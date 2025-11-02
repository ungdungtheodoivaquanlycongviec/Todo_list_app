const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const Group = require('../models/Group.model');
const User = require('../models/User.model');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CONVERSATION_TYPES,
  CHAT_LIMITS,
  MESSAGE_STATUSES
} = require('../config/constants');
const {
  isValidObjectId,
  validatePagination,
  sanitizeSort
} = require('../utils/validationHelper');

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

const buildContentPreview = (messageDoc) => {
  if (!messageDoc) {
    return null;
  }

  const baseContent = (messageDoc.content || '').trim();
  if (baseContent.length > 0) {
    return baseContent.slice(0, 140);
  }

  if (Array.isArray(messageDoc.attachments) && messageDoc.attachments.length > 0) {
    return 'Attachment';
  }

  return null;
};

class ConversationService {
  async listConversations(userId, query = {}) {
    const actorId = normalizeId(userId);
    if (!actorId || !isValidObjectId(actorId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const {
      page,
      limit,
      type,
      groupId,
      includeArchived,
      sort
    } = query;

    const includeArchivedFlag = includeArchived === true || includeArchived === 'true';

    const pagination = validatePagination(page, limit);
    const sortResult = sanitizeSort(sort, ['latestActivityAt', 'createdAt']);
    if (!sortResult.isValid) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: sortResult.error
      };
    }

    const filter = {
      'participants.userId': actorId
    };

    if (type) {
      if (!CONVERSATION_TYPES.includes(type)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.VALIDATION_ERROR
        };
      }
      filter.type = type;
    }

