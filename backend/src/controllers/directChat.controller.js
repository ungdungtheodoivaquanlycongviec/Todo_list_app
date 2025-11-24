const asyncHandler = require('../middlewares/asyncHandler');
const directChatService = require('../services/directChat.service');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await directChatService.listConversations(req.user._id);
  sendSuccess(res, { conversations }, 'Danh sách cuộc trò chuyện riêng');
});

const startConversation = asyncHandler(async (req, res) => {
  const { email, userId } = req.body;
  if (!email && !userId) {
    return sendError(res, 'Bạn phải cung cấp email hoặc userId để bắt đầu trò chuyện', HTTP_STATUS.BAD_REQUEST);
  }

  const conversation = await directChatService.startConversation(req.user._id, { email, userId });
  sendSuccess(res, { conversation }, 'Khởi tạo cuộc trò chuyện thành công', HTTP_STATUS.CREATED);
});

const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page, limit, before, after } = req.query;

  const result = await directChatService.getMessages(conversationId, req.user._id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 50,
    before,
    after
  });

  sendSuccess(res, result, 'Tải tin nhắn thành công');
});

const sendDirectMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content, replyTo, attachments = [] } = req.body;

  const result = await directChatService.createMessage(
    conversationId,
    req.user._id,
    { content, replyTo, attachments }
  );

  sendSuccess(res, result, 'Gửi tin nhắn thành công', HTTP_STATUS.CREATED);
});

const toggleDirectReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return sendError(res, 'Emoji là bắt buộc', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await directChatService.toggleReaction(messageId, emoji, req.user._id);
  sendSuccess(res, result, 'Cập nhật reaction thành công');
});

const editDirectMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content) {
    return sendError(res, 'Nội dung là bắt buộc', HTTP_STATUS.BAD_REQUEST);
  }

  const message = await directChatService.editMessage(messageId, req.user._id, content);
  sendSuccess(res, message, 'Chỉnh sửa tin nhắn thành công');
});

const deleteDirectMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await directChatService.deleteMessage(messageId, req.user._id);
  sendSuccess(res, message, 'Xóa tin nhắn thành công');
});

const uploadDirectAttachment = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const file = req.file;

  if (!file) {
    return sendError(res, 'Không có tệp nào được tải lên', HTTP_STATUS.BAD_REQUEST);
  }

  const attachment = await directChatService.uploadAttachment(file, conversationId, req.user._id);
  sendSuccess(res, attachment, 'Upload tệp thành công', HTTP_STATUS.CREATED);
});

module.exports = {
  listConversations,
  startConversation,
  getConversationMessages,
  sendDirectMessage,
  toggleDirectReaction,
  editDirectMessage,
  deleteDirectMessage,
  uploadDirectAttachment
};


