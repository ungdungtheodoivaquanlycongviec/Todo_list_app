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
  notifyGroupRoleUpdated,
  notifyTaskCreated,
  notifyTaskAssigned,
  notifyTaskUnassigned,
  notifyTaskCompleted,
  notifyCommentAdded
} = require('./notification.events');

const createGroupInvitationNotification = async (recipientId, senderId, groupId, groupName, inviterName, role) => {
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
    inviterName,
    role
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

  const senderIdStr = senderId.toString();
  
  // Normalize all member IDs to strings for comparison
  const recipientIds = group.members
    .map(member => {
      if (!member.userId) return null;
      // Handle both populated (with _id) and non-populated (ObjectId) userId
      if (member.userId._id) {
        return member.userId._id.toString();
      }
      if (typeof member.userId === 'object' && member.userId.toString) {
        return member.userId.toString();
      }
      if (typeof member.userId === 'string') {
        return member.userId;
      }
      return null;
    })
    .filter(id => id && id !== senderIdStr && isValidObjectId(id));

  console.log('Group name change notification:', {
    groupId: groupId.toString(),
    senderId: senderIdStr,
    totalMembers: group.members.length,
    recipientIds,
    oldName,
    newName
  });

  if (recipientIds.length === 0) {
    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'No other members to notify',
      data: []
    };
  }

  const notificationTasks = recipientIds.map(recipientId => {
    const recipientIdStr = recipientId?.toString() || recipientId;
    return notifyGroupNameChange({
      recipientId: recipientIdStr,
      senderId: senderIdStr,
      groupId: groupId.toString(),
      oldName,
      newName,
      actorName
    }).enqueuePromise;
  });

  const notifications = await Promise.all(notificationTasks);

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Group name change notifications created',
    data: notifications
  };
};

const createGroupRoleChangeNotification = async ({
  groupId,
  senderId,
  recipientId,
  newRole
}) => {
  if (!isValidObjectId(groupId) || !isValidObjectId(senderId) || !isValidObjectId(recipientId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const group = await Group.findById(groupId).populate('members.userId', 'name');
  if (!group) {
    return {
      success: false,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: ERROR_MESSAGES.GROUP_NOT_FOUND
    };
  }

  const isRecipientMember = group.members.some(member => member.userId && member.userId._id.toString() === recipientId.toString());
  if (!isRecipientMember) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.GROUP_MEMBER_NOT_FOUND
    };
  }

  const senderRecord = group.members.find(member => member.userId && member.userId._id.toString() === senderId.toString());
  const actorName = senderRecord?.userId?.name || null;

  const { enqueuePromise } = notifyGroupRoleUpdated({
    recipientId,
    senderId,
    groupId,
    newRole,
    actorName
  });

  const notification = await enqueuePromise;

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Group role change notification created',
    data: notification
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

const createTaskAssignedNotification = async ({
  taskId,
  senderId,
  assigneeIds = [],
  taskTitle,
  groupId,
  groupName,
  assignerName,
  priority,
  dueDate
}) => {
  if (!isValidObjectId(taskId) || !isValidObjectId(senderId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const validRecipients = assigneeIds.filter(id => isValidObjectId(id) && id !== senderId.toString());

  if (validRecipients.length === 0) {
    return {
      success: true,
      statusCode: HTTP_STATUS.OK,
      message: 'No recipients to notify',
      data: []
    };
  }

  const notificationTasks = validRecipients.map(recipientId =>
    notifyTaskAssigned({
      recipientId,
      senderId,
      taskId,
      taskTitle,
      groupId,
      groupName,
      assignerName,
      priority,
      dueDate
    }).enqueuePromise
  );

  const notifications = await Promise.all(notificationTasks);

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Task assignment notifications created',
    data: notifications
  };
};

const createTaskCompletedNotification = async ({
  taskId,
  completerId,
  taskTitle,
  groupId,
  groupName,
  completerName,
  recipientIds = [],
  completedAt
}) => {
  if (!isValidObjectId(taskId) || !isValidObjectId(completerId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  let validRecipients = recipientIds.filter(id => isValidObjectId(id) && id !== completerId.toString());

  if (validRecipients.length === 0 && groupId) {
    const group = await Group.findById(groupId);
    if (group) {
      validRecipients = group.members
        .filter(member => member.userId.toString() !== completerId.toString())
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
    notifyTaskCompleted({
      recipientId,
      senderId: completerId,
      taskId,
      taskTitle,
      groupId,
      groupName,
      completerName,
      completedAt: completedAt || new Date()
    }).enqueuePromise
  );

  const notifications = await Promise.all(notificationTasks);

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Task completion notifications created',
    data: notifications
  };
};

const createCommentAddedNotification = async ({
  taskId,
  commenterId,
  commentId,
  taskTitle,
  groupId,
  groupName,
  commenterName,
  commentPreview,
  recipientIds = []
}) => {
  if (!isValidObjectId(taskId) || !isValidObjectId(commenterId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  let validRecipients = recipientIds.filter(id => isValidObjectId(id) && id !== commenterId.toString());

  if (validRecipients.length === 0 && groupId) {
    const group = await Group.findById(groupId);
    if (group) {
      validRecipients = group.members
        .filter(member => member.userId.toString() !== commenterId.toString())
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
    notifyCommentAdded({
      recipientId,
      senderId: commenterId,
      taskId,
      taskTitle,
      groupId,
      groupName,
      commenterName,
      commentId,
      commentPreview: commentPreview ? commentPreview.substring(0, 100) : null
    }).enqueuePromise
  );

  const notifications = await Promise.all(notificationTasks);

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Comment notifications created',
    data: notifications
  };
};

const createTaskUnassignmentNotification = async ({
  taskId,
  taskTitle,
  groupId,
  groupName,
  unassignerId,
  unassignerName,
  recipientId
}) => {
  if (!isValidObjectId(taskId) || !isValidObjectId(unassignerId) || !isValidObjectId(groupId) || !isValidObjectId(recipientId)) {
    return {
      success: false,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_ID
    };
  }

  const { enqueuePromise } = notifyTaskUnassigned({
    recipientId,
    senderId: unassignerId,
    taskId,
    taskTitle,
    groupId,
    groupName,
    unassignerName
  });

  const notification = await enqueuePromise;

  return {
    success: true,
    statusCode: HTTP_STATUS.CREATED,
    message: 'Task unassignment notification created',
    data: notification
  };
};

module.exports = {
  publishNotification,
  notifyGroupInvitation,
  notifyGroupNameChange,
  notifyGroupRoleUpdated,
  notifyTaskCreated,
  createGroupInvitationNotification,
  createGroupNameChangeNotification,
  createGroupRoleChangeNotification,
  createNewTaskNotification,
  createTaskAssignedNotification,
  createTaskUnassignmentNotification,
  createTaskCompletedNotification,
  createCommentAddedNotification
};
