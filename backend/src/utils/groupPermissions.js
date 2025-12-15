const { GROUP_ROLE_KEYS, GROUP_ROLE_GROUPS } = require('../config/constants');

const READ_ONLY_ROLES = [
  GROUP_ROLE_KEYS.SALE,
  GROUP_ROLE_KEYS.QA,
  GROUP_ROLE_KEYS.DEV_MANAGER
];

const FOLDER_SCOPED_ROLES = [
  ...GROUP_ROLE_GROUPS.DELIVERY.filter(role => role !== GROUP_ROLE_KEYS.PM),
  ...GROUP_ROLE_GROUPS.INFRA,
  ...GROUP_ROLE_GROUPS.PRODUCT_TEAM
];

const getRoleGroup = role => {
  if (!role) {
    return null;
  }

  return Object.entries(GROUP_ROLE_GROUPS).find(([, roles]) => roles.includes(role))?.[0] || null;
};

const isRoleInGroup = (role, groupKey) => {
  if (!role || !groupKey) {
    return false;
  }
  const groupRoles = GROUP_ROLE_GROUPS[groupKey];
  if (!Array.isArray(groupRoles)) {
    return false;
  }
  return groupRoles.includes(role);
};

const isReadOnlyRole = role => READ_ONLY_ROLES.includes(role);

const requiresFolderAssignment = role => FOLDER_SCOPED_ROLES.includes(role);

const canViewAllFolders = role =>
  Boolean(role) &&
  (requiresFolderAssignment(role) === false ||
    isReadOnlyRole(role) ||
    role === GROUP_ROLE_KEYS.PRODUCT_OWNER ||
    role === GROUP_ROLE_KEYS.PM);

const canManageFolders = role =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM;

const canAssignFolderMembers = role =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM;

const canManageRoles = role => role === GROUP_ROLE_KEYS.PRODUCT_OWNER;

const canManageGroupSettings = role =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM;

const canWriteInFolder = (role, { isAssigned = false } = {}) => {
  if (!role) {
    return false;
  }
  if (role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM) {
    return true;
  }
  if (isReadOnlyRole(role)) {
    return false;
  }
  if (requiresFolderAssignment(role)) {
    return isAssigned;
  }
  return false;
};

const canCreateTasks = role => !isReadOnlyRole(role) && Boolean(role);

const canViewFolder = (role, { isAssigned = false } = {}) => {
  if (!role) {
    return false;
  }
  if (canViewAllFolders(role)) {
    return true;
  }
  if (requiresFolderAssignment(role)) {
    return isAssigned;
  }
  return false;
};

/**
 * Check if role is an admin role (Product Owner or PM)
 * @param {String} role - User's role in the group
 * @returns {Boolean}
 */
const isAdminRole = role =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM;

/**
 * Check if user can edit a task (update, timer, repeat, attachments)
 * Allowed: Admin roles, task creator, or assignees
 * @param {Object} params
 * @param {String} params.role - User's role in the group
 * @param {Boolean} params.isCreator - Is user the task creator
 * @param {Boolean} params.isAssignee - Is user assigned to the task
 * @returns {Boolean}
 */
const canEditTask = ({ role, isCreator = false, isAssignee = false }) => {
  if (isAdminRole(role)) {
    return true;
  }
  if (isCreator) {
    return true;
  }
  if (isAssignee) {
    return true;
  }
  return false;
};

/**
 * Check if user can delete a task
 * Allowed: Admin roles or task creator only (NOT assignees)
 * @param {Object} params
 * @param {String} params.role - User's role in the group
 * @param {Boolean} params.isCreator - Is user the task creator
 * @returns {Boolean}
 */
const canDeleteTask = ({ role, isCreator = false }) => {
  if (isAdminRole(role)) {
    return true;
  }
  if (isCreator) {
    return true;
  }
  return false;
};

module.exports = {
  READ_ONLY_ROLES,
  FOLDER_SCOPED_ROLES,
  getRoleGroup,
  isRoleInGroup,
  isReadOnlyRole,
  requiresFolderAssignment,
  canViewAllFolders,
  canManageFolders,
  canAssignFolderMembers,
  canManageRoles,
  canManageGroupSettings,
  canWriteInFolder,
  canCreateTasks,
  canViewFolder,
  isAdminRole,
  canEditTask,
  canDeleteTask
};

