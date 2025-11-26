import apiClient from './api.client';
import { User, Language, RegionalPreferences } from './types/auth.types';
import { ApiResponse } from './types/auth.types';

export const userService = {
  // Update user theme preference
  async updateTheme(theme: string): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      '/users/theme',
      { theme }
    );
    return response.data.user;
  },

  // Update user language preference
  async updateLanguage(language: Language): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      '/users/me/language',
      { language }
    );
    return response.data.user;
  },

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      '/users/me',
      userData
    );
    return response.data.user;
  },

  // Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.put<ApiResponse<void>>(
      '/users/me/password',
      { oldPassword, newPassword }
    );
  },

  // Deactivate account
  async deactivateAccount(): Promise<void> {
    await apiClient.delete<ApiResponse<void>>('/users/me');
  },

  // Update avatar
  async updateAvatar(avatar: string): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      '/users/me/avatar',
      { avatar }
    );
    return response.data.user;
  },

  // Update regional preferences
  async updateRegionalPreferences(preferences: {
    timeZone?: string;
    dateFormat?: string;
    timeFormat?: string;
    weekStart?: string;
  }): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      '/users/me/regional-preferences',
      preferences
    );
    return response.data.user;
  }
};