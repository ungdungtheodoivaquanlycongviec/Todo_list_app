const DirectConversation = require('../models/DirectConversation.model');
const DirectMessage = require('../models/DirectMessage.model');
const User = require('../models/User.model');
const fileService = require('./file.service');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../config/constants');
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

const buildAttachmentPreview = (attachments = []) => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return 'Đã gửi tin nhắn';
  }

  const first = attachments[0];
  if (first.type === 'image') {
    return '📷 Hình ảnh';
  }

  return `📎 ${first.filename || 'Tệp đính kèm'}`;
};

const ensureContentPresent = (content, attachments = []) => {
  const hasContent = typeof content === 'string' && content.trim().length > 0;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  return hasContent || hasAttachments;
};

class DirectChatService {
  formatConversationForUser(conversationDoc, viewerId) {
    if (!conversationDoc) {
      return null;
    }

    const conversation = conversationDoc.toObject
      ? conversationDoc.toObject({ virtuals: true })
      : conversationDoc;

    const normalizedViewerId = normalizeId(viewerId);
    const participants = (conversation.participants || []).map(participant => {
      if (!participant) return null;
      if (participant._id) return participant;
      return { _id: participant };
    }).filter(Boolean);

    const targetUser =
      participants.find(
        participant => normalizeId(participant._id) !== normalizedViewerId
      ) || null;

    const unreadCountMap =
      typeof conversation.unreadCounts?.get === 'function'
        ? conversation.unreadCounts
        : new Map(Object.entries(conversation.unreadCounts || {}));

    const unreadCount = unreadCountMap.get(normalizedViewerId) || 0;

    return {
      _id: normalizeId(conversation._id),
      participants,
      targetUser,
      lastMessagePreview: conversation.lastMessagePreview || '',
      lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
      lastMessageSender: conversation.lastMessageSender
        ? normalizeId(conversation.lastMessageSender)
        : null,
      unreadCount
    };
  }

  async listConversations(userId) {
    const normalizedUserId = normalizeId(userId);
    if (!normalizedUserId) {
      const error = new Error(ERROR_MESSAGES.INVALID_ID);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const conversations = await DirectConversation.find({
      participants: normalizedUserId
    })
      .populate('participants', 'name email avatar')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return conversations.map(conversation =>
      this.formatConversationForUser(conversation, normalizedUserId)
    );
  }

  async startConversation(requesterId, { email, userId }) {
    const normalizedRequesterId = normalizeId(requesterId);
    if (!normalizedRequesterId) {
      const error = new Error(ERROR_MESSAGES.INVALID_ID);
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    if (!email && !userId) {
      const error = new Error('Email hoặc userId là bắt buộc');
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    let targetUser = null;
    if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase(), isActive: true });
    } else if (userId) {
      targetUser = await User.findById(userId);
    }

    if (!targetUser) {
      const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const normalizedTargetId = normalizeId(targetUser._id);
    if (normalizedTargetId === normalizedRequesterId) {
      const error = new Error('Không thể tạo cuộc trò chuyện với chính bạn');
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const participantHash = [normalizedRequesterId, normalizedTargetId].sort().join(':');

    let conversation = await DirectConversation.findOne({ participantHash }).populate(
      'participants',
      'name email avatar'
    );

    if (!conversation) {
      conversation = await DirectConversation.create({
        participants: [normalizedRequesterId, normalizedTargetId],
        participantHash,
        unreadCounts: {
          [normalizedRequesterId]: 0,
          [normalizedTargetId]: 0
        },
        lastMessagePreview: '',
        lastMessageAt: null
      });

      await conversation.populate('participants', 'name email avatar');
    }

    return this.formatConversationForUser(conversation, normalizedRequesterId);
  }

  async ensureConversationAccess(conversationId, requesterId) {
    const conversation = await DirectConversation.findById(conversationId).populate(
      'participants',
      'name email avatar'
    );

    if (!conversation) {
      const error = new Error('Cuộc trò chuyện không tồn tại');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const normalizedRequesterId = normalizeId(requesterId);
    const isParticipant = conversation.participants.some(
      participant => normalizeId(participant._id) === normalizedRequesterId
    );

    if (!isParticipant) {
      const error = new Error(ERROR_MESSAGES.FORBIDDEN);
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    return {
      conversation,
      normalizedRequesterId,
      normalizedConversationId: normalizeId(conversation._id)
    };
  }

  async getMessages(conversationId, requesterId, options = {}) {
    const { conversation, normalizedRequesterId } = await this.ensureConversationAccess(
      conversationId,
      requesterId
    );

    const { page = 1, limit = 50, before, after } = options;

    const query = {
      conversationId,
      deletedAt: null
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    } else if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      DirectMessage.find(query)
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
      DirectMessage.countDocuments(query)
    ]);

    // Mark messages as read for requester
    await DirectConversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          [`unreadCounts.${normalizedRequesterId}`]: 0
        }
      }
    );

