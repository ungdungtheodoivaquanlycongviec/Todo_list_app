/**
 * Application Constants
 */

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];

const TASK_STATUS = ['todo', 'in_progress', 'completed', 'archived'];

const GROUP_ROLES = ['admin', 'member'];

const NOTIFICATION_TYPES = [
  'task_due_soon',
  'task_assigned',
  'task_completed',
  'group_invite',
  'comment_added'
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
  USER_NOT_FOUND: 'User not found',
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden access',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_ID: 'Invalid ID format',
  INVALID_TASK_ID: 'Invalid task ID'
};

// Success Messages
const SUCCESS_MESSAGES = {
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  TASK_ASSIGNED: 'Assignees updated successfully',
  TASK_UNASSIGNED: 'Assignee removed successfully',
  GROUP_CREATED: 'Group created successfully',
  GROUP_UPDATED: 'Group updated successfully',
  GROUP_DELETED: 'Group deleted successfully',
  USER_REGISTERED: 'User registered successfully',
  USER_UPDATED: 'User updated successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful'
};

// Limits
const LIMITS = {
  MAX_COMMENTS_PER_TASK: 200,
  MAX_ATTACHMENTS_PER_TASK: 20,
  MAX_ASSIGNEES_PER_TASK: 50,
  MAX_MEMBERS_PER_GROUP: 100,
  MAX_TAGS_PER_TASK: 10,
  MAX_TAG_LENGTH: 30,
  MAX_FILE_SIZE: 10485760, // 10MB in bytes
  NOTIFICATION_RETENTION_DAYS: 30
};

module.exports = {
  PRIORITY_LEVELS,
  TASK_STATUS,
  GROUP_ROLES,
  NOTIFICATION_TYPES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LIMITS
};
