"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  List,
  Layout,
  Clock,
  Calendar,
  User,
  Flag,
  ArrowUpDown,
  AlertTriangle,
  Search,
  X,
  Filter,
  MoreVertical,
} from "lucide-react";
import { taskService } from "../../../services/task.service";
import { Task } from "../../../services/types/task.types";
import CreateTaskModal from "./CreateTaskModal";
import TaskContextMenu from "./TaskContextMenu";
import TaskDetailModal from "./TaskDetailModal";
import RepeatTaskModal, { RepeatSettings } from "./RepeatTaskModal";
import EstimatedTimePicker from "./EstimatedTimePicker";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useRegional } from "../../../contexts/RegionalContext";
import { Group } from "../../../services/types/group.types";
import { useGroupChange } from "../../../hooks/useGroupChange";
import { useTaskRealtime } from "../../../hooks/useTaskRealtime";
import NoGroupState from "../../common/NoGroupState";
import NoFolderState from "../../common/NoFolderState";
import { useFolder } from "../../../contexts/FolderContext";
import { useUIState } from "../../../contexts/UIStateContext";
import { useTimer } from "../../../contexts/TimerContext";

export default function TasksView() {
  const { user: currentUser, currentGroup } = useAuth();
  const { currentFolder } = useFolder();
  const { t } = useLanguage();
  const { formatDate, convertFromUserTimezone, convertToUserTimezone } = useRegional();
  const { setIsTaskDetailOpen } = useUIState();
  const timerContext = useTimer();
  const [todoTasksExpanded, setTodoTasksExpanded] = useState(true);
  const [inProgressTasksExpanded, setInProgressTasksExpanded] = useState(true);
  const [incompleteTasksExpanded, setIncompleteTasksExpanded] = useState(true);
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(true);
  const [todoTasks, setTodoTasks] = useState<Task[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: Task;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [repeatModalTask, setRepeatModalTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [kanbanData, setKanbanData] = useState<any>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  // Separate sort configs for each task section
  const [sortConfigs, setSortConfigs] = useState<{
    todo: Array<{ key: string; direction: "asc" | "desc" }>;
    inProgress: Array<{ key: string; direction: "asc" | "desc" }>;
    completed: Array<{ key: string; direction: "asc" | "desc" }>;
    incomplete: Array<{ key: string; direction: "asc" | "desc" }>;
  }>({
    todo: [],
    inProgress: [],
    completed: [],
    incomplete: []
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const router = useRouter();

  interface MinimalUser {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  }

  const priorityOptions = ["low", "medium", "high", "urgent"];
  const statusOptions = ["todo", "in_progress", "completed", "incomplete"];
  const typeOptions = [
    "Operational",
    "Strategic",
    "Financial",
    "Technical",
    "Other",
  ];

  // Sort options - moved inside component to use translations
  const sortOptions = [
    { key: "title", label: t('sort.taskName'), asc: t('sort.aToZ'), desc: t('sort.zToA') },
    {
      key: "dueDate",
      label: t('sort.dueDate'),
      asc: t('sort.nearest') || 'Nearest',
      desc: t('sort.furthest') || 'Furthest',
    },
    {
      key: "priority",
      label: t('sort.priority'),
      asc: t('sort.lowToHigh'),
      desc: t('sort.highToLow'),
    },
    {
      key: "estimatedTime",
      label: t('sort.estimatedTime'),
      asc: t('sort.shortestFirst'),
      desc: t('sort.longestFirst'),
    },
    {
      key: "createdAt",
      label: t('sort.createdDate'),
      asc: t('sort.oldestFirst'),
      desc: t('sort.newestFirst'),
    },
  ];

  const currentGroupId =
    (currentGroup && (currentGroup as any)._id) ||
    (currentGroup && (currentGroup as any).id) ||
    null;

  // Helper để lấy error message
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === "string") {
      return error;
    } else if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }
    return "An unknown error occurred";
  };

  const getTaskFolderId = (task: Task): string | null => {
    const folder = (task as any)?.folderId;
    if (!folder) return null;
    if (typeof folder === "string") return folder;
    if (typeof folder === "object") {
      return folder._id || null;
    }
    return null;
  };

  const isTaskInCurrentFolder = (task: Task): boolean => {
    if (!currentFolder) return true;
    const taskFolderId = getTaskFolderId(task);
    if (currentFolder.isDefault) {
      return !taskFolderId || taskFolderId === currentFolder._id;
    }
    return taskFolderId === currentFolder._id;
  };

  // NEW: Helper để lấy danh sách assignees chi tiết
  // Type-safe helper to get detailed assignees
  const getDetailedAssignees = (task: Task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return {
        hasAssignees: false,
        assignees: [],
        currentUserIsAssigned: false,
        totalCount: 0
      };
    }

    const assignees = (task.assignedTo as any[])
      .filter(assignment => assignment && assignment.userId)
      .map(assignment => {
        // Xử lý cả trường hợp userId là string hoặc object
        let userData;

        if (typeof assignment.userId === 'string') {
          // Nếu userId là string ID, tạo minimal user object
          userData = {
            _id: assignment.userId,
            name: 'Loading...', // Tạm thời
            email: '',
            avatar: undefined
          };

          // Nếu là currentUser, sử dụng thông tin currentUser
          if (currentUser && assignment.userId === currentUser._id) {
            userData = {
              _id: currentUser._id,
              name: currentUser.name || t('tasks.you'),
              email: currentUser.email,
              avatar: currentUser.avatar
            };
          }
        } else if (assignment.userId && typeof assignment.userId === 'object') {
          // Nếu userId là object (đã populated)
          const user = assignment.userId as { _id: string; name?: string; email?: string; avatar?: string };
          userData = {
            _id: user._id,
            name: user.name || 'Unknown User',
            email: user.email || '',
            avatar: user.avatar
          };
        } else {
          // Fallback nếu userId không hợp lệ
          return null;
        }

        if (!userData) return null;

        return {
          ...userData,
          initial: (userData.name?.charAt(0) || 'U').toUpperCase()
        };
      })
      .filter((assignee): assignee is NonNullable<typeof assignee> => assignee !== null);

    const currentUserIsAssigned = currentUser &&
      assignees.some(assignee => assignee._id === currentUser._id);

    return {
      hasAssignees: assignees.length > 0,
      assignees,
      currentUserIsAssigned,
      totalCount: assignees.length
    };
  };

  // Type-safe helper to get assignee summary
  const getAssigneeSummary = (task: Task) => {
    const { hasAssignees, assignees, currentUserIsAssigned, totalCount } = getDetailedAssignees(task);

    if (!hasAssignees) {
      return {
        displayText: t('tasks.unassigned'),
        tooltip: t('tasks.noOneAssigned'),
        isCurrentUser: false
      };
    }

    if (currentUserIsAssigned && totalCount === 1) {
      return {
        displayText: t('tasks.you'),
        tooltip: t('tasks.assignedToYou'),
        isCurrentUser: true
      };
    }

    if (currentUserIsAssigned && totalCount > 1) {
      const othersCount = totalCount - 1;
      return {
        displayText: t('tasks.youPlus', { count: othersCount }),
        tooltip: othersCount > 1
          ? t('tasks.assignedToYouAndPlural', { count: othersCount })
          : t('tasks.assignedToYouAnd', { count: othersCount }),
        isCurrentUser: true
      };
    }

    // Display assignee name
    if (totalCount === 1) {
      return {
        displayText: assignees[0].name,
        tooltip: t('tasks.assignedTo', { name: assignees[0].name, email: assignees[0].email }),
        isCurrentUser: false
      };
    }

    // Multiple assignees
    const names = assignees.map(a => a.name).join(', ');
    return {
      displayText: `${totalCount} people`,
      tooltip: `Assigned to: ${names}`,
      isCurrentUser: false
    };
  };

  // Helper to check if task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    if (!task.dueDate) return false;
    if (task.status === "completed") return false;

    try {
      // Convert UTC date from backend to user's timezone for comparison
      const dueDate = convertToUserTimezone(task.dueDate);
      const today = convertToUserTimezone(new Date());

      // Reset time part for accurate date comparison
      const dueDateOnly = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate()
      );
      const todayOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      return dueDateOnly < todayOnly;
    } catch (error) {
      console.error("Error parsing due date:", error);
      return false;
    }
  };

  // Fetch tasks từ API (chế độ list)
  const fetchTasks = async () => {
    // Skip fetching if no folder is selected (e.g., during group transition)
    if (!currentFolder?._id) {
      setTodoTasks([]);
      setInProgressTasks([]);
      setIncompleteTasks([]);
      setCompletedTasks([]);
      setLoading(false);
      return;
    }

    // Skip fetching if folder doesn't belong to current group (race condition during group switch)
    if (currentFolder.groupId && currentGroupId && currentFolder.groupId !== currentGroupId) {
      console.log("Folder group mismatch - skipping fetch, waiting for folder refresh");
      setTodoTasks([]);
      setInProgressTasks([]);
      setIncompleteTasks([]);
      setCompletedTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await taskService.getAllTasks(
        { folderId: currentFolder._id },
        undefined
      );

      console.log("=== FETCH TASKS DEBUG ===");
      console.log("Full response:", response);

      const tasks = response?.tasks || [];
      console.log("Total tasks:", tasks.length);

      const todo: Task[] = [];
      const inProgress: Task[] = [];
      const incomplete: Task[] = [];
      const completed: Task[] = [];

      tasks.forEach((task: Task) => {
        if (!task || !task._id) return; // Skip invalid tasks

        switch (task.status) {
          case "completed":
            completed.push(task);
            break;
          case "incomplete":
            incomplete.push(task);
            break;
          case "in_progress":
            inProgress.push(task);
            break;
          case "todo":
          default:
            todo.push(task);
            break;
        }
      });

      console.log("Todo tasks:", todo.length);
      console.log("In Progress tasks:", inProgress.length);
      console.log("Incomplete tasks:", incomplete.length);
      console.log("Completed tasks:", completed.length);

      setTodoTasks(todo);
      setInProgressTasks(inProgress);
      setIncompleteTasks(incomplete);
      setCompletedTasks(completed);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error("Error fetching tasks:", errorMessage);

      if (errorMessage.includes("Authentication failed")) {
        alert("Session expired. Please login again.");
        router.push("/");
        return;
      }

      if (errorMessage.includes("You must join or create a group")) {
        // Don't show error alert for group requirement - let the UI handle it
        console.log("User needs to join/create a group");
        return;
      }

      if (errorMessage.includes("Folder not found") || errorMessage.includes("404") || errorMessage.includes("current group no longer exists")) {
        // Don't show error alert for folder/group not found - this happens during group switching
        console.log("Folder or group not found - likely switching groups");
        setTodoTasks([]);
        setInProgressTasks([]);
        setIncompleteTasks([]);
        setCompletedTasks([]);
        return;
      }

      // For other errors, show alert
      alert("Failed to fetch tasks: " + errorMessage);

      setTodoTasks([]);
      setInProgressTasks([]);
      setIncompleteTasks([]);
      setCompletedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch kanban data từ API
  const fetchKanbanData = async () => {
    // Skip fetching if no folder is selected (e.g., during group transition)
    if (!currentFolder?._id) {
      setKanbanData(null);
      setLoading(false);
      return;
    }

    // Skip fetching if folder doesn't belong to current group (race condition during group switch)
    if (currentFolder.groupId && currentGroupId && currentFolder.groupId !== currentGroupId) {
      console.log("Folder group mismatch - skipping kanban fetch, waiting for folder refresh");
      setKanbanData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await taskService.getKanbanView({
        folderId: currentFolder._id
      });

      console.log("=== FETCH KANBAN DEBUG ===");
      console.log("Kanban response:", response);

      setKanbanData(response);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error("Error fetching kanban data:", errorMessage);

      if (errorMessage.includes("Authentication failed")) {
        alert("Session expired. Please login again.");
        router.push("/");
        return;
      }

      if (errorMessage.includes("You must join or create a group")) {
        // Don't show error alert for group requirement - let the UI handle it
        console.log("User needs to join/create a group");
        return;
      }

      if (errorMessage.includes("Folder not found") || errorMessage.includes("404") || errorMessage.includes("current group no longer exists")) {
        // Don't show error alert for folder/group not found - this happens during group switching
        console.log("Folder or group not found - likely switching groups");
        setKanbanData(null);
        return;
      }

      // For other errors, show alert
      alert("Failed to fetch kanban data: " + errorMessage);

      setKanbanData(null);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API tương ứng khi chuyển chế độ hoặc thay đổi folder/group
  useEffect(() => {
    if (viewMode === "list") {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  }, [viewMode, currentFolder?._id, currentGroupId]);

  // Sync task detail open state with global UI context (for hiding chatbot)
  useEffect(() => {
    setIsTaskDetailOpen(showTaskDetail);
    return () => setIsTaskDetailOpen(false); // Clean up on unmount
  }, [showTaskDetail, setIsTaskDetailOpen]);

  // Sync timers from tasks that have active timers (for page reload persistence)
  // Note: timerContext.syncTimersFromTask is stable via useCallback, so we intentionally
  // exclude timerContext from deps to prevent infinite loops
  useEffect(() => {
    const allTasks = [...todoTasks, ...inProgressTasks, ...incompleteTasks, ...completedTasks];
    allTasks.forEach((task: Task) => {
      // Sync active timers from task data
      if (task.activeTimers && task.activeTimers.length > 0) {
        timerContext.syncTimersFromTask(task);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todoTasks, inProgressTasks, incompleteTasks, completedTasks]);

  // Listen for global group change events
  useGroupChange(() => {
    console.log('Group change detected, reloading TasksView');
    if (viewMode === "list") {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  });

  // Sort tasks function - supports multiple sort configs per section
  const sortTasks = (tasks: Task[], section: 'todo' | 'inProgress' | 'completed' | 'incomplete' = 'todo') => {
    const sectionSortConfigs = sortConfigs[section];
    if (sectionSortConfigs.length === 0) return tasks;

    const getSortValue = (task: Task, key: string): any => {
      const value = task[key as keyof Task];

      switch (key) {
        case "title":
          return (value || "").toString().toLowerCase();
        case "dueDate":
        case "createdAt":
          if (!value) return Number.MAX_SAFE_INTEGER;
          // Normalize to date only (ignore time) for proper comparison
          const date = new Date(value as string);
          // Set to start of day to ensure same-day dates are treated as equal
          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        case "priority":
          // For "low to high" (asc), we want low priority first, so low=0, high=3, urgent=4
          // For "high to low" (desc), the sort will reverse this order
          const priorityOrder: { [key: string]: number } = {
            low: 0,
            medium: 1,
            high: 2,
            critical: 3,
            urgent: 4,
          };
          return priorityOrder[value as string] ?? -1;
        case "estimatedTime":
          return convertTimeToMinutes((value || "") as string);
        case "status":
          const statusOrder: { [key: string]: number } = { todo: 0, in_progress: 1, completed: 2 };
          return statusOrder[value as string] ?? 3;
        case "category":
          return (value || "").toString().toLowerCase();
        default:
          return value || "";
      }
    };

    const sortedTasks = [...tasks].sort((a, b) => {
      // Iterate through sort configs in order - first config is the primary sort
      // Each subsequent config is used as a tiebreaker when previous configs are equal
      for (const config of sectionSortConfigs) {
        const aValue = getSortValue(a, config.key);
        const bValue = getSortValue(b, config.key);

        // Compare values - if they're equal, continue to the next sort config
        if (aValue < bValue) {
          return config.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === "asc" ? 1 : -1;
        }
        // Values are equal, continue to next sort config (for multi-level sorting)
      }
      return 0;
    });

    return sortedTasks;
  };

  // Helper to convert time string to minutes
  // Supports: Xm (minutes), Xh (hours), Xd (days = 8 working hours), Xmo (months = 160 working hours)
  const convertTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;

    // Try to match the pattern: number followed by unit (mo, m, h, d)
    // Note: 'mo' must be checked before 'm' to avoid false matches
    const monthsMatch = timeStr.match(/(\d+)\s*mo/i);
    const daysMatch = timeStr.match(/(\d+)\s*d(?!o)/i); // 'd' but not 'do' (part of 'mo')
    const hoursMatch = timeStr.match(/(\d+)\s*h/i);
    const minutesMatch = timeStr.match(/(\d+)\s*m(?!o)/i); // 'm' but not 'mo'

    // Working hours conventions:
    // 1 day = 8 working hours = 480 minutes
    // 1 month = 20 working days = 160 working hours = 9600 minutes
    const months = monthsMatch ? parseInt(monthsMatch[1]) : 0;
    const days = daysMatch ? parseInt(daysMatch[1]) : 0;
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

    return (months * 9600) + (days * 480) + (hours * 60) + minutes;
  };

  // Helper to get total logged time from task timeEntries (in minutes)
  const getTotalLoggedTimeForTask = (task: Task): number => {
    const timeEntries = (task as any).timeEntries || [];
    return timeEntries.reduce((total: number, entry: any) => {
      return total + ((entry.hours || 0) * 60) + (entry.minutes || 0);
    }, 0);
  };

  // Helper to format minutes to readable time string
  const formatTimeFromMinutes = (totalMinutes: number): string => {
    if (totalMinutes === 0) return "—";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  // Check if task has logged time entries
  const hasLoggedTimeEntries = (task: Task): boolean => {
    const timeEntries = (task as any).timeEntries || [];
    return timeEntries.length > 0;
  };

  // ElapsedTimeCell component for In Progress tasks - shows elapsed time + estimated time with warning
  const ElapsedTimeCell = ({ task }: { task: Task }) => {
    const { isTimerRunning, getElapsedTime, subscribeToTimerUpdates, getAllActiveTimers } = timerContext;
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showActiveTimersPopup, setShowActiveTimersPopup] = useState(false);
    const running = isTimerRunning(task._id);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (!running) {
        setElapsedSeconds(0);
        return;
      }

      // Set initial value
      setElapsedSeconds(getElapsedTime(task._id));

      // Update every second when timer is running
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(getElapsedTime(task._id));
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [running, task._id, getElapsedTime]);

    // Subscribe to timer updates
    useEffect(() => {
      const unsubscribe = subscribeToTimerUpdates(() => {
        if (isTimerRunning(task._id)) {
          setElapsedSeconds(getElapsedTime(task._id));
        } else {
          setElapsedSeconds(0);
        }
      });
      return unsubscribe;
    }, [task._id, subscribeToTimerUpdates, isTimerRunning, getElapsedTime]);

    // Close popup when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
          setShowActiveTimersPopup(false);
        }
      };
      if (showActiveTimersPopup) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [showActiveTimersPopup]);

    const loggedMinutes = getTotalLoggedTimeForTask(task);
    const currentTimerMinutes = Math.floor(elapsedSeconds / 60);
    const totalElapsedMinutes = loggedMinutes + currentTimerMinutes;
    const estimatedMinutes = convertTimeToMinutes(task.estimatedTime || "");
    const activeTimers = getAllActiveTimers(task._id);

    // Check if elapsed time exceeds estimated time
    const isOverEstimate = estimatedMinutes > 0 && totalElapsedMinutes > estimatedMinutes;
    const overByMinutes = totalElapsedMinutes - estimatedMinutes;

    const formatElapsedTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return hrs > 0
        ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Show timer if running
    if (running) {
      const timerDisplay = formatElapsedTime(elapsedSeconds);

      return (
        <div className="text-xs flex flex-col gap-0.5 relative">
          <div className="flex items-center gap-1">
            <span className="text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {timerDisplay}
            </span>
            {loggedMinutes > 0 && (
              <span className="text-gray-500 text-[10px]">+ {formatTimeFromMinutes(loggedMinutes)}</span>
            )}
            {isOverEstimate && (
              <div className="relative group">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  {t('tasks.overEstimate') || `Over by ${formatTimeFromMinutes(overByMinutes)}`}
                </div>
              </div>
            )}
            {/* Active Timers Button */}
            {activeTimers.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowActiveTimersPopup(!showActiveTimersPopup); }}
                className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600"
                title="View active timers"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {task.estimatedTime && (
            <span className={`text-[10px] ${isOverEstimate ? 'text-amber-600' : 'text-gray-400'}`}>
              Est: {task.estimatedTime}
            </span>
          )}
          {/* Active Timers Popup */}
          {showActiveTimersPopup && (
            <div ref={popupRef} className="absolute bottom-full right-0 mb-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100]" style={{ minWidth: '200px' }}>
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-medium text-xs text-gray-900 dark:text-gray-100">Active Timers ({activeTimers.length})</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {activeTimers.map((timer) => {
                  const timerElapsed = Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
                  const isCurrentUser = timer.userId === currentUser?._id;
                  return (
                    <div key={timer.userId} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                      <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {timer.userAvatar ? (
                          <img src={timer.userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                            {(timer.userName || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{timer.userName || 'Unknown'}</span>
                      {isCurrentUser && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">You</span>}
                      <span className="text-green-600 font-medium">{formatElapsedTime(timerElapsed)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show logged time + estimated time (no timer running)
    return (
      <div className="text-xs flex flex-col gap-0.5 relative">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-gray-600">{formatTimeFromMinutes(loggedMinutes)}</span>
          {isOverEstimate && (
            <div className="relative group">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                {t('tasks.overEstimate') || `Over by ${formatTimeFromMinutes(overByMinutes)}`}
              </div>
            </div>
          )}
          {/* Active Timers Button (for other users' timers when current user isn't running) */}
          {activeTimers.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowActiveTimersPopup(!showActiveTimersPopup); }}
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600"
              title="View active timers"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {task.estimatedTime && (
          <span className={`text-[10px] ${isOverEstimate ? 'text-amber-600' : 'text-gray-400'}`}>
            Est: {task.estimatedTime}
          </span>
        )}
        {/* Active Timers Popup */}
        {showActiveTimersPopup && (
          <div ref={popupRef} className="absolute bottom-full right-0 mb-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100]" style={{ minWidth: '200px' }}>
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <span className="font-medium text-xs text-gray-900 dark:text-gray-100">Active Timers ({activeTimers.length})</span>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {activeTimers.map((timer) => {
                const timerElapsed = Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
                const isCurrentUser = timer.userId === currentUser?._id;
                return (
                  <div key={timer.userId} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {timer.userAvatar ? (
                        <img src={timer.userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                          {(timer.userName || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{timer.userName || 'Unknown'}</span>
                    {isCurrentUser && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">You</span>}
                    <span className="text-green-600 font-medium">{formatElapsedTime(timerElapsed)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // TimeTakenCell component for Completed tasks - shows total logged time
  const TimeTakenCell = ({ task }: { task: Task }) => {
    const loggedMinutes = getTotalLoggedTimeForTask(task);

    return (
      <div className="text-xs text-gray-600 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {formatTimeFromMinutes(loggedMinutes)}
      </div>
    );
  };

  // KanbanTimeCell - Compact time display for Kanban cards
  const KanbanTimeCell = ({ task, status }: { task: Task; status: string }) => {
    const { isTimerRunning, getElapsedTime, subscribeToTimerUpdates } = timerContext;
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const running = isTimerRunning(task._id);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (!running) {
        setElapsedSeconds(0);
        return;
      }

      setElapsedSeconds(getElapsedTime(task._id));
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(getElapsedTime(task._id));
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [running, task._id, getElapsedTime]);

    useEffect(() => {
      const unsubscribe = subscribeToTimerUpdates(() => {
        if (isTimerRunning(task._id)) {
          setElapsedSeconds(getElapsedTime(task._id));
        } else {
          setElapsedSeconds(0);
        }
      });
      return unsubscribe;
    }, [task._id, subscribeToTimerUpdates, isTimerRunning, getElapsedTime]);

    const loggedMinutes = getTotalLoggedTimeForTask(task);
    const currentTimerMinutes = Math.floor(elapsedSeconds / 60);
    const totalElapsedMinutes = loggedMinutes + currentTimerMinutes;
    const estimatedMinutes = convertTimeToMinutes(task.estimatedTime || "");
    const isOverEstimate = estimatedMinutes > 0 && totalElapsedMinutes > estimatedMinutes;

    // For completed tasks - show time taken
    if (status === "completed") {
      if (loggedMinutes === 0 && !task.estimatedTime) return null;
      return (
        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          {loggedMinutes > 0 ? formatTimeFromMinutes(loggedMinutes) : task.estimatedTime}
        </span>
      );
    }

    // For in_progress tasks - show elapsed time with timer
    if (status === "in_progress") {
      if (running) {
        const timerMins = Math.floor(elapsedSeconds / 60);
        const timerSecs = elapsedSeconds % 60;
        const timerDisplay = `${timerMins}:${timerSecs.toString().padStart(2, '0')}`;

        return (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {timerDisplay}
            {isOverEstimate && <AlertTriangle className="w-3 h-3 text-amber-500" />}
          </span>
        );
      }

      // Show logged time if any, else show estimated time
      if (loggedMinutes > 0) {
        return (
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOverEstimate ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100'}`}>
            <Clock className="w-3 h-3" />
            {formatTimeFromMinutes(loggedMinutes)}
            {isOverEstimate && <AlertTriangle className="w-3 h-3 text-amber-500" />}
          </span>
        );
      }
    }

    // Default: show estimated time if available
    if (task.estimatedTime) {
      return (
        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          {task.estimatedTime}
        </span>
      );
    }

    return null;
  };

  // Handle sort selection - toggle sort config (add/remove/update) for a specific section
  const handleSortSelect = (key: string, direction: "asc" | "desc", section: 'todo' | 'inProgress' | 'completed' | 'incomplete' = 'todo') => {
    setSortConfigs(prev => {
      const sectionConfigs = prev[section];
      const existingIndex = sectionConfigs.findIndex(c => c.key === key);

      let newSectionConfigs;
      if (existingIndex >= 0) {
        // If same key and direction, remove it
        if (sectionConfigs[existingIndex].direction === direction) {
          newSectionConfigs = sectionConfigs.filter((_, i) => i !== existingIndex);
        } else {
          // If same key but different direction, update it
          newSectionConfigs = sectionConfigs.map((c, i) => i === existingIndex ? { key, direction } : c);
        }
      } else {
        // Add new sort config
        newSectionConfigs = [...sectionConfigs, { key, direction }];
      }

      return { ...prev, [section]: newSectionConfigs };
    });
  };

  // Clear sort for all sections or a specific section
  const handleClearSort = (section?: 'todo' | 'inProgress' | 'completed' | 'incomplete') => {
    if (section) {
      setSortConfigs(prev => ({ ...prev, [section]: [] }));
    } else {
      setSortConfigs({ todo: [], inProgress: [], completed: [], incomplete: [] });
    }
    setShowSortDropdown(false);
  };

  // Get current sort display text for a section
  const getCurrentSortText = (section: 'todo' | 'inProgress' | 'completed' | 'incomplete' = 'todo') => {
    const sectionConfigs = sortConfigs[section];
    if (sectionConfigs.length === 0) return "Sort";

    return sectionConfigs.map(config => {
      const option = sortOptions.find((opt) => opt.key === config.key);
      if (!option) return "";
      return `${option.label} ${config.direction === "asc" ? "↑" : "↓"}`;
    }).filter(Boolean).join(", ");
  };

  // Get sort indicator for Kanban columns (uses todo section for kanban)
  const getSortIndicator = () => {
    const sectionConfigs = sortConfigs.todo;
    if (sectionConfigs.length === 0) return null;

    const labels = sectionConfigs.map(config => {
      const option = sortOptions.find((opt) => opt.key === config.key);
      if (!option) return "";
      return `${option.label} ${config.direction === "asc" ? "↑" : "↓"}`;
    }).filter(Boolean).join(", ");

    return (
      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
        Sorted by {labels}
      </div>
    );
  };

  const handleAddTask = () => {
    setShowCreateModal(true);
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      // Mặc định gán người tạo là assignee
      const assignedTo = taskData.assignedTo && taskData.assignedTo.length > 0
        ? taskData.assignedTo
        : (currentUser ? [{ userId: currentUser._id }] : []);

      const backendTaskData = {
        title: taskData.title || "Untitled Task",
        description: taskData.description || "",
        category: taskData.category || "Other",
        status: "todo",
        priority: mapPriorityToBackend(taskData.priority),
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        tags: taskData.tags || [],
        estimatedTime: taskData.estimatedTime || "",
        type: taskData.category || "Operational",
        assignedTo,
        folderId: currentFolder?._id || undefined
      };

      console.log('🎯 Creating task with data:', backendTaskData);
      console.log('🎯 Current user:', currentUser);
      console.log('🎯 AssignedTo array:', assignedTo);

      const createdTask = await taskService.createTask(backendTaskData);
      console.log('🎯 Created task response:', createdTask);

      setShowCreateModal(false);

      // Refresh data
      if (viewMode === "list") {
        fetchTasks();
      } else {
        fetchKanbanData();
      }
    } catch (error) {
      console.error("❌ Error creating task:", error);
      alert("Failed to create task: " + getErrorMessage(error));
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    setShowTaskDetail(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    console.log("=== HANDLE TASK UPDATE ===");
    console.log("Updated task:", updatedTask);

    if (viewMode === "list") {
      // Remove task from all sections
      setTodoTasks((prev) =>
        prev.filter((task) => task._id !== updatedTask._id)
      );
      setInProgressTasks((prev) =>
        prev.filter((task) => task._id !== updatedTask._id)
      );
      setIncompleteTasks((prev) =>
        prev.filter((task) => task._id !== updatedTask._id)
      );
      setCompletedTasks((prev) =>
        prev.filter((task) => task._id !== updatedTask._id)
      );

      if (!isTaskInCurrentFolder(updatedTask)) {
        return;
      }

      // Add task to appropriate section based on status
      switch (updatedTask.status) {
        case "completed":
          setCompletedTasks((prev) => [...prev, updatedTask]);
          break;
        case "incomplete":
          setIncompleteTasks((prev) => [...prev, updatedTask]);
          break;
        case "in_progress":
          setInProgressTasks((prev) => [...prev, updatedTask]);
          break;
        case "todo":
        default:
          setTodoTasks((prev) => [...prev, updatedTask]);
          break;
      }
    } else {
      fetchKanbanData();
    }
  };

  useTaskRealtime({
    onTaskCreated: ({ task, groupId }) => {
      if (!task) return;
      if (currentGroupId && groupId && groupId !== currentGroupId) return;
      handleTaskUpdate(task);
    },
    onTaskUpdated: ({ task, groupId }) => {
      if (!task) return;
      if (currentGroupId && groupId && groupId !== currentGroupId) return;
      handleTaskUpdate(task);
    },
    onTaskDeleted: ({ taskId, groupId }) => {
      if (!taskId) return;
      if (currentGroupId && groupId && groupId !== currentGroupId) return;
      handleTaskDelete(taskId);
    }
  });

  const handleTaskDelete = (taskId: string) => {
    if (viewMode === "list") {
      setTodoTasks((prev) => prev.filter((task) => task._id !== taskId));
      setInProgressTasks((prev) => prev.filter((task) => task._id !== taskId));
      setIncompleteTasks((prev) => prev.filter((task) => task._id !== taskId));
      setCompletedTasks((prev) => prev.filter((task) => task._id !== taskId));
    } else {
      fetchKanbanData();
    }
    setShowTaskDetail(false);
    setSelectedTask(null);
  };

  const handleContextMenu = (event: React.MouseEvent, task: Task) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, task });
  };

  const handleContextMenuAction = async (action: string, task: Task, payload?: any) => {
    setContextMenu(null);

    try {
      switch (action) {
        case "complete":
          const completedTask = await taskService.updateTask(task._id, {
            status: "completed",
          });
          handleTaskUpdate(completedTask);
          break;

        case "start_timer":
          const startedTask = await taskService.startTimer(task._id);
          handleTaskUpdate(startedTask);
          // Sync timers from updated task
          timerContext.syncTimersFromTask(startedTask);
          break;

        case "stop_timer":
          const stoppedTask = await timerContext.stopTimer(task._id);
          handleTaskUpdate(stoppedTask);
          // Sync timers from updated task
          timerContext.syncTimersFromTask(stoppedTask);
          break;

        case "change_category":
          if (payload?.category) {
            const updatedCategoryTask = await taskService.updateTask(task._id, {
              category: payload.category,
            });
            handleTaskUpdate(updatedCategoryTask);
          }
          break;

        case "set_repeat":
          if (payload) {
            const repeatTask = await taskService.setTaskRepetition(task._id, payload);
            handleTaskUpdate(repeatTask);
          }
          break;

        case "repeat_custom":
          // Open custom repeat modal
          setRepeatModalTask(task);
          setShowRepeatModal(true);
          break;

        case "repeat_after_completion":
          // Set repeat after completion
          const repeatAfterTask = await taskService.setTaskRepetition(task._id, {
            isRepeating: true,
            frequency: 'daily',
            interval: 1,
          });
          handleTaskUpdate(repeatAfterTask);
          break;

        case "duplicate":
          // Create a duplicate task
          const duplicateData = {
            title: `${task.title} (Copy)`,
            description: task.description,
            status: 'todo' as const,
            priority: task.priority,
            category: task.category,
            tags: task.tags,
            estimatedTime: task.estimatedTime,
            dueDate: task.dueDate,
          };
          const duplicatedTask = await taskService.createTask(duplicateData);
          // Add the new task to todo list
          setTodoTasks(prev => [duplicatedTask, ...prev]);
          break;

        case "move_to_folder":
          if (payload?.folderId) {
            const movedTask = await taskService.updateTask(task._id, {
              folderId: payload.folderId,
            });
            handleTaskUpdate(movedTask);
          }
          break;

        case "edit_types":
          // Could open a modal for editing types - for now show task detail
          setSelectedTask(task._id);
          setShowTaskDetail(true);
          break;

        case "remove_repeat":
          // Remove repeat settings from the task
          const noRepeatTask = await taskService.setTaskRepetition(task._id, {
            isRepeating: false,
            frequency: null,
            interval: null,
          });
          handleTaskUpdate(noRepeatTask);
          break;

        case "delete":
          if (confirm("Are you sure you want to delete this task?")) {
            await taskService.deleteTask(task._id);
            handleTaskDelete(task._id);
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error("Error in context menu action:", error);
      alert("Failed to perform action: " + getErrorMessage(error));
    }
  };

  // Handle saving repeat settings from RepeatTaskModal
  const handleRepeatSave = async (settings: RepeatSettings) => {
    if (!repeatModalTask) return;

    try {
      const updatedTask = await taskService.setTaskRepetition(repeatModalTask._id, {
        isRepeating: settings.isRepeating,
        frequency: settings.frequency,
        interval: settings.interval,
        endDate: settings.endDate,
        occurrences: settings.occurrences,
      });
      handleTaskUpdate(updatedTask);
      setShowRepeatModal(false);
      setRepeatModalTask(null);
    } catch (error) {
      console.error("Error saving repeat settings:", error);
      alert("Failed to save repeat settings: " + getErrorMessage(error));
    }
  };

  // Helper functions
  const mapPriorityToBackend = (frontendPriority: string): string => {
    const priorityMap: { [key: string]: string } = {
      'None': 'low',
      'Low': 'low',
      'Medium': 'medium',
      'High': 'high',
      'Urgent': 'urgent'
    };
    return priorityMap[frontendPriority] || 'medium';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Financial":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Strategic":
        return "bg-green-100 text-green-800 border-green-200";
      case "Operational":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "incomplete":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusDisplay = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Inline editing handlers
  const startEditing = (
    taskId: string,
    field: string,
    currentValue: string
  ) => {
    setEditingTaskId(taskId);
    setEditingField(field);
    setTempValue(currentValue);
  };

  const saveField = async (task: Task, field: string) => {
    // Check for status change restriction: cannot change to "todo" if task has logged time
    if (field === "status" && tempValue === "todo") {
      const currentStatus = task.status;
      const hasLoggedTime = hasLoggedTimeEntries(task);

      if ((currentStatus === "in_progress" || currentStatus === "completed") && hasLoggedTime) {
        alert(t('tasks.cannotChangeToTodo') ||
          "Cannot change status to 'To Do' because this task has logged time entries. Delete all time entries first to change status.");
        setEditingTaskId(null);
        setEditingField(null);
        setTempValue("");
        return;
      }
    }

    if (tempValue !== (task as any)[field]) {
      try {
        // Convert date fields from user timezone to UTC for backend storage
        let updateValue: any = tempValue;
        if (field === 'dueDate' && tempValue) {
          const userDate = new Date(tempValue + 'T23:59:59'); // Set to end of day
          updateValue = convertFromUserTimezone(userDate).toISOString();
        }

        const updatedTask = await taskService.updateTask(task._id, {
          [field]: updateValue,
        });
        handleTaskUpdate(updatedTask);
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        alert(`Failed to update ${field}: ${getErrorMessage(error)}`);
      }
    }
    setEditingTaskId(null);
    setEditingField(null);
    setTempValue("");
  };

  // Save field with a direct value (for picker components)
  const saveFieldDirect = async (task: Task, field: string, value: string) => {
    if (value !== (task as any)[field]) {
      try {
        // Convert date fields from user timezone to UTC for backend storage
        let updateValue: any = value;
        if (field === 'dueDate' && value) {
          const userDate = new Date(value + 'T23:59:59'); // Set to end of day
          updateValue = convertFromUserTimezone(userDate).toISOString();
        }

        const updatedTask = await taskService.updateTask(task._id, {
          [field]: updateValue,
        });
        handleTaskUpdate(updatedTask);
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        alert(`Failed to update ${field}: ${getErrorMessage(error)}`);
      }
    }
    setEditingTaskId(null);
    setEditingField(null);
    setTempValue("");
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingField(null);
    setTempValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, task: Task, field: string) => {
    if (e.key === "Enter") {
      saveField(task, field);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  // Close dropdowns when clicking outside - Sửa lại
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Chỉ đóng context menu, không đóng sort dropdown ở đây
      setContextMenu(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Component cho Kanban View 
  const KanbanView = () => {
    if (!kanbanData || !kanbanData.kanbanBoard) {
      return (
        <div className="p-8 text-center text-gray-500">
          No kanban data available
        </div>
      );
    }

    const statusColumns = [
      {
        key: "todo",
        title: t('kanban.todo'),
        icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />,
        count: kanbanData.kanbanBoard.todo?.count || 0,
        color: "bg-gray-50 border-gray-200",
        textColor: "text-gray-700"
      },
      {
        key: "in_progress",
        title: t('kanban.inProgress'),
        icon: <div className="w-2 h-2 bg-blue-500 rounded-full" />,
        count: kanbanData.kanbanBoard.in_progress?.count || 0,
        color: "bg-blue-50 border-blue-200",
        textColor: "text-blue-700"
      },
      {
        key: "completed",
        title: t('kanban.completed'),
        icon: <div className="w-2 h-2 bg-green-500 rounded-full" />,
        count: kanbanData.kanbanBoard.completed?.count || 0,
        color: "bg-green-50 border-green-200",
        textColor: "text-green-700"
      },
      {
        key: "incomplete",
        title: t('kanban.incomplete') || 'Incomplete',
        icon: <div className="w-2 h-2 bg-red-500 rounded-full" />,
        count: kanbanData.kanbanBoard.incomplete?.count || 0,
        color: "bg-red-50 border-red-200",
        textColor: "text-red-700"
      },
    ];

    const getTasksForColumn = (columnKey: string) => {
      const tasks = kanbanData.kanbanBoard[columnKey]?.tasks || [];

      // Apply filtering and sorting to Kanban tasks (use 'todo' section for Kanban)
      return sortTasks(filterTasks(tasks), 'todo');
    };

    return (
      <div className="space-y-4">
        {/* Sort Indicator for Kanban View */}
        {getSortIndicator() && (
          <div className="flex justify-center">
            {getSortIndicator()}
          </div>
        )}

        <div className="flex gap-6 overflow-x-auto pb-6 px-1">
          {statusColumns.map((column) => {
            const columnTasks = getTasksForColumn(column.key);

            return (
              <div
                key={column.key}
                className={`flex-shrink-0 w-92 ${column.color} border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 p-2 rounded-lg bg-white/50">
                  <div className="flex items-center gap-3">
                    {column.icon}
                    <h3 className={`font-semibold text-sm ${column.textColor}`}>
                      {column.title}
                    </h3>
                    <span className={`text-xs ${column.textColor} bg-white/80 px-2 py-1 rounded-full font-medium border`}>
                      {column.count}
                    </span>
                  </div>
                  {/* Removed the add task button from column header */}
                </div>

                {/* Task List */}
                <div className="space-y-3 min-h-[200px]">
                  {columnTasks.map((task: Task) => {
                    const assigneeInfo = getDetailedAssignees(task);
                    const assigneeSummary = getAssigneeSummary(task);
                    const isOverdue = isTaskOverdue(task);

                    return (
                      <div
                        key={task._id}
                        className={`bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer group
                        ${isOverdue ? "border-red-200 bg-red-50/50" : "border-gray-100"}
                        ${column.key === "completed" ? "opacity-80" : ""}
                      `}
                        onClick={() => handleTaskClick(task._id)}
                        onContextMenu={(e) => handleContextMenu(e, task)}
                      >
                        <div className="p-4">
                          {/* Task Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                                {task.title || "Untitled Task"}
                              </h4>
                            </div>

                            {/* Priority Badge - Always show */}
                            {task.priority && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 ml-2 ${getPriorityColor(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Tags and Category */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {task.category && task.category !== "Other" && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(
                                  task.category
                                )}`}
                              >
                                {task.category}
                              </span>
                            )}
                            {task.tags?.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200"
                              >
                                {tag}
                              </span>
                            ))}
                            {task.tags && task.tags.length > 2 && (
                              <span className="text-xs px-2 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                                +{task.tags.length - 2}
                              </span>
                            )}
                          </div>

                          {/* Task Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Assignee Avatars */}
                              <div className="flex -space-x-1">
                                {assigneeInfo.assignees.slice(0, 2).map((assignee) => (
                                  <div
                                    key={assignee._id}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm
                                    ${assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id
                                        ? "bg-gradient-to-br from-green-100 to-green-200 text-green-800"
                                        : "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800"
                                      }`}
                                    title={assignee.name}
                                  >
                                    {assignee.avatar ? (
                                      <img
                                        src={assignee.avatar}
                                        alt=""
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      assignee.initial
                                    )}
                                  </div>
                                ))}
                                {assigneeInfo.totalCount > 2 && (
                                  <div className="w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm text-[10px] font-medium">
                                    +{assigneeInfo.totalCount - 2}
                                  </div>
                                )}
                              </div>

                              {/* Time Display - KanbanTimeCell */}
                              <KanbanTimeCell task={task} status={column.key === "in_progress" ? "in_progress" : column.key} />
                            </div>

                            {/* Due Date */}
                            {task.dueDate && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full border font-medium
                                ${isOverdue
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                  }`}
                              >
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtle hover effect */}
                        <div className="h-1 bg-gradient-to-r from-transparent via-gray-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-b-xl" />
                      </div>
                    );
                  })}

                  {/* Empty State */}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        {column.key === "incomplete" ? (
                          <div className="w-3 h-3 bg-red-500 rounded-full" />
                        ) : column.key === "completed" ? (
                          <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                          </div>
                        ) : (
                          <Plus className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-gray-500">
                        {column.key === "incomplete"
                          ? t('kanban.noIncomplete') || 'No incomplete tasks'
                          : column.key === "completed"
                            ? t('kanban.noCompleted')
                            : t('kanban.noTasks')
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div >
    );
  };

  // Task Row Component for List View 
  const TaskRow = ({
    task,
    isOverdue = false,
    isCompleted = false,
    section = "todo",
  }: {
    task: Task;
    isOverdue?: boolean;
    isCompleted?: boolean;
    section?: "todo" | "inProgress" | "completed" | "incomplete";
  }) => {
    const assigneeInfo = getDetailedAssignees(task);
    const assigneeSummary = getAssigneeSummary(task);
    const isEditing = editingTaskId === task._id;

    return (
      <div
        className={`grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 transition-colors ${isCompleted
          ? "bg-gray-50 border-gray-100"
          : isOverdue
            ? "bg-red-50 border-red-100"
            : "bg-white border-gray-100"
          }`}
        onContextMenu={(e) => handleContextMenu(e, task)}
      >
        {/* Task Title - Clickable for task detail */}
        <div
          className="col-span-3 cursor-pointer"
          onClick={() => handleTaskClick(task._id)}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${task.priority === "urgent" || task.priority === "critical"
                ? "bg-red-500"
                : task.priority === "high"
                  ? "bg-orange-500"
                  : task.priority === "medium"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                }`}
            />
            <span
              className={`text-sm font-medium ${isCompleted
                ? "text-gray-500 line-through"
                : isOverdue
                  ? "text-red-700"
                  : "text-gray-900"
                } hover:text-blue-600 transition-colors`}
            >
              {task.title || "Untitled Task"}
            </span>
          </div>
        </div>

        {/* Status - Inline editable */}
        <div className="col-span-1">
          {isEditing && editingField === "status" ? (
            <select
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => saveField(task, "status")}
              onKeyDown={(e) => handleKeyDown(e, task, "status")}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
              autoFocus
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {getStatusDisplay(option)}
                </option>
              ))}
            </select>
          ) : (
            <div
              className={`text-xs px-2 py-1 rounded border cursor-pointer hover:border-gray-400 transition-colors ${getStatusColor(
                task.status || "todo"
              )}`}
              onClick={(e) => {
                e.stopPropagation();
                startEditing(task._id, "status", task.status || "todo");
              }}
            >
              {getStatusDisplay(task.status || "todo")}
            </div>
          )}
        </div>

        {/* Type - Inline editable */}
        <div className="col-span-1">
          {isEditing && editingField === "category" ? (
            <select
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => saveField(task, "category")}
              onKeyDown={(e) => handleKeyDown(e, task, "category")}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
              autoFocus
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <div
              className={`text-xs px-2 py-1 rounded border cursor-pointer hover:border-gray-400 transition-colors ${getTypeColor(
                task.category || ""
              )}`}
              onClick={(e) => {
                e.stopPropagation();
                startEditing(task._id, "category", task.category || "");
              }}
            >
              {task.category || "No type"}
            </div>
          )}
        </div>

        {/* Due Date - Inline editable */}
        <div className="col-span-1">
          {isEditing && editingField === "dueDate" ? (
            <input
              type="date"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => saveField(task, "dueDate")}
              onKeyDown={(e) => handleKeyDown(e, task, "dueDate")}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <div
              className={`text-xs cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-gray-600"
                }`}
              onClick={(e) => {
                e.stopPropagation();
                // Convert UTC date from backend to user timezone for the date picker
                const displayDate = task.dueDate
                  ? convertToUserTimezone(task.dueDate).toISOString().split("T")[0]
                  : "";
                startEditing(
                  task._id,
                  "dueDate",
                  displayDate
                );
              }}
            >
              <Calendar className="w-3 h-3" />
              {task.dueDate
                ? formatDate(task.dueDate)
                : "—"}
              {isOverdue}
            </div>
          )}
        </div>

        {/* Priority - Inline editable */}
        <div className="col-span-1">
          {isEditing && editingField === "priority" ? (
            <select
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={() => saveField(task, "priority")}
              onKeyDown={(e) => handleKeyDown(e, task, "priority")}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
              autoFocus
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          ) : (
            <div
              className={`text-xs px-2 py-1 rounded border cursor-pointer hover:border-gray-400 transition-colors ${getPriorityColor(
                task.priority || "medium"
              )}`}
              onClick={(e) => {
                e.stopPropagation();
                startEditing(task._id, "priority", task.priority || "medium");
              }}
            >
              {task.priority || "medium"}
            </div>
          )}
        </div>

        {/* UPDATED: Assignee Column */}
        <div className="col-span-2">
          <div className="flex items-center gap-2 group relative">
            {/* Avatar stack for multiple assignees */}
            <div className="flex -space-x-2">
              {assigneeInfo.assignees.slice(0, 3).map((assignee, index) => (
                <div
                  key={assignee._id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-white ${assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}
                  title={`${assignee.name}${assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id ? ` (${t('tasks.you')})` : ''}`}
                >
                  {assignee.avatar ? (
                    <img
                      src={assignee.avatar}
                      alt={assignee.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    assignee.initial
                  )}
                </div>
              ))}
              {assigneeInfo.totalCount > 3 && (
                <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs border-2 border-white">
                  +{assigneeInfo.totalCount - 3}
                </div>
              )}
            </div>

            {/* Assignee text */}
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-medium truncate ${assigneeSummary.isCurrentUser
                ? "text-green-700"
                : "text-gray-700"
                }`}>
                {assigneeSummary.displayText}
              </span>
              {assigneeInfo.totalCount > 0 && (
                <span className="text-xs text-gray-500 truncate">
                  {assigneeInfo.currentUserIsAssigned ? t('tasks.includesYou') : t('tasks.assigned', { count: assigneeInfo.totalCount })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time Column - Changes based on section */}
        <div className="col-span-2 relative">
          {section === "inProgress" ? (
            // In Progress: Show elapsed time (timer + logged time)
            <ElapsedTimeCell task={task} />
          ) : section === "completed" ? (
            // Completed: Show total time taken (logged time only)
            <TimeTakenCell task={task} />
          ) : (
            // Todo/Incomplete: Show editable estimated time
            <>
              {isEditing && editingField === "estimatedTime" ? (
                <EstimatedTimePicker
                  value={task.estimatedTime || ""}
                  onSave={(value) => {
                    setTempValue(value);
                    saveFieldDirect(task, "estimatedTime", value);
                  }}
                  onClose={() => setEditingTaskId(null)}
                />
              ) : (
                <div
                  className="text-xs text-gray-600 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(
                      task._id,
                      "estimatedTime",
                      task.estimatedTime || ""
                    );
                  }}
                >
                  <Clock className="w-3 h-3" />
                  {task.estimatedTime || "—"}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Filter tasks by search query, status, and category
  const filterTasks = (tasks: Task[]) => {
    let filtered = tasks;

    // Apply search filter
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Apply tag filter
    if (tagFilter) {
      filtered = filtered.filter(task => task.tags?.includes(tagFilter));
    }

    return filtered;
  };

  // Handle search
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setStatusFilter(null);
    setCategoryFilter(null);
    setTagFilter(null);
    setShowSortDropdown(false);
  };

  // Handle column header click for sorting - section specific
  // New sort becomes PRIMARY (inserted at beginning), existing sorts become secondary
  // Handle column header click for sorting - section specific
  // New sort becomes PRIMARY (inserted at beginning), existing sorts become secondary
  const handleColumnSort = (key: string, section: 'todo' | 'inProgress' | 'completed' | 'incomplete') => {
    setSortConfigs(prev => {
      const sectionConfigs = prev[section];
      const existingIndex = sectionConfigs.findIndex(c => c.key === key);

      let newSectionConfigs;
      if (existingIndex >= 0) {
        const currentDirection = sectionConfigs[existingIndex].direction;
        if (currentDirection === "asc") {
          // Change to desc and move to primary position (beginning)
          const updated = { key, direction: "desc" as const };
          newSectionConfigs = [updated, ...sectionConfigs.filter((_, i) => i !== existingIndex)];
        } else {
          // Remove this sort
          newSectionConfigs = sectionConfigs.filter((_, i) => i !== existingIndex);
        }
      } else {
        // Add new sort config as PRIMARY (at beginning) with asc direction
        newSectionConfigs = [{ key, direction: "asc" as const }, ...sectionConfigs];
      }

      return { ...prev, [section]: newSectionConfigs };
    });
  };

  // Get sort indicator for a column - section specific
  const getColumnSortIndicator = (key: string, section: 'todo' | 'inProgress' | 'completed' | 'incomplete') => {
    const sectionConfigs = sortConfigs[section];
    const config = sectionConfigs.find(c => c.key === key);
    const index = sectionConfigs.findIndex(c => c.key === key);

    if (!config) return null;

    return (
      <span className="inline-flex items-center gap-1 ml-1">
        <span className={`text-blue-600 ${config.direction === "asc" ? "" : "rotate-180 inline-block"}`}>
          ↑
        </span>
        {sectionConfigs.length > 1 && (
          <span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded-full min-w-[16px] text-center">
            {index + 1}
          </span>
        )}
      </span>
    );
  };

  // Sortable column header component - section specific
  const SortableColumnHeader = ({ sortKey, section, children, className = "" }: { sortKey: string; section: 'todo' | 'inProgress' | 'completed' | 'incomplete'; children: React.ReactNode; className?: string }) => (
    <div
      className={`cursor-pointer hover:text-blue-600 transition-colors select-none flex items-center ${className}`}
      onClick={() => handleColumnSort(sortKey, section)}
      title="Click to sort"
    >
      {children}
      {getColumnSortIndicator(sortKey, section)}
    </div>
  );

  // Check if any filter is active
  const hasActiveFilters = activeSearchQuery || statusFilter || categoryFilter || tagFilter;

  // Collect all unique tags from all tasks in current folder
  const allUniqueTags = Array.from(
    new Set([...todoTasks, ...inProgressTasks, ...completedTasks, ...incompleteTasks].flatMap(task => task.tags || []))
  ).sort();

  // Sort Dropdown ref for click outside detection
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sort Dropdown Component - rendered inline to avoid recreation issues
  const renderSortDropdown = () => (
    <div className="relative" ref={sortDropdownRef}>
      <button
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors text-sm min-w-[100px] justify-between ${hasActiveFilters
          ? "bg-blue-50 border-blue-300 text-blue-700"
          : "bg-white border-gray-300 text-gray-700"
          }`}
        onClick={(e) => {
          e.stopPropagation();
          setShowSortDropdown(!showSortDropdown);
        }}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="truncate">
            {hasActiveFilters ? t('sort.filtered') || 'Filtered' : 'Filter'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform flex-shrink-0 ${showSortDropdown ? "rotate-180" : ""
            }`}
        />
      </button>

      {showSortDropdown && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          <div className="p-3 space-y-4">
            {/* Search Section */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('sort.search') || 'Search'}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setActiveSearchQuery(searchQuery);
                      }
                    }}
                    placeholder={t('sort.searchPlaceholder') || 'Search task name...'}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery("");
                        setActiveSearchQuery("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSearchQuery(searchQuery);
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {activeSearchQuery && (
                <div className="mt-2 text-xs text-blue-600">
                  {t('sort.searchingFor') || 'Searching for'}: &quot;{activeSearchQuery}&quot;
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('sort.filterByStatus') || 'Filter by Status'}
              </div>
              <select
                value={statusFilter || ""}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">{t('sort.allStatuses') || 'All Statuses'}</option>
                <option value="todo">{t('status.todo') || 'Todo'}</option>
                <option value="in_progress">{t('status.inProgress') || 'In Progress'}</option>
                <option value="completed">{t('status.completed') || 'Completed'}</option>
                <option value="incomplete">{t('status.incomplete') || 'Incomplete'}</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t('sort.filterByCategory') || 'Filter by Category'}
              </div>
              <select
                value={categoryFilter || ""}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">{t('sort.allCategories') || 'All Categories'}</option>
                <option value="Operational">{t('category.operational') || 'Operational'}</option>
                <option value="Strategic">{t('category.strategic') || 'Strategic'}</option>
                <option value="Financial">{t('category.financial') || 'Financial'}</option>
                <option value="Technical">{t('category.technical') || 'Technical'}</option>
                <option value="Other">{t('category.other') || 'Other'}</option>
              </select>
            </div>

            {/* Tag Filter */}
            {allUniqueTags.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                  {t('sort.filterByTag') || 'Filter by Tag'}
                </div>
                <select
                  value={tagFilter || ""}
                  onChange={(e) => setTagFilter(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">{t('sort.allTags') || 'All Tags'}</option>
                  {allUniqueTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear All Button */}
            {hasActiveFilters && (
              <button
                className="w-full text-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                onClick={handleClearFilters}
              >
                {t('sort.clearAll') || 'Clear All Filters'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Check if user has a current group
  if (!currentGroup) {
    return (
      <NoGroupState
        title="Join or Create a Group to Manage Tasks"
        description="You need to join or create a group to manage tasks and collaborate with your team."
      />
    );
  }

  // Check if user has a current folder
  if (!currentFolder) {
    return <NoFolderState />;
  }

  return (
    <div className="p-6 bg-gray-50 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
          {currentFolder?.description && (
            <p className="text-gray-600 mt-1">
              Description: <span className="font-medium">{currentFolder.description}</span>
            </p>
          )}
          {currentFolder && (
            <p className="text-sm text-gray-500 mt-1">
              Folder: <span className="font-medium text-gray-800">{currentFolder.name}{currentFolder.isDefault ? ' (Default)' : ''}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          {/* Sort Button - Available for both List and Kanban views */}
          <div className="relative">
            {renderSortDropdown()}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
            <button
              className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${viewMode === "list"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
              {t('viewMode.list')}
            </button>
            <button
              className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${viewMode === "kanban"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              onClick={() => setViewMode("kanban")}
            >
              <Layout className="w-4 h-4" />
              {t('viewMode.kanban')}
            </button>
          </div>

          {/* Add Task Button */}
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('tasks.createTask')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === "list" ? (
        <div className="space-y-6">
          {/* Todo Tasks Section */}
          {(!statusFilter || statusFilter === "todo") && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setTodoTasksExpanded(!todoTasksExpanded)}
              >
                <div className="flex items-center gap-3">
                  {todoTasksExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <h2 className="font-semibold text-gray-900">{t('tasks.todo') || 'To Do'}</h2>
                  <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded-full">
                    {hasActiveFilters ? `${filterTasks(todoTasks).length}/${todoTasks.length}` : todoTasks.length}
                  </span>
                </div>
              </div>

              {todoTasksExpanded && (
                <div>
                  {/* Header Row with sortable columns */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <SortableColumnHeader sortKey="title" section="todo" className="col-span-3">{t('tasks.taskName')}</SortableColumnHeader>
                    <div className="col-span-1">{t('tasks.status')}</div>
                    <div className="col-span-1">{t('tasks.category')}</div>
                    <SortableColumnHeader sortKey="dueDate" section="todo" className="col-span-1">{t('tasks.dueDate')}</SortableColumnHeader>
                    <SortableColumnHeader sortKey="priority" section="todo" className="col-span-1">{t('tasks.priority')}</SortableColumnHeader>
                    <div className="col-span-2">{t('tasks.assignee')}</div>
                    <SortableColumnHeader sortKey="estimatedTime" section="todo" className="col-span-2">{t('tasks.estimatedTime') || 'Time'}</SortableColumnHeader>
                  </div>

                  {/* Task Rows */}
                  {filterTasks(todoTasks).length > 0 ? (
                    sortTasks(filterTasks(todoTasks), 'todo').map((task) => (
                      <TaskRow key={task._id} task={task} />
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 mb-2">{t('tasks.noTodoTasks') || 'No tasks to do'}</p>
                      <button
                        onClick={handleAddTask}
                        className="text-blue-500 hover:text-blue-600 font-medium"
                      >
                        {t('tasks.addFirstTask')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* In Progress Tasks Section */}
          {(!statusFilter || statusFilter === "in_progress") && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setInProgressTasksExpanded(!inProgressTasksExpanded)}
              >
                <div className="flex items-center gap-3">
                  {inProgressTasksExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <h2 className="font-semibold text-gray-900">{t('tasks.inProgress') || 'In Progress'}</h2>
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {hasActiveFilters ? `${filterTasks(inProgressTasks).length}/${inProgressTasks.length}` : inProgressTasks.length}
                  </span>
                </div>
              </div>

              {inProgressTasksExpanded && (
                <div>
                  {/* Header Row with sortable columns */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <SortableColumnHeader sortKey="title" section="inProgress" className="col-span-3">{t('tasks.taskName')}</SortableColumnHeader>
                    <div className="col-span-1">{t('tasks.status')}</div>
                    <div className="col-span-1">{t('tasks.category')}</div>
                    <SortableColumnHeader sortKey="dueDate" section="inProgress" className="col-span-1">{t('tasks.dueDate')}</SortableColumnHeader>
                    <SortableColumnHeader sortKey="priority" section="inProgress" className="col-span-1">{t('tasks.priority')}</SortableColumnHeader>
                    <div className="col-span-2">{t('tasks.assignee')}</div>
                    <div className="col-span-2">{t('tasks.elapsedTime') || 'Elapsed Time'}</div>
                  </div>

                  {/* Task Rows */}
                  {filterTasks(inProgressTasks).length > 0 ? (
                    sortTasks(filterTasks(inProgressTasks), 'inProgress').map((task) => (
                      <TaskRow key={task._id} task={task} section="inProgress" />
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 mb-2">{t('tasks.noInProgressTasks') || 'No tasks in progress'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completed Tasks Section */}
          {(!statusFilter || statusFilter === "completed") && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setCompletedTasksExpanded(!completedTasksExpanded)}
              >
                <div className="flex items-center gap-3">
                  {completedTasksExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <h2 className="font-semibold text-gray-900">{t('tasks.completed')}</h2>
                  <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                    {hasActiveFilters ? `${filterTasks(completedTasks).length}/${completedTasks.length}` : completedTasks.length}
                  </span>
                </div>
              </div>

              {completedTasksExpanded && (
                <div>
                  {/* Header Row with sortable columns */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <SortableColumnHeader sortKey="title" section="completed" className="col-span-3">{t('tasks.taskName')}</SortableColumnHeader>
                    <div className="col-span-1">{t('tasks.status')}</div>
                    <div className="col-span-1">{t('tasks.category')}</div>
                    <SortableColumnHeader sortKey="dueDate" section="completed" className="col-span-1">{t('tasks.dueDate')}</SortableColumnHeader>
                    <SortableColumnHeader sortKey="priority" section="completed" className="col-span-1">{t('tasks.priority')}</SortableColumnHeader>
                    <div className="col-span-2">{t('tasks.assignee')}</div>
                    <div className="col-span-2">{t('tasks.timeTaken') || 'Time Taken'}</div>
                  </div>

                  {filterTasks(completedTasks).length > 0 ? (
                    sortTasks(filterTasks(completedTasks), 'completed').map((task) => (
                      <TaskRow key={task._id} task={task} isCompleted={true} section="completed" />
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-gray-600">{t('kanban.noCompletedYet')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Incomplete Tasks Section */}
          {(!statusFilter || statusFilter === "incomplete") && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setIncompleteTasksExpanded(!incompleteTasksExpanded)
                }
              >
                <div className="flex items-center gap-3">
                  {incompleteTasksExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-red-700">{t('tasks.incomplete') || 'Incomplete'}</h2>
                  </div>
                  <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">
                    {hasActiveFilters ? `${filterTasks(incompleteTasks).length}/${incompleteTasks.length}` : incompleteTasks.length}
                  </span>
                </div>
              </div>

              {incompleteTasksExpanded && (
                <div>
                  {/* Header Row with sortable columns */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <SortableColumnHeader sortKey="title" section="incomplete" className="col-span-3">{t('tasks.taskName')}</SortableColumnHeader>
                    <div className="col-span-1">{t('tasks.status')}</div>
                    <div className="col-span-1">{t('tasks.category')}</div>
                    <SortableColumnHeader sortKey="dueDate" section="incomplete" className="col-span-1">{t('tasks.dueDate')}</SortableColumnHeader>
                    <SortableColumnHeader sortKey="priority" section="incomplete" className="col-span-1">{t('tasks.priority')}</SortableColumnHeader>
                    <div className="col-span-2">{t('tasks.assignee')}</div>
                    <SortableColumnHeader sortKey="estimatedTime" section="incomplete" className="col-span-2">{t('tasks.estimatedTime') || 'Time'}</SortableColumnHeader>
                  </div>

                  {/* Always show content, even if empty */}
                  {filterTasks(incompleteTasks).length > 0 ? (
                    sortTasks(filterTasks(incompleteTasks), 'incomplete').map((task) => (
                      <TaskRow key={task._id} task={task} isOverdue={true} section="incomplete" />
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 mb-2">{t('tasks.noIncompleteTasks') || 'No incomplete tasks'}</p>
                      <p className="text-sm text-gray-500">
                        {t('tasks.incompleteDescription') || 'Overdue tasks will appear here'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <KanbanView />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTask={handleCreateTask}
          currentUser={currentUser}
          groupMembers={currentGroup?.members || []}
        />
      )}

      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          taskId={selectedTask}
          isOpen={showTaskDetail}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <TaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Repeat Task Modal */}
      {repeatModalTask && (
        <RepeatTaskModal
          task={repeatModalTask}
          isOpen={showRepeatModal}
          onClose={() => {
            setShowRepeatModal(false);
            setRepeatModalTask(null);
          }}
          onSave={handleRepeatSave}
        />
      )}
    </div>
  );
}