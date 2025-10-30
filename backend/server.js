/**
 * Server Entry Point
 */

const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const env = require('./src/config/environment');
const { initializeRealtimeServer } = require('./src/services/realtime.server');

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const httpServer = http.createServer(app);
    const realtime = initializeRealtimeServer(httpServer);

    // Start HTTP server
    httpServer.listen(env.port, () => {
      console.log('=================================');
      console.log(`🚀 Server is running`);
      console.log(`📍 Environment: ${env.nodeEnv}`);
      console.log(`🌐 Port: ${env.port}`);
      console.log(`🔗 URL: http://localhost:${env.port}`);
      if (realtime?.namespace) {
        console.log(`📡 Realtime namespace ready at /ws/app`);
      }
      console.log('=================================');
    });

    // Handle server errors
    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${env.port} is already in use`);
        console.error('💡 Try using a different port or close the application using this port');
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
      httpServer.close(async () => {
        console.log('🔌 HTTP server closed');

        if (realtime && typeof realtime.shutdown === 'function') {
          await realtime.shutdown();
        }
        
        // Close database connection
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
