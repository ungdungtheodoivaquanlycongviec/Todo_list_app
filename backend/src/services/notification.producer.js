const Notification = require('../models/Notification.model');
const Group = require('../models/Group.model');
const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} = require('../config/constants');
const { isValidObjectId } = require('../utils/validationHelper');
const {
  publishNotification,
  notifyGroupInvitation,
  notifyGroupNameChange,
  notifyTaskCreated
} = require('./notification.events');

const createGroupInvitationNotification = async (recipientId, senderId, groupId, groupName, inviterName) => {
  if (!isValidObjectId(recipientId) || !isValidObjectId(senderId) || !isValidObjectId(groupId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const existingNotification = await Notification.findOne({
    recipient: recipientId,
    type: 'group_invitation',
    status: 'pending',
    'data.groupId': groupId
  }).lean();

  if (existingNotification) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Invitation already sent'
    };
  }

  const { enqueuePromise } = notifyGroupInvitation({
    recipientId,
    senderId,
    groupId,
    groupName,
    inviterName
  });

  const notification = await enqueuePromise;

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Group invitation notification created',
    data: notification
  };
};

const createGroupNameChangeNotification = async (groupId, senderId, oldName, newName, actorName) => {
  if (!isValidObjectId(groupId) || !isValidObjectId(senderId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
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

  const recipientIds = group.members
    .filter(member => member.userId.toString() !== senderId.toString())
    .map(member => member.userId);

  if (recipientIds.length === 0) {
    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'No other members to notify',
      data: []
    };
  }

  const notificationTasks = recipientIds.map(recipientId =>
    notifyGroupNameChange({
      recipientId,
      senderId,
      groupId,
      oldName,
      newName,
      actorName
    }).enqueuePromise
  );

  const notifications = await Promise.all(notificationTasks);

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Group name change notifications created',
    data: notifications
  };
};

const createNewTaskNotification = async ({
  groupId,
  senderId,
  groupName,
  taskId,
  taskTitle,
  recipientIds = [],
  creatorName,
  priority,
  dueDate
}) => {
  if (!isValidObjectId(groupId) || !isValidObjectId(senderId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  let validRecipients = recipientIds.filter(isValidObjectId);
  let resolvedGroupName = groupName;

  if (validRecipients.length === 0 || !resolvedGroupName) {
    const group = await Group.findById(groupId);

    if (!group) {
      return {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.GROUP_NOT_FOUND
      };
    }

    resolvedGroupName = resolvedGroupName || group.name;

    if (validRecipients.length === 0) {
      validRecipients = group.members
        .filter(member => member.userId.toString() !== senderId.toString())
        .map(member => member.userId)
        .filter(isValidObjectId);
    }
  }

  if (validRecipients.length === 0) {
    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'No recipients to notify',
      data: []
    };
  }

  const notificationTasks = validRecipients.map(recipientId =>
    notifyTaskCreated({
      recipientId,
      senderId,
      taskId,
      taskTitle,
      groupId,
      groupName: resolvedGroupName,
      creatorName,
      priority,
      dueDate
    }).enqueuePromise
  );

  const notifications = await Promise.all(notificationTasks);

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'New task notifications created',
    data: notifications
  };
};

module.exports = {
  publishNotification,
  notifyGroupInvitation,
  notifyGroupNameChange,
  notifyTaskCreated,
  createGroupInvitationNotification,
  createGroupNameChangeNotification,
  createNewTaskNotification
};
