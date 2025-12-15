"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  User,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Calendar as CalendarIcon,
  Clock,
  Folder,
  Tag,
  ZoomIn,
  ZoomOut,
  GripVertical
} from 'lucide-react';
import { taskService } from '../../services/task.service';
import { Task } from '../../services/types/task.types';
import { useAuth } from '../../contexts/AuthContext';
import CreateTaskModal from './TasksView/CreateTaskModal';
import TaskDetailModal from './TasksView/TaskDetailModal';
import { useGroupChange } from '../../hooks/useGroupChange';
import NoGroupState from '../common/NoGroupState';
import NoFolderState from '../common/NoFolderState';
import { useFolder } from '../../contexts/FolderContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRegional } from '../../contexts/RegionalContext';
import { monthNames, dayNamesShort } from '../../i18n/dateLocales';

type ZoomLevel = 'days' | 'weeks' | 'months' | 'quarters';
type GroupBy = 'none' | 'folder' | 'category' | 'assignee' | 'status';

interface TimelineTask extends Task {
  startDate: Date;
  endDate: Date;
  left: number;
  width: number;
  row: number;
}

export default function TimelineView() {
  const { user: currentUser, currentGroup } = useAuth();
  const { currentFolder } = useFolder();
  const { t, language } = useLanguage();
  const { formatDate, getWeekStartDay } = useRegional();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('weeks');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [originalTaskData, setOriginalTaskData] = useState<{ startTime: Date; dueDate: Date } | null>(null);
  const [draggedTaskPosition, setDraggedTaskPosition] = useState<{ startTime: string; dueDate: string } | null>(null);
  const [resizingTask, setResizingTask] = useState<string | null>(null);
  const [resizeType, setResizeType] = useState<'start' | 'end' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragAnimationFrame = useRef<number | null>(null);
  const resizeAnimationFrame = useRef<number | null>(null);
  const [resizedTaskPosition, setResizedTaskPosition] = useState<{ startTime?: string; dueDate?: string } | null>(null);
  const wasInteractingRef = useRef(false); // Track if we just finished dragging/resizing

  const getTaskColor = useCallback((taskId: string) => {
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
      hash = (hash << 5) - hash + taskId.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }, []);

  const daysPerColumn = useMemo(() => {
    switch (zoomLevel) {
      case 'weeks':
        return 7;
      case 'months':
        return 30;
      case 'quarters':
        return 90;
      default:
        return 1;
    }
  }, [zoomLevel]);

  const pixelsPerDay = useMemo(() => {
    switch (zoomLevel) {
      case 'days':
        return 80;
      case 'weeks':
        return 28;
      case 'months':
        return 18;
      case 'quarters':
        return 10;
      default:
        return 24;
    }
  }, [zoomLevel]);

  const columnWidth = useMemo(() => pixelsPerDay * daysPerColumn, [pixelsPerDay, daysPerColumn]);
  const headerHeight = useMemo(() => (zoomLevel === 'days' ? 60 : 90), [zoomLevel]);

  const taskDateBounds = useMemo(() => {
    if (!tasks.length) return null;

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const getStart = (task: Task) => {
      // Use createdAt as start date for timeline display
      if (task.createdAt) return new Date(task.createdAt);
      if (task.dueDate) return new Date(task.dueDate);
      return null;
    };

    const getEnd = (task: Task, start: Date | null) => {
      // Use dueDate as end date, or createdAt + 1 day if no dueDate
      if (task.dueDate) return new Date(task.dueDate);
      if (start) return new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return null;
    };

    tasks.forEach(task => {
      const start = getStart(task);
      const end = getEnd(task, start);
      if (start) {
        if (!minDate || start < minDate) minDate = start;
        if (!maxDate || start > maxDate) maxDate = start;
      }
      if (end) {
        if (!minDate || end < minDate) minDate = end;
        if (!maxDate || end > maxDate) maxDate = end;
      }
    });

    return minDate && maxDate ? { min: minDate, max: maxDate } : null;
  }, [tasks]);

  // Calculate date range based on zoom level
  const getDateRange = useCallback(() => {
    const today = new Date(currentDate);
    let start = new Date(today);
    let end = new Date(today);

    switch (zoomLevel) {
      case 'days':
        start.setDate(today.getDate() - 7);
        end.setDate(today.getDate() + 14);
        break;
      case 'weeks':
        start.setDate(today.getDate() - 14);
        end.setDate(today.getDate() + 28);
        break;
      case 'months':
        start.setMonth(today.getMonth() - 2);
        end.setMonth(today.getMonth() + 4);
        break;
      case 'quarters':
        start.setMonth(today.getMonth() - 6);
        end.setMonth(today.getMonth() + 12);
        break;
    }

    if (taskDateBounds) {
      const buffer = daysPerColumn * 4 || 7;
      const minWithBuffer = new Date(taskDateBounds.min);
      minWithBuffer.setDate(minWithBuffer.getDate() - buffer);
      const maxWithBuffer = new Date(taskDateBounds.max);
      maxWithBuffer.setDate(maxWithBuffer.getDate() + buffer);

      if (minWithBuffer < start) start = minWithBuffer;
      if (maxWithBuffer > end) end = maxWithBuffer;
    }

    return { start, end };
  }, [currentDate, zoomLevel, taskDateBounds, daysPerColumn]);

  // Get daily dates in range (base unit)
  const getDatesInRange = useCallback(() => {
    const { start, end } = getDateRange();
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [getDateRange]);
  const dates = useMemo(() => getDatesInRange(), [getDatesInRange]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!currentUser || !currentGroup) return;

    try {
      setLoading(true);
      const response = await taskService.getAllTasks({
        folderId: currentFolder?._id
      });
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentGroup, currentFolder?._id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useGroupChange(() => {
    fetchTasks();
  });

  // Filter tasks based on search
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.category && task.category.toLowerCase().includes(query))
    );
  });

  // Group tasks
  const groupedTasks = useCallback(() => {
    if (groupBy === 'none') {
      return { [t('timeline.allTasks')]: filteredTasks };
    }

    const groups: { [key: string]: Task[] } = {};

    filteredTasks.forEach(task => {
      let key = t('timeline.uncategorized');

      switch (groupBy) {
        case 'folder':
          if (task.folderId && typeof task.folderId === 'object' && 'name' in task.folderId) {
            key = task.folderId.name || t('timeline.unnamedFolder');
          } else {
            key = t('timeline.noFolder');
          }
          break;
        case 'category':
          // Use category as-is, capitalize first letter
          if (task.category) {
            key = task.category.charAt(0).toUpperCase() + task.category.slice(1);
          } else {
            key = t('timeline.noCategory');
          }
          break;
        case 'assignee':
          if (task.assignedTo && task.assignedTo.length > 0) {
            const assignee = task.assignedTo[0];
            if (typeof assignee.userId === 'object' && 'name' in assignee.userId) {
              key = assignee.userId.name || t('timeline.unnamedUser');
            } else {
              key = t('timeline.assigned');
            }
          } else {
            key = t('timeline.unassigned');
          }
          break;
        case 'status':
          key = task.status ? (t as any)(`status.${task.status}`) : t('status.todo');
          break;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    return groups;
  }, [filteredTasks, groupBy, t]);

  // Calculate task position on timeline
  const calculateTaskPosition = useCallback((task: Task): TimelineTask | null => {
    const { start } = getDateRange();
    // Use dragged/resized position if task is being manipulated
    let taskStart: Date;
    let taskEnd: Date;

    const getFallbackStart = () => {
      // Use createdAt as start date for timeline display
      if (task.createdAt) return new Date(task.createdAt);
      if (task.dueDate) return new Date(task.dueDate);
      return new Date();
    };

    const getFallbackEnd = (start: Date) => {
      // Use dueDate as end date, or start + 1 day if no dueDate
      if (task.dueDate) return new Date(task.dueDate);
      return new Date(start.getTime() + 24 * 60 * 60 * 1000);
    };

    if (draggedTask === task._id && draggedTaskPosition) {
      taskStart = new Date(draggedTaskPosition.startTime);
      taskEnd = new Date(draggedTaskPosition.dueDate);
    } else if (resizingTask === task._id && resizedTaskPosition) {
      const baseStart = getFallbackStart();
      taskStart = resizedTaskPosition.startTime
        ? new Date(resizedTaskPosition.startTime)
        : baseStart;
      taskEnd = resizedTaskPosition.dueDate
        ? new Date(resizedTaskPosition.dueDate)
        : getFallbackEnd(taskStart);
    } else {
      taskStart = getFallbackStart();
      taskEnd = getFallbackEnd(taskStart);
    }

    // Check if task is in range
    if (dates.length > 0 && (taskEnd < start || taskStart > dates[dates.length - 1])) {
      return null;
    }

    // Calculate left position - normalize dates to start of day to avoid timezone issues
    const normalizedStart = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
    const normalizedRangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const daysDiff = Math.round((normalizedStart.getTime() - normalizedRangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const left = daysDiff * pixelsPerDay;

    // Calculate width - normalize end date as well
    const normalizedEnd = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
    const duration = Math.max(1, Math.round((normalizedEnd.getTime() - normalizedStart.getTime()) / (1000 * 60 * 60 * 24)));
    const width = duration * pixelsPerDay;

    return {
      ...task,
      startDate: taskStart,
      endDate: taskEnd,
      left: Math.max(0, left),
      width: Math.max(50, width),
      row: 0 // Will be calculated later
    };
  }, [getDateRange, getDatesInRange, pixelsPerDay, draggedTask, draggedTaskPosition, resizingTask, resizedTaskPosition]);

  // Calculate row positions for tasks (avoid overlapping)
  const calculateRows = useCallback((timelineTasks: TimelineTask[]): TimelineTask[] => {
    const rows: TimelineTask[][] = [];

    // Sort tasks by start date
    const sorted = [...timelineTasks].sort((a, b) =>
      a.startDate.getTime() - b.startDate.getTime()
    );

    sorted.forEach(task => {
      let placed = false;

      // Try to place in existing row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const canPlace = row.every(existingTask =>
          task.endDate < existingTask.startDate ||
          task.startDate > existingTask.endDate
        );

        if (canPlace) {
          row.push(task);
          task.row = i;
          placed = true;
          break;
        }
      }

      // If can't place, create new row
      if (!placed) {
        rows.push([task]);
        task.row = rows.length - 1;
      }
    });

    return sorted;
  }, []);

  // Get timeline tasks with positions
  const timelineTasks = useCallback(() => {
    const groups = groupedTasks();
    const allTimelineTasks: TimelineTask[] = [];
    let rowOffset = 0;

    Object.entries(groups).forEach(([groupName, groupTasks]) => {
      const tasksWithPositions = groupTasks
        .map(calculateTaskPosition)
        .filter((task): task is TimelineTask => task !== null);

      const tasksWithRows = calculateRows(tasksWithPositions);

      tasksWithRows.forEach(task => {
        task.row += rowOffset;
        allTimelineTasks.push(task);
      });

      rowOffset += Math.max(1, tasksWithRows.length > 0 ? Math.max(...tasksWithRows.map(t => t.row)) + 1 : 0);
    });

    return allTimelineTasks;
  }, [groupedTasks, calculateTaskPosition, calculateRows]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      // Use createdAt as start date, dueDate as end date
      const baseStart = task.createdAt
        ? new Date(task.createdAt)
        : task.dueDate
          ? new Date(task.dueDate)
          : new Date();
      const baseEnd = task.dueDate ? new Date(task.dueDate) : new Date(baseStart.getTime() + 24 * 60 * 60 * 1000);
      setOriginalTaskData({ startTime: baseStart, dueDate: baseEnd });
    }
    setDraggedTask(taskId);
    const timelineTask = timelineTasks().find(t => t._id === taskId);
    if (timelineTask && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 200; // Subtract sidebar width
      setDragOffset(x - timelineTask.left);
    }
  };

  // Handle drag - optimized with requestAnimationFrame
  const handleDrag = useCallback((e: MouseEvent) => {
    if (!draggedTask || !timelineRef.current || !originalTaskData) return;

    // Cancel previous animation frame
    if (dragAnimationFrame.current) {
      cancelAnimationFrame(dragAnimationFrame.current);
    }

    dragAnimationFrame.current = requestAnimationFrame(() => {
      const rect = timelineRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - 200 - dragOffset; // Subtract sidebar width and offset
      const { start } = getDateRange();

      const days = Math.max(0, Math.round(x / pixelsPerDay));
      const newStartDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

      // Reset to start of day for cleaner alignment
      newStartDate.setHours(0, 0, 0, 0);

      const duration = originalTaskData.dueDate.getTime() - originalTaskData.startTime.getTime();
      const newDueDate = new Date(newStartDate.getTime() + duration);
      // Use start of day to avoid timezone issues when saving
      newDueDate.setHours(0, 0, 0, 0);

      // Only update visual position, don't update tasks state
      setDraggedTaskPosition({
        startTime: newStartDate.toISOString(),
        dueDate: newDueDate.toISOString()
      });
    });
  }, [draggedTask, dragOffset, getDateRange, pixelsPerDay, originalTaskData]);

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    // Cancel any pending animation frame
    if (dragAnimationFrame.current) {
      cancelAnimationFrame(dragAnimationFrame.current);
      dragAnimationFrame.current = null;
    }

    if (!draggedTask) {
      setDraggedTask(null);
      setDragOffset(0);
      setOriginalTaskData(null);
      setDraggedTaskPosition(null);
      return;
    }

    const taskId = draggedTask;
    const finalPosition = draggedTaskPosition;

    // Reset drag state immediately
    setDraggedTask(null);
    setDragOffset(0);
    setOriginalTaskData(null);
    setDraggedTaskPosition(null);

    // Set flag to prevent click from opening task detail
    wasInteractingRef.current = true;
    setTimeout(() => { wasInteractingRef.current = false; }, 100);

    // Update task with final position
    if (finalPosition) {
      try {
        await taskService.updateTask(taskId, {
          dueDate: finalPosition.dueDate
        });

        // Update local state instead of refetching to preserve scroll position
        setTasks(prev => prev.map(t =>
          t._id === taskId
            ? { ...t, dueDate: finalPosition.dueDate }
            : t
        ));
      } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }, [draggedTask, draggedTaskPosition]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, taskId: string, type: 'start' | 'end') => {
    e.stopPropagation();
    setResizingTask(taskId);
    setResizeType(type);
  };

  // Handle resize - optimized with requestAnimationFrame
  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizingTask || !resizeType || !timelineRef.current) return;

    // Cancel previous animation frame
    if (resizeAnimationFrame.current) {
      cancelAnimationFrame(resizeAnimationFrame.current);
    }

    resizeAnimationFrame.current = requestAnimationFrame(() => {
      const rect = timelineRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - 200; // Subtract sidebar width
      const { start } = getDateRange();

      const days = Math.max(0, Math.round(x / pixelsPerDay));
      const newDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

      // Use start of day to avoid timezone issues when saving
      newDate.setHours(0, 0, 0, 0);

      // Get original task to check constraints
      const originalTask = tasks.find(t => t._id === resizingTask);
      if (originalTask) {
        // Use createdAt as start date, dueDate as end date
        const fallbackStart = originalTask.createdAt
          ? new Date(originalTask.createdAt)
          : originalTask.dueDate
            ? new Date(originalTask.dueDate)
            : new Date();
        const fallbackDue = originalTask.dueDate
          ? new Date(originalTask.dueDate)
          : new Date(fallbackStart.getTime() + 24 * 60 * 60 * 1000);

        if (resizeType === 'start') {
          if (newDate <= fallbackDue) {
            setResizedTaskPosition(prev => ({
              startTime: newDate.toISOString(),
              dueDate: prev?.dueDate
            }));
          }
        } else {
          if (newDate >= fallbackStart) {
            setResizedTaskPosition(prev => ({
              startTime: prev?.startTime,
              dueDate: newDate.toISOString()
            }));
          }
        }
      }
    });
  }, [resizingTask, resizeType, getDateRange, pixelsPerDay, tasks]);

  // Handle resize end
  const handleResizeEnd = useCallback(async () => {
    // Cancel any pending animation frame
    if (resizeAnimationFrame.current) {
      cancelAnimationFrame(resizeAnimationFrame.current);
      resizeAnimationFrame.current = null;
    }

    if (!resizingTask) {
      setResizingTask(null);
      setResizeType(null);
      setResizedTaskPosition(null);
      return;
    }

    const taskId = resizingTask;
    const finalPosition = resizedTaskPosition;
    const originalTask = tasks.find(t => t._id === taskId);

    // Reset resize state immediately
    setResizingTask(null);
    setResizeType(null);
    setResizedTaskPosition(null);

    // Set flag to prevent click from opening task detail
    wasInteractingRef.current = true;
    setTimeout(() => { wasInteractingRef.current = false; }, 100);

    // Update task with final position
    if (finalPosition && originalTask) {
      try {
        const updateData: any = {};
        // Note: Only updating dueDate since startTime was removed from Task model
        if (finalPosition.dueDate) {
          updateData.dueDate = finalPosition.dueDate;
        } else {
          updateData.dueDate = originalTask.dueDate || undefined;
        }

        await taskService.updateTask(taskId, updateData);

        // Update local state instead of refetching to preserve scroll position
        setTasks(prev => prev.map(t =>
          t._id === taskId
            ? { ...t, dueDate: updateData.dueDate }
            : t
        ));
      } catch (error) {
        console.error('Error resizing task:', error);
        alert('Failed to resize task: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }, [resizingTask, resizedTaskPosition, tasks]);

  // Mouse event handlers
  useEffect(() => {
    if (draggedTask) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggedTask, handleDrag, handleDragEnd]);

  useEffect(() => {
    if (resizingTask) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingTask, handleResize, handleResizeEnd]);

  // Navigate timeline
  const navigateTimeline = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (zoomLevel) {
        case 'days':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
          break;
        case 'weeks':
          newDate.setDate(prev.getDate() + (direction === 'next' ? 14 : -14));
          break;
        case 'months':
          newDate.setMonth(prev.getMonth() + (direction === 'next' ? 2 : -2));
          break;
        case 'quarters':
          newDate.setMonth(prev.getMonth() + (direction === 'next' ? 3 : -3));
          break;
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth / 2;
    }
  };

  // Keep current date visible when zoom level changes (only on explicit navigation)
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const { start } = getDateRange();
    const dayMs = 24 * 60 * 60 * 1000;
    const offsetDays = (currentDate.getTime() - start.getTime()) / dayMs;
    const timelineOffset = Math.max(0, offsetDays * pixelsPerDay);
    const centerAdjust = scrollContainerRef.current.clientWidth / 2;
    scrollContainerRef.current.scrollLeft = Math.max(0, timelineOffset - centerAdjust);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel, currentDate]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'todo':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };
  // Format day cell labels based on zoom
  const getDayCellLabel = (date: Date, index: number) => {
    const day = date.getDate();
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const monthShort = language === 'vi' ? `Th${month + 1}` : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
    const dayShort = dayNamesShort[language][dayOfWeek];

    switch (zoomLevel) {
      case 'days':
        return `${dayShort} ${day}`;
      case 'weeks':
        // Show label on week start day (Monday=1 or Sunday=0 based on preference)
        const weekStartDay = getWeekStartDay();
        return dayOfWeek === weekStartDay
          ? `${monthShort} ${day}`
          : '';
      case 'months':
        return day % 5 === 0 ? String(day) : '';
      case 'quarters':
        if (day === 1) {
          return monthShort;
        }
        return day % 10 === 0 ? String(day) : '';
      default:
        return formatDate(date);
    }
  };

  const periodGroups = useMemo<{ label: string; span: number }[]>(() => {
    if (dates.length === 0) return [];
    if (zoomLevel === 'days') return [];

    const groups: { label: string; span: number }[] = [];
    let i = 0;

    while (i < dates.length) {
      const startDate = dates[i];
      let span = 1;

      if (zoomLevel === 'weeks') {
        span = Math.min(7, dates.length - i);
      } else if (zoomLevel === 'months') {
        const month = startDate.getMonth();
        while (i + span < dates.length && dates[i + span].getMonth() === month) {
          span++;
        }
      } else if (zoomLevel === 'quarters') {
        const quarter = Math.floor(startDate.getMonth() / 3);
        while (
          i + span < dates.length &&
          Math.floor(dates[i + span].getMonth() / 3) === quarter
        ) {
          span++;
        }
      }

      const endDate = dates[Math.min(i + span - 1, dates.length - 1)];
      let label = '';

      if (zoomLevel === 'weeks') {
        const startMonthShort = language === 'vi' ? `Th${startDate.getMonth() + 1}` : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][startDate.getMonth()];
        const endMonthShort = language === 'vi' ? `Th${endDate.getMonth() + 1}` : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][endDate.getMonth()];
        label = `${startMonthShort} ${startDate.getDate()} - ${endMonthShort} ${endDate.getDate()}`;
      } else if (zoomLevel === 'months') {
        const monthName = monthNames[language][startDate.getMonth()];
        label = `${monthName} ${startDate.getFullYear()}`;
      } else if (zoomLevel === 'quarters') {
        label = `Q${Math.floor(startDate.getMonth() / 3) + 1} ${startDate.getFullYear()}`;
      }

      groups.push({ label, span });
      i += span;
    }

    return groups;
  }, [dates, zoomLevel, language]);
  const tasksWithPositions = timelineTasks();
  const groups = groupedTasks();
  const today = new Date();
  const todayIndex = dates.findIndex(d =>
    d.toDateString() === today.toDateString()
  );

  // Check if user has a current group
  if (!currentGroup) {
    return (
      <NoGroupState
        title={t('timeline.joinOrCreate')}
        description={t('timeline.needGroup')}
      />
    );
  }

  // Check if user has a current folder
  if (!currentFolder) {
    return <NoFolderState />;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('timeline.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{t('timeline.title')}</h1>
          <p className="text-gray-600 mt-1">{t('timeline.planAndTrack')}</p>
          {currentFolder && (
            <p className="text-sm text-gray-500 mt-1 truncate">
              {t('timeline.folder')}: <span className="font-medium text-gray-800 truncate inline-block align-middle max-w-full" title={currentFolder.name}>{currentFolder.name}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          {/* Zoom Controls */}
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm w-full sm:w-auto">
            {(['days', 'weeks', 'months', 'quarters'] as ZoomLevel[]).map(level => (
              <button
                key={level}
                className={`flex-1 px-3 py-2 text-sm capitalize transition-colors ${zoomLevel === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                onClick={() => setZoomLevel(level)}
              >
                {t(`timeline.${level}`)}
              </button>
            ))}
          </div>

          {/* Add Task Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm font-medium justify-center w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            {t('common.create')}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('timeline.searchTimeline')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Group By */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="flex-1 lg:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            >
              <option value="none">{t('timeline.noGrouping')}</option>
              <option value="folder">{t('timeline.groupByFolder')}</option>
              <option value="category">{t('timeline.groupByCategory')}</option>
              <option value="assignee">{t('timeline.groupByAssignee')}</option>
              <option value="status">{t('timeline.groupByStatus')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Timeline Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              onClick={() => navigateTimeline('prev')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold text-gray-900">
              {monthNames[language][currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>

            <button
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              onClick={() => navigateTimeline('next')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium w-full md:w-auto"
            onClick={goToToday}
          >
            {t('timeline.today')}
          </button>
        </div>

        {/* Timeline Grid */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          <div
            className="relative"
            style={{
              minHeight: '500px',
              width: `${200 + dates.length * pixelsPerDay}px`
            }}
            onDoubleClick={(e) => {
              if (timelineRef.current && !draggedTask && !resizingTask) {
                const rect = timelineRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left - 200; // Subtract left sidebar width
                if (x > 0) {
                  const { start } = getDateRange();
                  const days = Math.round(x / pixelsPerDay);
                  const clickedDate = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
                  setSelectedDate(clickedDate);
                  setShowCreateModal(true);
                }
              }
            }}
          >
            {/* Date Headers */}
            <div
              ref={timelineRef}
              className="sticky top-0 z-20 bg-white border-b border-gray-200 flex"
              style={{ height: `${headerHeight}px` }}
            >
              <div className="w-[200px] border-r border-gray-200 p-3 font-semibold text-gray-700 bg-gray-50 flex-shrink-0">
                {t('timeline.work')}
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {periodGroups.length > 0 && (
                  <div className="flex h-8">
                    {periodGroups.map((period, index) => (
                      <div
                        key={`period-${index}`}
                        className="border-r border-gray-200 text-[11px] uppercase tracking-wide text-gray-500 flex items-center justify-center bg-gray-50 px-2 font-medium"
                        style={{ width: `${period.span * pixelsPerDay}px` }}
                      >
                        {period.label}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex h-10 bg-white">
                  {dates.map((date, index) => {
                    const isToday = date.toDateString() === today.toDateString();
                    const dayLabel = getDayCellLabel(date, index);
                    return (
                      <div
                        key={index}
                        className={`border-r border-gray-100 flex-shrink-0 flex flex-col items-center justify-end pb-1 ${isToday ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500'
                          }`}
                        style={{ width: `${pixelsPerDay}px` }}
                      >
                        {dayLabel && (
                          <span className="text-[11px] leading-tight select-none">{dayLabel}</span>
                        )}
                        <div className="w-px h-3 bg-gray-200 mt-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ height: `${headerHeight}px` }} />

            {/* Today Indicator */}
            {todayIndex >= 0 && todayIndex < dates.length && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                style={{
                  left: `${200 + todayIndex * pixelsPerDay}px`
                }}
              >
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full -mt-1.5"></div>
              </div>
            )}

            {/* Task Rows */}
            {Object.entries(groups).map(([groupName, groupTasks]) => {
              const groupTimelineTasks = tasksWithPositions.filter(t =>
                groupTasks.some(gt => gt._id === t._id)
              );

              if (groupTimelineTasks.length === 0) return null;

              const groupRowOffset = Math.min(...groupTimelineTasks.map(t => t.row));
              const tasksForRender = groupTimelineTasks.map(task => ({
                ...task,
                rowWithinGroup: task.row - groupRowOffset
              }));
              const groupRowCount = Math.max(
                1,
                Math.max(...tasksForRender.map(t => t.rowWithinGroup)) + 1
              );
              const rowHeight = 40;
              const rowGap = 10;
              const groupPadding = groupBy !== 'none' ? 40 : 10;
              const containerHeight = Math.max(60, groupRowCount * (rowHeight + rowGap) + groupPadding);

              return (
                <div key={groupName} className="border-b border-gray-100">
                  {/* Group Header */}
                  {groupBy !== 'none' && (
                    <div
                      className="sticky z-10 bg-gray-50 border-b border-gray-200 px-4 py-2 font-medium text-gray-700 flex items-center gap-2 overflow-hidden"
                      style={{ top: `${headerHeight}px` }}
                    >
                      {groupBy === 'folder' && <Folder className="w-4 h-4" />}
                      {groupBy === 'category' && <Tag className="w-4 h-4" />}
                      {groupBy === 'assignee' && <User className="w-4 h-4" />}
                      {groupBy === 'status' && <Circle className="w-4 h-4" />}
                      <span className="truncate" title={groupName}>{groupName}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                        ({groupTimelineTasks.length})
                      </span>
                    </div>
                  )}

                  {/* Task Bars */}
                  <div className="relative" style={{ minHeight: `${containerHeight}px` }}>
                    {tasksForRender.map((task) => {
                      const top = task.rowWithinGroup * (rowHeight + rowGap) + groupPadding;

                      return (
                        <div
                          key={task._id}
                          className="absolute cursor-move group"
                          style={{
                            left: `${200 + task.left}px`,
                            top: `${top}px`,
                            width: `${Math.max(50, task.width)}px`,
                            height: `${rowHeight}px`,
                            zIndex: draggedTask === task._id ? 30 : (resizingTask === task._id ? 25 : 5)
                          }}
                          onMouseDown={(e) => {
                            // Don't start drag if clicking on resize handle
                            if ((e.target as HTMLElement).closest('.resize-handle')) {
                              return;
                            }
                            handleDragStart(e, task._id);
                          }}
                          onClick={(e) => {
                            // Only open detail if we didn't drag or resize
                            if (!draggedTask && !resizingTask && !wasInteractingRef.current && !(e.target as HTMLElement).closest('.resize-handle')) {
                              setSelectedTaskId(task._id);
                              setShowTaskDetail(true);
                            }
                          }}
                        >
                          {/* Task Bar */}
                          <div
                            className={`h-full rounded-md px-3 py-1 flex items-center justify-between shadow-sm hover:shadow-md transition-all task-bar-content ${draggedTask === task._id ? 'opacity-75 ring-2 ring-blue-400' : ''
                              } ${resizingTask === task._id ? 'ring-2 ring-yellow-400' : ''}`}
                            style={{
                              backgroundColor: getTaskColor(task._id),
                              color: '#ffffff'
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <GripVertical className="w-4 h-4 text-white opacity-50 flex-shrink-0" />
                              <span className="text-white text-sm font-medium truncate">
                                {task.title}
                              </span>
                            </div>

                            {/* Resize Handles */}
                            <div
                              className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white opacity-0 group-hover:opacity-30 hover:opacity-50 rounded-l-md"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(e, task._id, 'start');
                              }}
                            />
                            <div
                              className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white opacity-0 group-hover:opacity-30 hover:opacity-50 rounded-r-md"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeStart(e, task._id, 'end');
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Spacer to prevent clipping of last rows */}
            <div className="h-32" />

            {/* Empty State */}
            {tasksWithPositions.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">{t('timeline.noTasksInTimeline')}</p>
                  <p className="text-gray-400 text-sm mb-4">
                    {t('timeline.tasksWithDates')}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    {t('timeline.createTask')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTask={async (taskData) => {
            try {
              const assignedTo = currentUser ? [{ userId: currentUser._id }] : [];
              const startDate = selectedDate || (taskData.startTime ? new Date(taskData.startTime) : new Date());
              const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

              const backendTaskData = {
                title: taskData.title || t('timeline.untitledTask'),
                description: taskData.description || "",
                category: taskData.category || "general",
                status: "todo",
                priority: taskData.priority === 'None' ? 'low' : taskData.priority.toLowerCase(),
                dueDate: dueDate,
                startTime: startDate,
                tags: taskData.tags || [],
                assignedTo: assignedTo,
                estimatedTime: taskData.estimatedTime || "",
                folderId: currentFolder?._id || undefined
              };

              await taskService.createTask(backendTaskData);
              setShowCreateModal(false);
              setSelectedDate(null);
              await fetchTasks();
            } catch (error) {
              console.error("Error creating task:", error);
              alert("Failed to create task: " + (error instanceof Error ? error.message : 'Unknown error'));
            }
          }}
          currentUser={currentUser}
          initialDueDate={selectedDate || undefined}
        />
      )}

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          isOpen={showTaskDetail}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTaskId(null);
          }}
          onTaskUpdate={async (updatedTask) => {
            await fetchTasks();
          }}
          onTaskDelete={async (taskId) => {
            await fetchTasks();
            setShowTaskDetail(false);
            setSelectedTaskId(null);
          }}
        />
      )}
    </div>
  );
}

