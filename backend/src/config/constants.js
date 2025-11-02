/**
 * Application Constants
 */

const env = require('./environment');

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical', 'urgent'];

const TASK_STATUS = ['todo', 'in_progress', 'completed', 'archived'];

const TASK_TYPES = ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'];

const SCHEDULED_WORK_STATUS = ['scheduled', 'in-progress', 'completed', 'cancelled'];

const TIME_ENTRY_BILLABLE_TYPES = ['billable', 'non-billable'];

const GROUP_ROLES = ['admin', 'member'];

const NOTIFICATION_CHANNELS = ['in_app', 'socket', 'email'];

const NOTIFICATION_CATEGORIES = ['group', 'task', 'chat', 'call', 'system'];

const NOTIFICATION_EVENTS = {
  GROUP_INVITATION_SENT: 'GROUP_INVITATION_SENT',
  GROUP_ROLE_UPDATED: 'GROUP_ROLE_UPDATED',
  GROUP_NAME_CHANGED: 'GROUP_NAME_CHANGED',
  TASK_CREATED_IN_GROUP: 'TASK_CREATED_IN_GROUP',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UNASSIGNED: 'TASK_UNASSIGNED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  COMMENT_MENTION: 'COMMENT_MENTION',
  CHAT_MESSAGE_OFFLINE: 'CHAT_MESSAGE_OFFLINE',
  CALL_INVITATION: 'CALL_INVITATION',
  CALL_MISSED: 'CALL_MISSED',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT'
};

const NOTIFICATION_TYPES = [
  'task_due_soon',
  'task_assigned',
  'task_completed',
  'group_invite',
  'group_invitation',
  'comment_added',
  'time_logged',
  'work_scheduled',
  'group_name_change',
  'new_task',
  ...Object.values(NOTIFICATION_EVENTS)
];

const CONVERSATION_TYPES = ['direct', 'group'];

const MESSAGE_STATUSES = ['sent', 'edited', 'deleted'];

