const asyncHandler = require('../middlewares/asyncHandler');
const adminService = require('../services/admin.service');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters and pagination
 * @access  Private (Admin/Super Admin)
 */
const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  sendSuccess(res, result, 'Users retrieved successfully');
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin/Super Admin)
 */
const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    sendSuccess(res, { user }, 'User retrieved successfully');
  } catch (error) {
    if (error.message === 'Invalid user ID' || error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    throw error;
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Private (Admin/Super Admin)
 */
const createUser = asyncHandler(async (req, res) => {
  try {
    const user = await adminService.createUser(
      req.body,
      req.user._id,
      req.user.email,
      req
    );
    sendSuccess(res, { user }, 'User created successfully', 201);
  } catch (error) {
    if (error.message.includes('required') ||
      error.message.includes('Invalid') ||
      error.message.includes('already exists')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin/Super Admin)
 */
const updateUser = asyncHandler(async (req, res) => {
  try {
    const user = await adminService.updateUser(
      req.params.id,
      req.body,
      req.user._id,
      req.user.email,
      req
    );
    sendSuccess(res, { user }, 'User updated successfully');
  } catch (error) {
    if (error.message === 'Invalid user ID' || error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('required') ||
      error.message.includes('Invalid') ||
      error.message.includes('already') ||
      error.message.includes('cannot') ||
      error.message.includes('Only super_admin')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   PATCH /api/admin/users/:id/lock
 * @desc    Lock user account
 * @access  Private (Admin/Super Admin)
 */
const lockUser = asyncHandler(async (req, res) => {
  try {
    const user = await adminService.toggleUserLock(
      req.params.id,
      false,
      req.user._id,
      req.user.email,
      req
    );
    sendSuccess(res, { user }, 'User account locked successfully');
  } catch (error) {
    if (error.message === 'Invalid user ID' || error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    throw error;
  }
});

/**
 * @route   PATCH /api/admin/users/:id/unlock
 * @desc    Unlock user account
 * @access  Private (Admin/Super Admin)
 */
const unlockUser = asyncHandler(async (req, res) => {
  try {
    const user = await adminService.toggleUserLock(
      req.params.id,
      true,
      req.user._id,
      req.user.email,
      req
    );
    sendSuccess(res, { user }, 'User account unlocked successfully');
  } catch (error) {
    if (error.message === 'Invalid user ID' || error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    throw error;
  }
});

/**
 * @route   POST /api/admin/users/:id/assign-admin
 * @desc    Assign admin role to user (Super Admin only)
 * @access  Private (Super Admin)
 */
const assignAdminRole = asyncHandler(async (req, res) => {
  try {
    const user = await adminService.assignAdminRole(
      req.params.id,
      req.user._id,
      req.user.email,
      req
    );
    sendSuccess(res, { user }, 'Admin role assigned successfully');
  } catch (error) {
    if (error.message === 'Invalid user ID' || error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already') ||
      error.message.includes('Cannot') ||
      error.message.includes('not an admin')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   POST /api/admin/users/:id/remove-admin
 * @desc    Remove admin role from user (Super Admin only)
 * @access  Private (Super Admin)
 */
const removeAdminRole = asyncHandler(async (req, res) => {
  try {
    const user = await adminService.removeAdminRole(
      req.params.id,
      req.user._id,
      req.user.email,
      req
    );
    sendSuccess(res, { user }, 'Admin role removed successfully');
  } catch (error) {
    if (error.message === 'Invalid user ID' || error.message === 'User not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('already') ||
      error.message.includes('Cannot') ||
      error.message.includes('not an admin')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   POST /api/admin/notifications/send
 * @desc    Send notification to users
 * @access  Private (Admin/Super Admin)
 */
const sendNotification = asyncHandler(async (req, res) => {
  try {
    const result = await adminService.sendNotification(
      req.body,
      req.user._id,
      req.user.email,
      req
    );
    sendSuccess(res, result, `Notification sent to ${result.sentCount} user(s) successfully`);
  } catch (error) {
    if (error.message.includes('required') ||
      error.message.includes('Invalid') ||
      error.message.includes('No valid') ||
      error.message.includes('No recipients') ||
      error.message.includes('Please specify')) {
      return sendError(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * @route   GET /api/admin/login-history
 * @desc    Get login history with filters
 * @access  Private (Admin/Super Admin)
 */
const getLoginHistory = asyncHandler(async (req, res) => {
  const result = await adminService.getLoginHistory(req.query);
  sendSuccess(res, result, 'Login history retrieved successfully');
});

/**
 * @route   GET /api/admin/action-logs
 * @desc    Get admin action logs
 * @access  Private (Admin/Super Admin)
 */
const getActionLogs = asyncHandler(async (req, res) => {
  const result = await adminService.getAdminActionLogs(req.query);
  sendSuccess(res, result, 'Action logs retrieved successfully');
});

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin/Super Admin)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  sendSuccess(res, { stats }, 'Dashboard stats retrieved successfully');
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get user analytics data
 * @access  Private (Admin/Super Admin)
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getAnalytics();
  sendSuccess(res, { analytics }, 'Analytics data retrieved successfully');
});

/**
 * @route   GET /api/admin/system-status
 * @desc    Get system status metrics
 * @access  Private (Admin/Super Admin)
 */
const getSystemStatus = asyncHandler(async (req, res) => {
  // Get socket namespace from app if available
  const socketNamespace = req.app.get('socketNamespace') || null;
  const status = await adminService.getSystemStatus(socketNamespace);
  sendSuccess(res, { status }, 'System status retrieved successfully');
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  lockUser,
  unlockUser,
  assignAdminRole,
  removeAdminRole,
  sendNotification,
  getLoginHistory,
  getActionLogs,
  getDashboardStats,
  getAnalytics,
  getSystemStatus
};

