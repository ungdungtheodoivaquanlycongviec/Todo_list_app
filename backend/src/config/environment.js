/**
 * Load và validate environment variables
 */

require('dotenv').config();

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/todolist',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default_secret_change_this',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_change_this',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',

  // File upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  maxFilesPerTask: parseInt(process.env.MAX_FILES_PER_TASK) || 20,
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Feature flags
  enableRealtimeNotifications: process.env.ENABLE_REALTIME_NOTIFICATIONS === 'true'
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI'];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env file');
}

module.exports = env;

// Export individual values for convenience
module.exports.PORT = env.port;
module.exports.MONGODB_URI = env.mongoUri;
module.exports.JWT_SECRET = env.jwtSecret;
module.exports.JWT_EXPIRES_IN = env.jwtExpiresIn;
module.exports.JWT_REFRESH_SECRET = env.jwtRefreshSecret;
module.exports.JWT_REFRESH_EXPIRES_IN = env.jwtRefreshExpiresIn;
module.exports.GOOGLE_CLIENT_ID = env.googleClientId;
module.exports.ENABLE_REALTIME_NOTIFICATIONS = env.enableRealtimeNotifications;
