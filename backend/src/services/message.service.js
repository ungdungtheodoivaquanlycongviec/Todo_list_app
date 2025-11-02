const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const conversationService = require('./conversation.service');
const fileService = require('./file.service');
const { emitMessageEvent } = require('./realtime.gateway');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CHAT_LIMITS,
  MESSAGE_EVENTS,
  MESSAGE_STATUSES
} = require('../config/constants');
const { CHAT_CONFIG } = require('../config/environment');
const { isValidObjectId } = require('../utils/validationHelper');

const normalizeId = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value.toHexString) {
    return value.toHexString();
  }
  if (value._id) {
    return normalizeId(value._id);
  }
  if (value.toString) {
    return value.toString();
  }
  return null;
};

const serializeMessage = (messageDoc) => {
  if (!messageDoc) {
    return null;
  }

  const message = messageDoc.toObject ? messageDoc.toObject() : messageDoc;
  const senderData = message.senderId && typeof message.senderId === 'object' && message.senderId._id
    ? {
        _id: normalizeId(message.senderId._id),
        name: message.senderId.name,
        email: message.senderId.email,
        avatar: message.senderId.avatar || null
      }
    : null;

  const attachments = Array.isArray(message.attachments)
    ? message.attachments.map(entry => {
        const attachment = entry && typeof entry.toObject === 'function' ? entry.toObject() : { ...entry };
        if (attachment.metadata && typeof attachment.metadata.entries === 'function') {
          attachment.metadata = Object.fromEntries(attachment.metadata.entries());
        }
        return attachment;
      })
    : [];

  let metadata = {};
  if (message.metadata) {
    if (typeof message.metadata.entries === 'function') {
      metadata = Object.fromEntries(message.metadata.entries());
    } else if (typeof message.metadata === 'object') {
      metadata = { ...message.metadata };
    }
  }

  return {
    _id: normalizeId(message._id),
    conversationId: normalizeId(message.conversationId),
    senderId: senderData ? senderData._id : normalizeId(message.senderId),
    sender: senderData,
    content: message.content,
    attachments,
    metadata,
    status: message.status,
    deletedAt: message.deletedAt || null,
    readBy: Array.isArray(message.readBy)
      ? message.readBy.map(entry => ({
          userId: normalizeId(entry.userId),
          readAt: entry.readAt
        }))
      : [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
};

const ensureParticipant = async (conversationId, userId) => {
  const allowed = await conversationService.isParticipant(conversationId, userId);
  if (!allowed) {
    return {
      success: false,
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: ERROR_MESSAGES.CONVERSATION_ACCESS_DENIED
    };
  }
  return { success: true };
};

const buildAttachmentPayload = (uploadedFiles) => {
  return uploadedFiles.map(file => ({
    url: file.url,
    publicId: file.publicId,
    filename: file.originalName || file.filename || null,
    mimetype: file.mimetype,
    size: file.size,
    resourceType: file.resourceType,
    metadata: file.metadata || {},
    uploadedAt: new Date()
  }));
};

class MessageService {
  async listMessages(conversationId, userId, query = {}) {
    if (!isValidObjectId(conversationId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const participantCheck = await ensureParticipant(conversationId, userId);
    if (!participantCheck.success) {
      return participantCheck;
    }

    const { limit, before, after } = query;
    const requestedLimit = Number.parseInt(limit, 10) || 50;
    const sanitizedLimit = Math.min(Math.max(requestedLimit, 1), 100);

    const filter = { conversationId };
    if (before) {
      const beforeDate = new Date(before);
      if (!Number.isNaN(beforeDate.getTime())) {
        filter.createdAt = { ...(filter.createdAt || {}), $lt: beforeDate };
      }
    }

    if (after) {
      const afterDate = new Date(after);
      if (!Number.isNaN(afterDate.getTime())) {
        filter.createdAt = { ...(filter.createdAt || {}), $gt: afterDate };
      }
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .populate('senderId', 'name email avatar')
      .lean();

    const ordered = messages.reverse().map(serializeMessage);

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.MESSAGES_FETCHED,
      data: {
        messages: ordered,
        pagination: {
          limit: sanitizedLimit,
          hasMore: messages.length === sanitizedLimit
        }
      }
    };
  }

  async createMessage(conversationId, userId, payload = {}, files = []) {
    const actorId = normalizeId(userId);
    if (!isValidObjectId(conversationId) || !actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const participantCheck = await ensureParticipant(conversationId, actorId);
    if (!participantCheck.success) {
      return participantCheck;
    }

    const sanitizedContent = (payload.content || '').trim();
    if (sanitizedContent.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.MESSAGE_TOO_LONG
      };
    }

    const incomingFiles = Array.isArray(files) ? files : [];
    if (incomingFiles.length > CHAT_LIMITS.MAX_ATTACHMENTS_PER_MESSAGE) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.MESSAGE_ATTACHMENT_LIMIT
      };
    }

    const oversize = incomingFiles.find(file => file.size > CHAT_LIMITS.MAX_ATTACHMENT_SIZE_BYTES);
    if (oversize) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.MESSAGE_ATTACHMENT_TOO_LARGE
      };
    }

    let attachments = [];
    if (incomingFiles.length > 0) {
      const uploaded = await fileService.uploadMultipleFiles(
        incomingFiles,
        CHAT_CONFIG?.attachmentFolder || 'chat'
      );
      attachments = buildAttachmentPayload(uploaded);
    }

    if (!sanitizedContent && attachments.length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.MESSAGE_EMPTY
      };
    }

    const message = await Message.create({
      conversationId,
      senderId: actorId,
      content: sanitizedContent,
      attachments,
      status: MESSAGE_STATUSES[0],
      readBy: [{ userId: actorId, readAt: new Date() }]
    });

    await message.populate('senderId', 'name email avatar');

    await conversationService.applyNewMessage(conversationId, message);

    const conversation = await Conversation.findById(conversationId)
      .select('participants.userId')
      .lean();

    const participantIds = conversation
      ? conversation.participants.map(participant => normalizeId(participant.userId)).filter(Boolean)
      : [];

    const serialized = serializeMessage(message);
    emitMessageEvent(MESSAGE_EVENTS.MESSAGE_NEW, {
      conversationId: serialized.conversationId,
      message: serialized,
      senderId: serialized.senderId,
      recipients: participantIds
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: SUCCESS_MESSAGES.MESSAGE_SENT,
      data: serialized
    };
  }

  async updateMessage(conversationId, messageId, userId, payload = {}) {
    const actorId = normalizeId(userId);
    if (!isValidObjectId(conversationId) || !isValidObjectId(messageId) || !actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const participantCheck = await ensureParticipant(conversationId, actorId);
    if (!participantCheck.success) {
      return participantCheck;
    }

    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.MESSAGE_NOT_FOUND
      };
    }

    if (normalizeId(message.senderId) !== actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.FORBIDDEN
      };
    }

    const sanitizedContent = (payload.content || '').trim();
    if (sanitizedContent.length > CHAT_LIMITS.MAX_MESSAGE_LENGTH) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.MESSAGE_TOO_LONG
      };
    }

    if (!sanitizedContent && (!message.attachments || message.attachments.length === 0)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.MESSAGE_EMPTY
      };
    }

    message.content = sanitizedContent;
    message.status = 'edited';
    await message.save();
    await message.populate('senderId', 'name email avatar');

    const serialized = serializeMessage(message);

    const conversation = await Conversation.findById(conversationId)
      .select('lastMessage.messageId participants.userId')
      .lean();

    if (conversation?.lastMessage?.messageId &&
        normalizeId(conversation.lastMessage.messageId) === serialized._id) {
      await conversationService.applyNewMessage(conversationId, message);
    }

    const participants = conversation
      ? conversation.participants.map(participant => normalizeId(participant.userId)).filter(Boolean)
      : [];

    emitMessageEvent(MESSAGE_EVENTS.MESSAGE_UPDATED, {
      conversationId: serialized.conversationId,
      message: serialized,
      senderId: serialized.senderId,
      recipients: participants
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.MESSAGE_UPDATED,
      data: serialized
    };
  }

  async deleteMessage(conversationId, messageId, userId) {
    const actorId = normalizeId(userId);
    if (!isValidObjectId(conversationId) || !isValidObjectId(messageId) || !actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const participantCheck = await ensureParticipant(conversationId, actorId);
    if (!participantCheck.success) {
      return participantCheck;
    }

    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.MESSAGE_NOT_FOUND
      };
    }

    if (normalizeId(message.senderId) !== actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: ERROR_MESSAGES.FORBIDDEN
      };
    }

    if (Array.isArray(message.attachments) && message.attachments.length > 0) {
      const deletions = message.attachments.map(attachment => ({
        publicId: attachment.publicId,
        resourceType: attachment.resourceType || 'raw'
      }));
      await fileService.deleteMultipleFiles(deletions);
    }

    message.status = 'deleted';
    message.deletedAt = new Date();
    message.content = '';
    message.attachments = [];
    await message.save();
    await message.populate('senderId', 'name email avatar');

    const conversation = await Conversation.findById(conversationId)
      .select('lastMessage.messageId participants.userId')
      .lean();

    if (conversation?.lastMessage?.messageId &&
        normalizeId(conversation.lastMessage.messageId) === normalizeId(messageId)) {
      await conversationService.refreshLastMessage(conversationId);
    }

    const serialized = serializeMessage(message);
    const participants = conversation
      ? conversation.participants.map(participant => normalizeId(participant.userId)).filter(Boolean)
      : [];

    emitMessageEvent(MESSAGE_EVENTS.MESSAGE_DELETED, {
      conversationId: serialized.conversationId,
      message: serialized,
      senderId: serialized.senderId,
      recipients: participants
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.MESSAGE_DELETED,
      data: serialized
    };
  }
}

module.exports = new MessageService();
