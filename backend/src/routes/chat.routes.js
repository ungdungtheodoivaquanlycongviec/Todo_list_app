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
const directChatController = require('../controllers/directChat.controller');
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

// Direct conversation routes
router.get('/direct/conversations', directChatController.listConversations);
router.post('/direct/conversations', directChatController.startConversation);
router.get(
  '/direct/conversations/:conversationId/messages',
  directChatController.getConversationMessages
);
router.post(
  '/direct/conversations/:conversationId/messages',
  directChatController.sendDirectMessage
);
router.post(
  '/direct/conversations/:conversationId/upload',
  uploadSingle,
  handleMulterError,
  directChatController.uploadDirectAttachment
);
router.post(
  '/direct/messages/:messageId/reactions',
  directChatController.toggleDirectReaction
);
router.put('/direct/messages/:messageId', directChatController.editDirectMessage);
router.delete('/direct/messages/:messageId', directChatController.deleteDirectMessage);

module.exports = router;

