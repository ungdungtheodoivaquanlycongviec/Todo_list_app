const EventEmitter = require('events');

const DEFAULT_TTL_SECONDS = 60;
const DEFAULT_PREFIX = 'presence';

const now = () => Date.now();

const safeJsonParse = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const formatPresencePayload = (userId, socketEntries = []) => {
  const sockets = socketEntries.map(entry => ({
    socketId: entry.socketId,
    connectedAt: entry.connectedAt,
    lastSeen: entry.lastSeen,
    userAgent: entry.userAgent || null,
    ip: entry.ip || null
  }));

  const isOnline = sockets.length > 0;
  const lastSeen = sockets.reduce((latest, entry) => Math.max(latest, entry.lastSeen || 0), 0) || null;

  return {
    userId,
    isOnline,
    lastSeen,
    sockets
  };
};

const createPresenceService = ({
  redisClient = null,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  prefix = DEFAULT_PREFIX
} = {}) => {
  const events = new EventEmitter();
  const isRedisEnabled = Boolean(redisClient);
  const ttlMs = ttlSeconds * 1000;

  const memoryState = {
    users: new Map()
  };

  const onlineSetKey = `${prefix}:online`;
  const getUserHashKey = (userId) => `${prefix}:user:${userId}`;

  const emitPresence = async (userId) => {
    const payload = await getUserPresence(userId);
    events.emit('presence:update', payload);
    return payload;
  };

  const upsertMemoryRecord = (userId, socketId, metadata = {}) => {
    if (!memoryState.users.has(userId)) {
      memoryState.users.set(userId, new Map());
    }

    const userSockets = memoryState.users.get(userId);
    const nowTs = now();

    userSockets.set(socketId, {
      socketId,
      connectedAt: metadata.connectedAt || nowTs,
      lastSeen: metadata.lastSeen || nowTs,
      userAgent: metadata.userAgent || null,
      ip: metadata.ip || null
    });
  };

  const updateMemoryHeartbeat = (userId, socketId, metadata = {}) => {
    const userSockets = memoryState.users.get(userId);
    if (!userSockets) {
      return;
    }

    const existing = userSockets.get(socketId);
    if (!existing) {
      upsertMemoryRecord(userId, socketId, metadata);
      return;
    }

    existing.lastSeen = metadata.lastSeen || now();
    if (metadata.userAgent) {
      existing.userAgent = metadata.userAgent;
    }
    if (metadata.ip) {
      existing.ip = metadata.ip;
    }
  };

  const removeMemorySocket = (userId, socketId) => {
    const userSockets = memoryState.users.get(userId);
    if (!userSockets) {
      return;
    }

    userSockets.delete(socketId);

    if (userSockets.size === 0) {
      memoryState.users.delete(userId);
    }
  };

  const recordConnection = async (userId, socketId, metadata = {}) => {
    if (!userId || !socketId) {
      return null;
    }

    const connectionMeta = {
      socketId,
      connectedAt: metadata.connectedAt || now(),
      lastSeen: metadata.lastSeen || now(),
      userAgent: metadata.userAgent || null,
      ip: metadata.ip || null
    };

    if (isRedisEnabled) {
      const userHash = getUserHashKey(userId);
      await redisClient.hset(userHash, socketId, JSON.stringify(connectionMeta));
      await redisClient.expire(userHash, ttlSeconds);
      await redisClient.zadd(onlineSetKey, connectionMeta.lastSeen, userId);
      await redisClient.zremrangebyscore(onlineSetKey, 0, now() - ttlMs);
    } else {
      upsertMemoryRecord(userId, socketId, connectionMeta);
    }

    return emitPresence(userId);
  };

  const recordHeartbeat = async (userId, socketId, metadata = {}) => {
    if (!userId || !socketId) {
      return null;
    }

    const heartbeatMeta = {
      socketId,
      lastSeen: metadata.lastSeen || now(),
      userAgent: metadata.userAgent || null,
      ip: metadata.ip || null
    };

    if (isRedisEnabled) {
      const userHash = getUserHashKey(userId);
      const existing = safeJsonParse(await redisClient.hget(userHash, socketId));
      if (!existing) {
        return recordConnection(userId, socketId, heartbeatMeta);
      }

      const updated = {
        ...existing,
        lastSeen: heartbeatMeta.lastSeen
      };

      if (heartbeatMeta.userAgent) {
        updated.userAgent = heartbeatMeta.userAgent;
      }
      if (heartbeatMeta.ip) {
        updated.ip = heartbeatMeta.ip;
      }

      await redisClient.hset(userHash, socketId, JSON.stringify(updated));
      await redisClient.expire(userHash, ttlSeconds);
      await redisClient.zadd(onlineSetKey, updated.lastSeen, userId);
      await redisClient.zremrangebyscore(onlineSetKey, 0, now() - ttlMs);
      return emitPresence(userId);
    }

    updateMemoryHeartbeat(userId, socketId, heartbeatMeta);
    return emitPresence(userId);
  };

  const recordDisconnect = async (userId, socketId) => {
    if (!userId || !socketId) {
      return null;
    }

    if (isRedisEnabled) {
      const userHash = getUserHashKey(userId);
      await redisClient.hdel(userHash, socketId);
      const remaining = await redisClient.hlen(userHash);
      if (!remaining) {
        await redisClient.del(userHash);
        await redisClient.zrem(onlineSetKey, userId);
      }
      return emitPresence(userId);
    }

    removeMemorySocket(userId, socketId);
    return emitPresence(userId);
  };

  const getUserPresence = async (userId) => {
    if (!userId) {
      return formatPresencePayload(null, []);
    }

    if (isRedisEnabled) {
      const userHash = getUserHashKey(userId);
      const entries = await redisClient.hgetall(userHash);
      const sockets = Object.entries(entries || {}).map(([socketId, raw]) => {
        const parsed = safeJsonParse(raw) || {};
        return {
          socketId,
          connectedAt: parsed.connectedAt || null,
          lastSeen: parsed.lastSeen || null,
          userAgent: parsed.userAgent || null,
          ip: parsed.ip || null
        };
      });
      return formatPresencePayload(userId, sockets);
    }

    const sockets = memoryState.users.get(userId);
    return formatPresencePayload(userId, sockets ? Array.from(sockets.values()) : []);
  };

  const listOnlineUsers = async () => {
    if (isRedisEnabled) {
      await redisClient.zremrangebyscore(onlineSetKey, 0, now() - ttlMs);
      const members = await redisClient.zrangebyscore(onlineSetKey, '-inf', '+inf');
      return members || [];
    }

    return Array.from(memoryState.users.keys());
  };

  const shutdown = async () => {
    memoryState.users.clear();
  };

  return {
    recordConnection,
    recordHeartbeat,
    recordDisconnect,
    getUserPresence,
    listOnlineUsers,
    shutdown,
    events
  };
};

module.exports = {
  createPresenceService,
  formatPresencePayload
};
