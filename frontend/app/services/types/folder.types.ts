export interface FolderMetadata {
  color?: string;
  icon?: string;
}

export interface Folder {
  _id: string;
  name: string;
  description?: string;
  groupId?: string;
  isDefault?: boolean;
  order?: number;
  metadata?: FolderMetadata;
  taskCount?: number;
  noteCount?: number;
  createdAt?: string;
  updatedAt?: string;
  memberAccess?: Array<{
    userId: string;
    addedBy: string;
    addedAt: string;
  }>;
}

export interface FolderListResponse {
  folders: Folder[];
  meta?: {
    total: number;
    defaultFolderId?: string | null;
  };
}

