/**
 * Load và validate environment variables
 */

require('dotenv').config();

const parseList = (value) => {
  if (!value) {
    return null;
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  port: process.env.PORT || 8080,
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
  chat: {
    attachmentFolder: process.env.CHAT_ATTACHMENT_FOLDER || 'chat',
    maxMessageLength: toInt(process.env.CHAT_MAX_MESSAGE_LENGTH, 4000),
    maxAttachmentsPerMessage: toInt(process.env.CHAT_MAX_ATTACHMENTS, 5),
    maxAttachmentSizeBytes: toInt(process.env.CHAT_MAX_ATTACHMENT_SIZE_BYTES, 26214400)
  },
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Feature flags
  enableRealtimeNotifications: process.env.ENABLE_REALTIME_NOTIFICATIONS === 'true',

  // Realtime & presence configuration
  realtime: {
    namespace: process.env.SOCKET_NAMESPACE || '/ws/app',
    allowedOrigins: parseList(process.env.SOCKET_ALLOWED_ORIGINS),
    heartbeatIntervalMs: toInt(process.env.SOCKET_HEARTBEAT_INTERVAL_MS, 25000),
    maxPayloadBytes: toInt(process.env.SOCKET_MAX_PAYLOAD_BYTES, 5120),
    presenceTtlSeconds: toInt(process.env.PRESENCE_TTL_SECONDS, 60),
    enableRedisAdapter: process.env.ENABLE_SOCKET_REDIS_ADAPTER === 'true',
    redis: {
      url: process.env.REDIS_URL || '',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: toInt(process.env.REDIS_PORT, 6379),
      username: process.env.REDIS_USERNAME || '',
      password: process.env.REDIS_PASSWORD || '',
      tls: process.env.REDIS_TLS === 'true'
    }
  }
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
module.exports.REALTIME_CONFIG = env.realtime;
module.exports.SOCKET_NAMESPACE = env.realtime.namespace;
module.exports.SOCKET_ALLOWED_ORIGINS = env.realtime.allowedOrigins;
module.exports.SOCKET_HEARTBEAT_INTERVAL_MS = env.realtime.heartbeatIntervalMs;
module.exports.SOCKET_MAX_PAYLOAD_BYTES = env.realtime.maxPayloadBytes;
module.exports.PRESENCE_TTL_SECONDS = env.realtime.presenceTtlSeconds;
module.exports.ENABLE_SOCKET_REDIS_ADAPTER = env.realtime.enableRedisAdapter;
module.exports.REDIS_CONFIG = env.realtime.redis;
module.exports.CHAT_CONFIG = env.chat;
