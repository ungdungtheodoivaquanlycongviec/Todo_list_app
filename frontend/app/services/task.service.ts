import { Task } from './types/task.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

console.log('API_BASE_URL:', API_BASE_URL);

// Hàm helper để lấy token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || 
           localStorage.getItem('accessToken') ||
           sessionStorage.getItem('token') ||
           sessionStorage.getItem('accessToken');
  }
  return null;
};

// Định nghĩa interface cho API response
interface TasksResponse {
  tasks: Task[];
  pagination: any;
}

export const taskService = {
  // Tạo task mới
  createTask: async (taskData: any): Promise<Task> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    console.log('Current token:', token);

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found');
    }

    console.log('Sending request to:', `${API_BASE_URL}/tasks`);
    console.log('With data:', taskData);

    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('accessToken');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      
      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorMessage = `Failed to create task: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Nếu không parse được JSON, dùng text
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  // Lấy danh sách tasks
  getAllTasks: async (filters?: any, options?: any): Promise<TasksResponse> => {
    const token = getAuthToken();
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

    const url = `${API_BASE_URL}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('Fetching tasks from:', url);
    
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('accessToken');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      
      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorMessage = `Failed to fetch tasks: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Nếu không parse được JSON, dùng text
      }
      
      throw new Error(errorMessage);
    }
    
    const responseData = await response.json();
    console.log('Raw API response:', responseData);
    
    // Chuẩn hóa response structure - chỉ trả về tasks và pagination
    // Dựa trên controller của bạn, response có thể có nhiều dạng
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
      tasks,
      pagination
    };
  },

  // Các method khác giữ nguyên...
  getTaskById: async (id: string): Promise<Task> => {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('accessToken');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      
      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorMessage = `Failed to fetch task: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Nếu không parse được JSON, dùng text
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  updateTask: async (id: string, updateData: any): Promise<Task> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('accessToken');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      
      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorMessage = `Failed to update task: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Nếu không parse được JSON, dùng text
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  deleteTask: async (id: string): Promise<void> => {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('accessToken');
        }
        throw new Error('Authentication failed. Please login again.');
      }
      
      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorMessage = `Failed to delete task: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Nếu không parse được JSON, dùng text
      }
      
      throw new Error(errorMessage);
    }
  },
};