import { authService } from './auth.service';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

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
  | 'chat_message'
  | 'comment_added'
  | 'mention';
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
    // For chat/task events we store extra info here
    [key: string]: any;
  };
  isRead: boolean;
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Count of consolidated messages (for grouped notifications)
  messageCount?: number;
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
    const token = authService.getAuthToken();
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

    const url = `${API_BASE_URL}/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/${id}/accept`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/${id}/decline`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/notifications/group-name-change`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        groupId,
        oldName,
        newName
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to create notification: ${response.status}`);
    }
  },

  // Create notification for new task
  createNewTaskNotification: async (groupId: string, taskTitle: string): Promise<void> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/notifications/new-task`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        groupId,
        taskTitle
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to create notification: ${response.status}`);
    }
  },

  // Update notification preferences
  updatePreferences: async (preferences: any): Promise<any> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to update preferences: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Archive notifications
  archiveNotifications: async (ids: string[]): Promise<any> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications/archive`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to archive notifications: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  },

  // Delete notifications (bulk)
  deleteNotifications: async (ids: string[]): Promise<any> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to delete notifications: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }
};
