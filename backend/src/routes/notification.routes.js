const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  acceptGroupInvitation,
  declineGroupInvitation,
  getUnreadCount,
  deleteNotification
} = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.patch('/:id/read', markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

// Accept group invitation
router.post('/:id/accept', acceptGroupInvitation);

// Decline group invitation
router.post('/:id/decline', declineGroupInvitation);

// Delete notification
router.delete('/:id', deleteNotification);

// Create group name change notification
router.post('/group-name-change', require('../controllers/notification.controller').createGroupNameChangeNotification);

// Create new task notification
router.post('/new-task', require('../controllers/notification.controller').createNewTaskNotification);

module.exports = router;
