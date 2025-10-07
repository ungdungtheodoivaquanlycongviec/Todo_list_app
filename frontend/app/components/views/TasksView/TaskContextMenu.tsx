"use client"

import React, { useEffect, useRef } from 'react';
import { Task } from '../../../services/types/task.types';

interface TaskContextMenuProps {
  x: number;
  y: number;
  task: Task;
  onAction: (action: string, task: Task) => void;
  onClose: () => void;
}

export default function TaskContextMenu({ x, y, task, onAction, onClose }: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  const menuItems = [
    { label: 'Complete task', action: 'complete' },
    { label: 'Start timer', action: 'start_timer' },
    { label: 'Change type', action: 'change_type' },
    { label: 'Repeat task', action: 'repeat' },
    { label: 'Move to', action: 'move_to' },
    { label: 'Delete task', action: 'delete', destructive: true },
  ];

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Thêm event listener khi component mount
    document.addEventListener('mousedown', handleClickOutside);

    // Ngăn scroll khi menu đang mở
    document.body.style.overflow = 'hidden';

    // Dọn dẹp khi component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Đóng menu khi nhấn phím Escape
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const handleAction = (action: string, task: Task) => {
    onAction(action, task);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-48"
      style={{ 
        left: Math.min(x, window.innerWidth - 200), // Đảm bảo menu không vượt khỏi màn hình
        top: Math.min(y, window.innerHeight - 200)
      }}
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
            item.destructive ? 'text-red-600 hover:text-red-800' : 'text-gray-700'
          }`}
          onClick={() => handleAction(item.action, task)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}