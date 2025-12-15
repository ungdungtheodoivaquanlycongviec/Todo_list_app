// File: src/services/types/folder.types.ts

// ⚠️ Cần đảm bảo GroupRoleKey được import từ file constants/GroupRoles
// Ví dụ:
// import { GroupRoleKey } from '../../constants/GroupRoles'; 
// (Giả định rằng GroupRoleKey là string, nếu không import được)

export interface FolderMetadata {
  color?: string;
  icon?: string;
}

// --- Định nghĩa Type cho Folder Member Access ---
// Đã bổ sung các trường cần thiết để quản lý quyền truy cập trong FolderAccessModal
export interface FolderMemberAccess {
  userId: string; // ID của User
  
  // 💡 BỔ SUNG: Vai trò của thành viên trong folder này
  // Sử dụng 'string' nếu không thể import GroupRoleKey vào đây
  role: string; 
  
  // 💡 BỔ SUNG: ID của thành viên trong Group
  memberId: string; 
  
  addedBy: string;
  addedAt: string;
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
  
  // Đã cập nhật kiểu dữ liệu của memberAccess
  memberAccess?: FolderMemberAccess[];
  
  // Bạn có thể cần thêm trường folderMembers để tương thích với component trước:
  folderMembers?: FolderMemberAccess[];
}

export interface FolderListResponse {
  folders: Folder[];
  meta?: {
    total: number;
    defaultFolderId?: string | null;
  };
}