const asyncHandler = require('../middlewares/asyncHandler');
const notificationService = require('../services/notification.service');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

// Get all notifications for current user
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const userId = req.user._id;

  const result = await notificationService.getUserNotifications(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    unreadOnly: unreadOnly === 'true'
  });

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

  const result = await notificationService.markAllAsRead(userId);

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

  const result = await notificationService.getUnreadCount(userId);

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

const createGroupNameChangeNotification = asyncHandler(async (req, res) => {
  const { groupId, oldName, newName } = req.body;
  const senderId = req.user._id;

  const result = await notificationService.createGroupNameChangeNotification(
    groupId, 
    senderId, 
    oldName, 
    newName
  );

  if (!result.success) {
    return sendError(res, result.message, result.statusCode || HTTP_STATUS.BAD_REQUEST);
  }

  sendSuccess(res, result.data, result.message, result.statusCode || HTTP_STATUS.CREATED);
});

const createNewTaskNotification = asyncHandler(async (req, res) => {
  const { groupId, taskTitle } = req.body;
  const senderId = req.user._id;

  const result = await notificationService.createNewTaskNotification(
    groupId, 
    senderId, 
    taskTitle
  );

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
  createGroupNameChangeNotification,
  createNewTaskNotification
};
