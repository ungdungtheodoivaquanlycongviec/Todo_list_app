"use client";

import React, { useEffect, useRef } from 'react';
import { Pencil, Trash2, Users, X } from 'lucide-react';

interface FolderContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

export default function FolderContextMenu({
  x,
  y,
  onClose,
  onEdit,
  onDelete,
  onAssign,
  canEdit,
  canDelete,
  canAssign
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  const [adjustedX, adjustedY] = React.useMemo(() => {
    if (typeof window === 'undefined') return [x, y];

    const menuWidth = 200;
    const menuHeight = 150;
    const padding = 10;

    let finalX = x;
    let finalY = y;

    if (x + menuWidth > window.innerWidth) {
      finalX = window.innerWidth - menuWidth - padding;
    }

    if (y + menuHeight > window.innerHeight) {
      finalY = window.innerHeight - menuHeight - padding;
    }

    return [finalX, finalY];
  }, [x, y]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-[#2E2E2E] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-[180px]"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => handleAction(onEdit)}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3E3E3E] transition-colors"
      >
        <Pencil className="w-4 h-4" />
        <span>Chỉnh sửa tên</span>
      </button>

      <button
        onClick={() => handleAction(onAssign)}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3E3E3E] transition-colors"
      >
        <Users className="w-4 h-4" />
        <span>Gán folder</span>
      </button>

      <button
        onClick={() => handleAction(onDelete)}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        <span>Xóa folder</span>
      </button>
    </div>
  );
}

