const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const { authenticate } = require('../middlewares/auth');

/**
 * Chatbot Routes
 * Base path: /api/chatbot
 */

// Apply authentication to all chatbot routes
router.use(authenticate);

// Get chatbot context (user info, tasks, etc.)
router.get('/context', chatbotController.getChatbotContext);

// Save recommended tasks for current user
router.post('/recommended-tasks', chatbotController.saveRecommendedTasks);

// Evaluate recommended tasks completion status from database
router.get('/recommended-tasks/evaluate', chatbotController.evaluateRecommendedTasks);

// Group progress summary (only for PM/Product Owner of current group)
router.get('/group-progress', chatbotController.getGroupProgressSummary);

// Member progress summary in current group (only for PM/Product Owner)
router.get('/member-progress', chatbotController.getMemberProgressSummary);

module.exports = router;


