// File: services/chat.service.ts (React Native Version - Đầy Đủ)

import apiClient from '../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { API_URL } from '../config/api.config'; 

// --- INTERFACES (Đầy đủ từ bản Web cũ) ---

export interface ConversationUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface DirectConversationSummary {
  _id: string;
  participants: ConversationUser[];
  targetUser: ConversationUser | null;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  lastMessageSender?: string | null;
  unreadCount: number;
}

export interface DirectMessagesResponse extends MessagesResponse {
  conversation: DirectConversationSummary | null;
}

export interface DirectParticipantSummary {
  userId: string;
  summary: DirectConversationSummary | null;
}

export interface ChatMessage {
  // ... (Các trường ChatMessage đã có)
  _id: string;
  groupId?: string; // Đã sửa lại là optional để tương thích với DM
  conversationId?: string;
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

// Loại file cho React Native
export interface RNFile {
    uri: string;
    name: string;
    type: string; // mimeType
}

class ChatService {
  // --- CHAT NHÓM (GROUP CHAT) ---

  /**
   * Lấy danh sách messages của group
   */
  async getMessages(
    groupId: string,
    options?: { page?: number; limit?: number; before?: string; after?: string }
  ): Promise<MessagesResponse> {
    try {
      const queryParts: string[] = [];
      if (options?.page) queryParts.push(`page=${options.page}`);
      if (options?.limit) queryParts.push(`limit=${options.limit}`);
      if (options?.before) queryParts.push(`before=${options.before}`);
      if (options?.after) queryParts.push(`after=${options.after}`);

      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

      const response = await apiClient.get<ApiResponse<MessagesResponse>>(
        `/chat/${groupId}/messages${queryString}`
      );
      return response.data.data;
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
      return response.data.data;
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
      return response.data.data;
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
      return response.data.data;
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
      return response.data.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Upload file/ảnh (Chat Nhóm)
   */
  async uploadAttachment(groupId: string, file: RNFile): Promise<{
    type: 'image' | 'file';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
  }> {
    try {
      const formData = new FormData();
      
      // Định dạng file cho FormData trong React Native
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any); 

      const token = await AsyncStorage.getItem('accessToken'); 

      // Sử dụng fetch để xử lý multipart/form-data
      const response = await fetch(`${API_URL}/chat/${groupId}/upload`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          // Không set Content-Type cho FormData
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
  
  
  // ----------------------------------------------------------------
  // --- CHAT RIÊNG (DIRECT MESSAGES - ĐÃ BỔ SUNG LẠI) ---
  // ----------------------------------------------------------------

  /**
   * Danh sách cuộc trò chuyện riêng
   */
  async getDirectConversations(): Promise<DirectConversationSummary[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ conversations: DirectConversationSummary[] }>>(
        '/chat/direct/conversations'
      );
      return response.data.data.conversations || [];
    } catch (error) {
      console.error('Error fetching direct conversations:', error);
      throw error;
    }
  }

  /**
   * Khởi tạo hoặc lấy cuộc trò chuyện riêng
   */
  async startDirectConversation(payload: { email?: string; userId?: string }): Promise<DirectConversationSummary> {
    try {
      const response = await apiClient.post<ApiResponse<{ conversation: DirectConversationSummary }>>(
        '/chat/direct/conversations',
        payload
      );
      return response.data.data.conversation;
    } catch (error) {
      console.error('Error starting direct conversation:', error);
      throw error;
    }
  }

  /**
   * Lấy tin nhắn chat riêng
   */
  async getDirectMessages(
    conversationId: string,
    options?: { page?: number; limit?: number; before?: string; after?: string }
  ): Promise<DirectMessagesResponse> {
    try {
      const queryParts: string[] = [];
      if (options?.page) queryParts.push(`page=${options.page}`);
      if (options?.limit) queryParts.push(`limit=${options.limit}`);
      if (options?.before) queryParts.push(`before=${options.before}`);
      if (options?.after) queryParts.push(`after=${options.after}`);

      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

      const response = await apiClient.get<ApiResponse<DirectMessagesResponse>>(
        `/chat/direct/conversations/${conversationId}/messages${queryString}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      throw error;
    }
  }

  /**
   * Gửi tin nhắn chat riêng
   */
  async sendDirectMessage(
    conversationId: string,
    data: { content?: string; replyTo?: string; attachments?: any[] }
  ): Promise<{ message: ChatMessage; participantSummaries: DirectParticipantSummary[] }> {
    try {
      const response = await apiClient.post<ApiResponse<{
        message: ChatMessage;
        participantSummaries: DirectParticipantSummary[];
      }>>(`/chat/direct/conversations/${conversationId}/messages`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error sending direct message:', error);
      throw error;
    }
  }

  /**
   * Toggle reaction chat riêng
   */
  async toggleDirectReaction(messageId: string, emoji: string) {
    try {
      const response = await apiClient.post<ApiResponse<{
        message: ChatMessage;
        added: boolean;
        reaction: any;
      }>>(`/chat/direct/messages/${messageId}/reactions`, { emoji });
      return response.data.data;
    } catch (error) {
      console.error('Error toggling direct reaction:', error);
      throw error;
    }
  }

  /**
   * Sửa tin nhắn chat riêng
   */
  async editDirectMessage(messageId: string, content: string): Promise<ChatMessage> {
    try {
      const response = await apiClient.put<ApiResponse<ChatMessage>>(
        `/chat/direct/messages/${messageId}`,
        { content }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error editing direct message:', error);
      throw error;
    }
  }

  /**
   * Xóa tin nhắn chat riêng
   */
  async deleteDirectMessage(messageId: string): Promise<ChatMessage> {
    try {
      const response = await apiClient.delete<ApiResponse<ChatMessage>>(
        `/chat/direct/messages/${messageId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error deleting direct message:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu conversation đã đọc
   */
  async markAsRead(conversationId: string): Promise<void> {
    try {
      await apiClient.put(`/chat/direct/conversations/${conversationId}/read`, {});
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }
  
  /**
   * Upload file chat riêng
   */
  async uploadDirectAttachment(conversationId: string, file: RNFile): Promise<{
    type: 'image' | 'file';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any); 

      const token = await AsyncStorage.getItem('accessToken'); 

      // Sử dụng fetch cho upload file
      const response = await fetch(`${API_URL}/chat/direct/conversations/${conversationId}/upload`, {
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
      console.error('Error uploading direct attachment:', error);
      throw error;
    }
  }
}

export const chatService = new ChatService();