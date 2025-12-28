import apiClient from '../api/apiClient';
import type { ApiResponse } from '../types/auth.types';

export interface Note {
  _id?: string;
  title: string;
  content: string;
  lastEdited: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  formattedLastEdited?: string;
  folderId?: string | null; // ✅ Đã thêm: Đồng bộ với Web
}

class NotesService {
  // Lấy tất cả notes của user
  // ✅ Đã thêm: tham số folderId
  async getAllNotes(search?: string, page = 1, limit = 50, folderId?: string): Promise<Note[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      // ✅ Đã thêm: Logic lọc theo folderId
      if (folderId) params.append('folderId', folderId);
      
      const response = await apiClient.get<ApiResponse<{ notes: Note[] }>>(`/notes?${params.toString()}`);
      
      // ⚠️ LƯU Ý: Kiểm tra lại cấu trúc trả về của Backend.
      // Nếu Web chạy đúng, có thể bạn cần đổi thành: return response.data?.notes || [];
      return response.data?.data?.notes || []; 
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  }

  // Lấy note theo ID
  async getNoteById(noteId: string): Promise<Note> {
    try {
      const response = await apiClient.get<ApiResponse<{ note: Note }>>(`/notes/${noteId}`);
      // ⚠️ LƯU Ý: Kiểm tra lại cấu trúc trả về
      return response.data?.data?.note;
    } catch (error) {
      console.error('Error fetching note:', error);
      throw error;
    }
  }

  // Tạo note mới
  async createNote(noteData: Partial<Note>): Promise<Note> {
    try {
      const response = await apiClient.post<ApiResponse<{ note: Note }>>('/notes', noteData);
      // ⚠️ LƯU Ý: Kiểm tra lại cấu trúc trả về
      return response.data?.data?.note;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  // Cập nhật note
  async updateNote(noteId: string, noteData: Partial<Note>): Promise<Note> {
    try {
      const response = await apiClient.put<ApiResponse<{ note: Note }>>(`/notes/${noteId}`, noteData);
      // ⚠️ LƯU Ý: Kiểm tra lại cấu trúc trả về
      return response.data?.data?.note;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  // Xóa note
  async deleteNote(noteId: string): Promise<void> {
    try {
      await apiClient.delete(`/notes/${noteId}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }
}

export const notesService = new NotesService();