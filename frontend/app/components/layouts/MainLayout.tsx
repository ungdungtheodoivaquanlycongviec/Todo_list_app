"use client"

import React from 'react';
import Sidebar from './Sidebar';
import ToolsSidebar from './ToolsSidebar';
import TopBar from './TopBar';

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function MainLayout({ children, activeView, onViewChange }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <ToolsSidebar activeView={activeView} onViewChange={onViewChange} />
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <TopBar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}