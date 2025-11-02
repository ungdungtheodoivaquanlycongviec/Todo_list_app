const conversationService = require('../services/conversation.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');

const handleServiceResponse = (res, result) => {
  if (!result.success) {
    return sendError(res, result.message, result.statusCode || 500, result.errors || null);
  }
  return sendSuccess(res, result.data, result.message, result.statusCode || 200);
};

const listConversations = asyncHandler(async (req, res) => {
  const result = await conversationService.listConversations(req.user._id, req.query);
  return handleServiceResponse(res, result);
});

const createConversation = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    createdBy: req.user._id
  };
  const result = await conversationService.createConversation(payload);
  return handleServiceResponse(res, result);
});

const getConversationById = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const result = await conversationService.getConversation(conversationId, req.user._id);
  return handleServiceResponse(res, result);
});

const updateConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const result = await conversationService.updateConversation(conversationId, req.user._id, req.body || {});
  return handleServiceResponse(res, result);
});

const updateParticipantState = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const result = await conversationService.updateParticipantState(conversationId, req.user._id, req.body || {});
  return handleServiceResponse(res, result);
});

const markConversationRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { messageId } = req.body || {};
  const result = await conversationService.markConversationRead(conversationId, req.user._id, messageId);
  return handleServiceResponse(res, result);
});

module.exports = {
  listConversations,
  createConversation,
  getConversationById,
  updateConversation,
  updateParticipantState,
  markConversationRead
};
