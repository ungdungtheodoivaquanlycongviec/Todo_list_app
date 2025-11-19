const {
  NOTIFICATION_EVENTS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  GROUP_ROLE_LABELS
} = require('../config/constants');
const { persistNotificationFromEvent } = require('./notification.consumer');

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 750;

const listeners = new Set();

const ensureArray = value => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const coerceChannels = channels => {
  const allowed = new Set(NOTIFICATION_CHANNELS);
  const normalized = ensureArray(channels)
    .map(channel => (channel ? String(channel).toLowerCase() : null))
    .filter(channel => channel && allowed.has(channel));

  return normalized.length > 0 ? normalized : ['in_app'];
};

const coerceCategories = categories => {
  const allowed = new Set(NOTIFICATION_CATEGORIES);
  const normalized = ensureArray(categories)
    .map(category => (category ? String(category).toLowerCase() : null))
    .filter(category => category && allowed.has(category));

  return normalized.length > 0 ? normalized : ['system'];
};

const EVENT_REGISTRY = {
  [NOTIFICATION_EVENTS.GROUP_INVITATION_SENT]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'group_invitation',
      eventKey: NOTIFICATION_EVENTS.GROUP_INVITATION_SENT,
      title: 'Group Invitation',
      message: `${payload.inviterName || 'Product Owner'} invited you to join ${payload.groupName} as ${GROUP_ROLE_LABELS[payload.role] || payload.role || 'a team member'}`,
      data: {
        groupId: payload.groupId,
        groupName: payload.groupName,
        invitationId: payload.invitationId || null,
        role: payload.role || null
      },
      metadata: {
        inviterId: payload.senderId,
        groupId: payload.groupId,
        role: payload.role || null
      },
      categories: ['group'],
      channels: ['in_app'],
      status: 'pending'
    })
  },
  [NOTIFICATION_EVENTS.GROUP_NAME_CHANGED]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'group_update',
      eventKey: NOTIFICATION_EVENTS.GROUP_NAME_CHANGED,
      title: 'Group Name Updated',
      message: `${payload.actorName || 'A group member'} renamed the group to ${payload.newName}`,
      data: {
        groupId: payload.groupId,
        oldName: payload.oldName,
        newName: payload.newName,
        action: 'name_changed'
      },
      metadata: {
        actorId: payload.senderId,
        groupId: payload.groupId
      },
      categories: ['group'],
      channels: ['in_app']
    })
  },
  [NOTIFICATION_EVENTS.GROUP_ROLE_UPDATED]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'group_role_update',
      eventKey: NOTIFICATION_EVENTS.GROUP_ROLE_UPDATED,
      title: 'Role Updated',
      message: `${payload.actorName || 'Product Owner'} updated your role to ${GROUP_ROLE_LABELS[payload.newRole] || payload.newRole}`,
      data: {
        groupId: payload.groupId,
        newRole: payload.newRole,
        action: 'role_changed'
      },
      metadata: {
        actorId: payload.senderId,
        groupId: payload.groupId
      },
      categories: ['group'],
      channels: ['in_app']
    })
  },
  [NOTIFICATION_EVENTS.TASK_CREATED_IN_GROUP]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'new_task',
      eventKey: NOTIFICATION_EVENTS.TASK_CREATED_IN_GROUP,
      title: 'New Task Created',
      message: `${payload.creatorName || 'A teammate'} created "${payload.taskTitle}"`,
      data: {
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        groupId: payload.groupId,
        groupName: payload.groupName
      },
      metadata: {
        priority: payload.priority || null,
        dueDate: payload.dueDate || null
      },
      categories: ['task'],
      channels: ['in_app']
    })
  },
  [NOTIFICATION_EVENTS.TASK_ASSIGNED]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'task_assigned',
      eventKey: NOTIFICATION_EVENTS.TASK_ASSIGNED,
      title: 'Task Assigned',
      message: `${payload.assignerName || 'Someone'} assigned you to "${payload.taskTitle}"`,
      data: {
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        groupId: payload.groupId,
        groupName: payload.groupName
      },
      metadata: {
        assignerId: payload.senderId,
        priority: payload.priority || null,
        dueDate: payload.dueDate || null
      },
      categories: ['task'],
      channels: ['in_app']
    })
  },
  [NOTIFICATION_EVENTS.TASK_DUE_SOON]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: null,
      type: 'task_due_soon',
      eventKey: NOTIFICATION_EVENTS.TASK_DUE_SOON,
      title: 'Task Due Soon',
      message: `"${payload.taskTitle}" is due soon`,
      data: {
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        groupId: payload.groupId,
        groupName: payload.groupName
      },
      metadata: {
        dueDate: payload.dueDate || null,
        hoursUntilDue: payload.hoursUntilDue || null
      },
      categories: ['task'],
      channels: ['in_app']
    })
  },
  [NOTIFICATION_EVENTS.TASK_COMPLETED]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'task_completed',
      eventKey: NOTIFICATION_EVENTS.TASK_COMPLETED,
      title: 'Task Completed',
      message: `${payload.completerName || 'Someone'} completed "${payload.taskTitle}"`,
      data: {
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        groupId: payload.groupId,
        groupName: payload.groupName
      },
      metadata: {
        completedAt: payload.completedAt || new Date()
      },
      categories: ['task'],
      channels: ['in_app']
    })
  },
  [NOTIFICATION_EVENTS.COMMENT_ADDED]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'comment_added',
      eventKey: NOTIFICATION_EVENTS.COMMENT_ADDED,
      title: 'New Comment',
      message: `${payload.commenterName || 'Someone'} commented on "${payload.taskTitle}"`,
      data: {
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        commentId: payload.commentId,
        groupId: payload.groupId,
        groupName: payload.groupName
      },
      metadata: {
        commentPreview: payload.commentPreview || null
      },
      categories: ['task'],
      channels: ['in_app']
    })
  },
  [NOTIFICATION_EVENTS.TASK_UNASSIGNED]: {
    transform: payload => ({
      recipient: payload.recipientId,
      sender: payload.senderId ?? null,
      type: 'task_unassigned',
      eventKey: NOTIFICATION_EVENTS.TASK_UNASSIGNED,
      title: 'Task Unassigned',
      message: `${payload.unassignerName || 'Someone'} removed you from "${payload.taskTitle}"`,
      data: {
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        groupId: payload.groupId,
        groupName: payload.groupName
      },
      metadata: {
        unassignerId: payload.senderId
      },
      categories: ['task'],
      channels: ['in_app']
    })
  }
};

