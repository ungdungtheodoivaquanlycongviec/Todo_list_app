"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { User } from '../../services/types/auth.types';

// Cập nhật interface để bao gồm tất cả props
interface UserMenuProps {
  currentUser: User;
  onLogout: () => void;           // Thêm dòng này
  theme: string;                  // Thêm dòng này
  onThemeChange: (theme: string) => void; // Thêm dòng này
}

export default function UserMenu({ 
  currentUser, 
  onLogout, 
  theme, 
  onThemeChange 
}: UserMenuProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getInitials(currentUser.name)}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getInitials(currentUser.name)}
                </span>
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{currentUser.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setShowUserMenu(false);
                router.push('/profile');
              }}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Profile settings</span>
            </button>

            {/* Theme Submenu */}
            <div className="px-4 py-2">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 mb-2">
                {theme === 'light' && <Sun className="w-4 h-4" />}
                {theme === 'dark' && <Moon className="w-4 h-4" />}
                {theme === 'auto' && <Monitor className="w-4 h-4" />}
                <span className="text-sm">Theme</span>
              </div>
              <div className="ml-7 space-y-1">
                <button
                  onClick={() => onThemeChange('light')}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                    theme === 'light' 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                    theme === 'dark' 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => onThemeChange('auto')}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                    theme === 'auto' 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogout();
              }}
              className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}