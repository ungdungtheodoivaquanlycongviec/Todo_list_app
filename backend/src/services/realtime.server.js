const { Server } = require('socket.io');
const env = require('../config/environment');
const authService = require('./auth.service');
const { registerNotificationListener } = require('./realtime.gateway');

const DEFAULT_CLIENT_ORIGINS = env.nodeEnv === 'production'
  ? ['https://your-production-domain.com']
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const USER_ROOM_PREFIX = 'user:';

const extractTokenFromHandshake = (handshake = {}) => {
  if (handshake.auth && typeof handshake.auth.token === 'string' && handshake.auth.token.trim()) {
    return handshake.auth.token.trim();
  }

  if (handshake.query && typeof handshake.query.token === 'string' && handshake.query.token.trim()) {
    return handshake.query.token.trim();
  }

  const authorization = handshake.headers?.authorization;
  if (typeof authorization === 'string' && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  return null;
};

const resolveRecipientId = (recipient) => {
  if (!recipient) {
    return null;
  }

  if (typeof recipient === 'string') {
    return recipient;
  }

  if (typeof recipient.toHexString === 'function') {
    return recipient.toHexString();
  }

  if (typeof recipient.toString === 'function') {
    return recipient.toString();
  }

  return null;
};

const initializeRealtimeServer = (httpServer) => {
  if (!env.enableRealtimeNotifications) {
    console.log('[Realtime] ENABLE_REALTIME_NOTIFICATIONS is disabled. Socket.IO bootstrap skipped.');
    return { io: null, namespace: null, shutdown: async () => {} };
  }

  const io = new Server(httpServer, {
    cors: {
      origin: DEFAULT_CLIENT_ORIGINS,
      credentials: true
    }
  });

  const appNamespace = io.of('/ws/app');

  appNamespace.use(async (socket, next) => {
    try {
      const token = extractTokenFromHandshake(socket.handshake);
      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = await authService.verifyToken(token);
      if (!decoded || !decoded.id) {
        return next(new Error('Invalid authentication payload'));
      }

      socket.data.userId = decoded.id;
      socket.data.userEmail = decoded.email || null;
      next();
    } catch (error) {
      next(new Error(error.message || 'Unauthenticated'));
    }
  });

  appNamespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    const roomName = userId ? `${USER_ROOM_PREFIX}${userId}` : null;

    if (roomName) {
      socket.join(roomName);
      socket.emit('notifications:ready', {
        message: 'Realtime notifications channel established',
        userId
      });
    }

    socket.on('disconnect', (reason) => {
      if (roomName) {
        socket.leave(roomName);
      }
      console.log(`[Realtime] Socket disconnected (${reason}) for user ${userId || 'unknown'}`);
    });
  });

  const listener = ({ eventKey, payload, data }) => {
    const notification = payload || data;
    if (!notification) {
      return;
    }

    const recipientId = resolveRecipientId(notification.recipient);
    if (!recipientId) {
      return;
    }

    const roomName = `${USER_ROOM_PREFIX}${recipientId}`;
    const channel = notification.eventKey || eventKey || 'notification';

    appNamespace.to(roomName).emit('notifications:new', {
      eventKey: channel,
      notification
    });
  };

  const unregister = registerNotificationListener(listener);

  const shutdown = async () => {
    try {
      if (typeof unregister === 'function') {
        unregister();
      }
      await appNamespace.disconnectSockets(true);
      await io.close();
      console.log('[Realtime] Socket.IO server closed.');
    } catch (error) {
      console.error('[Realtime] Error during Socket.IO shutdown', error);
    }
  };

  console.log('[Realtime] Socket.IO namespace /ws/app initialized.');

  return { io, namespace: appNamespace, shutdown };
};

module.exports = {
  initializeRealtimeServer
};