    if (groupId) {
      if (!isValidObjectId(groupId)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.INVALID_ID
        };
      }
      filter.groupId = groupId;
    }

    if (!includeArchivedFlag) {
      filter.participants = {
        $elemMatch: {
          userId: actorId,
          isArchived: { $ne: true }
        }
      };
    }

    const sortBy = sortResult.sortBy || 'latestActivityAt';
    const sortOrder = sortResult.order === 'asc' ? 1 : -1;
    const skip = (pagination.sanitizedPage - 1) * pagination.sanitizedLimit;

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('participants.userId', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .populate('groupId', 'name description')
        .populate('lastMessage.senderId', 'name email avatar')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(pagination.sanitizedLimit)
        .lean(),
      Conversation.countDocuments(filter)
    ]);

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.CONVERSATIONS_FETCHED,
      data: {
        conversations,
        pagination: {
          total,
          page: pagination.sanitizedPage,
          limit: pagination.sanitizedLimit,
          totalPages: Math.ceil(total / pagination.sanitizedLimit)
        }
      }
    };
  }

  async createConversation(payload = {}) {
    const {
      type,
      title,
      description,
      groupId,
      participantIds = [],
      createdBy
    } = payload;

    const actorId = normalizeId(createdBy);
    if (!actorId || !isValidObjectId(actorId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    if (!CONVERSATION_TYPES.includes(type)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    const rawParticipantIds = Array.isArray(participantIds) ? participantIds : [];
    const normalizedParticipants = new Set(
      rawParticipantIds
        .map(normalizeId)
        .filter(id => id && isValidObjectId(id))
    );

    normalizedParticipants.add(actorId);

    if (normalizedParticipants.size < 2) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    const participantArray = Array.from(normalizedParticipants);

    if (type === 'direct') {
      if (participantArray.length !== 2) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: 'Direct conversations require exactly two participants'
        };
      }
      if (groupId) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.VALIDATION_ERROR
        };
      }

      const sortedKey = [...participantArray].sort().join(':');
      const existing = await Conversation.findOne({ directKey: sortedKey })
        .populate('participants.userId', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .populate('lastMessage.senderId', 'name email avatar')
        .lean();

      if (existing) {
        return {
          success: true,
          statusCode: HTTP_STATUS.OK,
          message: SUCCESS_MESSAGES.CONVERSATION_FETCHED,
          data: existing,
          meta: {
            existing: true
          }
        };
      }
    }

    let resolvedGroup = null;
    if (type === 'group') {
      if (!groupId || !isValidObjectId(groupId)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.INVALID_ID
        };
      }

      resolvedGroup = await Group.findById(groupId).lean();
      if (!resolvedGroup) {
        return {
          success: false,
          statusCode: HTTP_STATUS.NOT_FOUND,
          message: ERROR_MESSAGES.GROUP_NOT_FOUND
        };
      }

      const groupMemberIds = new Set(
        resolvedGroup.members.map(member => normalizeId(member.userId)).filter(Boolean)
      );

      if (!groupMemberIds.has(actorId)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.FORBIDDEN,
          message: ERROR_MESSAGES.GROUP_ACCESS_DENIED
        };
      }

      const outsideGroup = participantArray.filter(id => !groupMemberIds.has(id));
      if (outsideGroup.length > 0) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.USER_NOT_IN_GROUP,
          errors: outsideGroup
        };
      }
    }

    const users = await User.find({ _id: { $in: participantArray }, isActive: true })
      .select('name email avatar')
      .lean();

    if (users.length !== participantArray.length) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    const now = new Date();
    const conversation = await Conversation.create({
      type,
      title: title ? title.trim() : (type === 'group' ? resolvedGroup?.name || null : null),
      description: description ? description.trim() : null,
      groupId: resolvedGroup?._id || null,
      createdBy: actorId,
      participants: participantArray.map(participantId => ({
        userId: participantId,
        joinedAt: now,
        role: type === 'group' && participantId === actorId ? 'admin' : 'member'
      })),
      latestActivityAt: now
    });

    await conversation.populate([
      { path: 'participants.userId', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'groupId', select: 'name description' }
    ]);

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: SUCCESS_MESSAGES.CONVERSATION_CREATED,
      data: conversation
    };
  }

  async getConversation(conversationId, userId) {
    const actorId = normalizeId(userId);
    if (!isValidObjectId(conversationId) || !actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': actorId
    })
      .populate('participants.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('groupId', 'name description')
      .populate('lastMessage.senderId', 'name email avatar');

    if (!conversation) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.CONVERSATION_NOT_FOUND
      };
    }

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.CONVERSATION_FETCHED,
      data: conversation
    };
  }

  async updateConversation(conversationId, userId, payload = {}) {
    const actorId = normalizeId(userId);
    if (!isValidObjectId(conversationId) || !actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.userId': actorId
    });

    if (!conversation) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.CONVERSATION_NOT_FOUND
      };
    }

    const updateFields = {};

    if (payload.title !== undefined) {
      updateFields.title = payload.title ? payload.title.trim() : null;
    }

    if (payload.description !== undefined) {
      updateFields.description = payload.description ? payload.description.trim() : null;
    }

    if (payload.metadata && typeof payload.metadata === 'object') {
      Object.keys(payload.metadata).forEach(key => {
        updateFields[`metadata.${key}`] = payload.metadata[key];
      });
    }

    if (Object.keys(updateFields).length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: updateFields },
      { new: true }
    )
      .populate('participants.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('groupId', 'name description')
      .populate('lastMessage.senderId', 'name email avatar');

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.CONVERSATION_UPDATED,
      data: updated
    };
  }

  async updateParticipantState(conversationId, userId, state = {}) {
    const actorId = normalizeId(userId);
    if (!isValidObjectId(conversationId) || !actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const update = {};
    if (state.isMuted !== undefined) {
      update['participants.$.isMuted'] = Boolean(state.isMuted);
    }
    if (state.isArchived !== undefined) {
      update['participants.$.isArchived'] = Boolean(state.isArchived);
    }

    if (Object.keys(update).length === 0) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.VALIDATION_ERROR
      };
    }

    if (state.isArchived === false) {
      update['participants.$.lastReadAt'] = new Date();
    }

    const result = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        'participants.userId': actorId
      },
      { $set: update },
      { new: true }
    )
      .populate('participants.userId', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('groupId', 'name description');

    if (!result) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.CONVERSATION_NOT_FOUND
      };
    }

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.CONVERSATION_UPDATED,
      data: result
    };
  }

  async markConversationRead(conversationId, userId, messageId = null) {
    const actorId = normalizeId(userId);
    if (!isValidObjectId(conversationId) || !actorId) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    let timestamp = new Date();
    if (messageId) {
      if (!isValidObjectId(messageId)) {
        return {
          success: false,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message: ERROR_MESSAGES.INVALID_ID
        };
      }
      const message = await Message.findOne({
        _id: messageId,
        conversationId
      }).select('createdAt');

      if (!message) {
        return {
          success: false,
          statusCode: HTTP_STATUS.NOT_FOUND,
          message: ERROR_MESSAGES.MESSAGE_NOT_FOUND
        };
      }

      timestamp = message.createdAt;
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        'participants.userId': actorId
      },
      {
        $set: {
          'participants.$.lastReadAt': timestamp,
          'participants.$.isArchived': false
        }
      },
      { new: true }
    );

    if (!conversation) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.CONVERSATION_NOT_FOUND
      };
    }

    await Message.updateMany(
      {
        conversationId,
        createdAt: { $lte: timestamp },
        'readBy.userId': { $ne: actorId }
      },
      {
        $push: {
          readBy: {
            userId: actorId,
            readAt: timestamp
          }
        }
      }
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.CONVERSATION_UPDATED,
      data: conversation
    };
  }

  async applyNewMessage(conversationId, messageDoc) {
    if (!messageDoc) {
      return;
    }

    const preview = buildContentPreview(messageDoc);
    const senderId = normalizeId(messageDoc.senderId);

    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessage: {
            messageId: messageDoc._id,
            senderId,
            contentPreview: preview,
            attachmentCount: messageDoc.attachments?.length || 0,
            sentAt: messageDoc.createdAt,
            status: messageDoc.status || MESSAGE_STATUSES[0]
          },
          latestActivityAt: messageDoc.createdAt
        }
      }
    );

    await Conversation.updateOne(
      {
        _id: conversationId,
        'participants.userId': senderId
      },
      {
        $set: {
          'participants.$.lastDeliveredAt': messageDoc.createdAt,
          'participants.$.lastReadAt': messageDoc.createdAt,
          'participants.$.isArchived': false
        }
      }
    );
  }

  async refreshLastMessage(conversationId) {
    const latest = await Message.findOne({ conversationId })
      .sort({ createdAt: -1 })
      .lean();

    if (!latest) {
      await Conversation.updateOne(
        { _id: conversationId },
        {
          $set: {
            lastMessage: {
              messageId: null,
              senderId: null,
              contentPreview: null,
              attachmentCount: 0,
              sentAt: null,
              status: MESSAGE_STATUSES[0]
            }
          }
        }
      );
      return;
    }

    await this.applyNewMessage(conversationId, {
      ...latest,
      attachments: latest.attachments || [],
      status: latest.status || MESSAGE_STATUSES[0]
    });
  }

  async isParticipant(conversationId, userId) {
    if (!isValidObjectId(conversationId)) {
      return false;
    }

    const actorId = normalizeId(userId);
    if (!actorId) {
      return false;
    }

    const exists = await Conversation.exists({
      _id: conversationId,
      'participants.userId': actorId
    });

    return Boolean(exists);
  }
}

module.exports = new ConversationService();
