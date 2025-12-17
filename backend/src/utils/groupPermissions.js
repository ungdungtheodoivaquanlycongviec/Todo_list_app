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

const isProductOwner = role => role === GROUP_ROLE_KEYS.PRODUCT_OWNER;
const isPM = role => role === GROUP_ROLE_KEYS.PM;

const isPrivilegedForGroup = ({ role, isLeader = false } = {}) =>
  Boolean(isProductOwner(role) || isLeader);

const canViewAllFolders = role =>
  Boolean(role) &&
  (requiresFolderAssignment(role) === false ||
    isReadOnlyRole(role) ||
    isProductOwner(role) ||
    isPM(role));

// PO + Leaders can CRUD group + folders. PM can CRUD folders in groups they belong to.
const canManageFolders = ({ role, isLeader = false } = {}) =>
  Boolean(isPM(role) || isPrivilegedForGroup({ role, isLeader }));

// PM + PO + Leaders can add members to group, assign folders, CRUD+assign tasks.
const canAssignFolderMembers = ({ role, isLeader = false } = {}) =>
  Boolean(isPM(role) || isPrivilegedForGroup({ role, isLeader }));

// Roles are assigned by system admin only (not by group roles)
const canManageRoles = () => false;

const canManageGroupSettings = ({ role, isLeader = false } = {}) =>
  Boolean(isPrivilegedForGroup({ role, isLeader }));

const canWriteInFolder = (role, { isAssigned = false, isLeader = false } = {}) => {
  if (!role) {
    return false;
  }
  if (isProductOwner(role) || isPM(role) || isLeader) {
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

// Everyone with a non-null role can create tasks,
// except read-only roles – but leaders are always allowed regardless of business role
const canCreateTasks = ({ role, isLeader = false } = {}) =>
  Boolean(role) && (!isReadOnlyRole(role) || isLeader);

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
const isAdminRole = ({ role, isLeader = false } = {}) =>
  Boolean(isPM(role) || isPrivilegedForGroup({ role, isLeader }));

/**
 * Check if user can edit a task (update, timer, repeat, attachments)
 * Allowed: Admin roles, task creator, or assignees
 * @param {Object} params
 * @param {String} params.role - User's role in the group
 * @param {Boolean} params.isCreator - Is user the task creator
 * @param {Boolean} params.isAssignee - Is user assigned to the task
 * @returns {Boolean}
 */
const canEditTask = ({ role, isCreator = false, isAssignee = false, isLeader = false } = {}) => {
  if (isAdminRole({ role, isLeader })) {
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
const canDeleteTask = ({ role, isCreator = false, isLeader = false } = {}) => {
  // Admin roles (PO/PM/Leader) can delete any task; otherwise only creator can delete
  if (isCreator) {
    return true;
  }
  if (isAdminRole({ role, isLeader })) {
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
  canDeleteTask,
  isPrivilegedForGroup
};

