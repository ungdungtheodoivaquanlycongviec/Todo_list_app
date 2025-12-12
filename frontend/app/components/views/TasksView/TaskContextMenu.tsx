"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Task } from '../../../services/types/task.types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTimer } from '../../../contexts/TimerContext';
import {
  CheckCircle,
  PlayCircle,
  StopCircle,
  Square,
  RefreshCw,
  FolderInput,
  Copy,
  Trash2,
  ChevronRight,
  Settings,
} from 'lucide-react';

interface TaskContextMenuProps {
  x: number;
  y: number;
  task: Task;
  onAction: (action: string, task: Task, payload?: any) => void;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Operational: '#3B82F6',
  Technical: '#8B5CF6',
  Strategic: '#10B981',
  Hiring: '#22C55E',
  Financial: '#F59E0B',
  Other: '#6B7280',
};

const CATEGORIES = ['Operational', 'Technical', 'Strategic', 'Hiring', 'Financial', 'Other'];

const REPEAT_OPTIONS = [
  { key: 'after_completion', label: 'After completion', frequency: null },
  { key: 'divider', label: 'Time-based', isDivider: true },
  { key: 'daily', label: 'Every day', frequency: 'daily', interval: 1 },
  { key: 'workday', label: 'Every workday', frequency: 'daily', interval: 1, workdaysOnly: true },
  { key: 'weekly', label: 'Every week', frequency: 'weekly', interval: 1 },
  { key: 'monthly', label: 'Every month', frequency: 'monthly', interval: 1 },
  { key: 'yearly', label: 'Every year', frequency: 'yearly', interval: 1 },
  { key: 'custom', label: 'Customize repeat', isCustom: true },
];

export default function TaskContextMenu({ x, y, task, onAction, onClose }: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { isTimerRunning } = useTimer();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // Check if this task has a running timer
  const taskHasRunningTimer = isTimerRunning(task._id);

  // Check if task is in a status that allows timer
  const canUseTimer = task.status !== 'completed' && task.status !== 'incomplete';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  const handleAction = (action: string, payload?: any) => {
    onAction(action, task, payload);
    onClose();
  };

  const handleCategoryChange = (category: string) => {
    handleAction('change_category', { category });
  };

  const handleRepeatChange = (option: typeof REPEAT_OPTIONS[0]) => {
    if (option.isCustom) {
      handleAction('repeat_custom');
    } else if (option.frequency) {
      handleAction('set_repeat', {
        isRepeating: true,
        frequency: option.frequency,
        interval: option.interval,
      });
    } else if (option.key === 'after_completion') {
      handleAction('repeat_after_completion');
    }
  };

  // Calculate menu position to stay within viewport
  const menuStyle = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 350),
    width: 200
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
      style={menuStyle}
    >
      <div className="py-1">
        {/* Complete Task */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => handleAction('complete')}
        >
          <CheckCircle className="w-4 h-4 text-gray-500" />
          {t('taskContextMenu.complete')}
        </button>

        {/* Timer */}
        {canUseTimer && (
          <button
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleAction(taskHasRunningTimer ? 'stop_timer' : 'start_timer')}
          >
            {taskHasRunningTimer ? (
              <StopCircle className="w-4 h-4 text-red-500" />
            ) : (
              <PlayCircle className="w-4 h-4 text-gray-500" />
            )}
            {taskHasRunningTimer ? t('taskContextMenu.stopTimer') : t('taskContextMenu.startTimer')}
          </button>
        )}

        {/* Change Type - with submenu */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu('change_type')}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: CATEGORY_COLORS[task.category || 'Other'] }}
              />
              {t('taskContextMenu.changeType')}
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Change Type Submenu */}
          {activeSubmenu === 'change_type' && (
            <div
              className="absolute left-full top-0 ml-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
            >
              <div className="py-1">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${task.category === category
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-300'
                      }`}
                    onClick={() => handleCategoryChange(category)}
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    />
                    {category}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleAction('edit_types')}
                >
                  <Settings className="w-4 h-4" />
                  Edit types
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Repeat Task - with submenu */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu('repeat')}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-gray-500" />
              {t('taskContextMenu.repeat')}
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Repeat Task Submenu */}
          {activeSubmenu === 'repeat' && (
            <div
              className="absolute left-full top-0 ml-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
            >
              <div className="py-1">
                {REPEAT_OPTIONS.map((option) => {
                  if (option.isDivider) {
                    return (
                      <div key={option.key} className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-t border-gray-200 dark:border-gray-700 mt-1 pt-2">
                        {option.label}
                      </div>
                    );
                  }

                  const isActive = task.repetition?.isRepeating && task.repetition?.frequency === option.frequency;

                  return (
                    <button
                      key={option.key}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${isActive
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                        }`}
                      onClick={() => handleRepeatChange(option)}
                    >
                      {option.isCustom ? (
                        <Settings className="w-4 h-4" />
                      ) : (
                        <RefreshCw className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                      )}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Move To */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => handleAction('move_to')}
        >
          <FolderInput className="w-4 h-4 text-gray-500" />
          {t('taskContextMenu.moveTo')}
        </button>

        {/* Duplicate Task */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => handleAction('duplicate')}
        >
          <Copy className="w-4 h-4 text-gray-500" />
          Duplicate task
        </button>

        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Delete Task */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => handleAction('delete')}
        >
          <Trash2 className="w-4 h-4" />
          {t('taskContextMenu.delete')}
        </button>
      </div>
    </div>
  );
}
