const asyncHandler = require('./asyncHandler');
const authService = require('../services/auth.service');
const User = require('../models/User.model');
const { sendError } = require('../utils/response');

/**
 * Authenticate user using JWT token
 * Extracts token from Authorization header, verifies it, and attaches user to req.user
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // 1. Extract token from header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return sendError(res, 'Authentication required. Please provide a valid token.', 401);
  }
  
  // 2. Verify token
  let decoded;
  try {
    decoded = await authService.verifyToken(token);
  } catch (error) {
    return sendError(res, error.message, 401);
  }
  
  // 3. Get user from DB
  const user = await User.findById(decoded.id);
  
  if (!user) {
    return sendError(res, 'User no longer exists', 401);
  }
  
  if (!user.isActive) {
    return sendError(res, 'Account has been deactivated', 401);
  }
  
  // 4. Attach user to request
  req.user = user;
  next();
});

/**
 * Authorize user based on roles
 * @param {...String} roles - Allowed roles (e.g., 'admin', 'user')
 * @returns {Function} - Middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }
    
    if (!roles.includes(req.user.role)) {
      return sendError(
        res, 
        `Access denied. This route requires one of the following roles: ${roles.join(', ')}`, 
        403
      );
    }
    
    next();
  };
};

/**
 * Optional authentication
 * Doesn't fail if no token is provided, just sets req.user = null
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  // 1. Extract token from header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // If no token, continue without user
  if (!token) {
    req.user = null;
    return next();
  }
  
  // 2. Try to verify token
  try {
    const decoded = await authService.verifyToken(token);
    
    // 3. Get user from DB
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (error) {
    // Invalid token, but don't fail - just set user to null
    req.user = null;
  }
  
  next();
});

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