const MESSAGE_EVENTS = {
  MESSAGE_NEW: 'messages:new',
  MESSAGE_UPDATED: 'messages:updated',
  MESSAGE_DELETED: 'messages:deleted',
  CONVERSATION_UPDATED: 'conversations:updated'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// Error Messages
const ERROR_MESSAGES = {
  TASK_NOT_FOUND: 'Task not found',
  GROUP_NOT_FOUND: 'Group not found',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  CONVERSATION_ACCESS_DENIED: 'You are not a participant in this conversation',
  GROUP_ACCESS_DENIED: 'You do not have permission to manage this group',
  GROUP_MEMBER_EXISTS: 'User is already a member of this group',
  GROUP_MEMBER_NOT_FOUND: 'Member not found in this group',
  USER_NOT_IN_GROUP: 'One or more users are not members of this group',
  USER_NOT_FOUND: 'User not found',
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  NOTIFICATION_ARCHIVE_LIMIT: 'Too many notifications in archive request',
  NOTIFICATION_ARCHIVE_INVALID: 'Notification list contains invalid identifiers',
  NOTIFICATION_PREFERENCES_INVALID: 'Notification preferences payload is invalid',
  NOTE_NOT_FOUND: 'Note not found',
  MESSAGE_NOT_FOUND: 'Message not found',
  MESSAGE_EMPTY: 'Message requires text or attachments',
  MESSAGE_TOO_LONG: 'Message content exceeds the allowed length',
  MESSAGE_ATTACHMENT_LIMIT: 'Too many attachments for one message',
  MESSAGE_ATTACHMENT_TOO_LARGE: 'One or more attachments exceed the allowed size',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden access',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_ID: 'Invalid ID format',
  INVALID_TASK_ID: 'Invalid task ID',
  GROUP_MEMBER_LIMIT_REACHED: 'Group has reached the maximum number of members'
};

// Success Messages
const SUCCESS_MESSAGES = {
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  TASK_FETCHED: 'Task fetched successfully',
  TASKS_FETCHED: 'Tasks fetched successfully',
  TASK_ASSIGNED: 'Assignees updated successfully',
  TASK_UNASSIGNED: 'Assignee removed successfully',
  GROUP_CREATED: 'Group created successfully',
  GROUP_UPDATED: 'Group updated successfully',
  GROUP_DELETED: 'Group deleted successfully',
  GROUP_FETCHED: 'Group fetched successfully',
  GROUPS_FETCHED: 'Groups fetched successfully',
  GROUP_MEMBER_ADDED: 'Member added to group successfully',
  GROUP_MEMBER_REMOVED: 'Member removed from group successfully',
  GROUP_LEFT: 'Left group successfully',
  USER_REGISTERED: 'User registered successfully',
  USER_UPDATED: 'User updated successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  TIME_ENTRY_ADDED: 'Time entry added successfully',
  TIME_ENTRY_UPDATED: 'Time entry updated successfully',
  TIME_ENTRY_DELETED: 'Time entry deleted successfully',
  SCHEDULED_WORK_ADDED: 'Scheduled work added successfully',
  SCHEDULED_WORK_UPDATED: 'Scheduled work updated successfully',
  SCHEDULED_WORK_DELETED: 'Scheduled work deleted successfully',
  COMMENT_ADDED: 'Comment added successfully',
  COMMENT_UPDATED: 'Comment updated successfully',
  COMMENT_DELETED: 'Comment deleted successfully',
  NOTES_FETCHED: 'Notes fetched successfully',
  NOTE_CREATED: 'Note created successfully',
  NOTE_UPDATED: 'Note updated successfully',
  NOTE_DELETED: 'Note deleted successfully',
  NOTE_FETCHED: 'Note fetched successfully',
  CONVERSATION_CREATED: 'Conversation created successfully',
  CONVERSATION_UPDATED: 'Conversation updated successfully',
  CONVERSATION_FETCHED: 'Conversation fetched successfully',
  CONVERSATIONS_FETCHED: 'Conversations fetched successfully',
  MESSAGE_SENT: 'Message sent successfully',
  MESSAGE_UPDATED: 'Message updated successfully',
  MESSAGE_DELETED: 'Message deleted successfully',
  MESSAGES_FETCHED: 'Messages fetched successfully',
  NOTIFICATION_MARKED_READ: 'Notification marked as read',
  NOTIFICATIONS_FETCHED: 'Notifications fetched successfully',
  NOTIFICATIONS_MARKED_READ: 'Notifications marked as read',
  NOTIFICATIONS_ARCHIVED: 'Notifications archived successfully',
  NOTIFICATION_DELETED: 'Notification deleted successfully',
  NOTIFICATION_PREFERENCES_UPDATED: 'Notification preferences updated successfully'
};

// Limits
const LIMITS = {
  MAX_COMMENTS_PER_TASK: 200,
  MAX_ATTACHMENTS_PER_TASK: 20,
  MAX_ASSIGNEES_PER_TASK: 50,
  MAX_MEMBERS_PER_GROUP: 100,
  MAX_GROUP_NAME_LENGTH: 120,
  MAX_GROUP_DESCRIPTION_LENGTH: 500,
  MAX_TAGS_PER_TASK: 10,
  MAX_TAG_LENGTH: 30,
  MAX_FILE_SIZE: 10485760, // 10MB in bytes
  NOTIFICATION_RETENTION_DAYS: 30,
  NOTIFICATION_DEFAULT_TTL_DAYS: 30,
  NOTIFICATION_MAX_PAGE_LIMIT: 50,
  NOTIFICATION_MAX_ARCHIVE_BATCH: 50,
  MAX_TIME_ENTRIES_PER_TASK: 1000,
  MAX_SCHEDULED_WORK_PER_TASK: 500,
  MAX_ESTIMATED_TIME_LENGTH: 50
};

const CHAT_LIMITS = {
  MAX_MESSAGE_LENGTH: env.chat?.maxMessageLength || 4000,
  MAX_ATTACHMENTS_PER_MESSAGE: env.chat?.maxAttachmentsPerMessage || 5,
  MAX_ATTACHMENT_SIZE_BYTES: env.chat?.maxAttachmentSizeBytes || 26214400
};

// Time and Date Formats
const TIME_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm',
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_DATETIME: 'MMM DD, YYYY HH:mm'
};

// Task Properties
const TASK_PROPERTIES = {
  PRIORITY_COLORS: {
    low: 'gray',
    medium: 'blue',
    high: 'orange',
    critical: 'red',
    urgent: 'red'
  },
  STATUS_COLORS: {
    todo: 'gray',
    in_progress: 'yellow',
    completed: 'green',
    archived: 'gray'
  },
  TYPE_COLORS: {
    Operational: 'blue',
    Strategic: 'purple',
    Financial: 'green',
    Technical: 'orange',
    Other: 'gray'
  }
};

// Default Values
const DEFAULTS = {
  TASK_ESTIMATED_TIME: '0h',
  TASK_PRIORITY: 'medium',
  TASK_STATUS: 'todo',
  TASK_TYPE: 'Operational',
  TIME_ENTRY_HOURS: 0,
  TIME_ENTRY_MINUTES: 0,
  SCHEDULED_WORK_STATUS: 'scheduled'
};

module.exports = {
  PRIORITY_LEVELS,
  TASK_STATUS,
  TASK_TYPES,
  SCHEDULED_WORK_STATUS,
  TIME_ENTRY_BILLABLE_TYPES,
  GROUP_ROLES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
  CONVERSATION_TYPES,
  MESSAGE_STATUSES,
  MESSAGE_EVENTS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LIMITS,
  CHAT_LIMITS,
  TIME_FORMATS,
  TASK_PROPERTIES,
  DEFAULTS
};