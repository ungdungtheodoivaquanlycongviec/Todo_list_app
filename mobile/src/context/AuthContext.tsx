import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin'; // ✅ Import Google Signin

import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { groupService } from '../services/group.service';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth.types';
import { Group } from '../types/group.types';
import { triggerGroupChange } from '../hooks/useGroupChange';

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

  // ✅ Cấu hình Google Signin khi App khởi động
  useEffect(() => {
    GoogleSignin.configure({
      // Thay bằng Web Client ID từ Google Cloud Console (Dùng chung cho cả Android/iOS)
      // KHÔNG DÙNG Android Client ID ở đây
      webClientId: '1095262788931-15k2...apps.googleusercontent.com', 
      offlineAccess: true, 
    });
  }, []);

  const persistUser = async (userData: User | null) => {
    try {
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem('user');
      }
    } catch (e) {
      console.warn('Persist user failed', e);
    }
  };

  const applyTheme = (theme: string) => {
    // Logic theme context sẽ xử lý việc này
  };

  const checkAuth = async () => {
    try {
      const { accessToken } = await authService.getStoredTokens();
      const isAuth = await authService.isAuthenticated();

      if (accessToken && isAuth) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
          await persistUser(userData);

          if (userData.theme) applyTheme(userData.theme);

          // Load Group Logic
          if (userData.currentGroupId) {
            try {
              const group = await groupService.getGroupById(userData.currentGroupId);
              if (group) {
                setCurrentGroup(group);
              } else {
                throw new Error('Group not found');
              }
            } catch (groupError) {
              await handleFallbackGroup(userData);
            }
          } else {
            await handleFallbackGroup(userData);
          }
        } catch (userError) {
          console.error('Failed to get current user:', userError);
          await logout();
        }
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackGroup = async (userData: User) => {
    try {
      const response = await groupService.getAllGroups();
      let fallbackGroup: Group | null = null;

      if (response.myGroups.length > 0) {
        fallbackGroup = response.myGroups[0];
      } else if (response.sharedGroups.length > 0) {
        fallbackGroup = response.sharedGroups[0];
      }

      setCurrentGroup(fallbackGroup);

      const newGroupId = fallbackGroup?._id;
      
      try {
        await userService.updateProfile({ currentGroupId: newGroupId });
      } catch (e) {
        console.warn('Failed to update group on server', e);
      }

      const updatedUser = { ...userData, currentGroupId: newGroupId };
      setUser(updatedUser);
      await persistUser(updatedUser);
      
      triggerGroupChange();
    } catch (error) {
      console.error('Failed to load fallback groups:', error);
      setCurrentGroup(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // --- ACTIONS ---

  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      const authData: AuthResponse = await authService.login(credentials);
      await handleAuthSuccess(authData);
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
      await handleAuthSuccess(authData);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ SỬA LỖI: Login Google thật
  // ✅ SỬA LỖI: Login Google thật
const loginWithGoogle = async () => {
  try {
    setLoading(true);

    // 1. Kiểm tra Google Play Services
    await GoogleSignin.hasPlayServices();

    // 2. Mở popup đăng nhập
    const response = await GoogleSignin.signIn(); // Đặt tên biến là response cho dễ hiểu

    // Trong phiên bản mới, dữ liệu user nằm trong response.data
    // Kiểm tra xem user có hủy đăng nhập không (nếu response.data là null)
    if (!response.data) {
       throw new Error('User cancelled the login flow');
    }

    // Lấy idToken từ trong data
    const idToken = response.data.idToken;

    if (!idToken) {
      throw new Error('No ID token found');
    }

    // 3. Gửi token lên backend
    const authData: AuthResponse = await authService.loginWithGoogle(idToken);

    // 4. Xử lý thành công
    await handleAuthSuccess(authData);

  } catch (error: any) {
    console.error('Google login failed:', error);
    
    // Check lỗi user hủy (code có thể thay đổi tùy version, nhưng logic cơ bản là vậy)
    if (error.code === '12501' || error.message === 'User cancelled the login flow') {
       // User cancelled (không cần alert)
    } else {
       Alert.alert("Google Login Error", error.message);
       throw error;
    }
  } finally {
    setLoading(false);
  }
};

  // Helper xử lý sau khi login thành công (dùng chung cho cả 3 cách)
  const handleAuthSuccess = async (authData: AuthResponse) => {
      await authService.saveTokens(authData.accessToken, authData.refreshToken);
      setUser(authData.user);
      await persistUser(authData.user);
      
      if (authData.user.theme) applyTheme(authData.user.theme);

      if (authData.user.currentGroupId) {
         try {
            const group = await groupService.getGroupById(authData.user.currentGroupId);
            setCurrentGroup(group);
         } catch {
            await handleFallbackGroup(authData.user);
         }
      } else {
         await handleFallbackGroup(authData.user);
      }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;
    try {
      const updatedUser = await userService.updateProfile(userData);
      setUser(updatedUser);
      await persistUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const updateUserTheme = async (theme: string) => {
    if (!user) return;
    try {
      const updatedUser = await userService.updateTheme(theme);
      setUser(updatedUser);
      await persistUser(updatedUser);
      applyTheme(theme);
    } catch (error) {
      console.error('Failed to update theme:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      try { 
          await authService.logout(); 
          await GoogleSignin.signOut(); // Logout Google luôn nếu có
      } catch (e) { console.warn(e); }
    } finally {
      await authService.removeTokens();
      await AsyncStorage.removeItem('user');
      setUser(null);
      setCurrentGroup(null);
      setLoading(false);
    }
  };

  const handleSetCurrentGroup = async (group: Group | null) => {
    setCurrentGroup(group);
    if (user) {
      const newGroupId = group?._id;
      const updatedUser = { ...user, currentGroupId: newGroupId };
      setUser(updatedUser);
      await persistUser(updatedUser);
      try {
        await userService.updateProfile({ currentGroupId: newGroupId });
      } catch (e) {
        console.warn('Failed to update group on server', e);
      }
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