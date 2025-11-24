import { Group } from './types/group.types';
import { authService } from './auth.service';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(groupData),
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
    
    // Update user in localStorage if updatedUser is provided
    if (data.updatedUser && typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data.updatedUser));
    }
    
    return group;
  },

  // Lấy danh sách groups của user
  getAllGroups: async (filters?: any, options?: any): Promise<GroupsResponse> => {
    const token = authService.getAuthToken();
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

    const url = `${API_BASE_URL}/groups${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
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
      throw new Error(`Failed to fetch group: ${response.status}`);
    }

    const data = await response.json();
    return normalizeGroupResponse(data);
  },

  // Cập nhật group
  updateGroup: async (id: string, updateData: any): Promise<Group> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(updateData),
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
      throw new Error(`Failed to update group: ${response.status}`);
    }

    const data = await response.json();
    return normalizeGroupResponse(data);
  },

  // Xóa group
  deleteGroup: async (id: string): Promise<void> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
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
      throw new Error(`Failed to delete group: ${response.status}`);
    }
  },

  // Tham gia group
  joinGroup: async (id: string): Promise<Group> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups/${id}/join`, {
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
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups/${id}/switch`, {
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
    
    // Update user in localStorage if updatedUser is provided
    if (data.data?.user && typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data.data || data;
  },

  // Mời user vào group
  inviteUserToGroup: async (id: string, email: string, role: string): Promise<any> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/groups/${id}/invite`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ email, role }),
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

  updateMemberRole: async (groupId: string, memberId: string, role: string): Promise<Group> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${memberId}/role`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ role })
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
      let errorMessage = `Failed to update member role: ${response.status}`;

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

  // Rời khỏi group
  leaveGroup: async (id: string): Promise<void> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups/${id}/leave`, {
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
      throw new Error(`Failed to leave group: ${response.status}`);
    }
  },

  // Lấy tasks của group
  getGroupTasks: async (id: string, filters?: any, options?: any): Promise<any> => {
    const token = authService.getAuthToken();
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

    const url = `${API_BASE_URL}/groups/${id}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

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
      throw new Error(`Failed to fetch group tasks: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData.data || responseData;
  },

  // Xóa thành viên khỏi group
  removeMember: async (groupId: string, memberId: string): Promise<void> => {
    const token = authService.getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${memberId}`, {
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
