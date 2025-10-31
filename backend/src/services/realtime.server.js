const { setupRealtimeServer } = require('../realtime/server');

/**
 * @deprecated Phase 10 migrated realtime bootstrap to src/realtime/server.
 * This wrapper preserves backwards compatibility for earlier imports.
 */
const initializeRealtimeServer = async (httpServer) => setupRealtimeServer(httpServer);

module.exports = {
  initializeRealtimeServer
};
