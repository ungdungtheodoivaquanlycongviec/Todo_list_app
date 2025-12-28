const mongoose = require('mongoose');
const Notification = require('../models/Notification.model');
const Group = require('../models/Group.model');
const User = require('../models/User.model');
const env = require('../config/environment');
const {
  LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  GROUP_ROLES,
  GROUP_ROLE_KEYS
} = require('../config/constants');
const {
  isValidObjectId,
  validatePagination,
  sanitizeEnumArray,
  sanitizeSort
} = require('../utils/validationHelper');
const { emitNotification } = require('./realtime.gateway');

const clampLimit = (value, fallback) => {
  const maxLimit = LIMITS.NOTIFICATION_MAX_PAGE_LIMIT || 50;
  if (!value || Number.isNaN(Number(value))) {
    return Math.min(fallback, maxLimit);
  }
  return Math.min(Number(value), maxLimit);
};

const buildCategorySummary = async (userId) => {
  const pipeline = [
    {
      $match: {
        recipient: new mongoose.Types.ObjectId(userId),
        archived: false,
        isRead: false
      }
    },
    { $unwind: '$categories' },
    {
      $group: {
        _id: '$categories',
        count: { $sum: 1 }
      }
    }
  ];

  const results = await Notification.aggregate(pipeline);
  return results.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

// Types that should be consolidated (grouped) when multiple notifications come from the same source
const CONSOLIDATABLE_TYPES = ['chat_message', 'comment_added'];

/**
 * Persist a notification, consolidating with existing unread notification from the same source if applicable.
 * For chat messages and comments, this updates the existing notification instead of creating duplicates.
 * Uses indexed fields for O(log n) lookup performance even with millions of notifications.
 */
const persistNotificationFromEvent = async (eventPayload, eventKey) => {
  const type = eventPayload.type || eventPayload.eventKey || 'system_event';
  const recipientId = eventPayload.recipient;
  const data = eventPayload.data || {};

  // Check if this notification type should be consolidated
  if (CONSOLIDATABLE_TYPES.includes(type) && recipientId) {
    // Build query to find existing unread notification from same source
    // Uses the composite index: recipient + type + data.groupId/conversationId/taskId + isRead
    const consolidationQuery = {
      recipient: recipientId,
      type: type,
      isRead: false,
      archived: false
    };

    // Add source-specific filters based on notification type
    if (data.groupId) {
      consolidationQuery['data.groupId'] = data.groupId;
    }
    if (data.conversationId) {
      consolidationQuery['data.conversationId'] = data.conversationId;
    }
    if (data.taskId && type === 'comment_added') {
      consolidationQuery['data.taskId'] = data.taskId;
    }

    // Try to find and update existing notification
    const existingNotification = await Notification.findOneAndUpdate(
      consolidationQuery,
      {
        $set: {
          message: eventPayload.message,
          sender: eventPayload.sender ?? null,
          'data.messageId': data.messageId,
          'data.preview': data.preview,
          deliveredAt: new Date()
        },
        $inc: { messageCount: 1 }
      },
      { new: true, sort: { createdAt: -1 } }
    );

    if (existingNotification) {
      const persisted = existingNotification.toObject();

      if (env.enableRealtimeNotifications) {
        const dispatchedKey = eventKey || persisted.eventKey || eventPayload?.eventKey || null;
        emitNotification(dispatchedKey, persisted);
      }

      return persisted;
    }
  }

  // No existing notification to consolidate with - create new one
  const document = Notification.buildFromEvent(eventPayload);
  const saved = await document.save();
  const persisted = saved.toObject();

  if (env.enableRealtimeNotifications) {
    const dispatchedKey = eventKey || persisted.eventKey || eventPayload?.eventKey || null;
    emitNotification(dispatchedKey, persisted);
  }

  return persisted;
};

const getUserNotifications = async (userId, options = {}) => {
  if (!isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    includeArchived = false,
    categories,
    channels,
    sort,
    order
  } = options;

  const pagination = validatePagination(page, limit);
  const sanitizedLimit = clampLimit(pagination.sanitizedLimit, limit);
  const sanitizedPage = pagination.sanitizedPage;

  const categoryCheck = sanitizeEnumArray(categories, NOTIFICATION_CATEGORIES);
  if (!categoryCheck.isValid) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: categoryCheck.error || ERROR_MESSAGES.VALIDATION_ERROR
    };
  }

  const channelCheck = sanitizeEnumArray(channels, NOTIFICATION_CHANNELS);
  if (!channelCheck.isValid) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: channelCheck.error || ERROR_MESSAGES.VALIDATION_ERROR
    };
  }

  const sortResult = sanitizeSort(sort ? `${sort}:${order || ''}` : undefined, ['createdAt', 'deliveredAt', 'readAt']);
  if (!sortResult.isValid) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: sortResult.error || ERROR_MESSAGES.VALIDATION_ERROR
    };
  }

  const query = { recipient: userId };

  if (!includeArchived) {
    query.archived = false;
  }

  if (unreadOnly) {
    query.isRead = false;
  }

  if (categoryCheck.values.length > 0) {
    query.categories = { $in: categoryCheck.values };
  }

  if (channelCheck.values.length > 0) {
    query.channels = { $in: channelCheck.values };
  }

  const sortOptions = {
    [sortResult.sortBy]: sortResult.order === 'asc' ? 1 : -1
  };

  if (sortResult.sortBy !== 'createdAt') {
    sortOptions.createdAt = -1;
  }

  const skip = (sanitizedPage - 1) * sanitizedLimit;

  const [notifications, total, summary] = await Promise.all([
    Notification.find(query)
      .populate('sender', 'name email avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(sanitizedLimit)
      .lean(),
    Notification.countDocuments(query),
    buildCategorySummary(userId)
  ]);

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: SUCCESS_MESSAGES.NOTIFICATIONS_FETCHED,
    data: {
      notifications,
      pagination: {
        total,
        page: sanitizedPage,
        limit: sanitizedLimit,
        totalPages: Math.ceil(total / sanitizedLimit)
      },
      filters: {
        categories: categoryCheck.values,
        channels: channelCheck.values,
        includeArchived,
        unreadOnly,
        sortBy: sortResult.sortBy,
        order: sortResult.order
      },
      categoriesSummary: summary
    }
  };
};

