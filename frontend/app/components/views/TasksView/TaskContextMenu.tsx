"use client"

import React, { useEffect, useRef } from 'react';
import { Task } from '../../../services/types/task.types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTimer } from '../../../contexts/TimerContext';

interface TaskContextMenuProps {
  x: number;
  y: number;
  task: Task;
  onAction: (action: string, task: Task) => void;
  onClose: () => void;
}

export default function TaskContextMenu({ x, y, task, onAction, onClose }: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { isTimerRunning } = useTimer();

  // Check if this task has a running timer
  const taskHasRunningTimer = isTimerRunning(task._id);

  const menuItems = [
    { label: t('taskContextMenu.complete'), action: 'complete' },
    {
      label: taskHasRunningTimer ? t('taskContextMenu.stopTimer') : t('taskContextMenu.startTimer'),
      action: taskHasRunningTimer ? 'stop_timer' : 'start_timer'
    },
    { label: t('taskContextMenu.changeType'), action: 'change_type' },
    { label: t('taskContextMenu.repeat'), action: 'repeat' },
    { label: t('taskContextMenu.moveTo'), action: 'move_to' },
    { label: t('taskContextMenu.delete'), action: 'delete', destructive: true },
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

    // Dọn dẹp khi component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-0.5 z-50 min-w-32"
      style={{
        left: Math.min(x, window.innerWidth - 140), // Đảm bảo menu không vượt khỏi màn hình
        top: Math.min(y, window.innerHeight - 180),
        width: 200
      }}
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          className={`w-full text-left px-2.5 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${item.destructive ? 'text-red-600 hover:text-red-800' : 'text-gray-700 dark:text-gray-300'
            }`}
          onClick={() => handleAction(item.action, task)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
