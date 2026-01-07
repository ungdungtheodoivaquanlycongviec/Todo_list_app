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
  folderId?: string | null;
  // New fields
  isBookmarked?: boolean;
  visibility?: 'private' | 'folder' | 'specific';
  sharedWith?: string[];
  tags?: string[];
}

class NotesService {
  // Lấy tất cả notes của user
  async getAllNotes(search?: string, page = 1, limit = 50, folderId?: string): Promise<Note[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (folderId) params.append('folderId', folderId);

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

  // Toggle bookmark status
  async toggleBookmark(noteId: string): Promise<Note> {
    try {
      const response = await apiClient.patch<ApiResponse<{ note: Note }>>(`/notes/${noteId}/bookmark`);
      return response.data.note;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw error;
    }
  }

  // Update sharing settings
  async updateSharing(noteId: string, visibility: 'private' | 'folder' | 'specific', sharedWith?: string[]): Promise<Note> {
    try {
      const response = await apiClient.patch<ApiResponse<{ note: Note }>>(`/notes/${noteId}/sharing`, {
        visibility,
        sharedWith
      });
      return response.data.note;
    } catch (error) {
      console.error('Error updating sharing:', error);
      throw error;
    }
  }

  // Remove a tag
  async removeTag(noteId: string, tag: string): Promise<Note> {
    try {
      const response = await apiClient.delete<ApiResponse<{ note: Note }>>(`/notes/${noteId}/tags`, {
        data: { tag }
      });
      return response.data.note;
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }
}

export const notesService = new NotesService();
