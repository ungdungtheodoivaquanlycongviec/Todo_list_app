"use client"

import React from 'react';
import UserMenu from '../common/UserMenu';
import { User } from '../../services/types/auth.types';

interface TopBarProps {
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export default function TopBar({ user, onLogout, theme, onThemeChange }: TopBarProps) {
  return (
    <div className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-6 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative">
          <span className="text-xl">🔔</span>
        </button>

        <UserMenu 
          currentUser={user} 
          onLogout={onLogout}
          theme={theme}
          onThemeChange={onThemeChange}
        />
      </div>
    </div>
  );
}