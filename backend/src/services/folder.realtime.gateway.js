const EventEmitter = require('events');
const env = require('../config/environment');

const FOLDER_EVENTS = {
  created: 'folder:created',
  updated: 'folder:updated',
  deleted: 'folder:deleted',
  membersUpdated: 'folder:members:updated'
};

class FolderRealtimeGateway extends EventEmitter {}

const gateway = new FolderRealtimeGateway();

const emitFolderEvent = (eventKey, payload) => {
  if (!env.enableRealtimeNotifications) {
    return;
  }

  setImmediate(() => {
    gateway.emit('folder:event', {
      eventKey,
      payload
    });
  });
};

const registerFolderRealtimeListener = (listener) => {
  if (typeof listener !== 'function') {
    throw new Error('Folder realtime listener must be a function');
  }

  gateway.on('folder:event', listener);
  return () => gateway.off('folder:event', listener);
};

module.exports = {
  FOLDER_EVENTS,
  emitFolderEvent,
  registerFolderRealtimeListener
};

