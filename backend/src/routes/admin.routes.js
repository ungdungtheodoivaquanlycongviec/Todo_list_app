const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin, requireSuperAdmin, canManageAdmins } = require('../middlewares/adminAuth');

/**
 * Admin Management Routes
 * Base path: /api/admin
 * All routes require authentication and admin/super_admin role
 */

// Apply authentication to all routes
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);
router.get('/system-status', adminController.getSystemStatus);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/lock', adminController.lockUser);
router.patch('/users/:id/unlock', adminController.unlockUser);

// Admin role management (Super Admin only)
router.post('/users/:id/assign-admin', canManageAdmins, adminController.assignAdminRole);
router.post('/users/:id/remove-admin', canManageAdmins, adminController.removeAdminRole);

// Notification management
router.post('/notifications/send', adminController.sendNotification);

// Login history
router.get('/login-history', adminController.getLoginHistory);

// Action logs
router.get('/action-logs', adminController.getActionLogs);

module.exports = router;

