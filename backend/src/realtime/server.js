const { Server } = require('socket.io');
const env = require('../config/environment');
const { registerNotificationListener } = require('../services/realtime.gateway');
const {
  authenticateSocket,
  SOCKET_ERROR_CODES
} = require('./middleware/authenticateSocket');
const { createPresenceService } = require('./presence.service');

const USER_ROOM_PREFIX = 'user:';
const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const realtimeMetrics = {
  activeConnections: 0,
  peakConnections: 0,
  totalConnections: 0,
  disconnectReasons: {},
  lastUpdatedAt: null
};

const incrementDisconnectReason = (reason) => {
  const key = reason || 'unknown';
  realtimeMetrics.disconnectReasons[key] = (realtimeMetrics.disconnectReasons[key] || 0) + 1;
};

const logMetricSnapshot = () => {
  realtimeMetrics.lastUpdatedAt = new Date().toISOString();
  console.log('[Realtime] Metrics snapshot:', {
    activeConnections: realtimeMetrics.activeConnections,
    peakConnections: realtimeMetrics.peakConnections,
    totalConnections: realtimeMetrics.totalConnections,
    disconnectReasons: realtimeMetrics.disconnectReasons,
    lastUpdatedAt: realtimeMetrics.lastUpdatedAt
  });
};

const buildOrigins = () => {
  const explicitOrigins = Array.isArray(env.realtime.allowedOrigins)
    ? env.realtime.allowedOrigins.filter(Boolean)
    : [];

  if (explicitOrigins.length > 0) {
    return explicitOrigins;
  }

  if (env.nodeEnv === 'production') {
    return [];
  }

  return DEFAULT_DEV_ORIGINS;
};

const resolveRedisOptions = () => {
  const { redis } = env.realtime;
  const hasUrl = Boolean(redis.url);
  const baseOptions = {};

  if (redis.tls) {
    baseOptions.tls = {};
  }

  if (!hasUrl) {
    baseOptions.host = redis.host;
    baseOptions.port = redis.port;
    if (redis.username) {
      baseOptions.username = redis.username;
    }
    if (redis.password) {
      baseOptions.password = redis.password;
    }
  }

  return {
    hasUrl,
    baseOptions,
    url: redis.url
  };
};

const initializeRedisAdapter = async () => {
  if (!env.realtime.enableRedisAdapter) {
    return { adapter: null, pubClient: null, subClient: null, presenceClient: null };
  }

  let createAdapter;
  let Redis;
  try {
    ({ createAdapter } = require('@socket.io/redis-adapter'));
    Redis = require('ioredis');
  } catch (error) {
    console.error('[Realtime] Failed to load Redis adapter dependencies:', error.message);
    return { adapter: null, pubClient: null, subClient: null, presenceClient: null };
  }

  const { hasUrl, baseOptions, url } = resolveRedisOptions();
  const pubClient = hasUrl ? new Redis(url, baseOptions) : new Redis(baseOptions);
  const subClient = pubClient.duplicate();
  const presenceClient = pubClient.duplicate();

  const clients = [pubClient, subClient, presenceClient];
  clients.forEach(client => {
    client.on('error', (error) => {
      console.error('[Realtime] Redis client error:', error.message);
    });
  });

  const adapter = createAdapter(pubClient, subClient);
  return { adapter, pubClient, subClient, presenceClient };
};

const buildSocketMetadata = (socket) => {
  const headers = socket.handshake?.headers || {};
  const forwardedFor = headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : (forwardedFor || socket.handshake?.address || null);

  return {
    userAgent: headers['user-agent'] || null,
    ip: typeof ip === 'string' ? ip.split(',')[0].trim() : null
  };
};

const broadcastPresenceUpdate = (namespace, payload) => {
  if (!payload || !payload.userId) {
    return;
  }

  const roomName = `${USER_ROOM_PREFIX}${payload.userId}`;
  namespace.except(roomName).emit('presence:update', payload);
  namespace.to(roomName).emit('presence:update', payload);
};

