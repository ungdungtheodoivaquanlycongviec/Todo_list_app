import apiClient from './api.client';

export interface ChatMessage {
  _id: string;
  groupId?: string;
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

  /**
   * Danh sách cuộc trò chuyện riêng
   */
  async getDirectConversations(): Promise<DirectConversationSummary[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ conversations: DirectConversationSummary[] }>>(
        '/chat/direct/conversations'
      );
      return response.data.conversations || [];
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
      return response.data.conversation;
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
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.before) params.append('before', options.before);
      if (options?.after) params.append('after', options.after);

      const response = await apiClient.get<ApiResponse<DirectMessagesResponse>>(
        `/chat/direct/conversations/${conversationId}/messages?${params.toString()}`
      );
      return response.data;
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
      return response.data;
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
      return response.data;
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
      return response.data;
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
      return response.data;
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
  async uploadDirectAttachment(conversationId: string, file: File): Promise<{
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

      const response = await fetch(`${API_BASE_URL}/chat/direct/conversations/${conversationId}/upload`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
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

