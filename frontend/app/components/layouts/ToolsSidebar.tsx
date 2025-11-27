"use client"

import React from 'react';
import { CheckSquare, Calendar, FileText, Users, Layout, Target, BarChart3, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ToolsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function ToolsSidebar({ activeView, onViewChange }: ToolsSidebarProps) {
  const { t } = useLanguage();
  
  const tools = [
    { id: 'tasks', icon: CheckSquare, label: t('nav.tasks') },
    { id: 'calendar', icon: Calendar, label: t('nav.calendar') },
    { id: 'notes', icon: FileText, label: t('nav.notes') },
    { id: 'chat', icon: MessageSquare, label: t('nav.chat') },
    { id: 'members', icon: Users, label: t('nav.members') },
  ];

  return (
    <div className="w-full max-w-[72px] xl:max-w-[100px] h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Minimal Header */}
      <div className="p-3 xl:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="w-7 h-7 xl:w-8 xl:h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-1">
            <Layout className="w-4 h-4 text-white" />
          </div>
          <span className="text-[10px] xl:text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('tools.title')}
          </span>
        </div>
      </div>

      {/* Icon-only Navigation */}
      <div className="flex-1 flex flex-col items-center py-3 xl:py-4 space-y-2 xl:space-y-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeView === tool.id;
          
          return (
            <button
              key={tool.id}
              className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl transition-all duration-200 group relative flex items-center justify-center ${
                isActive 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => onViewChange(tool.id)}
              title={tool.label}
            >
              <Icon className="w-4 h-4 xl:w-5 xl:h-5" />
              
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}