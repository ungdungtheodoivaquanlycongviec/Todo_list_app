const EventEmitter = require('events');
const env = require('../config/environment');

const GROUP_EVENTS = {
  created: 'group:created',
  updated: 'group:updated',
  deleted: 'group:deleted',
  memberAdded: 'group:member:added',
  memberRemoved: 'group:member:removed',
  memberRoleUpdated: 'group:member:role:updated'
};

class GroupRealtimeGateway extends EventEmitter {}

const gateway = new GroupRealtimeGateway();

const emitGroupEvent = (eventKey, payload) => {
  if (!env.enableRealtimeNotifications) {
    return;
  }

  setImmediate(() => {
    gateway.emit('group:event', {
      eventKey,
      payload
    });
  });
};

const registerGroupRealtimeListener = (listener) => {
  if (typeof listener !== 'function') {
    throw new Error('Group realtime listener must be a function');
  }

  gateway.on('group:event', listener);
  return () => gateway.off('group:event', listener);
};

module.exports = {
  GROUP_EVENTS,
  emitGroupEvent,
  registerGroupRealtimeListener
};

