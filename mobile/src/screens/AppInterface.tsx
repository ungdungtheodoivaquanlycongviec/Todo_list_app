import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Appearance, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import TasksView from '../components/tasks/TaskScreen';
import CalendarView from '../screens/CalendarScreen';
import NotesView from '../screens/NotesScreen';
// 🔑 ĐÃ THÊM: Import màn hình Chat
import ChatView from '../screens/ChatScreen'; 
import GroupMembersView from '../screens/GroupMembersScreen';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

export default function AppInterface({ navigation }: any) {
  const [activeView, setActiveView] = useState('tasks');
  const { user, logout, loading: authLoading, updateUserTheme } = useAuth();
  const { theme: contextTheme, setTheme: setContextTheme } = useTheme();

  // Sync theme from user with ThemeContext on mount and when user changes
  useEffect(() => {
    if (user?.theme && ['light', 'dark', 'auto'].includes(user.theme)) {
      if (contextTheme !== user.theme) {
        setContextTheme(user.theme as Theme);
      }
    }
  }, [user?.theme, contextTheme, setContextTheme]);

  // Lắng nghe system theme changes nếu theme là 'auto' (Tương đương logic Web dùng Appearance API)
  useEffect(() => {
    if (!user || user.theme !== 'auto') return;

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // ThemeContext đã được cấu hình để tự động xử lý system theme changes
    });

    return () => subscription.remove();
  }, [user?.theme]);

  // Redirect to login if not authenticated (Tương đương router.push trên Web)
  useEffect(() => {
    if (!authLoading && !user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }], // Giả sử route đăng nhập là 'Auth' hoặc 'Login'
      });
    }
  }, [user, authLoading, navigation]);

  // Handle theme change (Giống web: cập nhật service và Context)
  const handleThemeChange = async (newTheme: string) => {
    try {
      if (['light', 'dark', 'auto'].includes(newTheme)) {
        await updateUserTheme(newTheme as Theme);
        setContextTheme(newTheme as Theme);
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  // Helper function để lấy theme từ user (Giống web)
  const getUserTheme = (): string => {
    if (user?.theme && ['light', 'dark', 'auto'].includes(user.theme)) {
      return user.theme;
    }
    return 'auto'; // default fallback
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        return <CalendarView />; // Tên View trên Mobile là CalendarView
      case 'notes':
        return <NotesView />;
      case 'chat': // Đã fix lỗi Chat
        return <ChatView />;
      case 'members':
        return <GroupMembersView />;
      default:
        return <TasksView />;
    }
  };

  // Hiển thị loading trong khi check auth (Tương đương logic Web)
  if (authLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={loadingStyles.text}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout 
      activeView={activeView} 
      onViewChange={setActiveView}
      user={user}
      onLogout={logout}
      theme={getUserTheme()}
      onThemeChange={handleThemeChange}
    >
      {renderActiveView()}
    </MainLayout>
  );
}

const loadingStyles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f3f4f6' 
  },
  text: { 
    marginTop: 12, 
    color: '#6b7280' 
  }
});