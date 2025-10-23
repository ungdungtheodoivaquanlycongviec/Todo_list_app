"use client"

import React from 'react';
import UserMenu from '../common/UserMenu';
import NotificationDropdown from '../NotificationDropdown';
import { User } from '../../services/types/auth.types';

interface TopBarProps {
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
}

export default function TopBar({ user, onLogout, theme, onThemeChange, onProfileClick }: TopBarProps) {
  return (
    // LOẠI BỎ BORDER Ở TOPBAR
    <div className="h-16 flex items-center justify-end px-6 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationDropdown />

        <UserMenu 
          currentUser={user} 
          onLogout={onLogout}
          theme={theme}
          onThemeChange={onThemeChange}
          onProfileClick={onProfileClick}
        />
      </div>
    </div>
  );
}