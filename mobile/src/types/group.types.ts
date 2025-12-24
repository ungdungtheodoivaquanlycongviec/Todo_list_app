// File: src/services/types/group.types.ts (Mobile - Fixed)

// Import path này tùy thuộc vào cấu trúc thư mục của bạn, hãy giữ nguyên nếu đã đúng
import { GroupRoleKey } from '../components/constants/groupRoles'; 

export interface GroupMemberUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  // 🔥 BỔ SUNG: Role nghiệp vụ trong project
  groupRole?: string | null;
  // 🔥 BỔ SUNG: Cờ xác định leader
  isLeader?: boolean;
}

export interface GroupMember {
  userId: string | GroupMemberUser;
  // ⚠️ SỬA: Đổi thành optional (?) để khớp với Web (vì backend đang deprecate trường này)
  role?: GroupRoleKey | null;
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
  // 🔥 BỔ SUNG: Cờ xác định workspace cá nhân
  isPersonalWorkspace?: boolean; 
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