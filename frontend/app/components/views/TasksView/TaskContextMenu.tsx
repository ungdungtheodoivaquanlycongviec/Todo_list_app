"use client"

import React from 'react';
import { Task } from '../../../services/types/task.types';

interface TaskContextMenuProps {
  x: number;
  y: number;
  task: Task;
  onAction: (action: string, task: Task) => void;
  onClose: () => void;
}

export default function TaskContextMenu({ x, y, task, onAction, onClose }: TaskContextMenuProps) {
  const menuItems = [
    { label: 'Complete task', action: 'complete' },
    { label: 'Start timer', action: 'start_timer' },
    { label: 'Change type', action: 'change_type' },
    { label: 'Repeat task', action: 'repeat' },
    { label: 'Move to', action: 'move_to' },
    { label: 'Delete task', action: 'delete', destructive: true },
  ];

  const handleAction = (action: string, task: Task) => {
    onAction(action, task);
    onClose();
  };

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-48"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item) => (
        <button
          key={item.action}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
            item.destructive ? 'text-red-600' : 'text-gray-700'
          }`}
          onClick={() => handleAction(item.action, task)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}