    messages.reverse();

    return {
      messages,
      conversation: this.formatConversationForUser(conversation, normalizedRequesterId),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total
      }
    };
  }

  async createMessage(conversationId, senderId, messageData, skipRealtime = false) {
    const { conversation, normalizedRequesterId, normalizedConversationId } =
      await this.ensureConversationAccess(conversationId, senderId);

    const { content = '', replyTo, attachments = [], mentions = [] } = messageData;

    if (!ensureContentPresent(content, attachments)) {
      const error = new Error('Tin nhắn phải có nội dung hoặc tệp đính kèm');
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    if (replyTo) {
      const replyMessage = await DirectMessage.findById(replyTo);
      if (
        !replyMessage ||
        normalizeId(replyMessage.conversationId) !== normalizedConversationId
      ) {
        const error = new Error('Tin nhắn trả lời không hợp lệ');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }
    }

    const message = new DirectMessage({
      conversationId,
      senderId,
      content: content || '',
      attachments,
      replyTo: replyTo || null,
      mentions: mentions || []
    });

    const savedMessage = await message.save();

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

    const otherParticipantId = conversation.getOtherParticipantId(senderId);
    const preview = content?.trim()
      ? content.trim().slice(0, 140)
      : buildAttachmentPreview(attachments);

    const updatePayload = {
      lastMessagePreview: preview,
      lastMessageAt: savedMessage.createdAt,
      lastMessageSender: senderId,
      $set: {
        [`unreadCounts.${normalizedRequesterId}`]: 0
      }
    };

    if (otherParticipantId) {
      updatePayload.$inc = {
        [`unreadCounts.${otherParticipantId}`]: 1
      };
    }

    await DirectConversation.updateOne({ _id: conversationId }, updatePayload);

    const freshConversation = await DirectConversation.findById(conversationId)
      .populate('participants', 'name email avatar')
      .lean();

    const participantSummaries = (freshConversation.participants || []).map(participant => {
      const participantId = normalizeId(participant._id || participant);
      return {
        userId: participantId,
        summary: this.formatConversationForUser(freshConversation, participantId)
      };
    });

    if (!skipRealtime) {
      emitChatEvent(CHAT_EVENTS.messageCreated, {
        targetType: 'direct',
        conversationId: normalizedConversationId,
        participants: participantSummaries.map(entry => entry.userId),
        participantSummaries,
        message: savedMessage
      });
    }

    // Exclude mentioned users from regular notification (they get mention notification)
    const mentionedUserIds = Array.isArray(mentions) ? mentions : [];
    const notificationRecipients = otherParticipantId && !mentionedUserIds.includes(otherParticipantId)
      ? [otherParticipantId]
      : [];

    if (notificationRecipients.length > 0) {
      notificationService
        .createChatMessageNotification({
          senderId: normalizedRequesterId,
          senderName: savedMessage?.senderId?.name || null,
          preview,
          contextType: 'direct',
          groupId: null,
          groupName: null,
          conversationId: normalizedConversationId,
          messageId: savedMessage._id,
          recipientIds: notificationRecipients
        })
        .catch(error => {
          console.error('Failed to dispatch direct chat notification:', error);
        });
    }

    return {
      message: savedMessage,
      conversation: freshConversation,
      participantSummaries
    };
  }

  async toggleReaction(messageId, emoji, userId, skipRealtime = false) {
    const message = await DirectMessage.findById(messageId);
    if (!message) {
      const error = new Error('Tin nhắn không tồn tại');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    const { conversation } = await this.ensureConversationAccess(
      message.conversationId,
      userId
    );

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

    if (!skipRealtime) {
      emitChatEvent(CHAT_EVENTS.reactionToggled, {
        targetType: 'direct',
        conversationId: normalizeId(conversation._id),
        participants: conversation.participants.map(participant =>
          normalizeId(participant._id)
        ),
        emoji,
        userId: normalizeId(userId),
        added: result.added,
        message
      });
    }

    return {
      message,
      ...result
    };
  }

  async editMessage(messageId, userId, content, skipRealtime = false) {
    const message = await DirectMessage.findById(messageId);
    if (!message) {
      const error = new Error('Tin nhắn không tồn tại');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (normalizeId(message.senderId) !== normalizeId(userId)) {
      const error = new Error('Chỉ có thể chỉnh sửa tin nhắn của bạn');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }

    if (message.deletedAt) {
      const error = new Error('Không thể sửa tin nhắn đã xóa');
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

    if (!skipRealtime) {
      const conversation = await DirectConversation.findById(message.conversationId);
      emitChatEvent(CHAT_EVENTS.messageUpdated, {
        targetType: 'direct',
        conversationId: normalizeId(message.conversationId),
        participants: (conversation?.participants || []).map(participant =>
          normalizeId(participant)
        ),
        message
      });
    }

    return message;
  }

  async deleteMessage(messageId, userId, skipRealtime = false) {
    const message = await DirectMessage.findById(messageId);
    if (!message) {
      const error = new Error('Tin nhắn không tồn tại');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (normalizeId(message.senderId) !== normalizeId(userId)) {
      const error = new Error('Chỉ có thể xóa tin nhắn của bạn');
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
            console.error('Error deleting direct chat attachment from Cloudinary:', error);
            // Continue with message deletion even if Cloudinary deletion fails
          }
        }
      }
    }

    await message.softDelete();
    await message.populate('senderId', 'name email avatar');

    if (!skipRealtime) {
      const conversation = await DirectConversation.findById(message.conversationId);
      emitChatEvent(CHAT_EVENTS.messageDeleted, {
        targetType: 'direct',
        conversationId: normalizeId(message.conversationId),
        participants: (conversation?.participants || []).map(participant =>
          normalizeId(participant)
        ),
        message
      });
    }

    return message;
  }

  async uploadAttachment(file, conversationId, userId = null) {
    if (!file) {
      const error = new Error('Không có tệp đính kèm');
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const conversation = await DirectConversation.findById(conversationId);
    if (!conversation) {
      const error = new Error('Cuộc trò chuyện không tồn tại');
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    if (userId) {
      const normalizedUserId = normalizeId(userId);
      const isParticipant = conversation.participants.some(
        participant => normalizeId(participant) === normalizedUserId
      );
      if (!isParticipant) {
        const error = new Error(ERROR_MESSAGES.FORBIDDEN);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }
    }

    try {
      const uploadResult = await fileService.uploadFile(
        file.buffer,
        {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        },
        `chat/direct/${conversationId}`
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
      throw new Error('Không thể upload file: ' + (error.message || 'Unknown error'));
    }
  }
}

module.exports = new DirectChatService();


