import { authService } from './auth.service';
import { API_URL } from '../config/api.config'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ ĐÃ ĐỒNG BỘ: Interface đầy đủ như bản Web để hỗ trợ Chat và Task mới
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
    [key: string]: any; // Hỗ trợ các trường dữ liệu linh hoạt khác
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

export const notificationService = {
  // Helper lấy headers với token (giảm lặp code)
  getHeaders: async () => {
    const token = await authService.getAuthToken();
    if (!token) throw new Error('No authentication token found');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  },

  // 1. Lấy tất cả thông báo
  getNotifications: async (options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> => {
    const headers = await notificationService.getHeaders();
    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.unreadOnly) queryParams.append('unreadOnly', 'true');

    const url = `${API_URL}/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // 2. Lấy số lượng chưa đọc
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/unread-count`, { headers });
    const data = await response.json();
    return data.data || data;
  },

  // 3. Đánh dấu 1 thông báo là đã đọc
  markAsRead: async (id: string): Promise<Notification> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers,
    });
    const data = await response.json();
    return data.data || data;
  },

  // 4. Đánh dấu tất cả là đã đọc
  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers,
    });
    const data = await response.json();
    return data.data || data;
  },

  // 5. Chấp nhận lời mời vào nhóm
  acceptGroupInvitation: async (id: string): Promise<{ group: any; user: any }> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/${id}/accept`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to accept invitation');
    }
    const data = await response.json();
    return data.data || data;
  },

  // 6. Từ chối lời mời
  declineGroupInvitation: async (id: string): Promise<Notification> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/${id}/decline`, {
      method: 'POST',
      headers,
    });
    const data = await response.json();
    return data.data || data;
  },

  // 7. Xóa 1 thông báo
  deleteNotification: async (id: string): Promise<Notification> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers,
    });
    const data = await response.json();
    return data.data || data;
  },

  // 8. Cập nhật cài đặt nhận thông báo (MỚI BỔ SUNG)
  updatePreferences: async (preferences: any): Promise<any> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/preferences`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(preferences),
    });
    const data = await response.json();
    return data.data || data;
  },

  // 9. Lưu trữ thông báo (MỚI BỔ SUNG)
  archiveNotifications: async (ids: string[]): Promise<any> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications/archive`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ids }),
    });
    const data = await response.json();
    return data.data || data;
  },

  // 10. Xóa nhiều thông báo cùng lúc (MỚI BỔ SUNG)
  deleteNotifications: async (ids: string[]): Promise<any> => {
    const headers = await notificationService.getHeaders();
    const response = await fetch(`${API_URL}/notifications`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids }),
    });
    const data = await response.json();
    return data.data || data;
  },

  // 11. Tạo thông báo đổi tên nhóm
  createGroupNameChangeNotification: async (groupId: string, oldName: string, newName: string): Promise<void> => {
    const headers = await notificationService.getHeaders();
    await fetch(`${API_URL}/notifications/group-name-change`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId, oldName, newName }),
    });
  },

  // 12. Tạo thông báo có Task mới
  createNewTaskNotification: async (groupId: string, taskTitle: string): Promise<void> => {
    const headers = await notificationService.getHeaders();
    await fetch(`${API_URL}/notifications/new-task`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId, taskTitle }),
    });
  }
};