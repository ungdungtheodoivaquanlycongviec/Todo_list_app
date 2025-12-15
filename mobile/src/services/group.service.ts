import AsyncStorage from '@react-native-async-storage/async-storage';
import { Group } from '../types/group.types';
import { authService } from './auth.service';
// 💡 ĐÃ SỬA: Import API_URL thay vì API_BASE_URL
import { API_URL } from '../config/api.config'; 

// Helper để normalize response từ backend
const normalizeGroupResponse = (data: any): Group => {
  if (data.data?.group) {
    return data.data.group;
  }
  if (data.group) {
    return data.group;
  }
  if (data.data && !data.group) {
    return data.data;
  }
  return data;
};

// Định nghĩa interface cho API response
interface GroupsResponse {
  myGroups: Group[];
  sharedGroups: Group[];
  allGroups: Group[];
  pagination: any;
}

export const groupService = {
  // Tạo group mới
  createGroup: async (groupData: any): Promise<Group> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      let errorMessage = `Failed to create group: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const group = normalizeGroupResponse(data);
    
    // Update user in AsyncStorage if updatedUser is provided
    if (data.updatedUser) {
      await AsyncStorage.setItem('user', JSON.stringify(data.updatedUser));
    }
    
    return group;
  },

  // Lấy danh sách groups của user
  getAllGroups: async (filters?: any, options?: any): Promise<GroupsResponse> => {
    const token = await authService.getAuthToken(); 
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

    if (options) {
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
          queryParams.append(key, options[key]);
        }
      });
    }

    // 💡 ĐÃ SỬA URL
    const url = `${API_URL}/groups${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to fetch groups: ${response.status}`);
    }

    const responseData = await response.json();

    // Normalize response structure
    let myGroups: Group[] = [];
    let sharedGroups: Group[] = [];
    let allGroups: Group[] = [];
    let pagination = {};

    if (responseData.data) {
      myGroups = responseData.data.myGroups || [];
      sharedGroups = responseData.data.sharedGroups || [];
      allGroups = responseData.data.allGroups || [];
      pagination = responseData.data.pagination || {};
    } else if (Array.isArray(responseData.groups)) {
      allGroups = responseData.groups;
      pagination = responseData.pagination || {};
    } else if (Array.isArray(responseData)) {
      allGroups = responseData;
      pagination = { total: responseData.length, page: 1, limit: responseData.length, totalPages: 1 };
    }

    return {
      myGroups: myGroups || [],
      sharedGroups: sharedGroups || [],
      allGroups: allGroups || [],
      pagination
    };
  },

  // Lấy chi tiết group theo ID
  getGroupById: async (id: string): Promise<Group> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${id}`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to fetch group: ${response.status}`);
    }

    const data = await response.json();
    return normalizeGroupResponse(data);
  },

  // Cập nhật group
  updateGroup: async (id: string, updateData: any): Promise<Group> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to update group: ${response.status}`);
    }

    const data = await response.json();
    return normalizeGroupResponse(data);
  },

  // Xóa group
  deleteGroup: async (id: string): Promise<void> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${id}`, {
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
      throw new Error(`Failed to delete group: ${response.status}`);
    }
  },

  // Tham gia group
  joinGroup: async (id: string): Promise<Group> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${id}/join`, {
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
      let errorMessage = `Failed to join group: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return normalizeGroupResponse(data);
  },

  // Chuyển sang group khác
  switchToGroup: async (id: string): Promise<{ user: any; group: Group }> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${id}/switch`, {
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
      let errorMessage = `Failed to switch to group: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Update user in AsyncStorage if updatedUser is provided
    if (data.data?.user) {
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data.data || data;
  },

  // Mời user vào group
  inviteUserToGroup: async (id: string, email: string): Promise<any> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${id}/invite`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      let errorMessage = `Failed to invite user: ${response.status}`;

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

  // Rời khỏi group
  leaveGroup: async (id: string): Promise<void> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${id}/leave`, {
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
      throw new Error(`Failed to leave group: ${response.status}`);
    }
  },

  // Lấy tasks của group
  getGroupTasks: async (id: string, filters?: any, options?: any): Promise<any> => {
    const token = await authService.getAuthToken(); 
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

    if (options) {
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined && options[key] !== null && options[key] !== '') {
          queryParams.append(key, options[key]);
        }
      });
    }

    // 💡 ĐÃ SỬA URL
    const url = `${API_URL}/groups/${id}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }

      const errorText = await response.text();
      throw new Error(`Failed to fetch group tasks: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.data || responseData;
  },

  // Xóa thành viên khỏi group
  removeMember: async (groupId: string, memberId: string): Promise<void> => {
    const token = await authService.getAuthToken(); 
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 💡 ĐÃ SỬA URL
    const response = await fetch(`${API_URL}/groups/${groupId}/members/${memberId}`, {
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
      let errorMessage = `Failed to remove member: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }
  }
};