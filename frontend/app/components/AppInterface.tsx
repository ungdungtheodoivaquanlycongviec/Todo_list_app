"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from './layouts/MainLayout';
import TasksView from './views/TasksView';
import CalendarView from './views/CalendarView';
import NotesView from './views/NotesView';

export default function AppInterface() {
  const [activeView, setActiveView] = useState('tasks');
  const [theme, setTheme] = useState('dark');
  const router = useRouter();

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

  return (
    <MainLayout 
      activeView={activeView} 
      onViewChange={setActiveView}
    >
      {renderActiveView()}
    </MainLayout>
  );
}