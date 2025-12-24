// File: src/types/auth.types.ts (Mobile - Final Version)

export type Language = 'en' | 'vi';

export interface RegionalPreferences {
  timeZone: string;
  dateFormat: 'DD MMM YYYY' | 'MMM DD, YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  weekStart: 'sunday' | 'monday';
}

export interface User {
  _id: string;
  email: string;
  name: string;
  avatar: string | null;
  // 🔥 BỔ SUNG: Thêm 'super_admin' để tránh lỗi khi admin đăng nhập app
  role: 'user' | 'admin' | 'super_admin'; 
  
  // 🔥 BỔ SUNG: Cần thiết để xác định quyền trong Group hiện tại
  groupRole?: string | null;
  
  // 🔥 BỔ SUNG: Cần thiết để xác định Leader
  isLeader?: boolean;

  theme: 'light' | 'dark' | 'auto';
  language: Language;
  regionalPreferences: RegionalPreferences;
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