export interface User {
  _id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: 'user' | 'admin';
  theme: 'light' | 'dark' | 'auto';
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  currentGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
