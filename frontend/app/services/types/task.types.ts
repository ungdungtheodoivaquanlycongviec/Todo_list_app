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

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: string;
  assignedTo: Array<{
    userId: string;
    assignedAt: string;
  }>;
  tags: string[];
  category: string | null;
  groupId: string | null;
  estimatedTime?: string;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    uploadedBy: string;
    uploadedAt: string;
  }>;
  comments: Array<{
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  
  // NEW FIELDS
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
  estimatedTime?: string;
  type?: string;
  timeEntries?: TimeEntry[];
  scheduledWork?: ScheduledWork[];
  repetition?: RepetitionSettings;
  startTime?: string | null;
  tags?: string[];
}