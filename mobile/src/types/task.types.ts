// File: src/services/types/task.types.ts (Dành cho Mobile - React Native)

export interface MinimalUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AssignedUser {
  userId: string | MinimalUser;
  assignedAt: string;
}

export interface CommentUser {
  userId: string | MinimalUser;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  _id?: string;
  user?: any; // Cần thay thế 'any' bằng kiểu User/MinimalUser cụ thể sau
  date: string;
  hours: number;
  minutes: number;
  description?: string;
  billable: boolean;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
}

export interface ScheduledWork {
  _id?: string;
  user?: any; // Cần thay thế 'any' bằng kiểu User/MinimalUser cụ thể sau
  scheduledDate: string;
  estimatedHours: number;
  estimatedMinutes: number;
  description?: string;
  status: string;
  createdAt?: string;
}

export interface RepetitionSettings {
  isRepeating: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  occurrences?: number;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: string | MinimalUser; // Can be string ID or populated user object
  assignedTo: AssignedUser[];
  tags: string[];
  category: string | null;
  groupId: string | null;
  
  // 🟢 Đã bao gồm folderId (đã được thống nhất trong lần sửa trước đó)
  folderId?: string | {
    _id: string;
    name?: string;
    isDefault?: boolean;
  } | null;
  
  estimatedTime?: string;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    uploadedBy: string;
    uploadedAt: string;
  }>;
  comments: CommentUser[];
  
  // NEW FIELDS (Các trường nâng cao về thời gian)
  type?: string;
  timeEntries?: TimeEntry[];
  scheduledWork?: ScheduledWork[];
  repetition?: RepetitionSettings;
  startTime?: string | null;
  
  createdAt: string;
  updatedAt: string;
}

// For creating new tasks
export interface CreateTaskData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  category?: string | null;
  groupId?: string | null;
  // 🟢 Cần thêm folderId cho các Request/Data interfaces nếu cần gửi lên API
  folderId?: string | null; 
  estimatedTime?: string;
  type?: string;
  tags?: string[];
  assignedTo?: string[];
  timeEntries?: TimeEntry[];
  scheduledWork?: ScheduledWork[];
  repetition?: RepetitionSettings;
  startTime?: string | null;
}

// For updating tasks
export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  category?: string | null;
  // 🟢 Cần thêm folderId nếu muốn cập nhật vị trí folder
  folderId?: string | null;
  estimatedTime?: string;
  type?: string;
  timeEntries?: TimeEntry[];
  scheduledWork?: ScheduledWork[];
  repetition?: RepetitionSettings;
  startTime?: string | null;
  tags?: string[];
}