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
  user?: any;
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
  user?: any;
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

// NEW: Active timer for per-user timer tracking
export interface ActiveTimer {
  userId: string | MinimalUser;
  startTime: string;
}

// NEW: Checklist item for subtasks
export interface ChecklistItem {
  _id?: string;
  text: string;
  isCompleted: boolean;
  completedBy?: string | MinimalUser;
  completedAt?: string;
  createdBy?: string | MinimalUser;
  createdAt?: string;
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

  // NEW FIELDS
  type?: string;
  timeEntries?: TimeEntry[];
  scheduledWork?: ScheduledWork[];
  repetition?: RepetitionSettings;
  activeTimers?: ActiveTimer[];  // Array of per-user timers (replaces startTime)
  checklist?: ChecklistItem[];   // NEW: Checklist/subtask items

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
  estimatedTime?: string;
  type?: string;
  tags?: string[];
  assignedTo?: string[];
  timeEntries?: TimeEntry[];
  scheduledWork?: ScheduledWork[];
  repetition?: RepetitionSettings;
}

// For updating tasks
export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  category?: string | null;
  estimatedTime?: string;
  type?: string;
  timeEntries?: TimeEntry[];
  scheduledWork?: ScheduledWork[];
  repetition?: RepetitionSettings;
  tags?: string[];
}