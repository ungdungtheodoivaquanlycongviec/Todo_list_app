import apiClient from './api.client';
import { ApiResponse } from './types/auth.types';

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  isEmailVerified: boolean;
  // Business role inside project (assigned by admin, not per-group)
  groupRole?: string | null;
  // Leader flag (assigned by admin)
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
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get<ApiResponse<UsersResponse>>(
      `/admin/users?${params.toString()}`
    );
    return response.data;
  }

  // Get user by ID
  async getUserById(userId: string): Promise<AdminUser> {
    const response = await apiClient.get<ApiResponse<{ user: AdminUser }>>(
      `/admin/users/${userId}`
    );
    return response.data.user;
  }

  // Create user
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: 'user' | 'admin';
  }): Promise<AdminUser> {
    const response = await apiClient.post<ApiResponse<{ user: AdminUser }>>(
      '/admin/users',
      userData
    );
    return response.data.user;
  }

  // Update user
  async updateUser(userId: string, userData: Partial<AdminUser>): Promise<AdminUser> {
    const response = await apiClient.put<ApiResponse<{ user: AdminUser }>>(
      `/admin/users/${userId}`,
      userData
    );
    return response.data.user;
  }

  // Lock user
  async lockUser(userId: string): Promise<AdminUser> {
    const response = await apiClient.patch<ApiResponse<{ user: AdminUser }>>(
      `/admin/users/${userId}/lock`,
      {}
    );
    return response.data.user;
  }

  // Unlock user
  async unlockUser(userId: string): Promise<AdminUser> {
    const response = await apiClient.patch<ApiResponse<{ user: AdminUser }>>(
      `/admin/users/${userId}/unlock`,
      {}
    );
    return response.data.user;
  }

  // Assign admin role (Super Admin only)
  async assignAdminRole(userId: string): Promise<AdminUser> {
    const response = await apiClient.post<ApiResponse<{ user: AdminUser }>>(
      `/admin/users/${userId}/assign-admin`,
      {}
    );
    return response.data.user;
  }

  // Remove admin role (Super Admin only)
  async removeAdminRole(userId: string): Promise<AdminUser> {
    const response = await apiClient.post<ApiResponse<{ user: AdminUser }>>(
      `/admin/users/${userId}/remove-admin`,
      {}
    );
    return response.data.user;
  }

  // Send notification
  async sendNotification(data: SendNotificationRequest): Promise<{
    success: boolean;
    sentCount: number;
    recipients: string[];
  }> {
    const response = await apiClient.post<ApiResponse<{
      success: boolean;
      sentCount: number;
      recipients: string[];
    }>>(
      '/admin/notifications/send',
      data
    );
    return response.data;
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
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get<ApiResponse<LoginHistoryResponse>>(
      `/admin/login-history?${params.toString()}`
    );
    return response.data;
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
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get<ApiResponse<ActionLogsResponse>>(
      `/admin/action-logs?${params.toString()}`
    );
    return response.data;
  }

  // Get dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<ApiResponse<{ stats: DashboardStats }>>(
      '/admin/dashboard/stats'
    );
    return response.data.stats;
  }
}

export const adminService = new AdminService();

