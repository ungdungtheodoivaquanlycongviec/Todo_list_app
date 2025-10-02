const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth');
const { validateUpdateProfile, validateChangePassword } = require('../middlewares/validator');

/**
 * User Management Routes
 * Base path: /api/users
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// Profile management
router.put('/me', validateUpdateProfile, userController.updateProfile);
router.put('/me/password', validateChangePassword, userController.changePassword);
router.put('/me/avatar', userController.updateAvatar);
router.put('/me/notifications', userController.updateNotificationSettings);
router.delete('/me', userController.deactivateAccount);

module.exports = router;
