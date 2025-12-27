const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middlewares/validator');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Public routes (with rate limiting)
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/google', authLimiter, authController.loginWithGoogle);

// Password reset routes (public with rate limiting)
router.post('/forgot-password', authLimiter, authController.requestPasswordReset);
router.post('/verify-reset-code', authLimiter, authController.verifyResetCode);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