const markAsRead = async (notificationId, userId) => {
  if (!isValidObjectId(notificationId) || !isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    return {
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: ERROR_MESSAGES.NOTIFICATION_NOT_FOUND
    };
  }

  await notification.markAsRead();

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: SUCCESS_MESSAGES.NOTIFICATION_MARKED_READ,
    data: notification.toObject()
  };
};

const markAllAsRead = async (userId, categoriesFilter = []) => {
  if (!isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const updateFilter = {
    recipient: userId,
    isRead: false
  };

  if (Array.isArray(categoriesFilter) && categoriesFilter.length > 0) {
    updateFilter.categories = { $in: categoriesFilter };
  }

  const result = await Notification.updateMany(updateFilter, {
    $set: {
      isRead: true,
      readAt: new Date()
    }
  });

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: SUCCESS_MESSAGES.NOTIFICATIONS_MARKED_READ,
    data: { modifiedCount: result.modifiedCount }
  };
};

const archiveNotifications = async (ids, userId) => {
  if (!isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const uniqueIds = Array.from(new Set(ids || [])).filter(isValidObjectId);

  if (uniqueIds.length === 0) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.NOTIFICATION_ARCHIVE_INVALID
    };
  }

  if (uniqueIds.length > LIMITS.NOTIFICATION_MAX_ARCHIVE_BATCH) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.NOTIFICATION_ARCHIVE_LIMIT
    };
  }

  const result = await Notification.archiveMany(uniqueIds, userId);

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: SUCCESS_MESSAGES.NOTIFICATIONS_ARCHIVED,
    data: { modifiedCount: result.modifiedCount }
  };
};

const deleteNotification = async (notificationId, userId) => {
  if (!isValidObjectId(notificationId) || !isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    return {
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: ERROR_MESSAGES.NOTIFICATION_NOT_FOUND
    };
  }

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: SUCCESS_MESSAGES.NOTIFICATION_DELETED,
    data: notification.toObject()
  };
};

const deleteNotifications = async (ids, userId) => {
  if (!isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const uniqueIds = Array.from(new Set(ids || [])).filter(isValidObjectId);

  if (uniqueIds.length === 0) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.NOTIFICATION_ARCHIVE_INVALID
    };
  }

  const result = await Notification.deleteMany({
    _id: { $in: uniqueIds },
    recipient: userId,
    archived: true
  });

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: SUCCESS_MESSAGES.NOTIFICATION_DELETED,
    data: { deletedCount: result.deletedCount }
  };
};

const getUnreadCount = async (userId, categoriesFilter = []) => {
  if (!isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const query = {
    recipient: userId,
    isRead: false,
    archived: false
  };

  if (Array.isArray(categoriesFilter) && categoriesFilter.length > 0) {
    query.categories = { $in: categoriesFilter };
  }

  const count = await Notification.countDocuments(query);

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: 'Unread count retrieved',
    data: { unreadCount: count }
  };
};

const validateQuietHourFormat = (value) => {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
};

