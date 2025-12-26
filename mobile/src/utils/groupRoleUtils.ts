// File: src/utils/groupRoleUtils.ts (Mobile - Updated)

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
  // 🟢 Đã sửa: Dùng nullish coalescing giống Web để chuẩn hóa type
  return member?.role ?? null;
};

export const isReadOnlyRole = (role?: GroupRoleKey | null) =>
  role ? READ_ONLY_ROLES.includes(role) : false;

export const requiresFolderAssignment = (role?: GroupRoleKey | null) =>
  role ? FOLDER_SCOPED_ROLES.includes(role) : false;

// 🟢 Đã sửa: Roles are assigned by system admin only (account-level)
// Mobile không được phép hiển thị UI sửa role nữa.
export const canManageRoles = () => false;

// 🟢 Đã sửa: Bổ sung tham số isLeader
export const canAddMembers = (role?: GroupRoleKey | null, isLeader?: boolean) =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM || Boolean(isLeader);

// 🟢 Đã sửa: Bổ sung tham số isLeader
export const canManageFolders = (role?: GroupRoleKey | null, isLeader?: boolean) =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM || Boolean(isLeader);

// 🟢 Đã sửa: Viết tường minh và bổ sung tham số isLeader
export const canAssignFolderMembers = (role?: GroupRoleKey | null, isLeader?: boolean) =>
  role === GROUP_ROLE_KEYS.PRODUCT_OWNER || role === GROUP_ROLE_KEYS.PM || Boolean(isLeader);

export const getRoleSummary = (role?: GroupRoleKey | null) =>
  (role && ROLE_SUMMARIES[role]) || null;