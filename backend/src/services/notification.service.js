const Notification = require('../models/Notification.model');
const Group = require('../models/Group.model');
const User = require('../models/User.model');
const {
  LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS
} = require('../config/constants');
const {
  isValidObjectId,
  validatePagination,
  validateSort
} = require('../utils/validationHelper');

class NotificationService {
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const pagination = validatePagination(page, limit);

    if (!isValidObjectId(userId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const query = { recipient: userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const skip = (pagination.sanitizedPage - 1) * pagination.sanitizedLimit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.sanitizedLimit)
        .lean(),
      Notification.countDocuments(query)
    ]);

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: SUCCESS_MESSAGES.NOTIFICATIONS_FETCHED || 'Notifications fetched successfully',
      data: {
        notifications,
        pagination: {
          total,
          page: pagination.sanitizedPage,
          limit: pagination.sanitizedLimit,
          totalPages: Math.ceil(total / pagination.sanitizedLimit)
        }
      }
    };
  }

  async markAsRead(notificationId, userId) {
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
        message: 'Notification not found'
      };
    }

    await notification.markAsRead();

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Notification marked as read',
      data: notification
    };
  }

  async markAllAsRead(userId) {
    if (!isValidObjectId(userId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'All notifications marked as read',
      data: { modifiedCount: result.modifiedCount }
    };
  }

  async acceptGroupInvitation(notificationId, userId) {
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

    const groupId = notification.data.groupId;
    const group = await Group.findById(groupId);

    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'Group not found'
      };
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(member => 
      member.userId.toString() === userId.toString()
    );

    if (isAlreadyMember) {
      // Mark notification as accepted even if already member
      await notification.accept();
      return {
        success: true,
        statusCode: HTTP_STATUS.OK,
        message: 'You are already a member of this group',
        data: { group }
      };
    }

    // Add user to group
    group.members.push({
      userId: userId,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    // Mark notification as accepted
    await notification.accept();

    // Update user's current group if they don't have one
    const user = await User.findById(userId);
    if (!user.currentGroupId) {
      user.currentGroupId = groupId;
      await user.save();
    }

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Group invitation accepted successfully',
      data: { group, user: user.toSafeObject() }
    };
  }

  async declineGroupInvitation(notificationId, userId) {
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
      data: notification
    };
  }

  async getUnreadCount(userId) {
    if (!isValidObjectId(userId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Unread count retrieved',
      data: { unreadCount: count }
    };
  }

  async deleteNotification(notificationId, userId) {
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
        message: 'Notification not found'
      };
    }

    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'Notification deleted successfully',
      data: notification
    };
  }

  async createGroupInvitationNotification(recipientId, senderId, groupId, groupName) {
    if (!isValidObjectId(recipientId) || !isValidObjectId(senderId) || !isValidObjectId(groupId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    // Check if there's already a pending invitation
    const existingNotification = await Notification.findOne({
      recipient: recipientId,
      sender: senderId,
      type: 'group_invitation',
      status: 'pending',
      'data.groupId': groupId
    });

    if (existingNotification) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Invitation already sent'
      };
    }

    const notification = await Notification.createGroupInvitation(
      recipientId,
      senderId,
      groupId,
      groupName
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: 'Group invitation notification created',
      data: notification
    };
  }

  async createGroupNameChangeNotification(groupId, senderId, oldName, newName) {
    if (!isValidObjectId(groupId) || !isValidObjectId(senderId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    // Get all group members except the sender
    const Group = require('../models/Group.model');
    const group = await Group.findById(groupId);
    
    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_NOT_FOUND
      };
    }

    const memberIds = group.members
      .filter(member => member.userId.toString() !== senderId)
      .map(member => member.userId);

    if (memberIds.length === 0) {
      return {
        success: true,
        statusCode: HTTP_STATUS.OK,
        message: 'No other members to notify',
        data: []
      };
    }

    // Create notifications for all members
    const notifications = await Promise.all(
      memberIds.map(recipientId => 
        Notification.create({
          recipient: recipientId,
          sender: senderId,
          type: 'group_name_change',
          title: 'Group Name Changed',
          message: `Group "${oldName}" has been renamed to "${newName}"`,
          data: {
            groupId,
            groupName: newName,
            action: 'name_changed',
            oldName,
            newName
          },
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        })
      )
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: 'Group name change notifications created',
      data: notifications
    };
  }

  async createNewTaskNotification(groupId, senderId, taskTitle) {
    if (!isValidObjectId(groupId) || !isValidObjectId(senderId)) {
      return {
        success: false,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: ERROR_MESSAGES.INVALID_ID
      };
    }

    // Get all group members except the sender
    const Group = require('../models/Group.model');
    const group = await Group.findById(groupId);
    
    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_NOT_FOUND
      };
    }

    const memberIds = group.members
      .filter(member => member.userId.toString() !== senderId)
      .map(member => member.userId);

    if (memberIds.length === 0) {
      return {
        success: true,
        statusCode: HTTP_STATUS.OK,
        message: 'No other members to notify',
        data: []
      };
    }

    // Create notifications for all members
    const notifications = await Promise.all(
      memberIds.map(recipientId => 
        Notification.create({
          recipient: recipientId,
          sender: senderId,
          type: 'new_task',
          title: 'New Task Created',
          message: `A new task "${taskTitle}" has been created in group "${group.name}"`,
          data: {
            groupId,
            groupName: group.name,
            action: 'task_created',
            taskTitle
          },
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        })
      )
    );

    return {
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message: 'New task notifications created',
      data: notifications
    };
  }
}

module.exports = new NotificationService();
