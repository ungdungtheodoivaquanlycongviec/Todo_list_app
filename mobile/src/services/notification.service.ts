import { authService } from './auth.service';
import { API_URL } from '../config/api.config'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// ... (Giữ nguyên các Interface Notification và NotificationsResponse ở trên) ...
export interface Notification {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  type:
    | 'group_invitation'
    | 'task_assignment'
    | 'group_update'
    | 'group_name_change'
    | 'new_task'
    | 'chat_message';
  title: string;
  message: string;
  data: {
    taskId?: string;
    groupId?: string;
    groupName?: string;
    action?: string;
    contextType?: 'group' | 'direct';
    conversationId?: string | null;
    messageId?: string | null;
    [key: string]: any;
  };
  isRead: boolean;
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 🔥 ĐÃ SỬA LỖI Ở HÀM NÀY
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = await authService.getAuthToken();
  
  // ⚠️ THAY ĐỔI: Dùng Record<string, string> thay vì HeadersInit
  // Điều này cho phép bạn gán headers['Authorization'] mà không bị lỗi
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any), // Ép kiểu để merge headers cũ
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers, // Fetch chấp nhận Record<string, string> nên dòng này hợp lệ
  });

  if (!response.ok) {
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      // Nếu có authService.logout() thì gọi ở đây
      throw new Error('Authentication failed. Please login again.');
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
  return data.data || data;
};

// ... (Phần export const notificationService giữ nguyên như file trước) ...
export const notificationService = {
  // Get all notifications
  getNotifications: async (options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> => {
    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.unreadOnly) queryParams.append('unreadOnly', 'true');

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return fetchWithAuth(`/notifications${queryString}`);
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    return fetchWithAuth('/notifications/unread-count');
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return fetchWithAuth(`/notifications/${id}/read`, { method: 'PATCH' });
  },

 // Mark all as read
  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    // 👇 ĐÃ SỬA: Thay dấu ` ở cuối chuỗi bằng dấu '
    return fetchWithAuth('/notifications/mark-all-read', { method: 'PATCH' });
  },

  acceptGroupInvitation: async (id: string): Promise<{ group: any; user: any }> => {
    return fetchWithAuth(`/notifications/${id}/accept`, { method: 'POST' });
  },

  declineGroupInvitation: async (id: string): Promise<Notification> => {
    return fetchWithAuth(`/notifications/${id}/decline`, { method: 'POST' });
  },

  deleteNotification: async (id: string): Promise<Notification> => {
    return fetchWithAuth(`/notifications/${id}`, { method: 'DELETE' });
  },

  updatePreferences: async (preferences: any): Promise<any> => {
    return fetchWithAuth('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  },

  archiveNotifications: async (ids: string[]): Promise<any> => {
    return fetchWithAuth('/notifications/archive', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    });
  },

  deleteNotifications: async (ids: string[]): Promise<any> => {
    return fetchWithAuth('/notifications', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  createGroupNameChangeNotification: async (groupId: string, oldName: string, newName: string): Promise<void> => {
    return fetchWithAuth('/notifications/group-name-change', {
      method: 'POST',
      body: JSON.stringify({ groupId, oldName, newName }),
    });
  },

  createNewTaskNotification: async (groupId: string, taskTitle: string): Promise<void> => {
    return fetchWithAuth('/notifications/new-task', {
      method: 'POST',
      body: JSON.stringify({ groupId, taskTitle }),
    });
  }
};