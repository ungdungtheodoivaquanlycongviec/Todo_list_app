const asyncHandler = require('../middlewares/asyncHandler');
const notificationService = require('../services/notification.service');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

// Get all notifications for current user
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const filters = req.notificationFilters || {};

  const result = await notificationService.getUserNotifications(userId, filters);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const result = await notificationService.markAsRead(id, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const categories = req.notificationMarkAll?.categories || [];

  const result = await notificationService.markAllAsRead(userId, categories);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

// Accept group invitation
const acceptGroupInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const result = await notificationService.acceptGroupInvitation(id, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

// Decline group invitation
const declineGroupInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const result = await notificationService.declineGroupInvitation(id, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

// Get unread count
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const categories = req.notificationFilters?.categories || [];

  const result = await notificationService.getUnreadCount(userId, categories);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const result = await notificationService.deleteNotification(id, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const archiveNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const ids = req.notificationArchiveIds || [];

  const result = await notificationService.archiveNotifications(ids, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const deleteNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const ids = req.notificationArchiveIds || [];

  const result = await notificationService.deleteNotifications(ids, userId);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const updatePreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const preferences = req.notificationPreferences || req.body || {};

  const result = await notificationService.updateNotificationPreferences(userId, preferences);

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST, result.errors);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.OK);
});

const createGroupNameChangeNotification = asyncHandler(async (req, res) => {
  const { groupId, oldName, newName } = req.body;
  const senderId = req.user._id;

  const result = await notificationService.createGroupNameChangeNotification(
    groupId,
    senderId,
    oldName,
    newName,
    req.user.name
  );

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.CREATED);
});

const createNewTaskNotification = asyncHandler(async (req, res) => {
  const {
    groupId,
    taskTitle,
    taskId,
    recipientIds = [],
    groupName,
    creatorName,
    priority,
    dueDate
  } = req.body;
  const senderId = req.user._id;

  const result = await notificationService.createNewTaskNotification({
    groupId,
    senderId,
    groupName,
    taskId,
    taskTitle,
    recipientIds,
    creatorName,
    priority,
    dueDate
  });

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.CREATED);
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  acceptGroupInvitation,
  declineGroupInvitation,
  getUnreadCount,
  deleteNotification,
  deleteNotifications,
  archiveNotifications,
  updatePreferences,
  createGroupNameChangeNotification,
  createNewTaskNotification
};
