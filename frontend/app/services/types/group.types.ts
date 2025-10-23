export interface GroupMember {
  userId: string | {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  role: 'admin' | 'member';
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
