import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Appearance, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

// --- COMPONENTS ---
import MainLayout from '../components/layout/MainLayout';
import TasksView from '../components/tasks/TaskScreen'; // Kiểm tra lại đường dẫn thực tế của bạn
// 🔄 THAY THẾ: CalendarView -> TimelineView
import TimelineView from './TimelineView'; 
import NotesView from '../screens/NotesScreen';
import ChatView from '../screens/ChatScreen'; 
import GroupMembersView from '../screens/GroupMembersScreen';

export default function AppInterface({ navigation }: any) {
  const { user, logout, loading: authLoading, updateUserTheme } = useAuth();
  const { theme: contextTheme, setTheme: setContextTheme } = useTheme();

  // ✅ LOGIC ADMIN: Kiểm tra quyền
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // ✅ STATE: Khởi tạo view dựa trên quyền Admin (Giống Web)
  const [activeView, setActiveView] = useState(isAdmin ? 'chat' : 'tasks');

  // Sync theme logic (Giữ nguyên)
  useEffect(() => {
    if (user?.theme && ['light', 'dark', 'auto'].includes(user.theme)) {
      if (contextTheme !== user.theme) {
        setContextTheme(user.theme as Theme);
      }
    }
  }, [user?.theme, contextTheme, setContextTheme]);

  // System theme listener (Giữ nguyên)
  useEffect(() => {
    if (!user || user.theme !== 'auto') return;
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // ThemeContext tự xử lý
    });
    return () => subscription.remove();
  }, [user?.theme]);

  // Auth Redirect (Giữ nguyên)
  useEffect(() => {
    if (!authLoading && !user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [user, authLoading, navigation]);

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

  const getUserTheme = (): string => {
    if (user?.theme && ['light', 'dark', 'auto'].includes(user.theme)) {
      return user.theme;
    }
    return 'auto';
  };

  // ✅ RENDER VIEW: Đồng bộ logic với Web
  const renderActiveView = () => {
    // 1. Nếu là Admin -> Chỉ hiện Chat
    if (isAdmin) {
      return <ChatView />;
    }

    // 2. User thường -> Switch case
    switch (activeView) {
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        // 🔄 Đã thay bằng TimelineView
        return <TimelineView />; 
      case 'notes':
        return <NotesView />;
      case 'chat':
        return <ChatView />;
      case 'members':
        return <GroupMembersView />;
      default:
        return <TasksView />;
    }
  };

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
      // Có thể truyền thêm prop isAdmin vào MainLayout nếu cần ẩn menu
      // isAdmin={isAdmin} 
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