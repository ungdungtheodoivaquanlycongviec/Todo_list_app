import { authService } from './auth.service';
import { notificationService } from './notification.service'; // Đảm bảo đã có bản mobile
import { API_URL } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/task.types'; // Đảm bảo file types đã có

// Helper chuẩn hóa response (Giữ nguyên logic quan trọng từ Web)
const normalizeTaskResponse = (data: any): Task => {
  if (data.data?.task) return data.data.task;
  if (data.task) return data.task;
  if (data.data && !data.task) return data.data;
  return data;
};

// Interface cho Upload File trên React Native
export interface RNFile {
  uri: string;
  name: string;
  type: string;
}

// Interface Response
interface TasksResponse {
  tasks: Task[];
  pagination: any;
}

// --- HELPER FUNCTION (Tối ưu hóa) ---
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = await authService.getAuthToken();
  
  // Xử lý Headers đặc biệt cho FormData (không set Content-Type)
  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as any),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;
  console.log(`[TaskService] Requesting: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      throw new Error('Authentication failed. Please login again.');
    }
    
    // Xử lý lỗi 304 (Not Modified)
    if (response.status === 304) return { status: 304 };

    // Xử lý lỗi 403 (Forbidden)
    if (response.status === 403) {
      throw new Error('You must join or create a group to manage tasks');
    }

    const errorText = await response.text();
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;

  const data = await response.json();
  return data;
};

export const taskService = {
  // Tạo task mới
  createTask: async (taskData: any): Promise<Task> => {
    // Logic lấy currentGroupId từ AsyncStorage
    let currentGroupId = null;
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        currentGroupId = user.currentGroupId;
      }
    } catch (e) { console.error(e); }

    if (currentGroupId && !taskData.groupId) {
      taskData.groupId = currentGroupId;
    }

    const data = await fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });

    const task = normalizeTaskResponse(data);

    // Gửi thông báo (nếu có logic này)
    if (task.groupId) {
       // Lưu ý: Đảm bảo notificationService bản mobile có hàm này
       try {
         await notificationService.createNewTaskNotification(task.groupId, task.title);
       } catch (e) { console.warn('Failed to send task notification:', e); }
    }

    return task;
  },

  // Lấy tất cả tasks
  getAllTasks: async (filters?: any, options?: any): Promise<TasksResponse> => {
    const queryParams = new URLSearchParams();
    const mergeParams = { ...filters, ...options };
    
    Object.keys(mergeParams).forEach(key => {
      if (mergeParams[key] !== undefined && mergeParams[key] !== null && mergeParams[key] !== '') {
        queryParams.append(key, mergeParams[key]);
      }
    });

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const responseData = await fetchWithAuth(`/tasks${queryString}`);

    // Normalize response structure
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

  // Lấy task theo ID
  getTaskById: async (id: string): Promise<Task> => {
    const data = await fetchWithAuth(`/tasks/${id}`);
    return normalizeTaskResponse(data);
  },

  // Update task
  updateTask: async (id: string, updateData: any): Promise<Task> => {
    // Loại bỏ các trường hệ thống không được update
    const { _id, __v, createdAt, updatedAt, createdBy, ...cleanData } = updateData;
    
    const data = await fetchWithAuth(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanData),
    });

    // Handle 304 Not Modified -> Re-fetch
    if (data && data.status === 304) {
      return taskService.getTaskById(id);
    }

    return normalizeTaskResponse(data);
  },

  // Delete task
  deleteTask: async (id: string): Promise<void> => {
    await fetchWithAuth(`/tasks/${id}`, { method: 'DELETE' });
  },

  // Add comment
  addComment: async (taskId: string, content: string): Promise<Task> => {
    const data = await fetchWithAuth(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return normalizeTaskResponse(data);
  },

  // Add comment with file attachment (Mobile Upload)
  addCommentWithFile: async (taskId: string, content: string, file: RNFile): Promise<Task> => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as any);

    const data = await fetchWithAuth(`/tasks/${taskId}/comments/with-file`, {
      method: 'POST',
      body: formData,
    });
    return normalizeTaskResponse(data);
  },

  // Upload attachment
  uploadAttachment: async (taskId: string, file: RNFile): Promise<Task> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as any);

    const data = await fetchWithAuth(`/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    return normalizeTaskResponse(data);
  },

  // Kanban View
  getKanbanView: async (filters?: any): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
      });
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const data = await fetchWithAuth(`/tasks/kanban${queryString}`);
    return data.data || data;
  },

  // Calendar View
  getCalendarView: async (year: number, month: number, folderId?: string): Promise<any> => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month)
    });
    if (folderId) params.append('folderId', folderId);

    const data = await fetchWithAuth(`/tasks/calendar?${params.toString()}`);
    return data.data || data;
  },

  // Update comment
  updateComment: async (taskId: string, commentId: string, userId: string, content: string): Promise<any> => {
    return fetchWithAuth(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  // Delete comment
  deleteComment: async (taskId: string, commentId: string, userId: string): Promise<any> => {
    return fetchWithAuth(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
  },

  // Assign users
  assignUsersToTask: async (taskId: string, userIds: string[]): Promise<any> => {
    return fetchWithAuth(`/tasks/${taskId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },

  // Unassign user
  unassignUserFromTask: async (taskId: string, userId: string): Promise<any> => {
    return fetchWithAuth(`/tasks/${taskId}/unassign/${userId}`, { method: 'DELETE' });
  },

  // Get assignees
  getTaskAssignees: async (taskId: string): Promise<any> => {
    return fetchWithAuth(`/tasks/${taskId}/assignees`);
  },

  // Timer functions
  startTimer: async (taskId: string): Promise<Task> => {
    const data = await fetchWithAuth(`/tasks/${taskId}/start-timer`, { method: 'POST' });
    return normalizeTaskResponse(data);
  },

  stopTimer: async (taskId: string): Promise<Task> => {
    const data = await fetchWithAuth(`/tasks/${taskId}/stop-timer`, { method: 'POST' });
    return normalizeTaskResponse(data);
  },

  // Custom status
  setCustomStatus: async (taskId: string, name: string, color: string): Promise<Task> => {
    const data = await fetchWithAuth(`/tasks/${taskId}/custom-status`, {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    return normalizeTaskResponse(data);
  },

  // Repetition
  setTaskRepetition: async (taskId: string, repetitionSettings: any): Promise<Task> => {
    const data = await fetchWithAuth(`/tasks/${taskId}/repeat`, {
      method: 'POST',
      body: JSON.stringify(repetitionSettings),
    });
    return normalizeTaskResponse(data);
  },

  // Get Comments Paginated
  getComments: async (
    taskId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{
    comments: any[];
    pagination: {
      page: number;
      limit: number;
      totalComments: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const data = await fetchWithAuth(`/tasks/${taskId}/comments?${params.toString()}`);
    
    return {
      comments: data.data?.comments || data.comments || [],
      pagination: data.data?.pagination || data.pagination || {
        page: options?.page || 1,
        limit: options?.limit || 15,
        totalComments: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
};