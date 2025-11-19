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
    <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 py-3 md:py-4">
        <div className="flex justify-end">
          <div className="w-full max-w-full md:max-w-[10vw] lg:max-w-[220px] flex items-center justify-end gap-2 sm:gap-3">
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
      </div>
    </div>
  );
}