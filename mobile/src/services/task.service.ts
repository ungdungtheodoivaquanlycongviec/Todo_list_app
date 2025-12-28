import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authService } from './auth.service';
import { API_URL } from '../config/api.config';

// ----------------------------------------------------------------------
// 1. DEFINITIONS & INTERFACES
// ----------------------------------------------------------------------

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived' | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  startDate?: string;
  createdAt?: string;
  folderId?: string | { _id: string; name: string };
  groupId?: string;
  category?: string;
  assignedTo?: { userId: string | { _id: string; name: string; avatar?: string; email?: string } }[];
  estimatedTime?: string;
  tags?: string[];
  [key: string]: any;
}

interface TasksResponse {
  tasks: Task[];
  pagination: any;
}

// ----------------------------------------------------------------------
// 2. HELPERS & UTILS
// ----------------------------------------------------------------------

const normalizeTaskResponse = (data: any): Task => {
  if (!data) return data;
  if (data.data?.task) return data.data.task;
  if (data.task) return data.task;
  if (data.data && !data.task) return data.data;
  return data;
};

const getHeaders = async (isMultipart = false) => {
  const token = await authService.getAuthToken();
  const headers: any = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Multipart (Upload file) không được set Content-Type thủ công
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

const handleResponse = async (response: Response, actionName: string) => {
  if (!response.ok) {
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      throw new Error('Authentication failed. Please login again.');
    }

    if (response.status === 403) {
       throw new Error('You must join or create a group to manage tasks');
    }

    const errorText = await response.text();
    console.error(`[TaskService] ${actionName} Error (${response.status}):`, errorText);
    
    let errorMessage = `Failed to ${actionName}: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) return null;

  return response.json();
};

const createMobileFileObject = (file: any) => {
  return {
    uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
    type: file.type || 'image/jpeg',
    name: file.name || `upload_${Date.now()}.jpg`,
  };
};

// ----------------------------------------------------------------------
// 3. MAIN SERVICE
// ----------------------------------------------------------------------

export const taskService = {
  
  // --- CREATE (ĐÃ SỬA LOGIC LẤY GROUP ID) ---
  createTask: async (taskData: any): Promise<Task> => {
    // 1. Ưu tiên GroupID truyền vào, nếu không có thì lấy từ Storage
    let finalGroupId = taskData.groupId;

    if (!finalGroupId) {
        try {
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                finalGroupId = user.currentGroupId || user.groupId;
            }
        } catch (e) {
            console.warn('[TaskService] Error reading user storage', e);
        }
    }

    // 2. Chặn lỗi nếu vẫn không có GroupID
    if (!finalGroupId) {
        throw new Error('Missing Group ID. Please select a group first.');
    }

    // Gán lại
    taskData.groupId = finalGroupId;

    console.log('[API] Creating task payload:', JSON.stringify(taskData));

    const headers = await getHeaders();
    // ✅ Endpoint KHÔNG CÓ dấu / ở cuối để tránh lỗi 301
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskData),
    });

    const data = await handleResponse(response, 'create task');
    return normalizeTaskResponse(data);
  },

  // --- READ (ALL) ---
  getAllTasks: async (filters?: any, options?: any): Promise<TasksResponse> => {
    const headers = await getHeaders();
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] != null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
    }

    if (options) {
      Object.keys(options).forEach(key => {
        if (options[key] != null && options[key] !== '') {
          queryParams.append(key, options[key]);
        }
      });
    }

    const url = `${API_URL}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    // console.log('[API] Fetching tasks:', url);

    const response = await fetch(url, { headers });
    const responseData = await handleResponse(response, 'fetch tasks');

    let tasks: Task[] = [];
    let pagination = {};

    if (Array.isArray(responseData.tasks)) {
      tasks = responseData.tasks;
      pagination = responseData.pagination || {};
    } else if (Array.isArray(responseData.data?.tasks)) {
      tasks = responseData.data.tasks;
      pagination = responseData.data.pagination || {};
    } else if (Array.isArray(responseData.data)) {
      tasks = responseData.data;
      pagination = responseData.pagination || {};
    } else if (Array.isArray(responseData)) {
      tasks = responseData;
      pagination = { total: responseData.length, page: 1, limit: responseData.length, totalPages: 1 };
    }

    return { tasks: tasks || [], pagination };
  },

  // --- READ (ONE) ---
  getTaskById: async (id: string): Promise<Task> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${id}`, { headers });
    const data = await handleResponse(response, 'fetch task by id');
    return normalizeTaskResponse(data);
  },

  // --- UPDATE ---
  updateTask: async (id: string, updateData: any): Promise<Task> => {
    const headers = await getHeaders();
    const { _id, __v, createdAt, updatedAt, createdBy, ...cleanData } = updateData;

    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(cleanData),
    });

    if (response.status === 304) {
      return taskService.getTaskById(id);
    }

    const data = await handleResponse(response, 'update task');
    return normalizeTaskResponse(data);
  },

  // --- DELETE ---
  deleteTask: async (id: string): Promise<void> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers,
    });
    await handleResponse(response, 'delete task');
  },

  // --- DUPLICATE ---
  duplicateTask: async (taskId: string): Promise<Task> => {
    try {
      const originalTask = await taskService.getTaskById(taskId);
      
      const newTaskData = {
        title: `${originalTask.title} (Copy)`,
        description: originalTask.description,
        category: originalTask.category,
        priority: originalTask.priority,
        estimatedTime: originalTask.estimatedTime,
        tags: originalTask.tags || [],
        dueDate: originalTask.dueDate,
        folderId: typeof originalTask.folderId === 'object' ? (originalTask.folderId as any)._id : originalTask.folderId, 
        status: 'todo',
        assignedTo: originalTask.assignedTo?.map((a: any) => ({
          userId: typeof a.userId === 'object' ? a.userId._id : a.userId
        })) || []
      };

      return await taskService.createTask(newTaskData);
    } catch (error) {
      console.error('[Service] Duplicate task failed:', error);
      throw error;
    }
  },

  moveTaskToFolder: async (taskId: string, folderId: string): Promise<Task> => {
    return await taskService.updateTask(taskId, { folderId: folderId });
  },

  // --- COMMENTS ---
  getComments: async (taskId: string, options?: { page?: number; limit?: number }) => {
    const headers = await getHeaders();
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${API_URL}/tasks/${taskId}/comments${params.toString() ? `?${params.toString()}` : ''}`, { headers });
    const responseData = await handleResponse(response, 'fetch comments');

    return {
      comments: responseData.data?.comments || responseData.comments || [],
      pagination: responseData.data?.pagination || responseData.pagination || { page: 1, limit: 15, totalComments: 0, totalPages: 1 }
    };
  },

  addComment: async (taskId: string, content: string): Promise<Task> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    });
    const data = await handleResponse(response, 'add comment');
    return normalizeTaskResponse(data);
  },

  updateComment: async (taskId: string, commentId: string, userId: string, content: string): Promise<any> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ content }),
    });
    return await handleResponse(response, 'update comment');
  },

  deleteComment: async (taskId: string, commentId: string, userId: string): Promise<any> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
      headers,
    });
    return await handleResponse(response, 'delete comment');
  },

  // --- FILES & ATTACHMENTS ---
  addCommentWithFile: async (taskId: string, content: string, file: any): Promise<Task> => {
    const headers = await getHeaders(true); // true = Multipart
    const formData = new FormData();
    
    formData.append('content', content);
    // @ts-ignore
    formData.append('file', createMobileFileObject(file));

    const response = await fetch(`${API_URL}/tasks/${taskId}/comments/with-file`, {
      method: 'POST',
      headers, 
      body: formData,
    });

    const data = await handleResponse(response, 'add comment with file');
    return normalizeTaskResponse(data);
  },

  uploadAttachment: async (taskId: string, file: any): Promise<Task> => {
    const headers = await getHeaders(true);
    const formData = new FormData();

    // @ts-ignore
    formData.append('file', createMobileFileObject(file));

    const response = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await handleResponse(response, 'upload attachment');
    return normalizeTaskResponse(data);
  },

  // --- VIEWS ---
  getKanbanView: async (filters?: any): Promise<any> => {
    const headers = await getHeaders();
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });
    }
    
    const response = await fetch(`${API_URL}/tasks/kanban?${queryParams.toString()}`, { headers });
    const data = await handleResponse(response, 'fetch kanban');
    return data.data || data;
  },

  getCalendarView: async (year: number, month: number, folderId?: string): Promise<any> => {
    const headers = await getHeaders();
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (folderId) params.append('folderId', folderId);

    const response = await fetch(`${API_URL}/tasks/calendar?${params.toString()}`, { headers });
    const data = await handleResponse(response, 'fetch calendar');
    return data.data || data;
  },

  // --- ASSIGNMENT ---
  assignUsersToTask: async (taskId: string, userIds: string[]): Promise<any> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userIds }),
    });
    return await handleResponse(response, 'assign users');
  },

  unassignUserFromTask: async (taskId: string, userId: string): Promise<any> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/unassign/${userId}`, {
      method: 'DELETE',
      headers,
    });
    return await handleResponse(response, 'unassign user');
  },

  getTaskAssignees: async (taskId: string): Promise<any> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/assignees`, { headers });
    return await handleResponse(response, 'get assignees');
  },

  // --- EXTRAS ---
  startTimer: async (taskId: string): Promise<Task> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/start-timer`, { method: 'POST', headers });
    const data = await handleResponse(response, 'start timer');
    return normalizeTaskResponse(data);
  },

  stopTimer: async (taskId: string): Promise<Task> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/stop-timer`, { method: 'POST', headers });
    const data = await handleResponse(response, 'stop timer');
    return normalizeTaskResponse(data);
  },

  setCustomStatus: async (taskId: string, name: string, color: string): Promise<Task> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/custom-status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, color }),
    });
    const data = await handleResponse(response, 'set custom status');
    return normalizeTaskResponse(data);
  },

  setTaskRepetition: async (taskId: string, repetitionSettings: any): Promise<Task> => {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/tasks/${taskId}/repeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(repetitionSettings),
    });
    const data = await handleResponse(response, 'set task repetition');
    return normalizeTaskResponse(data);
  }
};