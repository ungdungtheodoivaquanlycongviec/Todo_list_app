// File: src/services/types/group.types.ts (Dành cho Mobile, đã sửa đổi)

// Giả định import này đã đúng
import { GroupRoleKey } from '../components/constants/groupRoles'; 

export interface GroupMemberUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface GroupMember {
  // 🟢 Đã sửa: Sử dụng GroupMemberUser interface đã tách
  userId: string | GroupMemberUser; 
  role: GroupRoleKey;
  joinedAt: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface GroupMetadata {
  color: string;
  icon: string;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  // 🟢 Đã sửa: Sử dụng định nghĩa object inline tương tự Web
  createdBy: string | {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  members: GroupMember[];
  metadata: GroupMetadata;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  metadata?: Partial<GroupMetadata>;
}

export interface GroupFilters {
  search?: string;
}

export interface GroupOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}