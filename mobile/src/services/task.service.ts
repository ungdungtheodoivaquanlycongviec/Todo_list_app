import { authService } from './auth.service';
// import { notificationService } from './notification.service'; // Bỏ comment nếu đã setup notification
import { API_URL } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/task.types'; // Đảm bảo file types đã có

// ----------------------------------------------------------------------
// 1. HELPERS & UTILS
// ----------------------------------------------------------------------

// Chuẩn hóa dữ liệu trả về từ Backend (giống Web)
const normalizeTaskResponse = (data: any): Task => {
  if (data.data?.task) return data.data.task;
  if (data.task) return data.task;
  if (data.data && !data.task) return data.data;
  return data;
};

// Tạo Headers (Tự động thêm Token & Content-Type)
const getHeaders = async (isMultipart = false) => {
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

// Xử lý phản hồi chung (Lỗi 401, 403, Parse JSON lỗi)
const handleResponse = async (response: Response, actionName: string) => {
  if (!response.ok) {
    // 1. Lỗi xác thực -> Logout
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      throw new Error('Authentication failed. Please login again.');
    }
    
    // Xử lý lỗi 304 (Not Modified)
    if (response.status === 304) return { status: 304 };

    // 2. Lỗi quyền truy cập
    if (response.status === 403) {
      throw new Error('You must join or create a group to manage tasks');
    }

    // 3. Lỗi logic từ Backend
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
  
  // 204 No Content
  if (response.status === 204) return null;

  const data = await response.json();
  return data;
};

// Helper để format file cho FormData của React Native
const createMobileFileObject = (file: any) => {
  return {
    uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
    type: file.type || 'image/jpeg', // Fallback type
    name: file.name || `upload_${Date.now()}.jpg`, // Fallback name
  };
};

// ----------------------------------------------------------------------
// 2. MAIN SERVICE
// ----------------------------------------------------------------------

interface TasksResponse {
  tasks: Task[];
  pagination: any;
}

export const taskService = {
  
  // =================================================================
  // A. BASIC CRUD (Create, Read, Update, Delete)
  // =================================================================

  createTask: async (taskData: any): Promise<Task> => {
    // Lấy currentGroupId từ storage nếu thiếu
    let currentGroupId = null;
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        currentGroupId = user.currentGroupId;
      }
    } catch (e) { console.warn('Error reading user from storage', e); }

    if (currentGroupId && !taskData.groupId) {
      taskData.groupId = currentGroupId;
    }

    const data = await fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });

    const task = normalizeTaskResponse(data);

    // Gửi thông báo (Nếu có service)
    // if (task.groupId && notificationService) {
    //    try { await notificationService.createNewTaskNotification(task.groupId, task.title); } catch {}
    // }

    return task;
  },

  getAllTasks: async (filters?: any, options?: any): Promise<TasksResponse> => {
    const queryParams = new URLSearchParams();
    const mergeParams = { ...filters, ...options };
    
    Object.keys(mergeParams).forEach(key => {
      if (mergeParams[key] !== undefined && mergeParams[key] !== null && mergeParams[key] !== '') {
        queryParams.append(key, mergeParams[key]);
      }
    });

    // Mapping filters giống Web
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
    console.log('[API] Fetching tasks:', url);

    const response = await fetch(url, { headers });
    const responseData = await handleResponse(response, 'fetch tasks');

    // Normalize cấu trúc trả về
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

  updateTask: async (id: string, updateData: any): Promise<Task> => {
    const headers = await getHeaders();
    // Loại bỏ các trường hệ thống không được sửa
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

  deleteTask: async (id: string): Promise<void> => {
    await fetchWithAuth(`/tasks/${id}`, { method: 'DELETE' });
  },

  // =================================================================
  // B. ACTIONS & UTILS
  // =================================================================

  duplicateTask: async (taskId: string): Promise<Task> => {
    try {
      console.log('[Service] Duplicating task manually:', taskId);
      const originalTask = await taskService.getTaskById(taskId);
      
      const newTaskData = {
        title: `${originalTask.title} (Copy)`,
        description: originalTask.description,
        category: originalTask.category,
        priority: originalTask.priority,
        estimatedTime: originalTask.estimatedTime,
        tags: originalTask.tags || [],
        dueDate: originalTask.dueDate,
        folderId: originalTask.folderId, 
        status: 'todo',
        assignedTo: originalTask.assignedTo?.map((a: any) => ({
          userId: typeof a.userId === 'object' ? a.userId._id : a.userId
        })) || []
      };

      return await taskService.createTask(newTaskData);
    } catch (error) {
      console.error('Manual duplicate failed:', error);
      throw error;
    }
  },

  moveTaskToFolder: async (taskId: string, folderId: string): Promise<Task> => {
    return await taskService.updateTask(taskId, { folderId: folderId });
  },

  // =================================================================
  // C. COMMENTS (Đầy đủ chức năng như Web)
  // =================================================================

  // ✅ [MỚI] Lấy danh sách comment có phân trang
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
    const headers = await getHeaders();
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `${API_URL}/tasks/${taskId}/comments${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[API] Fetching comments:', url);

    const response = await fetch(url, { headers });
    const responseData = await handleResponse(response, 'fetch comments');

    // Normalize
    return {
      comments: responseData.data?.comments || responseData.comments || [],
      pagination: responseData.data?.pagination || responseData.pagination || {
        page: options?.page || 1,
        limit: options?.limit || 15,
        totalComments: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  },

  addComment: async (taskId: string, content: string): Promise<Task> => {
    const data = await fetchWithAuth(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
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

  // =================================================================
  // D. FILE UPLOAD (Đã fix cho React Native)
  // =================================================================

  addCommentWithFile: async (taskId: string, content: string, file: any): Promise<Task> => {
    const headers = await getHeaders(true); // true = Multipart/form-data
    const formData = new FormData();
    formData.append('content', content);
    formData.append('file', createMobileFileObject(file) as any);

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

    formData.append('file', createMobileFileObject(file) as any);

    const response = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    return normalizeTaskResponse(data);
  },

  // =================================================================
  // E. SPECIFIC VIEWS (Kanban, Calendar)
  // =================================================================

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

  // =================================================================
  // F. ASSIGNMENT & COLLABORATION (Đã đồng bộ)
  // =================================================================

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

  // =================================================================
  // G. TIMER & SETTINGS
  // =================================================================

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