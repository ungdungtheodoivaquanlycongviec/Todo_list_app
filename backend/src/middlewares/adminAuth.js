const { sendError } = require('../utils/response');

/**
 * Middleware to check if user is admin or super_admin
 * Must be used after authenticate middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }
  
  const allowedRoles = ['admin', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return sendError(
      res,
      'Access denied. This route requires admin or super_admin role',
      403
    );
  }
  
  next();
};

/**
 * Middleware to check if user is super_admin only
 * Must be used after authenticate middleware
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }
  
  if (req.user.role !== 'super_admin') {
    return sendError(
      res,
      'Access denied. This route requires super_admin role',
      403
    );
  }
  
  next();
};

/**
 * Middleware to check if user can manage admins
 * Only super_admin can manage other admins
 */
const canManageAdmins = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }
  
  if (req.user.role !== 'super_admin') {
    return sendError(
      res,
      'Access denied. Only super_admin can manage admin roles',
      403
    );
  }
  
  next();
};

module.exports = {
  requireAdmin,
  requireSuperAdmin,
  canManageAdmins
};

