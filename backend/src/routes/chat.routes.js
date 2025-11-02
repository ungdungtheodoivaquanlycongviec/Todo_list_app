const express = require('express');
const router = express.Router();
const {
  createMessage,
  getMessages,
  toggleReaction,
  editMessage,
  deleteMessage,
  uploadAttachment
} = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/auth');
const { uploadSingle, handleMulterError } = require('../middlewares/upload');

// All routes require authentication
router.use(authenticate);

// Upload attachment
router.post('/:groupId/upload', uploadSingle, handleMulterError, uploadAttachment);

// Get messages
router.get('/:groupId/messages', getMessages);

// Create message
router.post('/:groupId/messages', createMessage);

// Toggle reaction
router.post('/messages/:messageId/reactions', toggleReaction);

// Edit message
router.put('/messages/:messageId', editMessage);

// Delete message
router.delete('/messages/:messageId', deleteMessage);

module.exports = router;

