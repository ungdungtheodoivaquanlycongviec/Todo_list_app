"use client"

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ToolsSidebar from './ToolsSidebar';
import TopBar from './TopBar';
import ProfileSettings from '../ProfileSettings';
import { User } from '../../services/types/auth.types';
import { useFolder } from '../../contexts/FolderContext';

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export default function MainLayout({ 
  children, 
  activeView, 
  onViewChange,
  user,
  onLogout,
  theme,
  onThemeChange
}: MainLayoutProps) {
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const { currentFolder } = useFolder();
  const hasFolder = !!currentFolder;

  const handleViewChange = (view: string) => {
    if (view === 'profile') {
      setShowProfileSettings(true);
    } else {
      onViewChange(view);
      setShowProfileSettings(false);
    }
  };

  return (
    <div className={`grid h-screen bg-gray-100 dark:bg-gray-900 ${
      hasFolder && !showProfileSettings 
        ? 'grid-cols-[12.5%_6.25%_1fr]' 
        : 'grid-cols-[12.5%_1fr]'
    }`}>
      {/* Column 1: Sidebar - 12.5% */}
      <div className="col-span-1">
        <Sidebar />
      </div>

      {/* Column 2: ToolsSidebar - 6.25% (ẩn khi profile settings hiển thị hoặc không có folder) */}
      {!showProfileSettings && hasFolder && (
        <div className="col-span-1">
          <ToolsSidebar activeView={activeView} onViewChange={handleViewChange} />
        </div>
      )}

      {/* Column 3: Main Content - MỞ RỘNG KHI PROFILE SETTINGS HIỂN THỊ hoặc không có folder */}
      <div className={`${showProfileSettings || !hasFolder ? 'col-span-1' : 'col-span-1'} flex flex-col min-w-0`}>
        <TopBar 
          user={user} 
          onLogout={onLogout}
          theme={theme}
          onThemeChange={onThemeChange}
          onProfileClick={() => setShowProfileSettings(true)}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          {showProfileSettings ? (
            <div className="h-full overflow-y-auto">
              <ProfileSettings onClose={() => setShowProfileSettings(false)} />
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-hidden">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}