const normalizePreferencesPayload = (preferences = {}) => {
  const errors = [];
  const payload = {};

  if (preferences.beforeDue !== undefined) {
    if (typeof preferences.beforeDue !== 'number' || preferences.beforeDue < 0) {
      errors.push('beforeDue must be a positive number');
    } else {
      payload.beforeDue = preferences.beforeDue;
    }
  }

  if (preferences.email !== undefined) {
    payload.email = Boolean(preferences.email);
  }

  if (preferences.push !== undefined) {
    payload.push = Boolean(preferences.push);
  }

  if (preferences.quietHours) {
    const { start = null, end = null, timezone = 'UTC' } = preferences.quietHours;
    if (!validateQuietHourFormat(start) || !validateQuietHourFormat(end)) {
      errors.push('quietHours must use HH:MM format');
    } else {
      payload.quietHours = {
        start,
        end,
        timezone: typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'UTC'
      };
    }
  }

  if (preferences.channels) {
    const channelInput = Array.isArray(preferences.channels)
      ? preferences.channels
      : [];

    const enabledChannels = channelInput
      .map(item => (typeof item === 'string' ? item.toLowerCase() : item?.key))
      .filter(Boolean);

    const channelValidation = sanitizeEnumArray(enabledChannels, NOTIFICATION_CHANNELS);
    if (!channelValidation.isValid) {
      errors.push(channelValidation.error || 'Invalid notification channel');
    } else {
      payload.channels = NOTIFICATION_CHANNELS.map(channel => ({
        key: channel,
        enabled: channelValidation.values.includes(channel)
      }));
    }
  }

  if (preferences.categories) {
    const categoriesPayload = preferences.categories;
    let normalized = {};

    if (Array.isArray(categoriesPayload)) {
      const validation = sanitizeEnumArray(categoriesPayload, NOTIFICATION_CATEGORIES);
      if (!validation.isValid) {
        errors.push(validation.error || 'Invalid notification category');
      } else {
        normalized = NOTIFICATION_CATEGORIES.reduce((acc, category) => {
          acc[category] = validation.values.includes(category);
          return acc;
        }, {});
      }
    } else if (typeof categoriesPayload === 'object' && categoriesPayload !== null) {
      const invalidKeys = Object.keys(categoriesPayload).filter(
        key => !NOTIFICATION_CATEGORIES.includes(key)
      );
      if (invalidKeys.length > 0) {
        errors.push(`Invalid category keys: ${invalidKeys.join(', ')}`);
      } else {
        normalized = NOTIFICATION_CATEGORIES.reduce((acc, category) => {
          const value = categoriesPayload[category];
          acc[category] = value === undefined ? true : Boolean(value);
          return acc;
        }, {});
      }
    }

    if (Object.keys(normalized).length > 0) {
      payload.categories = normalized;
    }
  }

  return { payload, errors };
};

const updateNotificationPreferences = async (userId, preferences) => {
  if (!isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const { payload, errors } = normalizePreferencesPayload(preferences);

  if (errors.length > 0) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.NOTIFICATION_PREFERENCES_INVALID,
      errors
    };
  }

  const updateQuery = Object.entries(payload).reduce((acc, [key, value]) => {
    acc[`notificationSettings.${key}`] = value;
    return acc;
  }, {});

  if (Object.keys(updateQuery).length === 0) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.NOTIFICATION_PREFERENCES_INVALID
    };
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      ...updateQuery,
      updatedAt: new Date()
    },
    { new: true }
  );

  if (!user) {
    return {
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: ERROR_MESSAGES.USER_NOT_FOUND
    };
  }

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: SUCCESS_MESSAGES.NOTIFICATION_PREFERENCES_UPDATED,
    data: user.notificationSettings
  };
};

const acceptGroupInvitation = async (notificationId, userId) => {
  if (!isValidObjectId(notificationId) || !isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
    type: 'group_invitation',
    status: 'pending'
  }).populate('sender', 'name email');

  if (!notification) {
    return {
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Group invitation not found or already processed'
    };
  }

  const groupId = notification.data?.groupId;

  // Fetch user's account-level groupRole assigned by admin
  const acceptingUser = await User.findById(userId).select('groupRole').lean();
  // Priority: user's account-level groupRole > notification role > fallback to BA
  let invitationRole = acceptingUser?.groupRole || notification.data?.role || notification.metadata?.get?.('role') || GROUP_ROLE_KEYS.BA;
  if (!GROUP_ROLES.includes(invitationRole)) {
    invitationRole = GROUP_ROLE_KEYS.BA;
  }

  if (invitationRole === GROUP_ROLE_KEYS.PRODUCT_OWNER) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Product Owner role cannot be assigned through invitations'
    };
  }
  const group = await Group.findById(groupId);

  if (!group) {
    return {
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: ERROR_MESSAGES.GROUP_NOT_FOUND
    };
  }

  const isAlreadyMember = group.members.some(
    member => member.userId.toString() === userId.toString()
  );

  if (!isAlreadyMember) {
    group.members.push({
      userId,
      role: invitationRole,
      joinedAt: new Date()
    });
    await group.save();
  }

  await notification.accept();

  const user = await User.findById(userId);
  if (user && !user.currentGroupId) {
    user.currentGroupId = groupId;
    await user.save();
  }

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: 'Group invitation accepted successfully',
    data: {
      group,
      user: user ? user.toSafeObject() : null,
      notification: notification.toObject()
    }
  };
};

const declineGroupInvitation = async (notificationId, userId) => {
  if (!isValidObjectId(notificationId) || !isValidObjectId(userId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
    type: 'group_invitation',
    status: 'pending'
  });

  if (!notification) {
    return {
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Group invitation not found or already processed'
    };
  }

  await notification.decline();

  return {
    success: true,
    statusCode: HTTP_STATUS.OK,
    message: 'Group invitation declined',
    data: notification.toObject()
  };
};

module.exports = {
  persistNotificationFromEvent,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotifications,
  deleteNotification,
  deleteNotifications,
  getUnreadCount,
  updateNotificationPreferences,
  acceptGroupInvitation,
  declineGroupInvitation
};
