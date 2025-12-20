import apiClient from '../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { API_URL } from '../config/api.config'; 

// --- INTERFACES (Đồng bộ hoàn toàn với Web) ---

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

// Interface quan trọng cho UI Chat
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
  // Bổ sung các trường thiếu so với bản nháp
  mentions?: {
    users?: string[];
    roles?: string[];
  } | string[]; // Support legacy format if needed
  
  messageType?: 'text' | 'call';
  
  callData?: {
    meetingId: string;
    callType: 'group' | 'direct';
    status: 'active' | 'ended';
    startedAt?: string;
    endedAt?: string;
    participants?: string[];
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

// Interface riêng cho File React Native
export interface RNFile {
  uri: string;
  name: string;
  type: string; // mimeType (image/jpeg, application/pdf...)
}

class ChatService {
  // ----------------------------------------------------------------
  // --- CHAT NHÓM (GROUP CHAT) ---
  // ----------------------------------------------------------------

  /**
   * Lấy danh sách messages của group
   */
  async getMessages(
    groupId: string,
    options?: { page?: number; limit?: number; before?: string; after?: string }
  ): Promise<MessagesResponse> {
    try {
      // Sử dụng URLSearchParams cho gọn và chuẩn
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.before) params.append('before', options.before);
      if (options?.after) params.append('after', options.after);

      const queryString = params.toString() ? `?${params.toString()}` : '';

      const response = await apiClient.get<ApiResponse<MessagesResponse>>(
        `/chat/${groupId}/messages${queryString}`
      );
      // Unwrap data: Axios(response) -> API(data) -> Payload(data)
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
   * Toggle reaction
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
      
      // Quan trọng: Append đúng cấu trúc object cho RN
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream', // Fallback type
      } as any); 

      const token = await AsyncStorage.getItem('accessToken'); 

      // Dùng fetch để tránh lỗi boundary của Axios trên RN
      const response = await fetch(`${API_URL}/chat/${groupId}/upload`, {
        method: 'POST',
        headers: {
          // Chỉ set Auth, KHÔNG set Content-Type để fetch tự xử lý multipart
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json(); 
        throw new Error(errorData.message || 'Failed to upload file');
      }

      const data = await response.json();
      return data.data; // Server thường trả về { success: true, data: { url: ... } }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }
  
  // ----------------------------------------------------------------
  // --- CHAT RIÊNG (DIRECT MESSAGES) ---
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
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.before) params.append('before', options.before);
      if (options?.after) params.append('after', options.after);

      const queryString = params.toString() ? `?${params.toString()}` : '';

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
   * Đánh dấu conversation đã đọc (Dùng khi mở màn hình chat)
   */
  async markAsRead(conversationId: string): Promise<void> {
    try {
      await apiClient.put(`/chat/direct/conversations/${conversationId}/read`, {});
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      // Không throw error ở đây để tránh chặn UI nếu API lỗi nhẹ
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
        type: file.type || 'application/octet-stream',
      } as any); 

      const token = await AsyncStorage.getItem('accessToken'); 

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