// File: mobile/utils/groupRoleUtils.ts (Updated)

import {
  FOLDER_SCOPED_ROLES,
  GroupRoleKey,
  GROUP_ROLE_KEYS,
  READ_ONLY_ROLES,
  ROLE_SUMMARIES
} from '../components/constants/groupRoles'; // Giữ nguyên path import của mobile
import { Group, GroupMember } from '../types/group.types'; // Giữ nguyên path import của mobile

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
  return member?.role ?? null;
};

export const isReadOnlyRole = (role?: GroupRoleKey | null) =>
  role ? READ_ONLY_ROLES.includes(role) : false;

export const requiresFolderAssignment = (role?: GroupRoleKey | null) =>
  role ? FOLDER_SCOPED_ROLES.includes(role) : false;

// Roles are assigned by system admin only
export const canManageRoles = () => false;

// ✅ MỚI: Helper check chủ sở hữu Personal Workspace (Copy từ Web)
export const isPersonalWorkspaceOwner = (group: Group | null | undefined, userId?: string | null): boolean => {
  if (!group || !userId) {
    return false;
  }
  // Check if it's a personal workspace
  if (!(group as any).isPersonalWorkspace) {
    return false;
  }
  // Get creator ID - handle both string and object types for createdBy
  const createdBy = (group as any).createdBy;
  const creatorId = typeof createdBy === 'string' ? createdBy : createdBy?._id;
  return creatorId === userId;
};

// ✅ CẬP NHẬT: Thêm tham số isPersonalOwner và logic check || isPersonalOwner
export const canAddMembers = (role?: GroupRoleKey | null, isLeader?: boolean, isPersonalOwner?: boolean) =>
  isPersonalOwner || role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM || Boolean(isLeader);

// ✅ CẬP NHẬT: Thêm tham số isPersonalOwner
export const canManageFolders = (role?: GroupRoleKey | null, isLeader?: boolean, isPersonalOwner?: boolean) =>
  isPersonalOwner || role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM || Boolean(isLeader);

// ✅ CẬP NHẬT: Thêm tham số isPersonalOwner
export const canAssignFolderMembers = (role?: GroupRoleKey | null, isLeader?: boolean, isPersonalOwner?: boolean) =>
  isPersonalOwner || role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM || Boolean(isLeader);

export const getRoleSummary = (role?: GroupRoleKey | null) =>
  (role && ROLE_SUMMARIES[role]) || null;