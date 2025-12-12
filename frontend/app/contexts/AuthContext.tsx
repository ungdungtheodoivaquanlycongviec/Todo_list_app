'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../services/types/auth.types';
import { Group } from '../services/types/group.types';
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
  const router = useRouter();

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { accessToken } = authService.getStoredTokens();

      if (accessToken && authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);

          // Apply user's theme preference
          if (userData.theme) {
            applyTheme(userData.theme);
          }

          // Load current group if user has one
          if (userData.currentGroupId) {
            try {
              const { groupService } = await import('../services/group.service');
              const group = await groupService.getGroupById(userData.currentGroupId);
              setCurrentGroup(group);
            } catch (error) {
              console.error('Failed to load current group:', error);
              // Current group may have been deleted - try to load first available group
              try {
                const { groupService } = await import('../services/group.service');
                const response = await groupService.getAllGroups();
                let fallbackGroup = null;
                if (response.myGroups.length > 0) {
                  fallbackGroup = response.myGroups[0];
                } else if (response.sharedGroups.length > 0) {
                  fallbackGroup = response.sharedGroups[0];
                }

                setCurrentGroup(fallbackGroup);

                // Update user's currentGroupId on server and localStorage since original group was deleted
                if (fallbackGroup && typeof window !== 'undefined') {
                  const updatedUserData = { ...userData, currentGroupId: fallbackGroup._id };

                  // Update on server first
                  try {
                    const { userService } = await import('../services/user.service');
                    await userService.updateProfile({ currentGroupId: fallbackGroup._id });
                    console.log('Updated currentGroupId on server to:', fallbackGroup._id);
                  } catch (serverError) {
                    console.error('Failed to update currentGroupId on server:', serverError);
                  }

                  localStorage.setItem('user', JSON.stringify(updatedUserData));
                  setUser(updatedUserData);
                  // Trigger group change event so other components reload
                  triggerGroupChange();
                }
              } catch (fallbackError) {
                console.error('Failed to load fallback groups:', fallbackError);
                setCurrentGroup(null);
              }
            }
          } else {
            // If no current group, try to load the first available group
            try {
              const { groupService } = await import('../services/group.service');
              const response = await groupService.getAllGroups();
              let selectedGroup = null;
              if (response.myGroups.length > 0) {
                selectedGroup = response.myGroups[0];
              } else if (response.sharedGroups.length > 0) {
                selectedGroup = response.sharedGroups[0];
              }

              setCurrentGroup(selectedGroup);

              // Update localStorage with the selected group
              if (selectedGroup && typeof window !== 'undefined') {
                const updatedUserData = { ...userData, currentGroupId: selectedGroup._id };
                localStorage.setItem('user', JSON.stringify(updatedUserData));
                setUser(updatedUserData);
              }
            } catch (error) {
              console.error('Failed to load groups:', error);
              // Don't fail auth if group loading fails
            }
          }

          // Save user to localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (authError: any) {
          // If getCurrentUser fails (e.g., token expired, user locked, etc.)
          console.error('Failed to get current user:', authError);

          // Clear tokens if authentication fails
          authService.removeTokens();
          setUser(null);
          setCurrentGroup(null);

          // Don't throw - just set user to null and let the app handle it
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear tokens on any error
      authService.removeTokens();
      setUser(null);
      setCurrentGroup(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to apply theme
  const applyTheme = (theme: string) => {
    console.log('Applying theme:', theme);
    const root = document.documentElement;

    // Xóa cả class light và dark trước
    root.classList.remove('light', 'dark');

    if (theme === 'auto') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('System prefers dark:', systemPrefersDark);
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else if (theme === 'dark') {
      console.log('Setting dark theme');
      root.classList.add('dark');
    } else {
      console.log('Setting light theme');
      root.classList.add('light');
    }

    // Lưu vào localStorage
    localStorage.setItem('theme', theme);
    console.log('Theme saved to localStorage:', theme);
    console.log('HTML classes:', root.classList.toString());
  };

  // THÊM FUNCTION UPDATE USER
  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;

    try {
      // Update on server
      const updatedUser = await userService.updateProfile(userData);

      // Update local state
      setUser(updatedUser);

      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Không trả về gì cả (void)
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  // Google login
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { app } = await import('../firebase');

      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const authData: AuthResponse = await authService.loginWithGoogle(idToken);

      authService.saveTokens(authData.accessToken, authData.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(authData.user));
        localStorage.setItem('accessToken', authData.accessToken);
      }

      setUser(authData.user);
      applyTheme(authData.user.theme);
      // Redirect admin to admin panel, others to dashboard
      if (authData.user.role === 'admin' || authData.user.role === 'super_admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      const authData: AuthResponse = await authService.login(credentials);

      // Save tokens
      authService.saveTokens(authData.accessToken, authData.refreshToken);

      // THÊM: Lưu token vào localStorage để taskService có thể đọc
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', authData.accessToken);
        localStorage.setItem('accessToken', authData.accessToken);
      }

      // Set user state
      setUser(authData.user);

      // Apply user's theme preference
      applyTheme(authData.user.theme);

      // Load current group if user has one
      let finalUser = authData.user;
      if (authData.user.currentGroupId) {
        try {
          const { groupService } = await import('../services/group.service');
          const group = await groupService.getGroupById(authData.user.currentGroupId);
          setCurrentGroup(group);
        } catch (error) {
          console.error('Failed to load current group:', error);
          // Current group may have been deleted - try to load first available group
          try {
            const { groupService } = await import('../services/group.service');
            const response = await groupService.getAllGroups();
            let fallbackGroup = null;
            if (response.myGroups.length > 0) {
              fallbackGroup = response.myGroups[0];
            } else if (response.sharedGroups.length > 0) {
              fallbackGroup = response.sharedGroups[0];
            }
            setCurrentGroup(fallbackGroup);
            if (fallbackGroup) {
              finalUser = { ...authData.user, currentGroupId: fallbackGroup._id };
              setUser(finalUser);
            }
          } catch (fallbackError) {
            console.error('Failed to load fallback groups:', fallbackError);
          }
        }
      } else {
        // If no current group, try to load the first available group
        try {
          const { groupService } = await import('../services/group.service');
          const response = await groupService.getAllGroups();
          let selectedGroup = null;
          if (response.myGroups.length > 0) {
            selectedGroup = response.myGroups[0];
          } else if (response.sharedGroups.length > 0) {
            selectedGroup = response.sharedGroups[0];
          }
          setCurrentGroup(selectedGroup);
          if (selectedGroup) {
            finalUser = { ...authData.user, currentGroupId: selectedGroup._id };
            setUser(finalUser);
          }
        } catch (error) {
          console.error('Failed to load groups:', error);
        }
      }

      // Save user to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(finalUser));
      }

      console.log('Login successful, token saved:', authData.accessToken);

      // Redirect admin to admin panel, others to dashboard
      if (authData.user.role === 'admin' || authData.user.role === 'super_admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
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

      // Save tokens
      authService.saveTokens(authData.accessToken, authData.refreshToken);

      // Set user state
      setUser(authData.user);

      // Apply user's theme preference
      applyTheme(authData.user.theme);

      // Save user to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(authData.user));
      }

      // Redirect admin to admin panel, others to dashboard
      if (authData.user.role === 'admin' || authData.user.role === 'super_admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update theme function
  const updateUserTheme = async (theme: string) => {
    if (!user) return;

    try {
      // Update on server
      const updatedUser = await userService.updateTheme(theme);

      // Update local state
      setUser(updatedUser);

      // Apply theme
      applyTheme(theme);

      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('theme', theme);
      }
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
      // Clear everything regardless of API call success
      authService.removeTokens();
      setUser(null);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        // Giữ theme preference trong localStorage để dùng cho lần sau
      }

      // Redirect to login page
      router.push('/');
      setLoading(false);
    }
  };

  const handleSetCurrentGroup = async (group: Group | null) => {
    setCurrentGroup(group);

    // Update user's currentGroupId in localStorage and state
    if (typeof window !== 'undefined' && user) {
      const updatedUser = { ...user, currentGroupId: group?._id ?? undefined };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Also update on server
      try {
        await userService.updateProfile({ currentGroupId: group?._id });
        console.log('Updated currentGroupId on server to:', group?._id);
      } catch (error) {
        console.error('Failed to update currentGroupId on server:', error);
      }
    }

    // Trigger group change event to reload all views
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
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}