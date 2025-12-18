"use client"

import React from 'react';
import UserMenu from '../common/UserMenu';
import LanguageSwitcher from '../common/LanguageSwitcher';
import NotificationDropdown from '../NotificationDropdown';
import { User } from '../../services/types/auth.types';
import { getRoleLabel } from '../../constants/groupRoles';

interface TopBarProps {
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
  onViewChange: (view: string) => void;
}

export default function TopBar({
  user,
  onLogout,
  theme,
  onThemeChange,
  onProfileClick,
  onViewChange
}: TopBarProps) {
  const businessRole = (user as any)?.groupRole as string | null | undefined;
  const isLeader = Boolean((user as any)?.isLeader);

  return (
    <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: user summary */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                {businessRole ? getRoleLabel(businessRole) : 'No role'}
              </span>
              {isLeader && (
                <>
                  <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                    Lead
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: controls */}
          <div className="w-full max-w-full md:max-w-[15vw] lg:max-w-[320px] flex items-center justify-end gap-2 sm:gap-3">
            <LanguageSwitcher />
            <NotificationDropdown
              onNavigate={onViewChange}
            />
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