const setupRealtimeServer = async (httpServer) => {
  const allowedOrigins = buildOrigins();
  if (env.nodeEnv === 'production' && allowedOrigins.length === 0) {
    console.warn('[Realtime] No SOCKET_ALLOWED_ORIGINS configured; allowing all origins (production fallback).');
  }

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true
    },
    serveClient: false,
    maxHttpBufferSize: env.realtime.maxPayloadBytes
  });

  const namespacePath = env.realtime.namespace || '/ws/app';
  const appNamespace = io.of(namespacePath);

  const { adapter, pubClient, subClient, presenceClient } = await initializeRedisAdapter();
  if (adapter) {
    io.adapter(adapter);
    console.log('[Realtime] Redis adapter enabled for Socket.IO');
  }

  const presence = createPresenceService({
    redisClient: presenceClient,
    ttlSeconds: env.realtime.presenceTtlSeconds
  });

  const presenceListener = (payload) => broadcastPresenceUpdate(appNamespace, payload);
  presence.events.on('presence:update', presenceListener);

  appNamespace.use(authenticateSocket);

  appNamespace.on('connect_error', (error) => {
    const code = error?.data?.code || SOCKET_ERROR_CODES.unauthorized;
    console.error('[Realtime] Connection error:', code, error?.message);
  });

  const heartbeatIntervalMs = Math.max(env.realtime.heartbeatIntervalMs || 0, 0);

  appNamespace.on('connection', async (socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    const roomName = `${USER_ROOM_PREFIX}${userId}`;
    const metadata = buildSocketMetadata(socket);

    realtimeMetrics.activeConnections += 1;
    realtimeMetrics.totalConnections += 1;
    if (realtimeMetrics.activeConnections > realtimeMetrics.peakConnections) {
      realtimeMetrics.peakConnections = realtimeMetrics.activeConnections;
    }
    if (env.nodeEnv !== 'production') {
      logMetricSnapshot();
    }

    socket.join(roomName);
    socket.emit('notifications:ready', {
      message: 'Realtime channel established',
      userId
    });

    try {
      await presence.recordConnection(userId, socket.id, {
        ...metadata,
        connectedAt: Date.now()
      });
    } catch (error) {
      console.error('[Realtime] Failed to record presence on connection:', error.message);
    }

    let heartbeat = null;
    if (heartbeatIntervalMs > 0) {
      heartbeat = setInterval(() => {
        presence.recordHeartbeat(userId, socket.id, {
          ...metadata,
          lastSeen: Date.now()
        }).catch((error) => {
          console.error('[Realtime] Failed to update presence heartbeat:', error.message);
        });
      }, heartbeatIntervalMs);
    }

    socket.on('presence:heartbeat', () => {
      presence.recordHeartbeat(userId, socket.id, {
        ...metadata,
        lastSeen: Date.now()
      }).catch((error) => {
        console.error('[Realtime] Failed to update manual heartbeat:', error.message);
      });
    });

    socket.on('disconnect', async (reason) => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      socket.leave(roomName);
      try {
        await presence.recordDisconnect(userId, socket.id);
      } catch (error) {
        console.error('[Realtime] Failed to record presence disconnect:', error.message);
      }
      realtimeMetrics.activeConnections = Math.max(realtimeMetrics.activeConnections - 1, 0);
      incrementDisconnectReason(reason);
      if (env.nodeEnv !== 'production') {
        logMetricSnapshot();
      }
      console.log(`[Realtime] Socket disconnected (${reason}) for user ${userId}`);
    });

    socket.on('error', (error) => {
      const code = error?.data?.code || SOCKET_ERROR_CODES.unauthorized;
      console.error('[Realtime] Socket error:', code, error.message);
    });
  });

  const notificationListener = ({ eventKey, payload, data }) => {
    const notification = payload || data;
    if (!notification) {
      return;
    }

    const recipient = notification.recipient;
    const recipientId = typeof recipient === 'string'
      ? recipient
      : (typeof recipient?.toHexString === 'function'
        ? recipient.toHexString()
        : (typeof recipient?.toString === 'function' ? recipient.toString() : null));

    if (!recipientId) {
      return;
    }

    const channel = notification.eventKey || eventKey || 'notification';
    const roomName = `${USER_ROOM_PREFIX}${recipientId}`;

    appNamespace.to(roomName).emit('notifications:new', {
      eventKey: channel,
      notification
    });
  };

  const unregisterNotificationListener = registerNotificationListener(notificationListener);

  console.log(`[Realtime] Socket.IO namespace ${namespacePath} initialized.`);

  const shutdown = async () => {
    try {
      unregisterNotificationListener();
      presence.events.off('presence:update', presenceListener);
      await presence.shutdown();
      await appNamespace.disconnectSockets(true);
      await io.close();
      if (pubClient && typeof pubClient.quit === 'function') {
        await pubClient.quit();
      }
      if (subClient && typeof subClient.quit === 'function') {
        await subClient.quit();
      }
      if (presenceClient && typeof presenceClient.quit === 'function') {
        await presenceClient.quit();
      }
      logMetricSnapshot();
      console.log('[Realtime] Realtime server shut down gracefully.');
    } catch (error) {
      console.error('[Realtime] Error during realtime shutdown:', error.message);
    }
  };

  return {
    io,
    namespace: appNamespace,
    presence,
    metrics: realtimeMetrics,
    shutdown
  };
};

module.exports = {
  setupRealtimeServer
};
