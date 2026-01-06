/**
 * Express App Configuration - SIMPLE CORS FIX
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/environment');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// ==================== SIMPLE CORS FIX ====================
// Get allowed origins from environment variable
const getAllowedOrigins = () => {
  if (env.nodeEnv !== 'production') {
    return true; // Allow all origins in development
  }

  // In production, parse SOCKET_ALLOWED_ORIGINS or allow all if not set
  const originsEnv = process.env.SOCKET_ALLOWED_ORIGINS;
  if (originsEnv) {
    // Split by comma and trim, ensure https:// prefix
    return originsEnv.split(',').map(origin => {
      origin = origin.trim();
      if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
        return `https://${origin}`;
      }
      return origin;
    });
  }

  // Allow all if no origins specified
  return true;
};

const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: true
};

// Chỉ cần dùng app.use(cors()) - không cần app.options('*')
app.use(cors(corsOptions));

// Logging middleware
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Todo List API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// API Routes
app.use('/api', require('./routes'));

// 404 Handler - Must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error Handler Middleware
app.use(require('./middlewares/errorHandler'));

module.exports = app;