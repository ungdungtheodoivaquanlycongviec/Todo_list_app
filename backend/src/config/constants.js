/**
 * Application Constants
 */

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical', 'urgent'];

const TASK_STATUS = ['todo', 'in_progress', 'completed', 'archived'];

const TASK_TYPES = ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'];

const SCHEDULED_WORK_STATUS = ['scheduled', 'in-progress', 'completed', 'cancelled'];

const TIME_ENTRY_BILLABLE_TYPES = ['billable', 'non-billable'];

const GROUP_ROLE_KEYS = {
  PRODUCT_OWNER: 'product_owner',
  SALE: 'sale',
  QA: 'qa',
  DEV_MANAGER: 'developer_manager',
  PM: 'pm',
  BA: 'ba',
  TECH_LEAD: 'tech',
  BOT_BUILDER: 'bot_builder',
  QC: 'qc',
  DEVOPS: 'devops',
  CLOUD_INFRA: 'cloud_infra',
  SECURITY: 'security',
  CHATBOT: 'chatbot',
  VOICEBOT: 'voicebot',
  DEVELOPER: 'developer'
};

const GROUP_ROLES = Object.values(GROUP_ROLE_KEYS);

const GROUP_ROLE_GROUPS = {
  SUPERVISION: [
    GROUP_ROLE_KEYS.SALE,
    GROUP_ROLE_KEYS.PRODUCT_OWNER,
    GROUP_ROLE_KEYS.QA,
    GROUP_ROLE_KEYS.DEV_MANAGER
  ],
  DELIVERY: [
    GROUP_ROLE_KEYS.PM,
    GROUP_ROLE_KEYS.BA,
    GROUP_ROLE_KEYS.TECH_LEAD,
    GROUP_ROLE_KEYS.BOT_BUILDER,
    GROUP_ROLE_KEYS.QC
  ],
  INFRA: [
    GROUP_ROLE_KEYS.DEVOPS,
    GROUP_ROLE_KEYS.CLOUD_INFRA,
    GROUP_ROLE_KEYS.SECURITY
  ],
  PRODUCT_TEAM: [
    GROUP_ROLE_KEYS.CHATBOT,
    GROUP_ROLE_KEYS.VOICEBOT,
    GROUP_ROLE_KEYS.DEVELOPER
  ]
};

const GROUP_ROLE_LABELS = {
  [GROUP_ROLE_KEYS.PRODUCT_OWNER]: 'Product Owner',
  [GROUP_ROLE_KEYS.SALE]: 'Sale',
  [GROUP_ROLE_KEYS.QA]: 'Quality Assurance',
  [GROUP_ROLE_KEYS.DEV_MANAGER]: 'Developer Manager',
  [GROUP_ROLE_KEYS.PM]: 'Project Manager',
  [GROUP_ROLE_KEYS.BA]: 'Business Analyst',
  [GROUP_ROLE_KEYS.TECH_LEAD]: 'Tech Lead',
  [GROUP_ROLE_KEYS.BOT_BUILDER]: 'Bot Builder',
  [GROUP_ROLE_KEYS.QC]: 'Quality Control',
  [GROUP_ROLE_KEYS.DEVOPS]: 'DevOps',
  [GROUP_ROLE_KEYS.CLOUD_INFRA]: 'Cloud Infra',
  [GROUP_ROLE_KEYS.SECURITY]: 'Security',
  [GROUP_ROLE_KEYS.CHATBOT]: 'Chatbot',
  [GROUP_ROLE_KEYS.VOICEBOT]: 'Voicebot',
  [GROUP_ROLE_KEYS.DEVELOPER]: 'Developer'
};

const NOTIFICATION_CHANNELS = ['in_app', 'socket', 'email'];

const NOTIFICATION_CATEGORIES = ['group', 'task', 'chat', 'call', 'system'];

const NOTIFICATION_EVENTS = {
  GROUP_INVITATION_SENT: 'GROUP_INVITATION_SENT',
  GROUP_ROLE_UPDATED: 'GROUP_ROLE_UPDATED',
  GROUP_NAME_CHANGED: 'GROUP_NAME_CHANGED',
  TASK_CREATED_IN_GROUP: 'TASK_CREATED_IN_GROUP',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UNASSIGNED: 'TASK_UNASSIGNED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  COMMENT_ADDED: 'COMMENT_ADDED',
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
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden access',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_ID: 'Invalid ID format',
  INVALID_TASK_ID: 'Invalid task ID',
  GROUP_MEMBER_LIMIT_REACHED: 'Group has reached the maximum number of members',
  FOLDER_NOT_FOUND: 'Folder not found in this group',
  FOLDER_ACCESS_DENIED: 'You do not have permission to manage folders in this group',
  FOLDER_NAME_EXISTS: 'Folder name already exists in this group',
  FOLDER_DELETE_DEFAULT: 'Default folder cannot be deleted',
  FOLDER_NOT_EMPTY: 'Folder still contains tasks or notes',
  FOLDER_LIMIT_REACHED: 'Folder limit for this group has been reached'
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
  NOTIFICATION_MARKED_READ: 'Notification marked as read',
  NOTIFICATIONS_FETCHED: 'Notifications fetched successfully',
  NOTIFICATIONS_MARKED_READ: 'Notifications marked as read',
  NOTIFICATIONS_ARCHIVED: 'Notifications archived successfully',
  NOTIFICATION_DELETED: 'Notification deleted successfully',
  NOTIFICATION_PREFERENCES_UPDATED: 'Notification preferences updated successfully',
  FOLDERS_FETCHED: 'Folders fetched successfully',
  FOLDER_CREATED: 'Folder created successfully',
  FOLDER_UPDATED: 'Folder updated successfully',
  FOLDER_DELETED: 'Folder deleted successfully'
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
  MAX_ESTIMATED_TIME_LENGTH: 50,
  MAX_FOLDERS_PER_GROUP: 100
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
  GROUP_ROLE_KEYS,
  GROUP_ROLES,
  GROUP_ROLE_GROUPS,
  GROUP_ROLE_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LIMITS,
  TIME_FORMATS,
  TASK_PROPERTIES,
  DEFAULTS
};