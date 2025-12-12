import { authService } from './auth.service';
import { Folder, FolderListResponse } from './types/folder.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

const buildHeaders = (contentType: 'json' | 'none' = 'json'): HeadersInit => {
  const headers: HeadersInit = {};
  if (contentType === 'json') {
    headers['Content-Type'] = 'application/json';
  }

  const token = authService.getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed: ${response.status}`;
    let blockedUsers = null;
    try {
      const data = JSON.parse(errorText);
      errorMessage = data.message || errorMessage;
      blockedUsers = data.blockedUsers || null;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    const error = new Error(errorMessage) as Error & { blockedUsers?: unknown };
    if (blockedUsers) {
      error.blockedUsers = blockedUsers;
    }
    throw error;
  }
  return response.json();
};

export const folderService = {
  async getFolders(groupId: string): Promise<FolderListResponse> {
    if (!groupId) {
      throw new Error('Group ID is required to fetch folders');
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/folders`, {
      method: 'GET',
      headers: buildHeaders('none'),
      credentials: 'include'
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  async createFolder(groupId: string, payload: { name: string; description?: string }): Promise<Folder> {
    if (!groupId) {
      throw new Error('Group ID is required to create folder');
    }

    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/folders`, {
      method: 'POST',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  async updateFolder(groupId: string, folderId: string, payload: Partial<Folder>): Promise<Folder> {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/folders/${folderId}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  async deleteFolder(groupId: string, folderId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/folders/${folderId}`, {
      method: 'DELETE',
      headers: buildHeaders('none'),
      credentials: 'include'
    });

    await handleResponse(response);
  },

  async setFolderMembers(groupId: string, folderId: string, memberIds: string[]): Promise<Folder> {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/folders/${folderId}/members`, {
      method: 'PUT',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify({ memberIds })
    });

    const data = await handleResponse(response);
    return data.data || data;
  }
};

