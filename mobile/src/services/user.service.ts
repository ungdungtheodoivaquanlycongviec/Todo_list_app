import apiClient from '../api/apiClient';
import { User, Language, ApiResponse, RegionalPreferences } from '../types/auth.types';

export const userService = {
  // 🔹 Update user theme preference
  async updateTheme(theme: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      '/users/theme',
      { theme }
    );
    // Sửa lại thành response.data.user (giả định API response chuẩn)
    return response.data.data.user; 
  },
  
  // 🔑 ĐÃ THÊM: Update user language preference (Cần cho LanguageContext)
  async updateLanguage(language: Language): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      '/users/me/language',
      { language }
    );
       return response.data.data.user; 
  },

  // 🔹 Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      '/users/me',
      userData
    );
    // Sửa lại thành response.data.user 
        return response.data.data.user; 
  },

  // 🔹 Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.put<ApiResponse<void>>('/users/me/password', {
      oldPassword,
      newPassword,
    });
  },

  // 🔹 Deactivate account
  async deactivateAccount(): Promise<void> {
    await apiClient.delete<ApiResponse<void>>('/users/me');
  },

  // 🔹 Update avatar
  async updateAvatar(avatar: string): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      '/users/me/avatar',
      { avatar }
    );
    // Sửa lại thành response.data.user 
        return response.data.data.user; 
  },
  
  // 🔑 ĐÃ THÊM: Update regional preferences
  async updateRegionalPreferences(preferences: Partial<RegionalPreferences>): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      '/users/me/regional-preferences',
      preferences
    );
        return response.data.data.user; 
  }
};