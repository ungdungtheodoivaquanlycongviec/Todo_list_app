import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native'; // <--- QUAN TRỌNG: Import UI từ React Native

import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth.types';
import { Group } from '../types/group.types';
import { triggerGroupChange } from '../hooks/useGroupChange';

// --- 1. ĐỊNH NGHĨA AUTH CONTEXT TYPE ---
interface AuthContextType {
  user: User | null;
  currentGroup: Group | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUserTheme: (theme: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setCurrentGroup: (group: Group | null) => void;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  // Placeholder cho theme logic trên Mobile
  const applyTheme = (theme: string) => {
    console.log('Applying theme in mobile context:', theme);
    // TODO: Thêm logic theme mobile
  };

  // --- CHECK AUTH ---
  const checkAuth = async () => {
    try {
      const { accessToken } = await authService.getStoredTokens();
      const isAuth = await authService.isAuthenticated();

      if (accessToken && isAuth) {
        const userData = await authService.getCurrentUser();
        setUser(userData);

        if (userData.theme) {
          applyTheme(userData.theme);
        }

        // Load current group logic...
        if (userData.currentGroupId) {
          try {
            const { groupService } = await import('../services/group.service');
            const group = await groupService.getGroupById(userData.currentGroupId);
            setCurrentGroup(group);
          } catch (error) {
            console.error('Failed to load current group:', error);
          }
        } else {
          try {
            const { groupService } = await import('../services/group.service');
            const response = await groupService.getAllGroups();
            if (response.myGroups.length > 0) {
              setCurrentGroup(response.myGroups[0]);
            } else if (response.sharedGroups.length > 0) {
              setCurrentGroup(response.sharedGroups[0]);
            }
          } catch (error) {
            console.error('Failed to load groups:', error);
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      authService.removeTokens();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // --- CÁC HÀM XỬ LÝ ---

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;
    try {
      const updatedUser = await userService.updateProfile(userData);
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const idToken = 'MOCK_ID_TOKEN_FOR_MOBILE';
      const authData: AuthResponse = await authService.loginWithGoogle(idToken);

      authService.saveTokens(authData.accessToken, authData.refreshToken);
      setUser(authData.user);
      applyTheme(authData.user.theme);
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      const authData: AuthResponse = await authService.login(credentials);

      authService.saveTokens(authData.accessToken, authData.refreshToken);
      setUser(authData.user);
      applyTheme(authData.user.theme);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setLoading(true);
      const authData: AuthResponse = await authService.register(userData);

      authService.saveTokens(authData.accessToken, authData.refreshToken);
      setUser(authData.user);
      applyTheme(authData.user.theme);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserTheme = async (theme: string) => {
    if (!user) return;
    try {
      const updatedUser = await userService.updateTheme(theme);
      setUser(updatedUser);
      applyTheme(theme);
    } catch (error) {
      console.error('Failed to update theme:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      authService.removeTokens();
      setUser(null);
      setLoading(false);
    }
  };

  const handleSetCurrentGroup = (group: Group | null) => {
    setCurrentGroup(group);
    if (user) {
      const updatedUser = { ...user, currentGroupId: group?._id ?? undefined };
      setUser(updatedUser);
    }
    triggerGroupChange();
  };

  const value: AuthContextType = {
    user,
    currentGroup,
    loading,
    login,
    register,
    logout,
    updateUserTheme,
    updateUser,
    setUser,
    setCurrentGroup: handleSetCurrentGroup,
    isAuthenticated: !!user,
    loginWithGoogle,
  };

  // --- PHẦN SỬA LỖI QUAN TRỌNG NHẤT ---
  // Nếu đang loading, hiển thị icon xoay xoay thay vì hiển thị children
  // Điều này ngăn lỗi Text string và ngăn app bị crash khi user chưa load xong
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}