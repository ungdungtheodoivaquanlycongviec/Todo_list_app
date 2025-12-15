import apiClient from '../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse
} from '../types/auth.types';

// 🚨 Biến Cache trong bộ nhớ tạm thời (In-Memory Cache)
// Biến này giải quyết Race Condition, đảm bảo token mới nhất luôn có sẵn SYNC.
let authTokenCache: string | null = null; 

class AuthService {
  
  // 🔹 Private method để thiết lập cache trong bộ nhớ
  private setAuthTokenInMemory(token: string | null): void {
    authTokenCache = token;
  }
  
  // 🔹 Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    const authData = response.data.data;
    
    // 🚨 QUAN TRỌNG: Gọi saveTokens ngay sau khi login thành công
    if (authData.accessToken && authData.refreshToken) {
      await this.saveTokens(authData.accessToken, authData.refreshToken);
    }
    
    return authData;
  }

  // 🔹 Google login
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/google',
      { idToken }
    );
    const authData = response.data.data;
    
    // 🚨 QUAN TRỌNG: Gọi saveTokens ngay sau khi login thành công
    if (authData.accessToken && authData.refreshToken) {
      await this.saveTokens(authData.accessToken, authData.refreshToken);
    }
    
    return authData;
  }

  // 🔹 Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      userData
    );
    const authData = response.data.data;
    
    // 🚨 QUAN TRỌNG: Gọi saveTokens ngay sau khi register thành công
    if (authData.accessToken && authData.refreshToken) {
      await this.saveTokens(authData.accessToken, authData.refreshToken);
    }
    
    return authData;
  }

  // 🔹 Logout
  async logout(): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/logout'
    );
    
    // 🚨 Xóa token ngay lập tức
    await this.removeTokens();
    
    return response.data.data;
  }

  // 🔹 Get current user info
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  }

  // 🔹 Refresh access token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh-token',
      { refreshToken }
    );
    const tokens = response.data.data;
    
    // 🚨 QUAN TRỌNG: Cập nhật token mới vào cache và AsyncStorage
    await this.saveTokens(tokens.accessToken, tokens.refreshToken);
    
    return tokens;
  }

  // 🔹 Save tokens
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    // 1. SYNC: Lưu vào cache trước (Giải quyết Race Condition)
    this.setAuthTokenInMemory(accessToken);
    
    // 2. ASYNC: Lưu vào persistent storage
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }

  // 🔹 Remove tokens
  async removeTokens(): Promise<void> {
    // 1. SYNC: Xóa khỏi cache trước
    this.setAuthTokenInMemory(null);
    
    // 2. ASYNC: Xóa khỏi persistent storage
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  }

  // 🔹 Get stored tokens (chủ yếu dùng khi khởi động app)
  async getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem('accessToken'),
      AsyncStorage.getItem('refreshToken'),
    ]);
    
    // Cập nhật cache nếu tìm thấy token
    this.setAuthTokenInMemory(accessToken);
    
    return { accessToken, refreshToken };
  }

  // 🔹 Check authentication
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  // 🔹 Get access token
  async getAuthToken(): Promise<string | null> {
    // 1. Ưu tiên lấy token từ bộ nhớ Cache (SYNC)
    if (authTokenCache) {
      return authTokenCache;
    }
    
    // 2. Nếu không có trong Cache (ví dụ: lần đầu khởi động), mới đọc từ AsyncStorage (ASYNC)
    const token = await AsyncStorage.getItem('accessToken');
    
    // 3. Nếu đọc được từ AsyncStorage, cập nhật vào cache để lần sau dùng luôn
    if (token) {
        this.setAuthTokenInMemory(token);
    }
    
    return token;
  }
}

export const authService = new AuthService();