const env = require('../config/environment');
const { setupRealtimeServer } = require('./server');

let realtimeInstance = null;

const initializeRealtimeLayer = async (httpServer, options = {}) => {
  if (!httpServer) {
    throw new Error('HTTP server instance is required to initialize realtime transport');
  }

  if (!env.enableRealtimeNotifications) {
    console.log('[Realtime] ENABLE_REALTIME_NOTIFICATIONS is disabled. Socket.IO bootstrap skipped.');
    return {
      io: null,
      namespace: null,
      presence: null,
      shutdown: async () => {}
    };
  }

  if (realtimeInstance) {
    return realtimeInstance;
  }

  realtimeInstance = await setupRealtimeServer(httpServer, options);
  return realtimeInstance;
};

const getRealtimeInstance = () => realtimeInstance;

module.exports = {
  initializeRealtimeLayer,
  getRealtimeInstance
};
