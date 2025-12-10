import { authService } from './auth.service';
// 💡 ĐÃ SỬA: Thay thế API_BASE_URL bằng API_URL
import { API_URL } from '../config/api.config'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  type: 'group_invitation' | 'task_assignment' | 'group_update' | 'group_name_change' | 'new_task';
  title: string;
  message: string;
  data: {
    groupId?: string;
    groupName?: string;
    action?: string;
  };
  isRead: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
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

export const notificationService = {
  // Get all notifications for current user
  getNotifications: async (options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> => {
    // Cần sử dụng await/async vì authService.getAuthToken() có thể là async (tôi giả định như vậy)
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.unreadOnly) queryParams.append('unreadOnly', 'true');

    // 💡 ĐÃ SỬA URL
    const url = `${API_URL}/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      headers,
      // Xóa 'credentials: include' nếu không cần thiết trong React Native
      // credentials: 'include', 
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/unread-count`, {
      headers,
      // credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to fetch unread count: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<Notification> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers,
      // credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to mark notification as read: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers,
      // credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to mark all notifications as read: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Accept group invitation
  acceptGroupInvitation: async (id: string): Promise<{ group: any; user: any }> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/${id}/accept`, {
      method: 'POST',
      headers,
      // credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      let errorMessage = `Failed to accept group invitation: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Decline group invitation
  declineGroupInvitation: async (id: string): Promise<Notification> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/${id}/decline`, {
      method: 'POST',
      headers,
      // credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      let errorMessage = `Failed to decline group invitation: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<Notification> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers,
      // credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to delete notification: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Create notification for group name change
  createGroupNameChangeNotification: async (groupId: string, oldName: string, newName: string): Promise<void> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/group-name-change`, {
      method: 'POST',
      headers,
      // credentials: 'include',
      body: JSON.stringify({
        groupId,
        oldName,
        newName
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to create notification: ${response.status}`);
    }
  },

  // Create notification for new task
  createNewTaskNotification: async (groupId: string, taskTitle: string): Promise<void> => {
    // Cần sử dụng await/async
    const token = await authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/notifications/new-task`, {
      method: 'POST',
      headers,
      // credentials: 'include',
      body: JSON.stringify({
        groupId,
        taskTitle
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to create notification: ${response.status}`);
    }
  }
};