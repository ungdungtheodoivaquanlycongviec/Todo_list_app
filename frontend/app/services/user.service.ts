import { apiClient } from './api.client';
import { User } from './types/auth.types';
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

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(
      '/users/profile',
      userData
    );
    return response.data.user;
  },
};