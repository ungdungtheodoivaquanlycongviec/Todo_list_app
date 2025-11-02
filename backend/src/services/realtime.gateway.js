const EventEmitter = require('events');
const env = require('../config/environment');

/**
 * Lightweight event bridge for forwarding notifications to realtime transports.
 * Socket.IO integration can register listeners on this gateway without
 * introducing a hard dependency into the core notification pipeline.
 */
class NotificationGateway extends EventEmitter {}

const gateway = new NotificationGateway();

const emitNotification = (eventKey, payload) => {
  if (!env.enableRealtimeNotifications) {
    return;
  }

  // Emit asynchronously to avoid blocking the notification persistence flow.
  setImmediate(() => {
    gateway.emit('notification', {
      eventKey,
      payload
    });
  });
};

const emitMessageEvent = (eventKey, payload) => {
  if (!env.enableRealtimeNotifications) {
    return;
  }

  setImmediate(() => {
    gateway.emit('message', {
      eventKey,
      payload
    });
  });
};

const registerNotificationListener = listener => {
  if (typeof listener !== 'function') {
    throw new Error('Realtime listener must be a function');
  }

  gateway.on('notification', listener);
  return () => gateway.off('notification', listener);
};

const registerMessageListener = listener => {
  if (typeof listener !== 'function') {
    throw new Error('Realtime listener must be a function');
  }

  gateway.on('message', listener);
  return () => gateway.off('message', listener);
};

module.exports = {
  emitNotification,
  registerNotificationListener,
  emitMessageEvent,
  registerMessageListener
};
