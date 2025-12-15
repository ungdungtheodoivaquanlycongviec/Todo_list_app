// File: services/folder.service.ts (React Native Version)

import { authService } from './auth.service';
import { Folder, FolderListResponse } from '../types/folder.types';
// 💡 ĐÃ SỬA: Import API_URL đã được cấu hình đúng IP từ file cấu hình
import { API_URL } from '../config/api.config'; 
// XÓA: const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api'; 


// 1. CHUYỂN THÀNH ASYNC và SỬ DỤNG AWAIT
const buildHeaders = async (contentType: 'json' | 'none' = 'json'): Promise<HeadersInit> => {
  const headers: HeadersInit = {};
  if (contentType === 'json') {
    headers['Content-Type'] = 'application/json';
  }

  // Lấy token BẤT ĐỒNG BỘ từ authService
  const token = await authService.getAuthToken(); 
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Hàm xử lý phản hồi (giữ nguyên)
const handleResponse = async (response: Response) => {
// ... (Hàm này giữ nguyên)
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
  async getFolders(groupId: string): Promise<FolderListResponse> {
    if (!groupId) {
      throw new Error('Group ID is required to fetch folders');
    }

    // 💡 ĐÃ SỬA: Dùng API_URL
    const response = await fetch(`${API_URL}/groups/${groupId}/folders`, {
      method: 'GET',
      headers: await buildHeaders('none'),
      // XÓA credentials: 'include' (Nếu có)
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  // --- CREATE FOLDER ---
  async createFolder(groupId: string, payload: { name: string; description?: string }): Promise<Folder> {
    if (!groupId) {
      throw new Error('Group ID is required to create folder');
    }

    // 💡 ĐÃ SỬA: Dùng API_URL
    const response = await fetch(`${API_URL}/groups/${groupId}/folders`, {
      method: 'POST',
      headers: await buildHeaders(), 
      body: JSON.stringify(payload)
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  // --- UPDATE FOLDER ---
  async updateFolder(groupId: string, folderId: string, payload: Partial<Folder>): Promise<Folder> {
    // 💡 ĐÃ SỬA: Dùng API_URL
    const response = await fetch(`${API_URL}/groups/${groupId}/folders/${folderId}`, {
      method: 'PATCH',
      headers: await buildHeaders(), 
      body: JSON.stringify(payload)
    });

    const data = await handleResponse(response);
    return data.data || data;
  },

  // --- DELETE FOLDER ---
  async deleteFolder(groupId: string, folderId: string): Promise<void> {
    // 💡 ĐÃ SỬA: Dùng API_URL
    const response = await fetch(`${API_URL}/groups/${groupId}/folders/${folderId}`, {
      method: 'DELETE',
      headers: await buildHeaders('none'), 
    });

    await handleResponse(response);
  },

  // --- SET FOLDER MEMBERS (ASSIGN MEMBERS) ---
  async setFolderMembers(groupId: string, folderId: string, memberIds: string[]): Promise<Folder> {
    // 💡 ĐÃ SỬA: Dùng API_URL
    const response = await fetch(`${API_URL}/groups/${groupId}/folders/${folderId}/members`, {
      method: 'PUT',
      headers: await buildHeaders(), 
      body: JSON.stringify({ memberIds })
    });

    const data = await handleResponse(response);
    return data.data || data;
  }
};