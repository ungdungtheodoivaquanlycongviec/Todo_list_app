import {
  FOLDER_SCOPED_ROLES,
  GroupRoleKey,
  GROUP_ROLE_KEYS,
  READ_ONLY_ROLES,
  ROLE_SUMMARIES
} from '../constants/groupRoles';
import { Group, GroupMember } from '../services/types/group.types';

export const getMemberId = (member: GroupMember): string | null => {
  if (!member) {
    return null;
  }
  if (typeof member.userId === 'string') {
    return member.userId;
  }
  return member.userId?._id || null;
};

export const getMemberRole = (group: Group | null | undefined, userId?: string | null): GroupRoleKey | null => {
  if (!group || !userId) {
    return null;
  }
  const member = group.members?.find(item => getMemberId(item) === userId);
  return member ? member.role : null;
};

export const isReadOnlyRole = (role?: GroupRoleKey | null) =>
  role ? READ_ONLY_ROLES.includes(role) : false;

export const requiresFolderAssignment = (role?: GroupRoleKey | null) =>
  role ? FOLDER_SCOPED_ROLES.includes(role) : false;

export const canManageRoles = (role?: GroupRoleKey | null) =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER;

export const canManageFolders = (role?: GroupRoleKey | null) =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM;

export const canAssignFolderMembers = canManageFolders;

export const getRoleSummary = (role?: GroupRoleKey | null) =>
  (role && ROLE_SUMMARIES[role]) || null;


