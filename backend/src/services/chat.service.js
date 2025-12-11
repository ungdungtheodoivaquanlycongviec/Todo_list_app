const GroupMessage = require('../models/GroupMessage.model');
const Group = require('../models/Group.model');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../config/constants');
const fileService = require('./file.service');
const { CHAT_EVENTS, emitChatEvent } = require('./chat.realtime.gateway');
const notificationService = require('./notification.service');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return null;
};

const MAX_PREVIEW_LENGTH = 140;
const buildMessagePreview = (content, attachments = []) => {
  const text = typeof content === 'string' ? content.trim() : '';
  if (text) {
    return text.length > MAX_PREVIEW_LENGTH ? `${text.slice(0, MAX_PREVIEW_LENGTH)}…` : text;
  }
  if (Array.isArray(attachments) && attachments.length > 0) {
    const first = attachments[0];
    if (first?.type === 'image') {
      return '📷 Image attachment';
    }
    if (first?.filename) {
      return `📎 ${first.filename}`;
    }
    return '📎 File attachment';
  }
  return 'New message';
};

class ChatService {
  /**
   * Tạo message mới
   * @param {String} groupId - ID của group
   * @param {String} senderId - ID của người gửi
   * @param {Object} messageData - Dữ liệu message
   * @param {Boolean} skipRealtime - Skip emitting realtime event (for socket handlers)
   * @returns {Promise<Object>} Message đã tạo
   */
  async createMessage(groupId, senderId, messageData, skipRealtime = false) {
    const { content, replyTo, attachments = [] } = messageData;

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error(ERROR_MESSAGES.GROUP_NOT_FOUND || 'Group not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const normalizedSenderId = normalizeId(senderId);
    const isMember = group.members.some(
      member => normalizeId(member.userId) === normalizedSenderId
    );

    if (!isMember) {
      const error = new Error('You are not a member of this group');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    // Validate replyTo if provided
    if (replyTo) {
      const replyMessage = await GroupMessage.findById(replyTo);
      if (!replyMessage || normalizeId(replyMessage.groupId) !== normalizeId(groupId)) {
        const error = new Error('Reply message not found or belongs to different group');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    // Validate content or attachments
    if (!content && (!attachments || attachments.length === 0)) {
      const error = new Error('Message must have content or attachments');
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const message = new GroupMessage({
      groupId,
      senderId,
      content: content || '',
      attachments,
      replyTo: replyTo || null
    });

    const savedMessage = await message.save();

    // Populate sender info
    await savedMessage.populate('senderId', 'name email avatar');
    if (replyTo) {
      await savedMessage.populate({
        path: 'replyTo',
        select: 'content senderId createdAt',
        populate: {
          path: 'senderId',
          select: 'name email avatar'
        }
      });
    }

    // Emit realtime event (skip if called from socket handler)
    if (!skipRealtime) {
      emitChatEvent(CHAT_EVENTS.messageCreated, {
        targetType: 'group',
        message: savedMessage,
        groupId: normalizeId(groupId)
      });
    }

    const senderName = savedMessage?.senderId?.name || null;
    const preview = buildMessagePreview(content, attachments);
    const groupRecipients = group.members
      .map(member => normalizeId(member.userId))
      .filter(memberId => memberId && memberId !== normalizedSenderId);

    if (groupRecipients.length > 0) {
      notificationService
        .createChatMessageNotification({
          senderId: normalizedSenderId,
          senderName,
          preview,
          contextType: 'group',
          groupId: normalizeId(groupId),
          groupName: group.name,
          conversationId: null,
          messageId: savedMessage._id,
          recipientIds: groupRecipients
        })
        .catch(error => {
          console.error('Failed to dispatch group chat notification:', error);
        });
    }

    return savedMessage;
  }

  /**
   * Lấy danh sách messages của group
   * @param {String} groupId - ID của group
   * @param {String} userId - ID của user (để check permission)
   * @param {Object} options - Options (page, limit, before, after)
   * @returns {Promise<Object>} { messages, pagination }
   */
  async getMessages(groupId, userId, options = {}) {
    const { page = 1, limit = 50, before, after } = options;

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error(ERROR_MESSAGES.GROUP_NOT_FOUND || 'Group not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const normalizedUserId = normalizeId(userId);
    const isMember = group.members.some(
      member => normalizeId(member.userId) === normalizedUserId
    );

    if (!isMember) {
      const error = new Error('You are not a member of this group');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    // Build query
    const query = {
      groupId,
      deletedAt: null
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    } else if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      GroupMessage.find(query)
        .populate('senderId', 'name email avatar')
        .populate({
          path: 'replyTo',
          select: 'content senderId createdAt deletedAt',
          populate: {
            path: 'senderId',
            select: 'name email avatar'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GroupMessage.countDocuments(query)
    ]);

    // Reverse để có thứ tự từ cũ đến mới (cho UI)
    messages.reverse();

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total
      }
    };
  }

  /**
   * Thêm/toggle reaction cho message
   * @param {String} messageId - ID của message
   * @param {String} emoji - Emoji string
   * @param {String} userId - ID của user
   * @param {Boolean} skipRealtime - Skip emitting realtime event (for socket handlers)
   * @returns {Promise<Object>} Updated message
   */
  async toggleReaction(messageId, emoji, userId, skipRealtime = false) {
    const message = await GroupMessage.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    // Verify user is member of group
    const group = await Group.findById(message.groupId);
    if (!group) {
      const error = new Error(ERROR_MESSAGES.GROUP_NOT_FOUND || 'Group not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const normalizedUserId = normalizeId(userId);
    const isMember = group.members.some(
      member => normalizeId(member.userId) === normalizedUserId
    );

    if (!isMember) {
      const error = new Error('You are not a member of this group');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    const result = await message.toggleReaction(emoji, userId);

    await message.populate('senderId', 'name email avatar');
    await message.populate({
      path: 'replyTo',
      select: 'content senderId createdAt',
      populate: {
        path: 'senderId',
        select: 'name email avatar'
      }
    });

    // Emit realtime event (skip if called from socket handler)
    if (!skipRealtime) {
      emitChatEvent(CHAT_EVENTS.reactionToggled, {
        targetType: 'group',
        message,
        groupId: normalizeId(message.groupId),
        emoji,
        userId: normalizeId(userId),
        added: result.added
      });
    }

    return {
      message,
      ...result
    };
  }

  /**
   * Sửa message
   * @param {String} messageId - ID của message
   * @param {String} userId - ID của user (phải là người gửi)
   * @param {String} content - Nội dung mới
   * @param {Boolean} skipRealtime - Skip emitting realtime event (for socket handlers)
   * @returns {Promise<Object>} Updated message
   */
  async editMessage(messageId, userId, content, skipRealtime = false) {
    const message = await GroupMessage.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (normalizeId(message.senderId) !== normalizeId(userId)) {
      const error = new Error('You can only edit your own messages');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    if (message.deletedAt) {
      const error = new Error('Cannot edit deleted message');
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    await message.populate('senderId', 'name email avatar');
    await message.populate({
      path: 'replyTo',
      select: 'content senderId createdAt',
      populate: {
        path: 'senderId',
        select: 'name email avatar'
      }
    });

    // Emit realtime event (skip if called from socket handler)
    if (!skipRealtime) {
      emitChatEvent(CHAT_EVENTS.messageUpdated, {
        targetType: 'group',
        message,
        groupId: normalizeId(message.groupId)
      });
    }

    return message;
  }

  /**
   * Xóa message (soft delete)
   * @param {String} messageId - ID của message
   * @param {String} userId - ID của user (phải là người gửi)
   * @param {Boolean} skipRealtime - Skip emitting realtime event (for socket handlers)
   * @returns {Promise<Object>} Updated message
   */
  async deleteMessage(messageId, userId, skipRealtime = false) {
    const message = await GroupMessage.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    // Verify user is sender or admin
    const group = await Group.findById(message.groupId);
    if (!group) {
      const error = new Error(ERROR_MESSAGES.GROUP_NOT_FOUND || 'Group not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const normalizedUserId = normalizeId(userId);
    const isSender = normalizeId(message.senderId) === normalizedUserId;
    const isAdmin = group.isAdmin(userId);

    if (!isSender && !isAdmin) {
      const error = new Error('You can only delete your own messages or be an admin');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    // Delete attachments from Cloudinary before soft delete
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.publicId) {
          try {
            await fileService.deleteFile(
              attachment.publicId,
              attachment.resourceType || 'raw'
            );
          } catch (error) {
            console.error('Error deleting chat attachment from Cloudinary:', error);
            // Continue with message deletion even if Cloudinary deletion fails
          }
        }
      }
    }

    await message.softDelete();

    await message.populate('senderId', 'name email avatar');

    // Emit realtime event (skip if called from socket handler)
    if (!skipRealtime) {
      emitChatEvent(CHAT_EVENTS.messageDeleted, {
        targetType: 'group',
        message,
        groupId: normalizeId(message.groupId)
      });
    }

    return message;
  }

  /**
   * Upload file/ảnh cho message
   * @param {Object} file - File object từ multer
   * @param {String} groupId - ID của group
   * @param {String} userId - ID của user (để verify permission)
   * @returns {Promise<Object>} File info
   */
  async uploadAttachment(file, groupId, userId = null) {
    if (!file) {
      const error = new Error('No file provided');
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      const error = new Error(ERROR_MESSAGES.GROUP_NOT_FOUND || 'Group not found');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    // Verify user is member of group if userId provided
    if (userId) {
      const normalizedUserId = normalizeId(userId);
      const isMember = group.members.some(
        member => normalizeId(member.userId) === normalizedUserId
      );

      if (!isMember) {
        const error = new Error('You are not a member of this group');
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }
    }

    try {
      // Upload to cloudinary
      // fileService.uploadFile expects: (fileBuffer, fileInfo, folder)
      const uploadResult = await fileService.uploadFile(
        file.buffer,
        {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        },
        `chat/${groupId}`
      );

      const isImage = file.mimetype.startsWith('image/');

      return {
        type: isImage ? 'image' : 'file',
        url: uploadResult.url,
        filename: uploadResult.filename || file.originalname,
        size: uploadResult.size || file.size,
        mimeType: uploadResult.mimetype || file.mimetype,
        thumbnailUrl: isImage ? uploadResult.url : null,
        publicId: uploadResult.publicId,
        resourceType: uploadResult.resourceType
      };
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error);
      throw new Error('Failed to upload file: ' + (error.message || 'Unknown error'));
    }
  }
}

module.exports = new ChatService();

