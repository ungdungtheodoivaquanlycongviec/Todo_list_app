import { GroupRoleKey } from '../../constants/groupRoles';

export interface GroupMemberUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  groupRole?: string | null;
  isLeader?: boolean;
}

export interface GroupMember {
  userId: string | GroupMemberUser;
  // Group member roles are deprecated; keep for backward compatibility only.
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
  // Personal workspace flag (true for each user's private workspace group)
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
