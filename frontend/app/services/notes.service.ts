import apiClient from './api.client';
import type { ApiResponse } from './types/auth.types';

export interface Note {
  _id?: string;
  title: string;
  content: string;
  lastEdited: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  formattedLastEdited?: string;
}

class NotesService {
  // Lấy tất cả notes của user
  async getAllNotes(search?: string, page = 1, limit = 50): Promise<Note[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const response = await apiClient.get<ApiResponse<{ notes: Note[] }>>(`/notes?${params.toString()}`);
      return response.data?.notes || [];
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Re-throw the error to be handled by the calling component
      throw error;
    }
  }

  // Lấy note theo ID
  async getNoteById(noteId: string): Promise<Note> {
    try {
      const response = await apiClient.get<ApiResponse<{ note: Note }>>(`/notes/${noteId}`);
      return response.data.note;
    } catch (error) {
      console.error('Error fetching note:', error);
      throw error;
    }
  }

  // Tạo note mới
  async createNote(noteData: Partial<Note>): Promise<Note> {
    try {
      const response = await apiClient.post<ApiResponse<{ note: Note }>>('/notes', noteData);
      return response.data.note;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  // Cập nhật note
  async updateNote(noteId: string, noteData: Partial<Note>): Promise<Note> {
    try {
      const response = await apiClient.put<ApiResponse<{ note: Note }>>(`/notes/${noteId}`, noteData);
      return response.data.note;
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
