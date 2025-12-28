import { authService } from './auth.service';
import { Folder, FolderListResponse } from '../types/folder.types';
import { API_URL } from '../config/api.config'; 

// Hàm build headers (Giữ nguyên)
const buildHeaders = async (contentType: 'json' | 'none' = 'json'): Promise<HeadersInit> => {
  const headers: HeadersInit = {};
  if (contentType === 'json') {
    headers['Content-Type'] = 'application/json';
  }
  const token = await authService.getAuthToken(); 
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Hàm handleResponse (Giữ nguyên)
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const data = JSON.parse(errorText);
      errorMessage = data.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return response.json(); 
};

export const folderService = {
  // --- GET FOLDERS ---
  // ✅ Thêm tham số isPersonal
  async getFolders(targetId: string, isPersonal: boolean = false): Promise<FolderListResponse> {
    if (!targetId) throw new Error('Target ID is required');

    // ✅ Logic chuyển đổi URL: Nếu là Personal -> /folders, ngược lại -> /groups/...
    const url = isPersonal 
      ? `${API_URL}/folders` 
      : `${API_URL}/groups/${targetId}/folders`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await buildHeaders('none'),
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  // --- CREATE FOLDER ---
  // ✅ Thêm tham số isPersonal
  async createFolder(targetId: string, payload: { name: string; description?: string }, isPersonal: boolean = false): Promise<Folder> {
    if (!targetId) throw new Error('Target ID is required');

    const url = isPersonal 
      ? `${API_URL}/folders` 
      : `${API_URL}/groups/${targetId}/folders`;

    const response = await fetch(url, {
      method: 'POST',
      headers: await buildHeaders(), 
      body: JSON.stringify(payload)
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  // --- UPDATE FOLDER (ĐÃ SỬA: Thêm logic isPersonal) ---
  async updateFolder(targetId: string, folderId: string, payload: Partial<Folder>, isPersonal: boolean = false): Promise<Folder> {
    // Logic: Nếu là Personal thì gọi /folders/:id, nếu là Group thì gọi /groups/:groupId/folders/:id
    const url = isPersonal
      ? `${API_URL}/folders/${folderId}`
      : `${API_URL}/groups/${targetId}/folders/${folderId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: await buildHeaders(), 
      body: JSON.stringify(payload)
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  // --- DELETE FOLDER ---
  async deleteFolder(targetId: string, folderId: string, isPersonal: boolean = false): Promise<void> {
    const url = isPersonal
        ? `${API_URL}/folders/${folderId}`
        : `${API_URL}/groups/${targetId}/folders/${folderId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: await buildHeaders('none'), 
    });

    await handleResponse(response);
  },

  // --- SET FOLDER MEMBERS (ĐÃ SỬA: Thêm logic isPersonal) ---
  async setFolderMembers(targetId: string, folderId: string, memberIds: string[], isPersonal: boolean = false): Promise<Folder> {
    const url = isPersonal
        ? `${API_URL}/folders/${folderId}/members`
        : `${API_URL}/groups/${targetId}/folders/${folderId}/members`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: await buildHeaders(), 
      body: JSON.stringify({ memberIds })
    });

    const data = await handleResponse(response);
    return data.data || data;
  }
};