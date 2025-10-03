"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from './layouts/MainLayout';
import TasksView from './views/TasksView';
import CalendarView from './views/CalendarView';
import NotesView from './views/NotesView';
import { useAuth } from '../contexts/AuthContext';

export default function AppInterface() {
  const [activeView, setActiveView] = useState('tasks');
  const [theme, setTheme] = useState('dark');
  const router = useRouter();
  const { user, logout } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [theme]);

  const renderActiveView = () => {
    switch (activeView) {
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        return <CalendarView />;
      case 'notes':
        return <NotesView />;
      default:
        return <TasksView />;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout 
      activeView={activeView} 
      onViewChange={setActiveView}
      user={user}
      onLogout={logout}
      theme={theme}
      onThemeChange={setTheme}
    >
      {renderActiveView()}
    </MainLayout>
  );
}