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
} from "lucide-react";
import { taskService } from "../../../services/task.service";
import { Task } from "../../../services/types/task.types";
import CreateTaskModal from "./CreateTaskModal";
import TaskContextMenu from "./TaskContextMenu";
import TaskDetailModal from "./TaskDetailModal";
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

export default function TasksView() {
  const { user: currentUser, currentGroup } = useAuth();
  const { currentFolder } = useFolder();
  const { t } = useLanguage();
  const { formatDate } = useRegional();
  const [activeTasksExpanded, setActiveTasksExpanded] = useState(true);
  const [uncompletedTasksExpanded, setUncompletedTasksExpanded] =
    useState(true);
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(true);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [uncompletedTasks, setUncompletedTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: Task;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [kanbanData, setKanbanData] = useState<any>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const router = useRouter();

  interface MinimalUser {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  }

  const priorityOptions = ["low", "medium", "high", "urgent"];
  const statusOptions = ["todo", "in_progress", "completed"];
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
    { key: "status", label: t('sort.status'), asc: t('sort.aToZ'), desc: t('sort.zToA') },
    { key: "category", label: t('sort.type'), asc: t('sort.aToZ'), desc: t('sort.zToA') },
    {
      key: "dueDate",
      label: t('sort.dueDate'),
      asc: t('sort.oldestFirst'),
      desc: t('sort.newestFirst'),
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
      const dueDate = new Date(task.dueDate);
      const today = new Date();

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
    try {
      setLoading(true);
      const response = await taskService.getAllTasks(
        { folderId: currentFolder?._id },
        undefined
      );

      console.log("=== FETCH TASKS DEBUG ===");
      console.log("Full response:", response);

      const tasks = response?.tasks || [];
      console.log("Total tasks:", tasks.length);

      const active: Task[] = [];
      const uncompleted: Task[] = [];
      const completed: Task[] = [];

      tasks.forEach((task: Task) => {
        if (!task || !task._id) return; // Skip invalid tasks

        if (task.status === "completed") {
          completed.push(task);
        } else {
          // Check if task is overdue for uncompleted section
          if (isTaskOverdue(task)) {
            uncompleted.push(task);
          } else {
            active.push(task);
          }
        }
      });

      console.log("Active tasks:", active.length);
      console.log("Uncompleted tasks (overdue):", uncompleted.length);
      console.log("Completed tasks:", completed.length);
      console.log("Uncompleted tasks details:", uncompleted);

      setActiveTasks(active);
      setUncompletedTasks(uncompleted);
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

      // For other errors, show alert
      alert("Failed to fetch tasks: " + errorMessage);

      setActiveTasks([]);
      setUncompletedTasks([]);
      setCompletedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch kanban data từ API
  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const response = await taskService.getKanbanView({
        folderId: currentFolder?._id
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

      // For other errors, show alert
      alert("Failed to fetch kanban data: " + errorMessage);

      setKanbanData(null);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API tương ứng khi chuyển chế độ
  useEffect(() => {
    if (viewMode === "list") {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  }, [viewMode, currentFolder?._id]);

  // Listen for global group change events
  useGroupChange(() => {
    console.log('Group change detected, reloading TasksView');
    if (viewMode === "list") {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  });

  // Sort tasks function
  const sortTasks = (tasks: Task[]) => {
    if (!sortConfig) return tasks;

    const sortedTasks = [...tasks].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Task];
      let bValue: any = b[sortConfig.key as keyof Task];

      // Handle special cases
      switch (sortConfig.key) {
        case "dueDate":
        case "createdAt":
          aValue = aValue
            ? new Date(aValue).getTime()
            : Number.MAX_SAFE_INTEGER;
          bValue = bValue
            ? new Date(bValue).getTime()
            : Number.MAX_SAFE_INTEGER;
          break;
        case "priority":
          const priorityOrder = {
            urgent: 0,
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
          };
          aValue = priorityOrder[aValue as keyof typeof priorityOrder] ?? 5;
          bValue = priorityOrder[bValue as keyof typeof priorityOrder] ?? 5;
          break;
        case "estimatedTime":
          // Convert time strings to minutes for sorting
          aValue = convertTimeToMinutes(aValue || "");
          bValue = convertTimeToMinutes(bValue || "");
          break;
        default:
          aValue = aValue || "";
          bValue = bValue || "";
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sortedTasks;
  };

  // Helper to convert time string to minutes
  const convertTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;

    const hoursMatch = timeStr.match(/(\d+)h/);
    const minutesMatch = timeStr.match(/(\d+)m/);

    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

    return hours * 60 + minutes;
  };

  // Handle sort selection
  const handleSortSelect = (key: string, direction: "asc" | "desc") => {
    setSortConfig({ key, direction });
    setShowSortDropdown(false);
  };

  // Clear sort
  const handleClearSort = () => {
    setSortConfig(null);
    setShowSortDropdown(false);
  };

  // Get current sort display text
  const getCurrentSortText = () => {
    if (!sortConfig) return "Sort";

    const option = sortOptions.find((opt) => opt.key === sortConfig.key);
    if (!option) return "Sort";

    const directionText =
      sortConfig.direction === "asc" ? option.asc : option.desc;
    return `${option.label} • ${directionText}`;
  };

  // Get sort indicator for Kanban columns
  const getSortIndicator = () => {
    if (!sortConfig) return null;
    
    const option = sortOptions.find((opt) => opt.key === sortConfig.key);
    if (!option) return null;
    
    return (
      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
        Sorted by {option.label} {sortConfig.direction === "asc" ? "↑" : "↓"}
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
      setActiveTasks((prev) =>
        prev.filter((task) => task._id !== updatedTask._id)
      );
      setUncompletedTasks((prev) =>
        prev.filter((task) => task._id !== updatedTask._id)
      );
      setCompletedTasks((prev) =>
        prev.filter((task) => task._id !== updatedTask._id)
      );

      if (!isTaskInCurrentFolder(updatedTask)) {
        return;
      }

      // Add task to appropriate section based on status and due date
      if (updatedTask.status === "completed") {
        setCompletedTasks((prev) => [...prev, updatedTask]);
      } else if (isTaskOverdue(updatedTask)) {
        setUncompletedTasks((prev) => [...prev, updatedTask]);
      } else {
        setActiveTasks((prev) => [...prev, updatedTask]);
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
      setActiveTasks((prev) => prev.filter((task) => task._id !== taskId));
      setUncompletedTasks((prev) => prev.filter((task) => task._id !== taskId));
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

  const handleContextMenuAction = async (action: string, task: Task) => {
    setContextMenu(null);

    try {
      switch (action) {
        case "complete":
          const completedTask = await taskService.updateTask(task._id, {
            status: "completed",
          });
          handleTaskUpdate(completedTask);
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
    if (tempValue !== (task as any)[field]) {
      try {
        const updatedTask = await taskService.updateTask(task._id, {
          [field]: tempValue,
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
        const updatedTask = await taskService.updateTask(task._id, {
          [field]: value,
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

    // Calculate incompleted tasks (overdue tasks)
    const allTasks = [
      ...(kanbanData.kanbanBoard.todo?.tasks || []),
      ...(kanbanData.kanbanBoard.in_progress?.tasks || []),
      ...(kanbanData.kanbanBoard.completed?.tasks || []),
    ];

    const incompletedTasks = allTasks.filter(task => 
      task && isTaskOverdue(task) && task.status !== "completed"
    );

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
        key: "incompleted", 
        title: t('kanban.incompleted'), 
        icon: <div className="w-2 h-2 bg-red-500 rounded-full" />,
        count: incompletedTasks.length,
        color: "bg-red-50 border-red-200",
        textColor: "text-red-700"
      },
    ];

    const getTasksForColumn = (columnKey: string) => {
      let tasks = [];
      if (columnKey === "incompleted") {
        tasks = incompletedTasks;
      } else {
        tasks = kanbanData.kanbanBoard[columnKey]?.tasks || [];
      }
      
      // Apply sorting to Kanban tasks
      return sortTasks(tasks);
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
                          
                          {/* Priority Badge */}
                          {task.priority && task.priority !== "medium" && (
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

                            {/* Time Estimate */}
                            {task.estimatedTime && (
                              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" />
                                {task.estimatedTime}
                              </span>
                            )}
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
                      {column.key === "incompleted" ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : column.key === "completed" ? (
                        <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                        </div>
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                    </div>
                    <p className="text-gray-500">
                      {column.key === "incompleted" 
                        ? t('kanban.noOverdue') 
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
      </div>
    );
  };

  // Task Row Component for List View 
  const TaskRow = ({
    task,
    isOverdue = false,
    isCompleted = false,
  }: {
    task: Task;
    isOverdue?: boolean;
    isCompleted?: boolean;
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
                startEditing(
                  task._id,
                  "dueDate",
                  task.dueDate
                    ? new Date(task.dueDate).toISOString().split("T")[0]
                    : ""
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

        {/* Estimated Time - Inline editable with scroll picker */}
        <div className="col-span-2 relative">
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
        </div>
      </div>
    );
  };

  // Sort Dropdown Component (unchanged)
  const SortDropdown = () => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setShowSortDropdown(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 min-w-[120px] justify-between"
          onClick={(e) => {
            e.stopPropagation();
            setShowSortDropdown(!showSortDropdown);
          }}
        >
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            <span className="truncate">{getCurrentSortText()}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform flex-shrink-0 ${showSortDropdown ? "rotate-180" : ""
              }`}
          />
        </button>

        {showSortDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wide">
                {t('sort.label')}
              </div>

              {sortOptions.map((option) => (
                <div
                  key={option.key}
                  className="border-b border-gray-100 last:border-0"
                >
                  <div className="px-3 py-1 text-sm font-medium text-gray-700">
                    {option.label}
                  </div>
                  <button
                    className="w-full text-left px-6 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                    onClick={() => handleSortSelect(option.key, "asc")}
                  >
                    <span>{option.asc}</span>
                    {sortConfig?.key === option.key &&
                      sortConfig.direction === "asc" && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                  </button>
                  <button
                    className="w-full text-left px-6 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                    onClick={() => handleSortSelect(option.key, "desc")}
                  >
                    <span>{option.desc}</span>
                    {sortConfig?.key === option.key &&
                      sortConfig.direction === "desc" && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                  </button>
                </div>
              ))}

              {sortConfig && (
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 mt-2 border-t border-gray-100"
                  onClick={handleClearSort}
                >
                  Clear sort
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('tasks.description') || 'Manage your team\'s tasks and projects'}
          </p>
          {currentFolder && (
            <p className="text-sm text-gray-500 mt-2">
              Folder: <span className="font-medium text-gray-800">{currentFolder.name}{currentFolder.isDefault ? ' (Default)' : ''}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          {/* Sort Button - Available for both List and Kanban views */}
          <div className="relative">
            <SortDropdown />
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
          {/* Active Tasks Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
              className="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setActiveTasksExpanded(!activeTasksExpanded)}
            >
              <div className="flex items-center gap-3">
                {activeTasksExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
                <h2 className="font-semibold text-gray-900">{t('tasks.active')}</h2>
                <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                  {activeTasks.length}
                </span>
              </div>
            </div>

            {activeTasksExpanded && (
              <div>
                {/* UPDATED: Header Row with adjusted columns */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  <div className="col-span-3">{t('tasks.taskName')}</div>
                  <div className="col-span-1">{t('tasks.status')}</div>
                  <div className="col-span-1">{t('tasks.category')}</div>
                  <div className="col-span-1">{t('tasks.dueDate')}</div>
                  <div className="col-span-1">{t('tasks.priority')}</div>
                  <div className="col-span-2">{t('tasks.assignee')}</div>
                  <div className="col-span-2">{t('tasks.estimatedTime') || 'Time'}</div>
                </div>

                {/* Task Rows */}
                {activeTasks.length > 0 ? (
                  sortTasks(activeTasks).map((task) => (
                    <TaskRow key={task._id} task={task} />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 mb-2">{t('tasks.noTasks')}</p>
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

          {/* Completed Tasks Section */}
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
                  {completedTasks.length}
                </span>
              </div>
            </div>

            {completedTasksExpanded && (
              <div>
                {/* UPDATED: Header Row with adjusted columns */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  <div className="col-span-3">{t('tasks.taskName')}</div>
                  <div className="col-span-1">{t('tasks.status')}</div>
                  <div className="col-span-1">{t('tasks.category')}</div>
                  <div className="col-span-1">{t('tasks.dueDate')}</div>
                  <div className="col-span-1">{t('tasks.priority')}</div>
                  <div className="col-span-2">{t('tasks.assignee')}</div>
                  <div className="col-span-2">{t('tasks.estimatedTime') || 'Time'}</div>
                </div>

                {completedTasks.length > 0 ? (
                  sortTasks(completedTasks).map((task) => (
                    <TaskRow key={task._id} task={task} isCompleted={true} />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-gray-600">{t('kanban.noCompletedYet')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Uncompleted Tasks Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
              className="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() =>
                setUncompletedTasksExpanded(!uncompletedTasksExpanded)
              }
            >
              <div className="flex items-center gap-3">
                {uncompletedTasksExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{t('tasks.uncompleted')}</h2>
                </div>
                <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">
                  {uncompletedTasks.length}
                </span>
              </div>
            </div>

            {uncompletedTasksExpanded && (
              <div>
                {/* UPDATED: Header Row with adjusted columns */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  <div className="col-span-3">{t('tasks.taskName')}</div>
                  <div className="col-span-1">{t('tasks.status')}</div>
                  <div className="col-span-1">{t('tasks.category')}</div>
                  <div className="col-span-1">{t('tasks.dueDate')}</div>
                  <div className="col-span-1">{t('tasks.priority')}</div>
                  <div className="col-span-2">{t('tasks.assignee')}</div>
                  <div className="col-span-2">{t('tasks.estimatedTime') || 'Time'}</div>
                </div>

                {/* Always show content, even if empty */}
                {uncompletedTasks.length > 0 ? (
                  sortTasks(uncompletedTasks).map((task) => (
                    <TaskRow key={task._id} task={task} isOverdue={true} />
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 mb-2">{t('kanban.noOverdue')}</p>
                    <p className="text-sm text-gray-500">
                      {t('tasks.noTasks')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
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
    </div>
  );
}