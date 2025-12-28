import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './auth.service';
import { API_URL } from '../config/api.config';
import { Group, GroupMember } from '../types/group.types';

// Interface response
interface GroupsResponse {
  myGroups: Group[];
  sharedGroups: Group[];
  allGroups: Group[];
  pagination: any;
}

// Helper để normalize response
const normalizeGroupResponse = (data: any): Group => {
  if (data.data?.group) return data.data.group;
  if (data.group) return data.group;
  if (data.data && !data.group) return data.data;
  return data;
};

// --- HELPER FUNCTION (Tối ưu hóa code lặp) ---
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}, returnFullResponse = false) => {
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

  // Xử lý riêng cho trường hợp cần check status code cụ thể (như getGroupById)
  if (returnFullResponse) return response;

  if (!response.ok) {
    if (response.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
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
  return data; 
};

export const groupService = {
  // Tạo group mới
  createGroup: async (groupData: any): Promise<Group> => {
    const data = await fetchWithAuth('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });

    const group = normalizeGroupResponse(data);

    if (data.updatedUser) {
      await AsyncStorage.setItem('user', JSON.stringify(data.updatedUser));
    }

    return group;
  },

  // Lấy danh sách groups
  getAllGroups: async (filters?: any, options?: any): Promise<GroupsResponse> => {
    const queryParams = new URLSearchParams();

    const mergeParams = { ...filters, ...options };
    Object.keys(mergeParams).forEach(key => {
      if (mergeParams[key] !== undefined && mergeParams[key] !== null && mergeParams[key] !== '') {
        queryParams.append(key, mergeParams[key]);
      }
    });

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const responseData = await fetchWithAuth(`/groups${queryString}`);

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

  // Lấy chi tiết group
  getGroupById: async (id: string): Promise<Group | null> => {
    const response = await fetchWithAuth(`/groups/${id}`, {}, true) as Response;

    if (!response.ok) {
      if (response.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw new Error('Authentication failed. Please login again.');
      }
      
      if (response.status === 403 || response.status === 404) {
        console.warn(`Group ${id} not accessible (${response.status}).`);
        return null;
      }

      const errorText = await response.text();
      throw new Error(`Failed to fetch group: ${response.status}`);
    }

    const data = await response.json();
    return normalizeGroupResponse(data);
  },

  // ✅ HÀM BẠN ĐANG THIẾU: Lấy danh sách thành viên
  getGroupMembers: async (groupId: string): Promise<GroupMember[]> => {
    try {
      // Gọi API lấy members trực tiếp
      const data = await fetchWithAuth(`/groups/${groupId}/members`);
      
      // Xử lý các dạng trả về khác nhau của Backend
      if (Array.isArray(data)) return data;
      if (data.data && Array.isArray(data.data)) return data.data;
      if (data.members && Array.isArray(data.members)) return data.members;
      
      return [];
    } catch (error) {
      console.warn('Fallback getting members from group details', error);
      // Fallback: Gọi getGroupById nếu API members lỗi
      const group = await groupService.getGroupById(groupId);
      return group?.members || [];
    }
  },

  // Cập nhật group
  updateGroup: async (id: string, updateData: any): Promise<Group> => {
    const data = await fetchWithAuth(`/groups/${id}`, {
      method: 'PATCH', // Hoặc PUT tùy backend
      body: JSON.stringify(updateData),
    });
    return normalizeGroupResponse(data);
  },

  // Xóa group
  deleteGroup: async (id: string): Promise<void> => {
    await fetchWithAuth(`/groups/${id}`, { method: 'DELETE' });
  },

  // Tham gia group
  joinGroup: async (id: string): Promise<Group> => {
    const data = await fetchWithAuth(`/groups/${id}/join`, { method: 'POST' });
    return normalizeGroupResponse(data);
  },

  // Chuyển sang group khác
  switchToGroup: async (id: string): Promise<{ user: any; group: Group }> => {
    const data = await fetchWithAuth(`/groups/${id}/switch`, { method: 'POST' });

    if (data.data?.user) {
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
    } else if (data.user) {
       await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }

    return data.data || data;
  },

  // Mời user
  inviteUserToGroup: async (id: string, email: string): Promise<any> => {
    const data = await fetchWithAuth(`/groups/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data.data || data;
  },

  // Rời group
  leaveGroup: async (id: string): Promise<void> => {
    await fetchWithAuth(`/groups/${id}/leave`, { method: 'POST' });
  },

  // Lấy tasks của group
  getGroupTasks: async (id: string, filters?: any, options?: any): Promise<any> => {
    const queryParams = new URLSearchParams();
    const mergeParams = { ...filters, ...options };
    
    Object.keys(mergeParams).forEach(key => {
      if (mergeParams[key] !== undefined && mergeParams[key] !== null && mergeParams[key] !== '') {
        queryParams.append(key, mergeParams[key]);
      }
    });

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const responseData = await fetchWithAuth(`/groups/${id}/tasks${queryString}`);
    
    return responseData.data || responseData;
  },

  // Xóa thành viên
  removeMember: async (groupId: string, memberId: string): Promise<void> => {
    await fetchWithAuth(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
  }
};