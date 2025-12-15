const consumer = require('./notification.consumer');
const producer = require('./notification.producer');

module.exports = {
  publishNotification: producer.publishNotification,
  notifyGroupInvitation: producer.notifyGroupInvitation,
  notifyGroupNameChange: producer.notifyGroupNameChange,
  notifyTaskCreated: producer.notifyTaskCreated,
  getUserNotifications: consumer.getUserNotifications,
  markAsRead: consumer.markAsRead,
  markAllAsRead: consumer.markAllAsRead,
  archiveNotifications: consumer.archiveNotifications,
  deleteNotification: consumer.deleteNotification,
  deleteNotifications: consumer.deleteNotifications,
  getUnreadCount: consumer.getUnreadCount,
  updateNotificationPreferences: consumer.updateNotificationPreferences,
  acceptGroupInvitation: consumer.acceptGroupInvitation,
  declineGroupInvitation: consumer.declineGroupInvitation,
  createGroupInvitationNotification: producer.createGroupInvitationNotification,
  createGroupNameChangeNotification: producer.createGroupNameChangeNotification,
  createGroupRoleChangeNotification: producer.createGroupRoleChangeNotification,
  createNewTaskNotification: producer.createNewTaskNotification,
  createTaskAssignedNotification: producer.createTaskAssignedNotification,
  createTaskUnassignmentNotification: producer.createTaskUnassignmentNotification,
  createTaskCompletedNotification: producer.createTaskCompletedNotification,
  createCommentAddedNotification: producer.createCommentAddedNotification,
  createChatMessageNotification: producer.createChatMessageNotification,
  createMentionNotification: producer.createMentionNotification
};
