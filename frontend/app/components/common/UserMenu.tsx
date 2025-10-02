"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

interface User {
  name: string;
  email: string;
  avatar: string | null;
}

interface UserMenuProps {
  currentUser: User;
}

export default function UserMenu({ currentUser }: UserMenuProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    console.log('API Call: POST /api/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
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

            <ThemeToggle />

            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

            <button
              onClick={handleLogout}
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