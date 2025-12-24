import { authService } from './auth.service';
import { API_URL } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types/auth.types'; // Đảm bảo file types đã có

// --- INTERFACES (Giữ nguyên từ bản Web) ---

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  isEmailVerified: boolean;
  groupRole?: string | null;
  isLeader?: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LoginHistory {
  _id: string;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  email: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'blocked';
  failureReason?: string;
  loginAt: string;
  createdAt: string;
}

export interface LoginHistoryResponse {
  history: LoginHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminActionLog {
  _id: string;
  admin: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  description: string;
  changes: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ActionLogsResponse {
  logs: AdminActionLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalAdmins: number;
  totalGroups: number;
  recentLogins: number;
  recentActions: number;
}

export interface SendNotificationRequest {
  title: string;
  message: string;
  recipients?: string[];
  groupId?: string;
  sendToAll?: boolean;
}

// --- HELPER FUNCTION (Tối ưu hóa code lặp) ---
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = await authService.getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      throw new Error('Authentication failed. Please login again.');
    }
    
    // Xử lý 403 Forbidden (Admin only)
    if (response.status === 403) {
       throw new Error('Access denied. Admin privileges required.');
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

  const data = await response.json();
  // Unwrap data structure: { success: true, data: ... } -> ...
  return data.data || data; 
};

class AdminService {
  // Get all users
  async getUsers(query?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<UsersResponse> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    return fetchWithAuth(`/admin/users?${params.toString()}`);
  }

  // Get user by ID
  async getUserById(userId: string): Promise<AdminUser> {
    const data = await fetchWithAuth(`/admin/users/${userId}`);
    return data.user;
  }

  // Create user
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: 'user' | 'admin';
  }): Promise<AdminUser> {
    const data = await fetchWithAuth('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data.user;
  }

  // Update user
  async updateUser(userId: string, userData: Partial<AdminUser>): Promise<AdminUser> {
    const data = await fetchWithAuth(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return data.user;
  }

  // Lock user
  async lockUser(userId: string): Promise<AdminUser> {
    const data = await fetchWithAuth(`/admin/users/${userId}/lock`, {
      method: 'PATCH',
    });
    return data.user;
  }

  // Unlock user
  async unlockUser(userId: string): Promise<AdminUser> {
    const data = await fetchWithAuth(`/admin/users/${userId}/unlock`, {
      method: 'PATCH',
    });
    return data.user;
  }

  // Assign admin role (Super Admin only)
  async assignAdminRole(userId: string): Promise<AdminUser> {
    const data = await fetchWithAuth(`/admin/users/${userId}/assign-admin`, {
      method: 'POST',
    });
    return data.user;
  }

  // Remove admin role (Super Admin only)
  async removeAdminRole(userId: string): Promise<AdminUser> {
    const data = await fetchWithAuth(`/admin/users/${userId}/remove-admin`, {
      method: 'POST',
    });
    return data.user;
  }

  // Send notification
  async sendNotification(data: SendNotificationRequest): Promise<{
    success: boolean;
    sentCount: number;
    recipients: string[];
  }> {
    return fetchWithAuth('/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get login history
  async getLoginHistory(query?: {
    page?: number;
    limit?: number;
    userId?: string;
    email?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<LoginHistoryResponse> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    return fetchWithAuth(`/admin/login-history?${params.toString()}`);
  }

  // Get action logs
  async getActionLogs(query?: {
    page?: number;
    limit?: number;
    adminId?: string;
    action?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ActionLogsResponse> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    return fetchWithAuth(`/admin/action-logs?${params.toString()}`);
  }

  // Get dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    const data = await fetchWithAuth('/admin/dashboard/stats');
    return data.stats;
  }
}

export const adminService = new AdminService();