const validatePayload = payload => {
  if (!payload || !payload.recipient) {
    throw new Error('Notification payload requires a valid recipient');
  }

  if (!payload.title || !payload.message) {
    throw new Error('Notification payload requires title and message');
  }

  return {
    ...payload,
    channels: coerceChannels(payload.channels),
    categories: coerceCategories(payload.categories)
  };
};

const notifyListeners = (eventKey, data) => {
  listeners.forEach(listener => {
    try {
      listener({ eventKey, data });
    } catch (error) {
      console.warn('Notification listener execution failed', error);
    }
  });
};

const processJob = async (job) => {
  const registryEntry = EVENT_REGISTRY[job.eventKey];
  const transformer = registryEntry?.transform;
  const basePayload = transformer ? transformer(job.payload) : job.payload;
  const validated = validatePayload(basePayload);
  const persisted = await persistNotificationFromEvent(validated, job.eventKey);
  notifyListeners(job.eventKey, persisted);
  return persisted;
};

const publishNotification = (eventKey, payload = {}, options = {}) => {
  const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const retryDelay = options.retryDelay || DEFAULT_RETRY_DELAY_MS;

  const run = (attempt = 1) => {
    return processJob({ eventKey, payload })
      .catch(error => {
        if (attempt >= maxAttempts) {
          console.error('Notification dispatcher exhausted retries', {
            eventKey,
            jobId,
            error: error.message
          });
          throw error;
        }
        return new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          .then(() => run(attempt + 1));
      });
  };

  const enqueuePromise = new Promise((resolve, reject) => {
    setImmediate(() => {
      run().then(resolve).catch(reject);
    });
  });

  return {
    enqueuePromise,
    metadata: {
      jobId,
      eventKey,
      maxAttempts,
      retryDelay
    }
  };
};

