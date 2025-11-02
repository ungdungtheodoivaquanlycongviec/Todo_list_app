const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth');
const {
  validateCreateConversation,
  validateUpdateConversation,
  validateConversationState,
  validateSendMessage,
  validateUpdateMessage,
  validateMarkConversationRead
} = require('../middlewares/validator');
const { uploadChatAttachments, handleChatUploadError } = require('../middlewares/chatUpload');
const conversationController = require('../controllers/conversation.controller');
const messageController = require('../controllers/message.controller');

router.use(authenticate);

router
  .route('/')
  .get(conversationController.listConversations)
  .post(validateCreateConversation, conversationController.createConversation);

router
  .route('/:conversationId')
  .get(conversationController.getConversationById)
  .patch(validateUpdateConversation, conversationController.updateConversation);

router.patch('/:conversationId/state', validateConversationState, conversationController.updateParticipantState);
router.post('/:conversationId/read', validateMarkConversationRead, conversationController.markConversationRead);

router
  .route('/:conversationId/messages')
  .get(messageController.listMessages)
  .post(uploadChatAttachments, handleChatUploadError, validateSendMessage, messageController.createMessage);

router
  .route('/:conversationId/messages/:messageId')
  .patch(validateUpdateMessage, messageController.updateMessage)
  .delete(messageController.deleteMessage);

module.exports = router;
