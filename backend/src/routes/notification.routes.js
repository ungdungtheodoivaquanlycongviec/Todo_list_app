const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');
const {
  validateNotificationQuery,
  validateNotificationPreferences,
  validateNotificationArchive,
  validateNotificationMarkAll
} = require('../middlewares/validator');

router.use(authenticate);

// Get all notifications for current user
router.get('/', validateNotificationQuery, getNotifications);

// Get unread count
router.get('/unread-count', validateNotificationQuery, getUnreadCount);

// Update notification preferences
router.patch('/preferences', validateNotificationPreferences, updatePreferences);

// Archive notifications in bulk
router.patch('/archive', validateNotificationArchive, archiveNotifications);

// Mark notification as read
router.patch('/:id/read', markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', validateNotificationMarkAll, markAllAsRead);

// Accept group invitation
router.post('/:id/accept', acceptGroupInvitation);

// Decline group invitation
router.post('/:id/decline', declineGroupInvitation);

// Delete notification
router.delete('/:id', deleteNotification);

// Delete notifications in bulk
router.delete('/', validateNotificationArchive, deleteNotifications);

// Create group name change notification
router.post('/group-name-change', createGroupNameChangeNotification);

// Create new task notification
router.post('/new-task', createNewTaskNotification);

module.exports = router;
