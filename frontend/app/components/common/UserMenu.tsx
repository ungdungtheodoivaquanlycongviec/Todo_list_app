"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { User } from '../../services/types/auth.types';

interface UserMenuProps {
  currentUser: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
}

export default function UserMenu({ 
  currentUser, 
  onLogout, 
  theme, 
  onThemeChange,
  onProfileClick
}: UserMenuProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [avatarError, setAvatarError] = useState(false); // THÊM STATE CHO AVATAR ERROR
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
        setShowThemeOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // RESET AVATAR ERROR KHI USER THAY ĐỔI
  useEffect(() => {
    setAvatarError(false);
  }, [currentUser.avatar]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'auto': return <Monitor className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'auto': return 'Auto';
      default: return 'Theme';
    }
  };

  const handleThemeChange = (newTheme: string) => {
    onThemeChange(newTheme);
    setShowThemeOptions(false);
  };

  return (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        {/* AVATAR DISPLAY - SỬA LẠI ĐỂ HIỂN THỊ ĐÚNG */}
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
          {currentUser.avatar && !avatarError ? (
            <img 
              src={currentUser.avatar} 
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getInitials(currentUser.name)}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                {currentUser.avatar && !avatarError ? (
                  <img 
                    src={currentUser.avatar} 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getInitials(currentUser.name)}
                  </span>
                )}
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{currentUser.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Profile Settings */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                onProfileClick?.();
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-left"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm flex-1">Profile settings</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

            {/* Theme Toggle */}
            <div className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <button
                onClick={() => setShowThemeOptions(!showThemeOptions)}
                className="w-full flex items-center justify-between text-gray-700 dark:text-gray-300 text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getThemeIcon()}
                  <span className="text-sm">Theme</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{getThemeLabel()}</span>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${
                      showThemeOptions ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              </button>

              {/* Theme Options */}
              {showThemeOptions && (
                <div className="mt-2 space-y-1 ml-7">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'light' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Sun className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">Light</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'dark' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Moon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">Dark</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('auto')}
                    className={`w-full px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'auto' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Monitor className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">Auto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

            {/* Logout */}
            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogout();
              }}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 text-left"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm flex-1">Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}