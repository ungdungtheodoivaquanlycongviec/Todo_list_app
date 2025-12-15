// Giả định các types này được import từ file types/auth.types khác
// import { Language } from './auth.types';
// import { RegionalPreferences } from './auth.types';

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
  role: 'user' | 'admin';
  theme: 'light' | 'dark' | 'auto';
  // 🟢 THÊM: Đồng bộ hóa ngôn ngữ người dùng
  language: Language; 
  // 🟢 THÊM: Đồng bộ hóa tùy chọn khu vực
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