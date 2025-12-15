"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Task } from '../../../services/types/task.types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTimer } from '../../../contexts/TimerContext';
import { useFolder } from '../../../contexts/FolderContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Folder } from '../../../services/types/folder.types';
import { requiresFolderAssignment } from '../../../utils/groupRoleUtils';
import {
  CheckCircle,
  PlayCircle,
  StopCircle,
  RefreshCw,
  FolderInput,
  Copy,
  Trash2,
  ChevronRight,
  Settings,
  XCircle,
  AlertTriangle,
  Folder as FolderIcon,
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
  { key: 'remove', label: 'Remove repeat', isRemove: true },
];

export default function TaskContextMenu({ x, y, task, onAction, onClose }: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const changeTypeRef = useRef<HTMLDivElement>(null);
  const repeatRef = useRef<HTMLDivElement>(null);
  const moveToRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();
  const { isTimerRunning } = useTimer();
  const { folders } = useFolder();
  const { currentGroup } = useAuth();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [moveWarning, setMoveWarning] = useState<{ folderId: string; missingAssignees: string[] } | null>(null);

  // Check if this task has a running timer
  const taskHasRunningTimer = isTimerRunning(task._id);

  // Check if task is in a status that allows timer
  const canUseTimer = task.status !== 'completed' && task.status !== 'incomplete';

  // Handle submenu open/close with delay to prevent flicker when moving between menu and submenu
  const handleSubmenuOpen = useCallback((submenu: string) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveSubmenu(submenu);
  }, []);

  const handleSubmenuClose = useCallback(() => {
    // Add a small delay before closing to allow mouse to move to submenu
    closeTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

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
    } else if (option.isRemove) {
      handleAction('remove_repeat');
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

  // Calculate submenu position to prevent overflow
  const getSubmenuStyle = (ref: React.RefObject<HTMLDivElement | null>, submenuHeight: number) => {
    if (!ref.current) return { top: 0 };

    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.top;
    const spaceAbove = rect.top;

    // If submenu would overflow below and there's more space above, position from bottom
    if (spaceBelow < submenuHeight && spaceAbove > spaceBelow) {
      // Position from bottom - align bottom of submenu with bottom of trigger
      return { bottom: 0, top: 'auto' };
    }

    return { top: 0 };
  };

  // Calculate menu position to stay within viewport
  const menuStyle = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 350),
    width: 200
  };

  // Estimated heights for submenus
  const categorySubmenuHeight = 320; // ~8 items * 40px
  const repeatSubmenuHeight = 380; // ~9 items * 40px + remove option
  const moveToSubmenuHeight = 300; // ~7 items * 40px

  // Get assignees who don't have access to target folder
  // This accounts for role-based access:
  // - 'full' scope roles (PM, Product Owner) have access to all folders
  // - 'read_only' roles (Sale, QA, Dev Manager) can view all folders
  // - 'folder_scoped' roles need explicit memberAccess in the folder
  const getAssigneesWithoutAccess = (targetFolder: Folder): string[] => {
    const missingAssignees: string[] = [];

    // Get the folder's member IDs (if any)
    const folderMemberIds = new Set(
      targetFolder.memberAccess?.map(m => m.userId) || []
    );

    task.assignedTo.forEach(assignment => {
      const userId = typeof assignment.userId === 'string'
        ? assignment.userId
        : assignment.userId._id;

      let userName = 'Unknown User';
      if (typeof assignment.userId === 'object' && assignment.userId) {
        userName = assignment.userId.name || 'Unknown User';
      } else if (typeof assignment.userId === 'string') {
        // Try to resolve from group members
        const member = currentGroup?.members?.find((m: any) => {
          const memberId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
          return memberId === assignment.userId;
        });
        if (member) {
          const userObj = typeof member.userId === 'object' ? member.userId : null;
          userName = userObj?.name || member.name || 'Unknown User';
        }
      }

      // Find the member in the current group to check their role
      const groupMember = currentGroup?.members?.find(m => {
        const memberId = typeof m.userId === 'string' ? m.userId : m.userId?._id;
        return memberId === userId;
      });

      // If we can't find the member or they don't require folder assignment, skip
      // (they have access to all folders by default)
      if (!groupMember || !requiresFolderAssignment(groupMember.role)) {
        return; // This user has full access, no need to check
      }

      // For folder_scoped roles, check if they're in the folder's memberAccess
      if (!folderMemberIds.has(userId)) {
        missingAssignees.push(userName);
      }
    });

    return missingAssignees;
  };

  // Handle folder move with access validation
  const handleFolderMove = (targetFolder: Folder) => {
    // Get current folder ID
    const currentFolderId = typeof task.folderId === 'object'
      ? task.folderId?._id
      : task.folderId;

    // Skip if already in this folder
    if (currentFolderId === targetFolder._id) return;

    // Check if all assignees have access
    const missingAssignees = getAssigneesWithoutAccess(targetFolder);

    if (missingAssignees.length > 0) {
      // Show warning instead of moving
      setMoveWarning({ folderId: targetFolder._id, missingAssignees });
    } else {
      // All assignees have access - proceed with move
      handleAction('move_to_folder', { folderId: targetFolder._id });
    }
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
          ref={changeTypeRef}
          className="relative"
          onMouseEnter={() => handleSubmenuOpen('change_type')}
          onMouseLeave={handleSubmenuClose}
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
              className="absolute left-full w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
              style={getSubmenuStyle(changeTypeRef, categorySubmenuHeight)}
              onMouseEnter={() => handleSubmenuOpen('change_type')}
              onMouseLeave={handleSubmenuClose}
            >
              {/* Invisible bridge to connect main menu to submenu */}
              <div className="absolute -left-2 top-0 bottom-0 w-2" />
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
          ref={repeatRef}
          className="relative"
          onMouseEnter={() => handleSubmenuOpen('repeat')}
          onMouseLeave={handleSubmenuClose}
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
              className="absolute left-full w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
              style={getSubmenuStyle(repeatRef, repeatSubmenuHeight)}
              onMouseEnter={() => handleSubmenuOpen('repeat')}
              onMouseLeave={handleSubmenuClose}
            >
              {/* Invisible bridge to connect main menu to submenu */}
              <div className="absolute -left-2 top-0 bottom-0 w-2" />
              <div className="py-1">
                {REPEAT_OPTIONS.map((option) => {
                  if (option.isDivider) {
                    return (
                      <div key={option.key} className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-t border-gray-200 dark:border-gray-700 mt-1 pt-2">
                        {option.label}
                      </div>
                    );
                  }

                  // Only show Remove repeat if task has active repeat
                  if (option.isRemove) {
                    if (!task.repetition?.isRepeating) return null;
                    return (
                      <React.Fragment key={option.key}>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleRepeatChange(option)}
                        >
                          <XCircle className="w-4 h-4" />
                          {option.label}
                        </button>
                      </React.Fragment>
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

        {/* Move To - with submenu */}
        <div
          ref={moveToRef}
          className="relative"
          onMouseEnter={() => handleSubmenuOpen('move_to')}
          onMouseLeave={handleSubmenuClose}
        >
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-3">
              <FolderInput className="w-4 h-4 text-gray-500" />
              {t('taskContextMenu.moveTo')}
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Move To Submenu */}
          {activeSubmenu === 'move_to' && (
            <div
              className="absolute left-full w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
              style={getSubmenuStyle(moveToRef, moveToSubmenuHeight)}
              onMouseEnter={() => handleSubmenuOpen('move_to')}
              onMouseLeave={handleSubmenuClose}
            >
              {/* Invisible bridge to connect main menu to submenu */}
              <div className="absolute -left-2 top-0 bottom-0 w-2" />
              <div className="py-1 max-h-64 overflow-y-auto">
                {folders.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No folders available
                  </div>
                ) : (
                  folders.map((folder) => {
                    const currentFolderId = typeof task.folderId === 'object'
                      ? task.folderId?._id
                      : task.folderId;
                    const isCurrentFolder = currentFolderId === folder._id;
                    const missingAssignees = getAssigneesWithoutAccess(folder);
                    const hasWarning = missingAssignees.length > 0;

                    return (
                      <button
                        key={folder._id}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${isCurrentFolder
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                          }`}
                        onClick={() => handleFolderMove(folder)}
                        disabled={isCurrentFolder}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FolderIcon
                            className={`w-4 h-4 flex-shrink-0 ${isCurrentFolder ? 'text-blue-500' : 'text-gray-400'
                              }`}
                          />
                          <span className="truncate">{folder.name}</span>
                          {folder.isDefault && (
                            <span className="text-xs text-gray-400">(default)</span>
                          )}
                        </div>
                        {hasWarning && !isCurrentFolder && (
                          <div title={`${missingAssignees.length} assignee(s) don't have access`}>
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

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

      {/* Move Warning Modal */}
      {moveWarning && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          onClick={() => setMoveWarning(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Cannot Move Task</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              The following assignees don&apos;t have access to this folder:
            </p>
            <ul className="text-sm text-gray-700 dark:text-gray-200 mb-4 list-disc list-inside">
              {moveWarning.missingAssignees.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
            <button
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => setMoveWarning(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
