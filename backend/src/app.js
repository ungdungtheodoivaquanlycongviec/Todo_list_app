/**
 * Express App Configuration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
// const mongoSanitize = require('express-mongo-sanitize'); // Không tương thích với Express v5
const env = require('./config/environment');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.nodeEnv === 'production' 
    ? ['https://your-production-domain.com'] // Thay bằng domain thật khi deploy
    : '*', // Allow all origins in development
  credentials: true
}));

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

// Data sanitization against NoSQL injection
// NOTE: express-mongo-sanitize không tương thích với Express v5
// TODO: Chờ update hoặc downgrade Express về v4 cho production
// app.use(mongoSanitize());

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
    documentation: '/api/docs' // Sẽ thêm sau
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
