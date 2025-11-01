import apiClient from './api.client';

export interface ChatMessage {
  _id: string;
  groupId: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  attachments?: Array<{
    type: 'image' | 'file';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
  }>;
  reactions?: Array<{
    emoji: string;
    userId: string;
    createdAt: string;
  }>;
  replyTo?: {
    _id: string;
    content: string;
    senderId: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    createdAt: string;
    deletedAt?: string;
  };
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

class ChatService {
  /**
   * Lấy danh sách messages của group
   */
  async getMessages(
    groupId: string,
    options?: { page?: number; limit?: number; before?: string; after?: string }
  ): Promise<MessagesResponse> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.before) params.append('before', options.before);
      if (options?.after) params.append('after', options.after);

      const response = await apiClient.get<ApiResponse<MessagesResponse>>(
        `/chat/${groupId}/messages?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Tạo message mới
   */
  async createMessage(
    groupId: string,
    data: { content?: string; replyTo?: string; attachments?: any[] }
  ): Promise<ChatMessage> {
    try {
      const response = await apiClient.post<ApiResponse<ChatMessage>>(
        `/chat/${groupId}/messages`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Toggle reaction cho message
   */
  async toggleReaction(messageId: string, emoji: string): Promise<{
    message: ChatMessage;
    added: boolean;
    reaction: any;
  }> {
    try {
      const response = await apiClient.post<ApiResponse<{
        message: ChatMessage;
        added: boolean;
        reaction: any;
      }>>(`/chat/messages/${messageId}/reactions`, { emoji });
      return response.data;
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  }

  /**
   * Sửa message
   */
  async editMessage(messageId: string, content: string): Promise<ChatMessage> {
    try {
      const response = await apiClient.put<ApiResponse<ChatMessage>>(
        `/chat/messages/${messageId}`,
        { content }
      );
      return response.data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Xóa message
   */
  async deleteMessage(messageId: string): Promise<ChatMessage> {
    try {
      const response = await apiClient.delete<ApiResponse<ChatMessage>>(
        `/chat/messages/${messageId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Upload file/ảnh
   */
  async uploadAttachment(groupId: string, file: File): Promise<{
    type: 'image' | 'file';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch(`${API_BASE_URL}/chat/${groupId}/upload`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();

