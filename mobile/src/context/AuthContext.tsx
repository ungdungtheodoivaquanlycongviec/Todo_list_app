import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 🆕 Import AsyncStorage

import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
// Import groupService bằng require hoặc import dynamic để tránh cycle dependency nếu có
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

  // Helper: Lưu user vào Storage để persistence
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

  // Helper: Theme logic (Mobile thường dùng ThemeContext riêng, ở đây chỉ update user pref)
  const applyTheme = (theme: string) => {
    // Logic theme thực tế sẽ nằm ở ThemeProvider, ở đây chỉ log
    // console.log('User theme preference:', theme);
  };

  // --- CHECK AUTH & LOAD INITIAL DATA (Full Web Logic) ---
  const checkAuth = async () => {
    try {
      const { accessToken } = await authService.getStoredTokens();
      const isAuth = await authService.isAuthenticated();

      if (accessToken && isAuth) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
          await persistUser(userData); // 🆕 Sync storage

          if (userData.theme) applyTheme(userData.theme);

          // === LOGIC LOAD GROUP (Ported from Web) ===
          if (userData.currentGroupId) {
            try {
              const group = await groupService.getGroupById(userData.currentGroupId);
              if (group) {
                setCurrentGroup(group);
              } else {
                throw new Error('Group not found'); // Kích hoạt logic fallback
              }
            } catch (groupError) {
              console.log('Current group not accessible, finding fallback...');
              await handleFallbackGroup(userData);
            }
          } else {
            // Chưa có nhóm nào được chọn
            await handleFallbackGroup(userData);
          }
        } catch (userError) {
          console.error('Failed to get current user:', userError);
          await logout(); // Token lỗi -> Logout luôn
        }
      } else {
        await logout(); // Không có token -> Logout
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Hàm xử lý Fallback Group (Tách ra để tái sử dụng)
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

      // Cập nhật lại currentGroupId chuẩn cho User
      const newGroupId = fallbackGroup?._id;
      
      // 1. Update Server
      try {
        await userService.updateProfile({ currentGroupId: newGroupId });
      } catch (e) {
        console.warn('Failed to update group on server', e);
      }

      // 2. Update Local State & Storage
      const updatedUser = { ...userData, currentGroupId: newGroupId };
      setUser(updatedUser);
      await persistUser(updatedUser);
      
      triggerGroupChange(); // Báo hiệu cho app reload view
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

      await authService.saveTokens(authData.accessToken, authData.refreshToken);
      setUser(authData.user);
      await persistUser(authData.user);
      
      if (authData.user.theme) applyTheme(authData.user.theme);

      // Sau khi login, check group luôn
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

      await authService.saveTokens(authData.accessToken, authData.refreshToken);
      setUser(authData.user);
      await persistUser(authData.user);
      
      if (authData.user.theme) applyTheme(authData.user.theme);
      
      // User mới thường chưa có nhóm, có thể gọi logic tạo nhóm mặc định ở đây nếu cần
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      // TODO: Tích hợp @react-native-google-signin/google-signin ở đây
      const idToken = 'MOCK_TOKEN_NEED_IMPLEMENTATION'; 
      const authData: AuthResponse = await authService.loginWithGoogle(idToken);

      await authService.saveTokens(authData.accessToken, authData.refreshToken);
      setUser(authData.user);
      await persistUser(authData.user);
      
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
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;
    try {
      const updatedUser = await userService.updateProfile(userData);
      setUser(updatedUser);
      await persistUser(updatedUser); // 🆕 Sync storage
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
      await persistUser(updatedUser); // 🆕 Sync storage
      applyTheme(theme);
    } catch (error) {
      console.error('Failed to update theme:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Cố gắng gọi API logout, nhưng không chặn nếu lỗi
      try { await authService.logout(); } catch (e) { console.warn(e); }
    } finally {
      await authService.removeTokens();
      await AsyncStorage.removeItem('user'); // 🆕 Clear user storage
      setUser(null);
      setCurrentGroup(null);
      setLoading(false);
    }
  };

  const handleSetCurrentGroup = async (group: Group | null) => {
    setCurrentGroup(group);
    
    // Update local state & storage & server
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