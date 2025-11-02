const messageService = require('../services/message.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');

const handleServiceResponse = (res, result) => {
  if (!result.success) {
    return sendError(res, result.message, result.statusCode || 500, result.errors || null);
  }
  return sendSuccess(res, result.data, result.message, result.statusCode || 200);
};

const listMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const result = await messageService.listMessages(conversationId, req.user._id, req.query || {});
  return handleServiceResponse(res, result);
});

const createMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const result = await messageService.createMessage(conversationId, req.user._id, req.body || {}, req.files || []);
  return handleServiceResponse(res, result);
});

const updateMessage = asyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;
  const result = await messageService.updateMessage(conversationId, messageId, req.user._id, req.body || {});
  return handleServiceResponse(res, result);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;
  const result = await messageService.deleteMessage(conversationId, messageId, req.user._id);
  return handleServiceResponse(res, result);
});

module.exports = {
  listMessages,
  createMessage,
  updateMessage,
  deleteMessage
};
