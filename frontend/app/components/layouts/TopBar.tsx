"use client"

import React from 'react';
import UserMenu from '../common/UserMenu';
import LanguageSwitcher from '../common/LanguageSwitcher';
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
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="flex justify-end">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <LanguageSwitcher />
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