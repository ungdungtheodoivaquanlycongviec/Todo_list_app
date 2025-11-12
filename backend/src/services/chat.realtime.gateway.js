const EventEmitter = require('events');
const env = require('../config/environment');

/**
 * Chat Realtime Gateway
 * Lightweight event bridge for forwarding chat events to realtime transports.
 */
class ChatRealtimeGateway extends EventEmitter {}

const gateway = new ChatRealtimeGateway();

const CHAT_EVENTS = {
  messageCreated: 'message:created',
  messageUpdated: 'message:updated',
  messageDeleted: 'message:deleted',
  reactionToggled: 'reaction:toggled'
};

const emitChatEvent = (eventKey, payload) => {
  if (!env.enableRealtimeNotifications) {
    return;
  }

  setImmediate(() => {
    gateway.emit('chat:event', {
      eventKey,
      payload
    });
  });
};

const registerChatRealtimeListener = (listener) => {
  if (typeof listener !== 'function') {
    throw new Error('Chat realtime listener must be a function');
  }

  gateway.on('chat:event', listener);
  return () => gateway.off('chat:event', listener);
};

module.exports = {
  CHAT_EVENTS,
  emitChatEvent,
  registerChatRealtimeListener
};

