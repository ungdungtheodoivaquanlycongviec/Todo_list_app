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
  createdAt: string;
  updatedAt: string;
}export interface Task {
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
  createdAt: string;
  updatedAt: string;
}