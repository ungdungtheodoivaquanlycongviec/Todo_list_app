"use client"

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  theme?: string;
  onThemeChange?: (theme: string) => void;
}

export default function ThemeToggle({ theme = 'dark', onThemeChange }: ThemeToggleProps) {
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'auto', label: 'Auto', icon: Monitor },
  ];

  const getCurrentThemeIcon = () => {
    const currentTheme = themes.find(t => t.id === theme);
    return currentTheme ? currentTheme.icon : Monitor;
  };

  const CurrentIcon = getCurrentThemeIcon();

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 mb-2">
        <CurrentIcon className="w-4 h-4" />
        <span className="text-sm">Theme</span>
      </div>
      <div className="ml-7 space-y-1">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <button
              key={themeOption.id}
              onClick={() => onThemeChange?.(themeOption.id)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                theme === themeOption.id 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-3 h-3" />
              {themeOption.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}