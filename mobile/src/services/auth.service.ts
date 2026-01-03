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
  
  // =================================================================
  // 1. AUTHENTICATION (LOGIN, REGISTER, LOGOUT)
  // =================================================================

  // 🔹 Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    // Lưu ý: Cấu trúc response phụ thuộc vào backend, ở đây giả định response.data.data chứa AuthResponse
    const authData = response.data.data;
    
    // 🚨 Tự động lưu token
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
    
    // 🚨 Tự động lưu token
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
    
    // 🚨 Tự động lưu token
    if (authData.accessToken && authData.refreshToken) {
      await this.saveTokens(authData.accessToken, authData.refreshToken);
    }
    
    return authData;
  }

  // 🔹 Logout
  async logout(): Promise<{ message: string }> {
    try {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
          '/auth/logout'
        );
        return response.data.data || { message: 'Logged out' };
    } catch (error) {
        console.warn('Logout API failed, cleaning up local storage anyway');
        return { message: 'Logged out locally' };
    } finally {
        // 🚨 Luôn xóa token dù API có lỗi hay không
        await this.removeTokens();
    }
  }

  // =================================================================
  // 2. USER & TOKEN MANAGEMENT
  // =================================================================

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
    
    // 🚨 Cập nhật token mới
    await this.saveTokens(tokens.accessToken, tokens.refreshToken);
    
    return tokens;
  }

  // =================================================================
  // 3. PASSWORD RESET FLOW (ĐÃ BỔ SUNG TỪ WEB)
  // =================================================================

  // 🔹 Request password reset code (Gửi OTP về email)
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/forgot-password',
      { email }
    );
    // Lấy message từ response gốc hoặc data
    return { message: response.data.message || 'Reset code sent' };
  }

  // 🔹 Verify reset code (Kiểm tra OTP)
  async verifyResetCode(email: string, code: string): Promise<{ valid: boolean }> {
    const response = await apiClient.post<ApiResponse<{ valid: boolean }>>(
      '/auth/verify-reset-code',
      { email, code }
    );
    return response.data.data;
  }

  // 🔹 Reset password with verified code (Đặt lại mật khẩu)
  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/reset-password',
      { email, code, newPassword }
    );
    return { message: response.data.message || 'Password reset successful' };
  }

  // =================================================================
  // 4. STORAGE HELPERS (MOBILE OPTIMIZED)
  // =================================================================

  // 🔹 Save tokens (Cache + Async)
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    // 1. SYNC: Lưu vào cache trước (Giải quyết Race Condition)
    this.setAuthTokenInMemory(accessToken);
    
    // 2. ASYNC: Lưu vào persistent storage
    try {
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
    } catch (e) {
        console.error('Failed to save tokens', e);
    }
  }

  // 🔹 Remove tokens (Cache + Async)
  async removeTokens(): Promise<void> {
    // 1. SYNC: Xóa khỏi cache trước
    this.setAuthTokenInMemory(null);
    
    // 2. ASYNC: Xóa khỏi persistent storage
    try {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    } catch (e) {
        console.error('Failed to remove tokens', e);
    }
  }

  // 🔹 Get stored tokens (chủ yếu dùng khi khởi động app)
  async getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
        const [accessToken, refreshToken] = await Promise.all([
            AsyncStorage.getItem('accessToken'),
            AsyncStorage.getItem('refreshToken'),
        ]);
        
        // Cập nhật cache nếu tìm thấy token
        this.setAuthTokenInMemory(accessToken);
        
        return { accessToken, refreshToken };
    } catch (e) {
        return { accessToken: null, refreshToken: null };
    }
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
    
    // 2. Nếu không có trong Cache (lần đầu khởi động), mới đọc từ AsyncStorage
    try {
        const token = await AsyncStorage.getItem('accessToken');
        
        // 3. Nếu đọc được, cập nhật vào cache để lần sau dùng luôn
        if (token) {
            this.setAuthTokenInMemory(token);
        }
        return token;
    } catch (e) {
        return null;
    }
  }
}

export const authService = new AuthService();