const registerEvent = (eventKey, transform) => {
  if (!eventKey || typeof transform !== 'function') {
    throw new Error('registerEvent requires an event key and a transformer function');
  }
  EVENT_REGISTRY[eventKey] = { transform };
};

const registerListener = (listener) => {
  if (typeof listener !== 'function') {
    throw new Error('Listener must be a function');
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notifyGroupInvitation = ({ recipientId, senderId, groupId, groupName, inviterName, invitationId }) => {
  return publishNotification(NOTIFICATION_EVENTS.GROUP_INVITATION_SENT, {
    recipientId,
    senderId,
    groupId,
    groupName,
    inviterName,
    invitationId
  });
};

const notifyGroupNameChange = ({ recipientId, senderId, groupId, oldName, newName, actorName }) => {
  return publishNotification(NOTIFICATION_EVENTS.GROUP_NAME_CHANGED, {
    recipientId,
    senderId,
    groupId,
    oldName,
    newName,
    actorName
  });
};

const notifyGroupRoleUpdated = ({ recipientId, senderId, groupId, newRole, actorName }) => {
  return publishNotification(NOTIFICATION_EVENTS.GROUP_ROLE_UPDATED, {
    recipientId,
    senderId,
    groupId,
    newRole,
    actorName
  });
};

const notifyTaskCreated = ({ recipientId, senderId, taskId, taskTitle, groupId, groupName, creatorName, priority, dueDate }) => {
  return publishNotification(NOTIFICATION_EVENTS.TASK_CREATED_IN_GROUP, {
    recipientId,
    senderId,
    taskId,
    taskTitle,
    groupId,
    groupName,
    creatorName,
    priority,
    dueDate
  });
};

const notifyTaskAssigned = ({ recipientId, senderId, taskId, taskTitle, groupId, groupName, assignerName, priority, dueDate }) => {
  return publishNotification(NOTIFICATION_EVENTS.TASK_ASSIGNED, {
    recipientId,
    senderId,
    taskId,
    taskTitle,
    groupId,
    groupName,
    assignerName,
    priority,
    dueDate
  });
};

const notifyTaskUnassigned = ({ recipientId, senderId, taskId, taskTitle, groupId, groupName, unassignerName }) => {
  return publishNotification(NOTIFICATION_EVENTS.TASK_UNASSIGNED, {
    recipientId,
    senderId,
    taskId,
    taskTitle,
    groupId,
    groupName,
    unassignerName
  });
};

const notifyTaskCompleted = ({ recipientId, senderId, taskId, taskTitle, groupId, groupName, completerName, completedAt }) => {
  return publishNotification(NOTIFICATION_EVENTS.TASK_COMPLETED, {
    recipientId,
    senderId,
    taskId,
    taskTitle,
    groupId,
    groupName,
    completerName,
    completedAt
  });
};

const notifyCommentAdded = ({ recipientId, senderId, taskId, taskTitle, groupId, groupName, commenterName, commentId, commentPreview }) => {
  return publishNotification(NOTIFICATION_EVENTS.COMMENT_ADDED, {
    recipientId,
    senderId,
    taskId,
    taskTitle,
    groupId,
    groupName,
    commenterName,
    commentId,
    commentPreview
  });
};

const notifyTaskDueSoon = ({ recipientId, taskId, taskTitle, groupId, groupName, dueDate, hoursUntilDue }) => {
  return publishNotification(NOTIFICATION_EVENTS.TASK_DUE_SOON, {
    recipientId,
    taskId,
    taskTitle,
    groupId,
    groupName,
    dueDate,
    hoursUntilDue
  });
};

module.exports = {
  EVENT_REGISTRY,
  publishNotification,
  registerEvent,
  registerListener,
  notifyGroupInvitation,
  notifyGroupNameChange,
  notifyGroupRoleUpdated,
  notifyTaskCreated,
  notifyTaskAssigned,
  notifyTaskUnassigned,
  notifyTaskCompleted,
  notifyCommentAdded,
  notifyTaskDueSoon
};
