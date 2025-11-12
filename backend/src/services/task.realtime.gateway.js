const EventEmitter = require('events');

const TASK_EVENTS = {
  created: 'task.created',
  updated: 'task.updated',
  deleted: 'task.deleted'
};

class TaskRealtimeGateway extends EventEmitter {}

const gateway = new TaskRealtimeGateway();

const emitTaskEvent = (eventKey, payload = {}) => {
  if (!eventKey || typeof eventKey !== 'string') {
    throw new Error('Task realtime events require a string event key');
  }

  // Defer emission to avoid blocking call stack
  setImmediate(() => {
    gateway.emit('task:event', {
      eventKey,
      payload
    });
  });
};

const registerTaskRealtimeListener = (listener) => {
  if (typeof listener !== 'function') {
    throw new Error('Task realtime listener must be a function');
  }

  gateway.on('task:event', listener);
  return () => gateway.off('task:event', listener);
};

module.exports = {
  TASK_EVENTS,
  emitTaskEvent,
  registerTaskRealtimeListener
};

