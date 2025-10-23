"use client"

import React from 'react';
import { CheckSquare, Calendar, FileText, Users } from 'lucide-react';

interface ToolsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function ToolsSidebar({ activeView, onViewChange }: ToolsSidebarProps) {
  const tools = [
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'notes', icon: FileText, label: 'Notes' },
    { id: 'members', icon: Users, label: 'Members' },
  ];

  return (
    // THAY ĐỔI: w-[6.25%] thành w-full vì grid đã xử lý width
    <div className="w-full h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col pt-4">
      <h2 className="px-3 mb-3 text-xs font-medium text-gray-600 dark:text-gray-400">Tools</h2>
      
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeView === tool.id;
        
        return (
          <div
            key={tool.id}
            className={`flex flex-col items-center gap-2 py-3 px-2 cursor-pointer ${
              isActive ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => onViewChange(tool.id)}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'}`} />
            <span className={`text-xs ${isActive ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
              {tool.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}