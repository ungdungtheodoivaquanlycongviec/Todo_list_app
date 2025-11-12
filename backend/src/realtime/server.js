const { Server } = require('socket.io');
const env = require('../config/environment');
const { registerNotificationListener } = require('../services/realtime.gateway');
const { registerTaskRealtimeListener } = require('../services/task.realtime.gateway');
const {
  authenticateSocket,
  SOCKET_ERROR_CODES
} = require('./middleware/authenticateSocket');
const { createPresenceService } = require('./presence.service');

const USER_ROOM_PREFIX = 'user:';
const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

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

  // In development, allow all origins to enable testing from other devices on local network
  // For production, explicitly set SOCKET_ALLOWED_ORIGINS in environment variables
  return true; // Allow all origins in development
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
  if (env.nodeEnv === 'production' && (Array.isArray(allowedOrigins) && allowedOrigins.length === 0)) {
    console.warn('[Realtime] No SOCKET_ALLOWED_ORIGINS configured; allowing all origins (production fallback).');
  }

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins === true || (Array.isArray(allowedOrigins) && allowedOrigins.length > 0) 
        ? allowedOrigins 
        : true,
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

  const taskRealtimeListener = ({ eventKey, payload }) => {
    if (!eventKey) {
      return;
    }

    const eventName = `tasks:${eventKey}`;
    const recipients = Array.isArray(payload?.recipients)
      ? payload.recipients.filter(Boolean)
      : [];

    if (recipients.length > 0) {
      const uniqueRecipients = Array.from(new Set(recipients));
      uniqueRecipients.forEach((userId) => {
        const roomName = `${USER_ROOM_PREFIX}${userId}`;
        appNamespace.to(roomName).emit(eventName, {
          eventKey,
          payload
        });
      });
      return;
    }

    appNamespace.emit(eventName, {
      eventKey,
      payload
    });
  };

  const unregisterTaskListener = registerTaskRealtimeListener(taskRealtimeListener);

  const { registerChatRealtimeListener, CHAT_EVENTS } = require('../services/chat.realtime.gateway');
  const GROUP_ROOM_PREFIX = 'group:';

  const chatRealtimeListener = ({ eventKey, payload }) => {
    if (!eventKey || !payload) {
      return;
    }

    const { message, groupId } = payload;
    if (!groupId) {
      return;
    }

    const roomName = `${GROUP_ROOM_PREFIX}${groupId}`;

    // Convert message to plain object to ensure proper serialization
    const messageData = message?.toObject ? message.toObject() : (message?.toJSON ? message.toJSON() : message);

    // Emit to group room (use .in() to include all sockets in the room)
    if (eventKey === CHAT_EVENTS.messageCreated) {
      appNamespace.in(roomName).emit('chat:message', {
        type: 'new',
        message: messageData
      });
    } else if (eventKey === CHAT_EVENTS.messageUpdated) {
      appNamespace.in(roomName).emit('chat:message', {
        type: 'edited',
        message: messageData
      });
    } else if (eventKey === CHAT_EVENTS.messageDeleted) {
      appNamespace.in(roomName).emit('chat:message', {
        type: 'deleted',
        message: messageData
      });
    } else if (eventKey === CHAT_EVENTS.reactionToggled) {
      appNamespace.in(roomName).emit('chat:reaction', {
        type: payload.added ? 'added' : 'removed',
        messageId: messageData?._id || message?._id,
        emoji: payload.emoji,
        userId: payload.userId,
        message: messageData
      });
    }
  };

  const unregisterChatListener = registerChatRealtimeListener(chatRealtimeListener);

  // Setup chat handlers
  const { setupChatHandlers } = require('../services/chat.socket');
  setupChatHandlers(appNamespace);

  console.log(`[Realtime] Socket.IO namespace ${namespacePath} initialized.`);
  console.log('[Realtime] Chat handlers registered.');

  const shutdown = async () => {
    try {
      unregisterNotificationListener();
      unregisterTaskListener();
      unregisterChatListener();
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
      console.log('[Realtime] Realtime server shut down gracefully.');
    } catch (error) {
      console.error('[Realtime] Error during realtime shutdown:', error.message);
    }
  };

  return {
    io,
    namespace: appNamespace,
    presence,
    shutdown
  };
};

module.exports = {
  setupRealtimeServer
};
