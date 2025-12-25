// File: src/services/types/folder.types.ts (Đã được điều chỉnh để đơn giản hóa)

export interface FolderMetadata {
  color?: string;
  icon?: string;
}

// ❌ Loại bỏ interface FolderMemberAccess định nghĩa riêng
// ❌ Loại bỏ các trường role và memberId

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
  
  // 🟢 Đưa về cấu trúc cơ bản và in-line (giống Web Cũ)
  memberAccess?: Array<{
    userId: string;
    addedBy: string;
    addedAt: string;
  }>;
  
  // ❌ Loại bỏ trường folderMembers?: FolderMemberAccess[];
}

export interface FolderListResponse {
  folders: Folder[];
  meta?: {
    total: number;
    defaultFolderId?: string | null;
  };
}