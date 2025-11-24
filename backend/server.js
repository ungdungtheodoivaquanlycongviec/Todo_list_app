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

    // Listen on all interfaces (0.0.0.0) to allow connections from other devices on the network
    const host = process.env.HOST || '0.0.0.0';
    httpServer.listen(env.port, host, () => {
      console.log('=================================');
      console.log('🚀 Server is running');
      console.log(`📍 Environment: ${env.nodeEnv}`);
      console.log(`🌐 Port: ${env.port}`);
      console.log(`🔗 URL: http://localhost:${env.port}`);
      console.log(`🌍 Network: http://${host === '0.0.0.0' ? getLocalIP() : host}:${env.port}`);
      if (realtime?.namespace) {
        console.log(`📡 Realtime namespace ready at ${env.realtime.namespace}`);
      }
      console.log('=================================');
    });
    
    // Helper function to get local IP address
    function getLocalIP() {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // Skip internal (loopback) and non-IPv4 addresses
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
      return 'localhost';
    }

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
