"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from './layouts/MainLayout';
import TasksView from './views/TasksView/TasksView';
import TimelineView from './views/TimelineView';
import NotesView from './views/NotesView';
import ChatView from './views/ChatView';
import GroupMembersView from './views/GroupMembersView';
import ChatbotWidget from './common/ChatbotWidget';
import { useAuth } from '../contexts/AuthContext';

export default function AppInterface() {
  const [activeView, setActiveView] = useState('tasks');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { user, logout, loading: authLoading, updateUserTheme } = useAuth();

  // Fix hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Lắng nghe system theme changes nếu theme là 'auto'
  useEffect(() => {
    if (!isClient || !user || user.theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [user?.theme, isClient]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleThemeChange = async (newTheme: string) => {
    try {
      await updateUserTheme(newTheme);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'tasks':
        return <TasksView />;
      case 'calendar':
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

  // Hiển thị loading trong khi check auth
  if (authLoading || !isClient) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <MainLayout 
        activeView={activeView} 
        onViewChange={setActiveView}
        user={user}
        onLogout={logout}
        theme={user.theme} // Sử dụng theme từ user
        onThemeChange={handleThemeChange} // Sử dụng hàm mới
      >
        {renderActiveView()}
      </MainLayout>
      <ChatbotWidget />
    </>
  );
}