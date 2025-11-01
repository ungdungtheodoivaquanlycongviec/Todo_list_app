const chatService = require('../services/chat.service');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * @desc    Tạo message mới
 * @route   POST /api/chat/:groupId/messages
 * @access  Private
 */
const createMessage = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { content, replyTo, attachments } = req.body;
  const senderId = req.user._id;

  const message = await chatService.createMessage(groupId, senderId, {
    content,
    replyTo,
    attachments: attachments || []
  });

  sendSuccess(res, message, 'Message created successfully', HTTP_STATUS.CREATED);
});

/**
 * @desc    Lấy danh sách messages của group
 * @route   GET /api/chat/:groupId/messages
 * @access  Private
 */
const getMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { page, limit, before, after } = req.query;
  const userId = req.user._id;

  const result = await chatService.getMessages(groupId, userId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    before,
    after
  });

  sendSuccess(res, result, 'Messages fetched successfully');
});

/**
 * @desc    Toggle reaction cho message
 * @route   POST /api/chat/messages/:messageId/reactions
 * @access  Private
 */
const toggleReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  if (!emoji) {
    return sendError(res, 'Emoji is required', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await chatService.toggleReaction(messageId, emoji, userId);

  sendSuccess(res, result, 'Reaction toggled successfully');
});

/**
 * @desc    Sửa message
 * @route   PUT /api/chat/messages/:messageId
 * @access  Private
 */
const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!content) {
    return sendError(res, 'Content is required', HTTP_STATUS.BAD_REQUEST);
  }

  const message = await chatService.editMessage(messageId, userId, content);

  sendSuccess(res, message, 'Message edited successfully');
});

/**
 * @desc    Xóa message
 * @route   DELETE /api/chat/messages/:messageId
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await chatService.deleteMessage(messageId, userId);

  sendSuccess(res, message, 'Message deleted successfully');
});

/**
 * @desc    Upload file/ảnh
 * @route   POST /api/chat/:groupId/upload
 * @access  Private
 */
const uploadAttachment = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const file = req.file;
  const userId = req.user._id;

  if (!file) {
    return sendError(res, 'No file provided', HTTP_STATUS.BAD_REQUEST);
  }

  const attachment = await chatService.uploadAttachment(file, groupId, userId);

  sendSuccess(res, attachment, 'File uploaded successfully', HTTP_STATUS.CREATED);
});

module.exports = {
  createMessage,
  getMessages,
  toggleReaction,
  editMessage,
  deleteMessage,
  uploadAttachment
};

