import { Task } from '../types/task.types';
import { authService } from './auth.service';
import { notificationService } from './notification.service';
// 💡 ĐÃ SỬA: Thay thế API_BASE_URL bằng API_URL
import { API_URL } from '../config/api.config'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper để normalize response từ backend
const normalizeTaskResponse = (data: any): Task => {
  // Backend có thể trả về nhiều dạng:
  // 1. { data: { task: {...} } }
  // 2. { task: {...} }
  // 3. Trực tiếp object task

  if (data.data?.task) {
    return data.data.task;
  }
  if (data.task) {
    return data.task;
  }
  if (data.data && !data.task) {
    return data.data;
  }
  return data;
};

// Định nghĩa interface cho API response
interface TasksResponse {
  tasks: Task[];
  pagination: any;
}

export const taskService = {
  // Tạo task mới
  createTask: async (taskData: any): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found');
    }

    // Get current group from AsyncStorage if available
    let currentGroupId = null;
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          currentGroupId = user.currentGroupId;
        } catch (error) {
          console.error('Failed to parse user from AsyncStorage:', error);
        }
      }
    } catch (error) {
      console.error('Failed to get user from AsyncStorage:', error);
    }

    // Add groupId to taskData if not already present
    if (currentGroupId && !taskData.groupId) {
      taskData.groupId = currentGroupId;
    }

    console.log('Creating task with data:', taskData);

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorMessage = `Failed to create task: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const task = normalizeTaskResponse(data);
    
    // Send notification to group members about new task
    if (task.groupId) {
      try {
        await notificationService.createNewTaskNotification(task.groupId, task.title);
      } catch (notifErr) {
        console.warn('Failed to send task notification:', notifErr);
      }
    }
    
    return task;
  },

  // Lấy tất cả tasks
  getAllTasks: async (filters?: any, options?: any): Promise<TasksResponse> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found for fetching tasks');
    }

    const queryParams = new URLSearchParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
    }

    if (options) {
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
          queryParams.append(key, options[key]);
        }
      });
    }

    // 💡 ĐÃ SỬA URL
    const url = `${API_URL}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('Fetching tasks from:', url);

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      if (response.status === 403) {
        const errorText = await response.text();
        let errorMessage = 'You must join or create a group to manage tasks';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default message if parsing fails
        }
        throw new Error(errorMessage);
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Raw API response for getAllTasks:', responseData);

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

    return {
      tasks: tasks || [],
      pagination
    };
  },

  // Lấy task theo ID
  getTaskById: async (id: string): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Fetching task by ID:', id);

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch task: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw task data from API:', data);

    // Normalize response
    const task = normalizeTaskResponse(data);
    console.log('Normalized task:', task);

    return task;
  },

  // Update task
  updateTask: async (id: string, updateData: any): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // QUAN TRỌNG: Đảm bảo không gửi _id trong body
    const { _id, __v, createdAt, updatedAt, createdBy, ...cleanData } = updateData;

    console.log('=== UPDATE TASK DEBUG ===');
    console.log('Task ID:', id);
    console.log('Original data:', updateData);
    console.log('Clean data to send:', cleanData);

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(cleanData),
    });

    console.log('Update response status:', response.status);

    if (!response.ok) {
      if (response.status === 304) {
        console.log('No changes detected (304)');
        return taskService.getTaskById(id);
      }

      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to update task: ${response.status}`);
    }

    const data = await response.json();
    console.log('Update response data:', data);

    const task = normalizeTaskResponse(data);
    console.log('Normalized updated task:', task);

    return task;
  },

  // Delete task
  deleteTask: async (id: string): Promise<void> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to delete task: ${response.status}`);
    }
  },

  // Add comment
  addComment: async (taskId: string, content: string): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add comment: ${errorText}`);
    }

    const data = await response.json();
    return normalizeTaskResponse(data);
  },

  // Upload attachment
  uploadAttachment: async (taskId: string, file: File): Promise<Task> => {
    // ⚠️ LƯU Ý: Kiểu dữ liệu 'File' là của Web API. Cần sửa cho RN nếu bạn upload file từ thiết bị di động.
    // Nếu sử dụng thư viện như 'react-native-image-picker', 'file' sẽ là { uri: string, name: string, type: string }
    
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const formData = new FormData();
    // formData.append('file', file); // Dòng này có thể sai trong RN, cần được thay thế

    // Thay thế file Web API bằng định dạng RN (DỰ KIẾN - Cần kiểm tra lại kiểu RNFile)
    // formData.append('file', {
    //   uri: file.uri,
    //   name: file.name,
    //   type: file.type,
    // } as any); 
    
    // Giữ nguyên theo code gốc nhưng sửa URL
    formData.append('file', file as any); // Giữ 'as any' để tránh lỗi TS

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // KHÔNG cần set Content-Type cho FormData, fetch/axios tự set với boundary

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload attachment: ${errorText}`);
    }

    const data = await response.json();
    return normalizeTaskResponse(data);
  },

  getKanbanView: async (filters?: any): Promise<any> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const queryParams = new URLSearchParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
    }

    // 💡 ĐÃ SỬA URL
    const url = `${API_URL}/tasks/kanban${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    console.log('Fetching kanban view from:', url);

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      if (response.status === 403) {
        const errorText = await response.text();
        let errorMessage = 'You must join or create a group to manage tasks';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default message if parsing fails
        }
        throw new Error(errorMessage);
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch kanban view: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Raw kanban API response:', responseData);

    return responseData.data || responseData;
  },

  // Get calendar view
  getCalendarView: async (year: number, month: number): Promise<any> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const url = `${API_URL}/tasks/calendar?year=${year}&month=${month}`;

    console.log('Fetching calendar view from:', url);

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      if (response.status === 403) {
        const errorText = await response.text();
        let errorMessage = 'You must join or create a group to manage tasks';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default message if parsing fails
        }
        throw new Error(errorMessage);
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch calendar view: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Raw calendar API response:', responseData);

    return responseData.data || responseData;
  },

  // Update comment
  updateComment: async (taskId: string, commentId: string, userId: string, content: string): Promise<any> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Updating comment:', { taskId, commentId, content });

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to update comment: ${response.status}`);
    }

    const data = await response.json();
    console.log('Update comment response:', data);
    return data;
  },

  // Delete comment
  deleteComment: async (taskId: string, commentId: string, userId: string): Promise<any> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Deleting comment:', { taskId, commentId });

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to delete comment: ${response.status}`);
    }

    const data = await response.json();
    console.log('Delete comment response:', data);
    return data;
  },

  // NEW: Assign users to task
  assignUsersToTask: async (taskId: string, userIds: string[]): Promise<any> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Assigning users to task:', { taskId, userIds });

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ userIds }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to assign users: ${response.status}`);
    }

    const data = await response.json();
    console.log('Assign users response:', data);
    return data;
  },

  // NEW: Unassign user from task
  unassignUserFromTask: async (taskId: string, userId: string): Promise<any> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Unassigning user from task:', { taskId, userId });

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/unassign/${userId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to unassign user: ${response.status}`);
    }

    const data = await response.json();
    console.log('Unassign user response:', data);
    return data;
  },

  // NEW: Get task assignees
  getTaskAssignees: async (taskId: string): Promise<any> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Getting task assignees:', taskId);

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/assignees`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to get task assignees: ${response.status}`);
    }

    const data = await response.json();
    console.log('Task assignees response:', data);
    return data;
  },

  // NEW: Start timer for task
  startTimer: async (taskId: string): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA

    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Starting timer for task:', taskId);

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/start-timer`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to start timer: ${response.status}`);
    }

    const data = await response.json();
    return normalizeTaskResponse(data);
  },

  // NEW: Stop timer for task
  stopTimer: async (taskId: string): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA

    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Stopping timer for task:', taskId);

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/stop-timer`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to stop timer: ${response.status}`);
    }

    const data = await response.json();
    return normalizeTaskResponse(data);
  },

  // NEW: Set custom status for task
  setCustomStatus: async (taskId: string, name: string, color: string): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Setting custom status for task:', { taskId, name, color });

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/custom-status`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ name, color }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to set custom status: ${response.status}`);
    }

    const data = await response.json();
    return normalizeTaskResponse(data);
  },

  // NEW: Set task repetition settings
  setTaskRepetition: async (taskId: string, repetitionSettings: any): Promise<Task> => {
    const token = await authService.getAuthToken(); // 💡 ĐÃ SỬA

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Setting task repetition for task:', { taskId, repetitionSettings });

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/tasks/${taskId}/repeat`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(repetitionSettings),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to set task repetition: ${response.status}`);
    }

    const data = await response.json();
    return normalizeTaskResponse(data);
  }
};