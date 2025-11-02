/**
 * Server Entry Point
 */

const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const env = require('./src/config/environment');
const { initializeRealtimeLayer } = require('./src/realtime');

const createHttpServer = async () => {
  await connectDB();
  return http.createServer(app);
};

const startServer = async ({ attachRealtime = true } = {}) => {
  try {
    const httpServer = await createHttpServer();
    let realtime = null;

    if (attachRealtime) {
      try {
        realtime = await initializeRealtimeLayer(httpServer);
      } catch (realtimeError) {
        console.error('❌ Failed to initialize realtime layer:', realtimeError);
      }
    }

    httpServer.listen(env.port, () => {
      console.log('=================================');
      console.log('🚀 Server is running');
      console.log(`📍 Environment: ${env.nodeEnv}`);
      console.log(`🌐 Port: ${env.port}`);
      console.log(`🔗 URL: http://localhost:${env.port}`);
      if (realtime?.namespace) {
        console.log(`📡 Realtime namespace ready at ${env.realtime.namespace}`);
      }
      console.log('=================================');
    });

    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${env.port} is already in use`);
        console.error('💡 Try using a different port or close the application using this port');
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
      httpServer.close(async () => {
        console.log('🔌 HTTP server closed');

        if (realtime && typeof realtime.shutdown === 'function') {
          await realtime.shutdown();
        }

        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return { httpServer, realtime };
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  createHttpServer
};
