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

module.exports = router;


