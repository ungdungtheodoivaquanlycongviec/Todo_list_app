import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ActionSheetIOS,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { Task } from '../../types/task.types';
import { taskService } from '../../services/task.service';
import CreateTaskModal from './CreateTaskModal';
import TaskContextMenu from './TaskContextMenu';
import TaskDetailModal from './TaskDetailModal';
import RepeatTaskModal, { RepeatSettings } from './RepeatTaskModal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTimer, useTimerElapsed } from '../../context/TimerContext';
import { useFolder } from '../../context/FolderContext';
import { useRegional } from '../../context/RegionalContext';
import NoGroupState from '../common/NoGroupState';
import NoFolderState from '../common/NoFolderState';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';
import { useGroupChange } from '../../hooks/useGroupChange';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Icon components
const {
  Plus, ChevronDown, ChevronRight, List, Layout, 
  Clock, Calendar, User, Flag, ArrowUpDown,
  AlertTriangle, Search, X, Filter, MoreVertical,
  CheckCircle, PlayCircle, AlertCircle, Grid,
  EllipsisVertical, Check,
  Trash2, Copy, Folder, Repeat, Timer,
  Eye, Edit, MoveRight, PieChart, EyeOff,
  Users, Tag, Type, Target
} = LucideIcons;

// Helper: Convert Time
const convertTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const months = parseInt(timeStr.match(/(\d+)\s*mo/i)?.[1] || '0');
  const days = parseInt(timeStr.match(/(\d+)\s*d(?!o)/i)?.[1] || '0');
  const hours = parseInt(timeStr.match(/(\d+)\s*h/i)?.[1] || '0');
  const minutes = parseInt(timeStr.match(/(\d+)\s*m(?!o)/i)?.[1] || '0');
  return (months * 9600) + (days * 480) + (hours * 60) + minutes;
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

// Component: TaskTimer (Hiển thị giờ chạy realtime)
const TaskTimer = ({ task, isRunning, style }: { task: Task; isRunning: boolean; style?: any }) => {
  const elapsedSeconds = useTimerElapsed(task._id);
  
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const estimatedMinutes = convertTimeToMinutes(task.estimatedTime || "");
  const currentSessionMinutes = Math.floor(elapsedSeconds / 60);
  const loggedMinutes = (task as any).timeEntries?.reduce((acc: number, curr: any) => acc + (curr.hours * 60) + curr.minutes, 0) || 0;
  const totalElapsedMinutes = loggedMinutes + currentSessionMinutes;
  const isOverEstimate = estimatedMinutes > 0 && totalElapsedMinutes > estimatedMinutes;

  if (isRunning) {
    return (
      <View style={[styles.timerBadge, isOverEstimate && { backgroundColor: '#FEF3C7' }, style]}>
        <View style={[styles.timerDot, isOverEstimate && { backgroundColor: '#B45309' }]} />
        <Text style={[styles.timerTextRunning, isOverEstimate && { color: '#B45309' }]}>
          {formatTime(elapsedSeconds)}
        </Text>
      </View>
    );
  }

  if (task.estimatedTime) {
    return (
      <View style={[styles.timeEstimate, style]}>
        <Clock size={14} color="#6b7280" />
        <Text style={styles.timeText}>{task.estimatedTime}</Text>
      </View>
    );
  }
  return null;
};

// Component: ActiveTimersPopup
const ActiveTimersPopup = ({ taskId, visible, onClose }: { taskId: string; visible: boolean; onClose: () => void }) => {
  const { getAllActiveTimers } = useTimer();
  const { user: currentUser } = useAuth();
  const activeTimers = getAllActiveTimers(taskId);
  const { isDark } = useTheme();

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.popupContent, isDark && styles.darkPopupContent]}>
              <View style={styles.popupHeader}>
                <Text style={[styles.popupTitle, isDark && styles.darkText]}>
                  Active Timers ({activeTimers.length})
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={20} color={isDark ? '#e5e7eb' : '#374151'} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.popupScroll} showsVerticalScrollIndicator={false}>
                {activeTimers.map((timer) => {
                  const timerElapsed = Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
                  const isCurrentUser = timer.userId === currentUser?._id;
                  return (
                    <View key={timer.userId} style={[styles.timerRow, isDark && styles.darkTimerRow]}>
                      <View style={styles.timerUser}>
                        <View style={[styles.timerAvatar, isCurrentUser ? styles.timerAvatarCurrent : styles.timerAvatarOther]}>
                          {timer.userAvatar ? (
                            <Image source={{ uri: timer.userAvatar }} style={styles.timerAvatarImage} />
                          ) : (
                            <Text style={styles.timerAvatarText}>
                              {(timer.userName || 'U').charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={styles.timerUserInfo}>
                          <Text style={[styles.timerUserName, isDark && styles.darkText]} numberOfLines={1}>
                            {timer.userName || 'Unknown'}
                          </Text>
                          {isCurrentUser && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>You</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={[styles.timerElapsed, isDark && styles.darkText]}>
                        {formatElapsedTime(timerElapsed)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Component: InlineEditField
const InlineEditField = ({ 
  task, 
  field, 
  value, 
  options,
  onSave 
}: { 
  task: Task; 
  field: string; 
  value: string; 
  options?: string[];
  onSave: (value: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const { isDark } = useTheme();

  const handleSave = () => {
    if (tempValue !== value) {
      onSave(tempValue);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.inlineEditContainer}>
        {options ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {options.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.inlineOption, tempValue === option && styles.inlineOptionSelected]}
                onPress={() => {
                  setTempValue(option);
                  handleSave();
                }}
              >
                <Text style={[styles.inlineOptionText, tempValue === option && styles.inlineOptionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TextInput
            value={tempValue}
            onChangeText={setTempValue}
            onBlur={handleSave}
            onSubmitEditing={handleSave}
            autoFocus
            style={[styles.inlineInput, isDark && styles.darkInlineInput]}
          />
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={() => setEditing(true)}>
      <Text style={[styles.inlineText, isDark && styles.darkText]}>{value || '—'}</Text>
    </TouchableOpacity>
  );
};

export default function TasksView() {
  const { currentGroup, user: currentUser } = useAuth();
  const { currentFolder } = useFolder();
  const { isDark } = useTheme();
  const { formatDate, convertToUserTimezone, convertFromUserTimezone } = useRegional();
  
  const { startTimer, stopTimer, isTimerRunning, syncTimersFromTask, getAllActiveTimers } = useTimer();

  const [todoTasksExpanded, setTodoTasksExpanded] = useState(true);
  const [inProgressTasksExpanded, setInProgressTasksExpanded] = useState(true);
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(true);
  const [incompleteTasksExpanded, setIncompleteTasksExpanded] = useState(true);
  
  const [todoTasks, setTodoTasks] = useState<Task[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [repeatModalTask, setRepeatModalTask] = useState<Task | null>(null);
  const [showActiveTimersPopup, setShowActiveTimersPopup] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    task: Task;
  } | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanData, setKanbanData] = useState<any>(null);
  
  const [sortConfigs, setSortConfigs] = useState({
    todo: [] as Array<{ key: string; direction: 'asc' | 'desc' }>,
    inProgress: [] as Array<{ key: string; direction: 'asc' | 'desc' }>,
    completed: [] as Array<{ key: string; direction: 'asc' | 'desc' }>,
    incomplete: [] as Array<{ key: string; direction: 'asc' | 'desc' }>,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const priorityOptions = ['low', 'medium', 'high', 'urgent'];
  const statusOptions = ['todo', 'in_progress', 'completed', 'incomplete'];
  const categoryOptions = ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'];

  const sortOptions = [
    { key: 'title', label: 'Task name', asc: 'A → Z', desc: 'Z → A' },
    { key: 'status', label: 'Status', asc: 'A → Z', desc: 'Z → A' },
    { key: 'category', label: 'Type', asc: 'A → Z', desc: 'Z → A' },
    { key: 'dueDate', label: 'Due date', asc: 'Oldest first', desc: 'Newest first' },
    { key: 'priority', label: 'Priority', asc: 'Low to high', desc: 'High to low' },
    { key: 'estimatedTime', label: 'Estimated time', asc: 'Shortest first', desc: 'Longest first' },
    { key: 'createdAt', label: 'Created date', asc: 'Oldest first', desc: 'Newest first' },
  ];

  const currentGroupId = currentGroup?._id;

  // Real-time updates
  useGroupChange(() => {
    console.log('Group change detected, reloading TasksView');
    onRefresh();
  });

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

  // Get error message helper
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  };

  // Check if task is in current folder
  const isTaskInCurrentFolder = (task: Task): boolean => {
    if (!currentFolder) return true;
    const taskFolderId = (task as any)?.folderId;
    if (currentFolder.isDefault) {
      return !taskFolderId || taskFolderId === currentFolder._id;
    }
    return taskFolderId === currentFolder._id;
  };

  // Get detailed assignees
  const getDetailedAssignees = useCallback((task: Task) => {
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
        let userData: any;

        if (typeof assignment.userId === 'string') {
          if (currentUser && assignment.userId === currentUser._id) {
            userData = {
              _id: currentUser._id,
              name: currentUser.name || 'You',
              email: currentUser.email || '',
              avatar: currentUser.avatar
            };
          } else {
            const member = currentGroup?.members?.find((m: any) => {
              const memberId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
              return memberId === assignment.userId;
            });

            if (member) {
              const userObj = typeof member.userId === 'object' ? member.userId : null;
              const userName = userObj?.name || member.name;
              if (userName) {
                userData = {
                  _id: assignment.userId,
                  name: userName,
                  email: userObj?.email || member.email || '',
                  avatar: userObj?.avatar || member.avatar
                };
              } else {
                userData = {
                  _id: assignment.userId,
                  name: 'Loading...',
                  email: '',
                  avatar: undefined
                };
              }
            } else {
              userData = {
                _id: assignment.userId,
                name: 'Loading...',
                email: '',
                avatar: undefined
              };
            }
          }
        } else if (assignment.userId && typeof assignment.userId === 'object') {
          const user = assignment.userId as { _id: string; name?: string; email?: string; avatar?: string };
          userData = {
            _id: user._id,
            name: user.name || 'Unknown User',
            email: user.email || '',
            avatar: user.avatar
          };
        } else {
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
  }, [currentGroup, currentUser]);

  // Get assignee summary
  const getAssigneeSummary = useCallback((task: Task) => {
    const { hasAssignees, assignees, currentUserIsAssigned, totalCount } = getDetailedAssignees(task);

    if (!hasAssignees) {
      return {
        displayText: 'Unassigned',
        tooltip: 'No one assigned',
        isCurrentUser: false
      };
    }

    if (currentUserIsAssigned && totalCount === 1) {
      return {
        displayText: 'You',
        tooltip: 'Assigned to you',
        isCurrentUser: true
      };
    }

    if (currentUserIsAssigned && totalCount > 1) {
      const othersCount = totalCount - 1;
      return {
        displayText: `You +${othersCount}`,
        tooltip: othersCount > 1 ? `Assigned to you and ${othersCount} others` : `Assigned to you and 1 other`,
        isCurrentUser: true
      };
    }

    if (totalCount === 1) {
      return {
        displayText: assignees[0].name,
        tooltip: `Assigned to ${assignees[0].name}`,
        isCurrentUser: false
      };
    }

    return {
      displayText: `${totalCount} people`,
      tooltip: `Assigned to ${assignees.map(a => a.name).join(', ')}`,
      isCurrentUser: false
    };
  }, [getDetailedAssignees]);

  // Check if task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    if (!task.dueDate) return false;
    if (task.status === 'completed') return false;

    try {
      const dueDate = convertToUserTimezone(task.dueDate);
      const today = convertToUserTimezone(new Date());
      
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return dueDateOnly < todayOnly;
    } catch (error) {
      console.error('Error parsing due date:', error);
      return false;
    }
  };

  // Get total logged time for task
  const getTotalLoggedTimeForTask = useCallback((task: Task): number => {
    const timeEntries = (task as any).timeEntries || [];
    return timeEntries.reduce((total: number, entry: any) => {
      return total + ((entry.hours || 0) * 60) + (entry.minutes || 0);
    }, 0);
  }, []);

  // Fetch tasks
  const fetchTasks = async () => {
    if (!currentFolder?._id) {
      setTodoTasks([]);
      setInProgressTasks([]);
      setIncompleteTasks([]);
      setCompletedTasks([]);
      setLoading(false);
      return;
    }

    if (currentFolder.groupId && currentGroupId && currentFolder.groupId !== currentGroupId) {
      console.log('Folder group mismatch - skipping fetch');
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

      const tasks = response?.tasks || [];

      const todo: Task[] = [];
      const inProgress: Task[] = [];
      const incomplete: Task[] = [];
      const completed: Task[] = [];

      tasks.forEach((task: Task) => {
        if (!task || !task._id) return;

        // Sync active timers from task data
        if ((task as any).activeTimers && (task as any).activeTimers.length > 0) {
          syncTimersFromTask(task);
        }

        if (!isTaskInCurrentFolder(task)) return;

        switch (task.status) {
          case 'completed':
            completed.push(task);
            break;
          case 'incomplete':
            incomplete.push(task);
            break;
          case 'in_progress':
            inProgress.push(task);
            break;
          case 'todo':
          default:
            todo.push(task);
            break;
        }
      });

      setTodoTasks(todo);
      setInProgressTasks(inProgress);
      setIncompleteTasks(incomplete);
      setCompletedTasks(completed);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching tasks:', errorMessage);
      
      setTodoTasks([]);
      setInProgressTasks([]);
      setIncompleteTasks([]);
      setCompletedTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch kanban data
  const fetchKanbanData = async () => {
    if (!currentFolder?._id) {
      setKanbanData(null);
      setLoading(false);
      return;
    }

    if (currentFolder.groupId && currentGroupId && currentFolder.groupId !== currentGroupId) {
      console.log('Folder group mismatch - skipping kanban fetch');
      setKanbanData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await taskService.getKanbanView({
        folderId: currentFolder._id
      });

      setKanbanData(response);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching kanban data:', errorMessage);
      setKanbanData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  }, [viewMode, currentFolder?._id, currentGroupId]);

  const onRefresh = () => {
    setRefreshing(true);
    if (viewMode === 'list') {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  };

  // Sort tasks function
  const sortTasks = (tasks: Task[], section: 'todo' | 'inProgress' | 'completed' | 'incomplete' = 'todo') => {
    const sectionSortConfigs = sortConfigs[section];
    if (sectionSortConfigs.length === 0) return tasks;

    const getSortValue = (task: Task, key: string): any => {
      const value = task[key as keyof Task];

      switch (key) {
        case 'title':
          return (value || '').toString().toLowerCase();
        case 'dueDate':
        case 'createdAt':
          if (!value) return Number.MAX_SAFE_INTEGER;
          const date = new Date(value as string);
          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        case 'priority':
          const priorityOrder: { [key: string]: number } = {
            low: 0, medium: 1, high: 2, critical: 3, urgent: 4,
          };
          return priorityOrder[value as string] ?? -1;
        case 'estimatedTime':
          return convertTimeToMinutes((value || '') as string);
        case 'status':
          const statusOrder: { [key: string]: number } = { todo: 0, in_progress: 1, completed: 2 };
          return statusOrder[value as string] ?? 3;
        case 'category':
          return (value || '').toString().toLowerCase();
        default:
          return value || '';
      }
    };

    const sortedTasks = [...tasks].sort((a, b) => {
      for (const config of sectionSortConfigs) {
        const aValue = getSortValue(a, config.key);
        const bValue = getSortValue(b, config.key);

        if (aValue < bValue) {
          return config.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });

    return sortedTasks;
  };

  // Handle column sort
  const handleColumnSort = (key: string, section: 'todo' | 'inProgress' | 'completed' | 'incomplete') => {
    setSortConfigs(prev => {
      const sectionConfigs = prev[section];
      const existingIndex = sectionConfigs.findIndex(c => c.key === key);

      let newSectionConfigs;
      if (existingIndex >= 0) {
        const currentDirection = sectionConfigs[existingIndex].direction;
        if (currentDirection === 'asc') {
          const updated = { key, direction: 'desc' as const };
          newSectionConfigs = [updated, ...sectionConfigs.filter((_, i) => i !== existingIndex)];
        } else {
          newSectionConfigs = sectionConfigs.filter((_, i) => i !== existingIndex);
        }
      } else {
        newSectionConfigs = [{ key, direction: 'asc' as const }, ...sectionConfigs];
      }

      return { ...prev, [section]: newSectionConfigs };
    });
  };

  // Get column sort indicator
  const getColumnSortIndicator = (key: string, section: 'todo' | 'inProgress' | 'completed' | 'incomplete') => {
    const sectionConfigs = sortConfigs[section];
    const config = sectionConfigs.find(c => c.key === key);
    const index = sectionConfigs.findIndex(c => c.key === key);

    if (!config) return null;

    return (
      <View style={styles.sortIndicator}>
        <Text style={styles.sortArrow}>
          {config.direction === 'asc' ? '↑' : '↓'}
        </Text>
        {sectionConfigs.length > 1 && (
          <View style={styles.sortOrderBadge}>
            <Text style={styles.sortOrderText}>{index + 1}</Text>
          </View>
        )}
      </View>
    );
  };

  // Sortable column header component
  const SortableColumnHeader = ({ 
    sortKey, 
    section, 
    children, 
    style = {} 
  }: { 
    sortKey: string; 
    section: 'todo' | 'inProgress' | 'completed' | 'incomplete'; 
    children: React.ReactNode; 
    style?: any;
  }) => (
    <TouchableOpacity
      style={[styles.columnHeader, style]}
      onPress={() => handleColumnSort(sortKey, section)}
    >
      <Text style={styles.columnHeaderText}>{children}</Text>
      {getColumnSortIndicator(sortKey, section)}
    </TouchableOpacity>
  );

  // Filter tasks
  const filterTasks = useCallback((tasks: Task[]) => {
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
  }, [activeSearchQuery, statusFilter, categoryFilter, tagFilter]);

  // Handle search
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveSearchQuery('');
    setStatusFilter(null);
    setCategoryFilter(null);
    setTagFilter(null);
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => 
    activeSearchQuery || statusFilter || categoryFilter || tagFilter,
    [activeSearchQuery, statusFilter, categoryFilter, tagFilter]
  );

  // Collect all unique tags
  const allUniqueTags = useMemo(() => 
    Array.from(
      new Set([...todoTasks, ...inProgressTasks, ...completedTasks, ...incompleteTasks]
        .flatMap(task => task.tags || []))
    ).sort(),
    [todoTasks, inProgressTasks, completedTasks, incompleteTasks]
  );

  const handleAddTask = () => {
    setShowCreateModal(true);
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      const assignedTo = taskData.assignedTo && taskData.assignedTo.length > 0
        ? taskData.assignedTo
        : (currentUser ? [{ userId: currentUser._id }] : []);

      const backendTaskData = {
        title: taskData.title || 'Untitled Task',
        description: taskData.description || '',
        category: taskData.category || 'Other',
        status: 'todo',
        priority: mapPriorityToBackend(taskData.priority),
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        tags: taskData.tags || [],
        estimatedTime: taskData.estimatedTime || '',
        type: taskData.category || 'Operational',
        assignedTo,
        folderId: currentFolder?._id || undefined
      };

      await taskService.createTask(backendTaskData);
      setShowCreateModal(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task: ' + getErrorMessage(error));
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    setShowTaskDetail(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    onRefresh();
  };

  const handleTaskDelete = (taskId: string) => {
    if (viewMode === 'list') {
      setTodoTasks(prev => prev.filter(task => task._id !== taskId));
      setInProgressTasks(prev => prev.filter(task => task._id !== taskId));
      setIncompleteTasks(prev => prev.filter(task => task._id !== taskId));
      setCompletedTasks(prev => prev.filter(task => task._id !== taskId));
    } else {
      fetchKanbanData();
    }
    setShowTaskDetail(false);
    setSelectedTask(null);
  };

  const handleContextMenu = (task: Task, x: number, y: number) => {
    setContextMenu({ visible: true, x, y, task });
  };

  // Handle repeat save
  const handleRepeatSave = async (settings: RepeatSettings) => {
    if (!repeatModalTask) return;

    try {
      await taskService.setTaskRepetition(repeatModalTask._id, {
        isRepeating: settings.isRepeating,
        frequency: settings.frequency,
        interval: settings.interval,
        endDate: settings.endDate,
        occurrences: settings.occurrences,
      });
      setShowRepeatModal(false);
      setRepeatModalTask(null);
      onRefresh();
      Alert.alert('Success', 'Repeat settings saved');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle context menu action
  const handleContextMenuAction = async (action: string, task: Task, payload?: any) => {
    setContextMenu(null);

    try {
      switch (action) {
        case 'complete':
          const completedTask = await taskService.updateTask(task._id, {
            status: 'completed',
          });
          handleTaskUpdate(completedTask);
          break;

        case 'start_timer':
          const startedTask = await taskService.startTimer(task._id);
          handleTaskUpdate(startedTask);
          syncTimersFromTask(startedTask);
          break;

        case 'stop_timer':
          const stoppedTask = await stopTimer(task._id);
          handleTaskUpdate(stoppedTask);
          syncTimersFromTask(stoppedTask);
          break;

        case 'change_category':
          if (payload?.category) {
            const updatedCategoryTask = await taskService.updateTask(task._id, {
              category: payload.category,
            });
            handleTaskUpdate(updatedCategoryTask);
          }
          break;

        case 'set_repeat':
          if (payload) {
            const repeatTask = await taskService.setTaskRepetition(task._id, payload);
            handleTaskUpdate(repeatTask);
          }
          break;

        case 'repeat_custom':
          setRepeatModalTask(task);
          setShowRepeatModal(true);
          break;

        case 'repeat_after_completion':
          const repeatAfterTask = await taskService.setTaskRepetition(task._id, {
            isRepeating: true,
            frequency: 'daily',
            interval: 1,
          });
          handleTaskUpdate(repeatAfterTask);
          break;

        case 'duplicate':
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
          setTodoTasks(prev => [duplicatedTask, ...prev]);
          break;

        case 'move_to_folder':
          if (payload?.folderId) {
            const movedTask = await taskService.updateTask(task._id, {
              folderId: payload.folderId,
            });
            handleTaskUpdate(movedTask);
          }
          break;

        case 'remove_repeat':
          const noRepeatTask = await taskService.setTaskRepetition(task._id, {
            isRepeating: false,
            frequency: null,
            interval: null,
          });
          handleTaskUpdate(noRepeatTask);
          break;

        case 'delete':
          Alert.alert('Delete Task', 'Are you sure? This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', style: 'destructive',
              onPress: async () => {
                await taskService.deleteTask(task._id);
                handleTaskDelete(task._id);
              }
            }
          ]);
          break;

        default:
          break;
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed: ' + getErrorMessage(error));
    }
  };

  const mapPriorityToBackend = (frontendPriority: string): string => {
    const priorityMap: { [key: string]: string } = {
      'None': 'low', 'Low': 'low', 'Medium': 'medium', 'High': 'high', 'Urgent': 'urgent'
    };
    return priorityMap[frontendPriority] || 'medium';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return styles.urgentPriority;
      case 'high': return styles.highPriority;
      case 'medium': return styles.mediumPriority;
      case 'low': return styles.lowPriority;
      default: return styles.defaultPriority;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Financial': return styles.financialType;
      case 'Strategic': return styles.strategicType;
      case 'Operational': return styles.operationalType;
      default: return styles.defaultType;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return styles.todoStatus;
      case 'in_progress': return styles.inProgressStatus;
      case 'completed': return styles.completedStatus;
      case 'incomplete': return styles.incompleteStatus;
      default: return styles.defaultStatus;
    }
  };

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Kanban View Component
  const KanbanViewComponent = () => {
    if (!kanbanData || !kanbanData.kanbanBoard) {
      return (
        <View style={styles.kanbanPlaceholder}>
          <Layout size={64} color={isDark ? '#4b5563' : '#d1d5db'} />
          <Text style={[styles.placeholderText, isDark && styles.darkText]}>No kanban data available</Text>
        </View>
      );
    }

    const statusColumns = [
      {
        key: 'todo',
        title: 'To Do',
        icon: <View style={[styles.kanbanColumnDot, { backgroundColor: isDark ? '#9ca3af' : '#6b7280' }]} />,
        count: kanbanData.kanbanBoard.todo?.count || 0,
        color: isDark ? '#374151' : '#f3f4f6',
        borderColor: isDark ? '#4b5563' : '#e5e7eb',
        textColor: isDark ? '#e5e7eb' : '#374151'
      },
      {
        key: 'in_progress',
        title: 'In Progress',
        icon: <View style={[styles.kanbanColumnDot, { backgroundColor: '#3b82f6' }]} />,
        count: kanbanData.kanbanBoard.in_progress?.count || 0,
        color: isDark ? '#1e3a8a' : '#dbeafe',
        borderColor: isDark ? '#1d4ed8' : '#93c5fd',
        textColor: isDark ? '#dbeafe' : '#1e40af'
      },
      {
        key: 'completed',
        title: 'Completed',
        icon: <View style={[styles.kanbanColumnDot, { backgroundColor: '#10b981' }]} />,
        count: kanbanData.kanbanBoard.completed?.count || 0,
        color: isDark ? '#064e3b' : '#dcfce7',
        borderColor: isDark ? '#047857' : '#86efac',
        textColor: isDark ? '#a7f3d0' : '#166534'
      },
      {
        key: 'incomplete',
        title: 'Incomplete',
        icon: <View style={[styles.kanbanColumnDot, { backgroundColor: '#dc2626' }]} />,
        count: kanbanData.kanbanBoard.incomplete?.count || 0,
        color: isDark ? '#7f1d1d' : '#fef2f2',
        borderColor: isDark ? '#b91c1c' : '#fecaca',
        textColor: isDark ? '#fecaca' : '#991b1b'
      },
    ];

    const getTasksForColumn = (columnKey: string) => {
      const tasks = kanbanData.kanbanBoard[columnKey]?.tasks || [];
      return sortTasks(filterTasks(tasks), 'todo');
    };

    return (
      <View style={styles.kanbanContainer}>
        {sortConfigs.todo.length > 0 && (
          <View style={[styles.kanbanSortIndicator, isDark && styles.darkKanbanSortIndicator]}>
            <Text style={[styles.kanbanSortText, isDark && styles.darkText]}>
              Sorted by {sortConfigs.todo.map(config => {
                const option = sortOptions.find(opt => opt.key === config.key);
                return `${option?.label} ${config.direction === 'asc' ? '↑' : '↓'}`;
              }).join(', ')}
            </Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanColumnsContainer}>
          {statusColumns.map((column) => {
            const columnTasks = getTasksForColumn(column.key);

            return (
              <View key={column.key} style={[styles.kanbanColumn, { backgroundColor: column.color, borderColor: column.borderColor }]}>
                <View style={styles.kanbanColumnHeader}>
                  <View style={styles.kanbanColumnHeaderLeft}>
                    {column.icon}
                    <Text style={[styles.kanbanColumnTitle, { color: column.textColor }]}>{column.title}</Text>
                    <View style={[styles.kanbanColumnCount, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
                      <Text style={[styles.kanbanColumnCountText, { color: column.textColor }]}>{column.count}</Text>
                    </View>
                  </View>
                </View>

                <FlatList
                  data={columnTasks}
                  renderItem={({ item: task }) => {
                    const assigneeInfo = getDetailedAssignees(task);
                    const isOverdue = isTaskOverdue(task);
                    const isRunning = isTimerRunning(task._id);
                    const activeTimers = getAllActiveTimers(task._id);

                    return (
                      <TouchableOpacity
                        key={task._id}
                        style={[styles.kanbanTaskCard, isOverdue && styles.kanbanTaskCardOverdue, column.key === 'completed' && styles.kanbanTaskCardCompleted, isDark && styles.darkKanbanTaskCard]}
                        onPress={() => handleTaskClick(task._id)}
                        onLongPress={(event) => {
                          const { pageX, pageY } = event.nativeEvent;
                          handleContextMenu(task, pageX, pageY);
                        }}
                      >
                        <View style={styles.kanbanTaskHeader}>
                          <Text style={[styles.kanbanTaskTitle, isDark && styles.darkText]} numberOfLines={2}>
                            {task.title || 'Untitled Task'}
                          </Text>
                          {task.priority && (
                            <View style={[styles.kanbanPriorityBadge, getPriorityColor(task.priority)]}>
                              <Text style={styles.kanbanPriorityText}>{task.priority}</Text>
                            </View>
                          )}
                        </View>

                        {task.description && (
                          <Text style={[styles.kanbanTaskDescription, isDark && styles.darkSubtitle]} numberOfLines={2}>
                            {task.description}
                          </Text>
                        )}

                        <View style={styles.kanbanTaskTags}>
                          {task.category && task.category !== 'Other' && (
                            <View style={[styles.kanbanTag, getTypeColor(task.category)]}>
                              <Text style={styles.kanbanTagText}>{task.category}</Text>
                            </View>
                          )}
                          {task.tags?.slice(0, 2).map((tag, index) => (
                            <View key={index} style={styles.kanbanTag}>
                              <Text style={styles.kanbanTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.kanbanTaskFooter}>
                          <View style={styles.kanbanTaskFooterLeft}>
                            <View style={styles.kanbanAvatars}>
                              {assigneeInfo.assignees.slice(0, 2).map((assignee) => (
                                <View key={assignee._id} style={[styles.kanbanAvatar, assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id ? styles.kanbanAvatarCurrentUser : styles.kanbanAvatarOther]}>
                                  {assignee.avatar ? (
                                    <Image source={{ uri: assignee.avatar }} style={styles.kanbanAvatarImage} />
                                  ) : (
                                    <Text style={styles.kanbanAvatarText}>{assignee.initial}</Text>
                                  )}
                                </View>
                              ))}
                            </View>
                            
                            <View style={styles.kanbanTimeInfo}>
                              {column.key === 'in_progress' ? (
                                <>
                                  <TaskTimer task={task} isRunning={isRunning} />
                                  {activeTimers.length > 0 && (
                                    <TouchableOpacity 
                                      style={styles.activeTimersButton}
                                      onPress={() => setShowActiveTimersPopup(task._id)}
                                    >
                                      <MoreVertical size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                  )}
                                </>
                              ) : column.key === 'completed' ? (
                                <View style={styles.completedTime}>
                                  <Clock size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                                  <Text style={[styles.completedTimeText, isDark && styles.darkSubtitle]}>
                                    {getTotalLoggedTimeForTask(task) > 0 
                                      ? formatTimeFromMinutes(getTotalLoggedTimeForTask(task))
                                      : task.estimatedTime || '—'}
                                  </Text>
                                </View>
                              ) : task.estimatedTime ? (
                                <View style={styles.estimatedTime}>
                                  <Clock size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                                  <Text style={[styles.estimatedTimeText, isDark && styles.darkSubtitle]}>
                                    {task.estimatedTime}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                          
                          {task.dueDate && (
                            <View style={[styles.kanbanDueDate, isOverdue && styles.kanbanDueDateOverdue]}>
                              <Calendar size={12} color={isOverdue ? '#dc2626' : (isDark ? '#9ca3af' : '#6b7280')} />
                              <Text style={[styles.kanbanDueDateText, isOverdue && styles.kanbanDueDateTextOverdue, isDark && styles.darkSubtitle]}>
                                {formatDate(task.dueDate)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  keyExtractor={item => item._id}
                  ListEmptyComponent={
                    <View style={styles.kanbanEmptyState}>
                      {column.key === 'incomplete' ? (
                        <AlertTriangle size={48} color={isDark ? '#4b5563' : '#d1d5db'} />
                      ) : column.key === 'completed' ? (
                        <CheckCircle size={48} color={isDark ? '#4b5563' : '#d1d5db'} />
                      ) : (
                        <Plus size={48} color={isDark ? '#4b5563' : '#d1d5db'} />
                      )}
                      <Text style={[styles.kanbanEmptyText, isDark && styles.darkSubtitle]}>
                        {column.key === 'incomplete'
                          ? 'No incomplete tasks'
                          : column.key === 'completed'
                            ? 'No completed tasks'
                            : 'No tasks'
                        }
                      </Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Task Row Component
  const TaskRow = ({ 
    task, 
    isOverdue = false, 
    isCompleted = false,
    section = 'todo' 
  }: { 
    task: Task; 
    isOverdue?: boolean; 
    isCompleted?: boolean;
    section?: 'todo' | 'inProgress' | 'completed' | 'incomplete';
  }) => {
    const assigneeInfo = getDetailedAssignees(task);
    const assigneeSummary = getAssigneeSummary(task);
    const isRunning = isTimerRunning(task._id);
    const activeTimers = getAllActiveTimers(task._id);
    const loggedMinutes = getTotalLoggedTimeForTask(task);

    return (
      <TouchableOpacity
        style={[styles.taskRow, isCompleted && styles.completedTask, isOverdue && styles.overdueTask]}
        onPress={() => handleTaskClick(task._id)}
        onLongPress={(event) => {
          const { pageX, pageY } = event.nativeEvent;
          handleContextMenu(task, pageX, pageY);
        }}
      >
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <View style={[styles.priorityDot, getPriorityColor(task.priority || 'medium')]} />
            <Text style={[styles.taskTitle, isCompleted && styles.completedText, isOverdue && styles.overdueText]} numberOfLines={1}>
              {task.title || 'Untitled Task'}
            </Text>
          </View>

          <View style={styles.taskDetails}>
            <View style={styles.detailRow}>
              <View style={[styles.statusBadge, getStatusColor(task.status || 'todo')]}>
                <Text style={styles.statusText}>{getStatusDisplay(task.status || 'todo')}</Text>
              </View>
              
              {task.category && task.category !== 'Other' && (
                <View style={[styles.typeBadge, getTypeColor(task.category || '')]}>
                  <Text style={styles.typeText}>{task.category}</Text>
                </View>
              )}
            </View>

            <View style={styles.detailRow}>
              {task.dueDate && (
                <View style={styles.dueDate}>
                  <Calendar size={14} color="#6b7280" />
                  <Text style={[styles.dueDateText, isOverdue && styles.overdueText]}>
                    {formatDate(task.dueDate)}
                  </Text>
                </View>
              )}
              
              <View style={[styles.priorityBadge, getPriorityColor(task.priority || 'medium')]}>
                <Text style={styles.priorityText}>{task.priority || 'medium'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.assignees}>
                <User size={14} color="#6b7280" />
                {assigneeInfo.hasAssignees ? (
                  <View style={styles.avatarStack}>
                    {assigneeInfo.assignees.slice(0, 3).map((assignee, index) => (
                      <View key={assignee._id} style={[styles.avatar, assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id ? styles.currentUserAvatar : styles.otherUserAvatar]}>
                        {assignee.avatar ? (
                          <Image source={{ uri: assignee.avatar }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.avatarText}>{assignee.initial}</Text>
                        )}
                      </View>
                    ))}
                    {assigneeInfo.totalCount > 3 && (
                      <View style={styles.moreAvatars}>
                        <Text style={styles.moreAvatarsText}>+{assigneeInfo.totalCount - 3}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.unassignedText}>Unassigned</Text>
                )}
              </View>

              <View style={styles.timeInfo}>
                {section === 'inProgress' ? (
                  <>
                    <TaskTimer task={task} isRunning={isRunning} />
                    {activeTimers.length > 0 && (
                      <TouchableOpacity 
                        style={styles.activeTimersButton}
                        onPress={() => setShowActiveTimersPopup(task._id)}
                      >
                        <MoreVertical size={14} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                  </>
                ) : section === 'completed' ? (
                  <View style={styles.completedTime}>
                    <Clock size={14} color="#6b7280" />
                    <Text style={styles.completedTimeText}>
                      {formatTimeFromMinutes(loggedMinutes)}
                    </Text>
                  </View>
                ) : task.estimatedTime ? (
                  <View style={styles.estimatedTime}>
                    <Clock size={14} color="#6b7280" />
                    <Text style={styles.estimatedTimeText}>{task.estimatedTime}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {task.description && (
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.contextMenuButton} 
          onPress={(event) => {
            const { pageX, pageY } = event.nativeEvent;
            handleContextMenu(task, pageX, pageY);
          }}
        >
          <MoreVertical size={16} color="#9ca3af" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Section Header Component
  const SectionHeader = ({ 
    title, 
    count, 
    expanded, 
    onToggle, 
    icon, 
    color 
  }: { 
    title: string; 
    count: number; 
    expanded: boolean; 
    onToggle: () => void; 
    icon: React.ReactNode; 
    color: string;
  }) => (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
      <View style={styles.sectionHeaderContent}>
        {expanded ? 
          <ChevronDown size={20} color="#6b7280" /> : 
          <ChevronRight size={20} color="#6b7280" />
        }
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: color }]}>
          <Text style={styles.countText}>
            {hasActiveFilters ? `${filterTasks(eval(`${title.toLowerCase().replace(' ', '')}Tasks`)).length}/${count}` : count}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Filter Modal Component
  const FilterModal = () => {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [localStatus, setLocalStatus] = useState(statusFilter);
    const [localCategory, setLocalCategory] = useState(categoryFilter);
    const [localTag, setLocalTag] = useState(tagFilter);

    const handleApply = () => {
      setSearchQuery(localSearch);
      setActiveSearchQuery(localSearch);
      setStatusFilter(localStatus);
      setCategoryFilter(localCategory);
      setTagFilter(localTag);
      setShowFilterModal(false);
    };

    const handleClear = () => {
      setLocalSearch('');
      setLocalStatus(null);
      setLocalCategory(null);
      setLocalTag(null);
    };

    return (
      <Modal visible={showFilterModal} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, isDark && styles.darkModalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>Filter Tasks</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={24} color={isDark ? '#e5e7eb' : '#374151'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, isDark && styles.darkText]}>Search</Text>
              <View style={[styles.searchInputContainer, isDark && styles.darkSearchInputContainer]}>
                <Search size={20} color="#9ca3af" />
                <TextInput
                  style={[styles.filterInput, isDark && styles.darkText]}
                  placeholder="Search task name..."
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={localSearch}
                  onChangeText={setLocalSearch}
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, isDark && styles.darkText]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !localStatus && styles.filterOptionSelected]}
                  onPress={() => setLocalStatus(null)}
                >
                  <Text style={[styles.filterOptionText, !localStatus && styles.filterOptionTextSelected]}>
                    All
                  </Text>
                </TouchableOpacity>
                {statusOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.filterOption, localStatus === option && styles.filterOptionSelected]}
                    onPress={() => setLocalStatus(option)}
                  >
                    <Text style={[styles.filterOptionText, localStatus === option && styles.filterOptionTextSelected]}>
                      {getStatusDisplay(option)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, isDark && styles.darkText]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !localCategory && styles.filterOptionSelected]}
                  onPress={() => setLocalCategory(null)}
                >
                  <Text style={[styles.filterOptionText, !localCategory && styles.filterOptionTextSelected]}>
                    All
                  </Text>
                </TouchableOpacity>
                {categoryOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.filterOption, localCategory === option && styles.filterOptionSelected]}
                    onPress={() => setLocalCategory(option)}
                  >
                    <Text style={[styles.filterOptionText, localCategory === option && styles.filterOptionTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {allUniqueTags.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, isDark && styles.darkText]}>Tags</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[styles.filterOption, !localTag && styles.filterOptionSelected]}
                    onPress={() => setLocalTag(null)}
                  >
                    <Text style={[styles.filterOptionText, !localTag && styles.filterOptionTextSelected]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {allUniqueTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.filterOption, localTag === tag && styles.filterOptionSelected]}
                      onPress={() => setLocalTag(tag)}
                    >
                      <Text style={[styles.filterOptionText, localTag === tag && styles.filterOptionTextSelected]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  if (!currentGroup) {
    return (
      <NoGroupState
        title="Join or Create a Group to Manage Tasks"
        description="You need to join or create a group to manage tasks and collaborate with your team."
      />
    );
  }

  if (!currentFolder) {
    return <NoFolderState />;
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <View>
          <Text style={[styles.title, isDark && styles.darkText]}>Tasks</Text>
          {currentFolder && (
            <>
              <Text style={[styles.subtitle, isDark && styles.darkSubtitle]}>
                Folder: {currentFolder.name}{currentFolder.isDefault ? ' (Default)' : ''}
              </Text>
              {currentFolder.description && (
                <Text style={[styles.folderDescription, isDark && styles.darkSubtitle]}>
                  {currentFolder.description}
                </Text>
              )}
            </>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity 
            style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]} 
            onPress={() => setViewMode('list')}
          >
            <List size={16} color={viewMode === 'list' ? '#ffffff' : '#374151'} />
            <Text style={[styles.viewModeText, viewMode === 'list' && styles.activeViewModeText]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewModeButton, viewMode === 'kanban' && styles.activeViewMode]} 
            onPress={() => setViewMode('kanban')}
          >
            <Layout size={16} color={viewMode === 'kanban' ? '#ffffff' : '#374151'} />
            <Text style={[styles.viewModeText, viewMode === 'kanban' && styles.activeViewModeText]}>Kanban</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={16} color={hasActiveFilters ? '#3b82f6' : '#374151'} />
          <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
            {hasActiveFilters ? 'Filtered' : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <ScrollView 
          style={styles.tasksList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.sectionsContainer}>
            {(!statusFilter || statusFilter === 'todo') && (
              <View style={[styles.section, isDark && styles.darkSection]}>
                <SectionHeader 
                  title="To Do" 
                  count={todoTasks.length} 
                  expanded={todoTasksExpanded} 
                  onToggle={() => setTodoTasksExpanded(!todoTasksExpanded)}
                  icon={<View style={[styles.sectionIcon, { backgroundColor: '#6b7280' }]} />}
                  color="#6b7280"
                />
                {todoTasksExpanded && (
                  <View style={styles.tasksContainer}>
                    {filterTasks(todoTasks).length > 0 ? (
                      sortTasks(filterTasks(todoTasks), 'todo').map((task) => (
                        <TaskRow key={task._id} task={task} section="todo" />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <Plus size={48} color={isDark ? '#4b5563' : '#d1d5db'} />
                        <Text style={[styles.emptyText, isDark && styles.darkText]}>No tasks to do</Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={handleAddTask}>
                          <Text style={styles.emptyButtonText}>Create your first task</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {(!statusFilter || statusFilter === 'in_progress') && (
              <View style={[styles.section, isDark && styles.darkSection]}>
                <SectionHeader 
                  title="In Progress" 
                  count={inProgressTasks.length} 
                  expanded={inProgressTasksExpanded} 
                  onToggle={() => setInProgressTasksExpanded(!inProgressTasksExpanded)}
                  icon={<View style={[styles.sectionIcon, { backgroundColor: '#3b82f6' }]} />}
                  color="#3b82f6"
                />
                {inProgressTasksExpanded && (
                  <View style={styles.tasksContainer}>
                    {filterTasks(inProgressTasks).length > 0 ? (
                      sortTasks(filterTasks(inProgressTasks), 'inProgress').map((task) => (
                        <TaskRow key={task._id} task={task} section="inProgress" />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <PlayCircle size={48} color={isDark ? '#4b5563' : '#d1d5db'} />
                        <Text style={[styles.emptyText, isDark && styles.darkText]}>No tasks in progress</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {(!statusFilter || statusFilter === 'completed') && (
              <View style={[styles.section, isDark && styles.darkSection]}>
                <SectionHeader 
                  title="Completed" 
                  count={completedTasks.length} 
                  expanded={completedTasksExpanded} 
                  onToggle={() => setCompletedTasksExpanded(!completedTasksExpanded)}
                  icon={<View style={[styles.sectionIcon, { backgroundColor: '#10b981' }]} />}
                  color="#10b981"
                />
                {completedTasksExpanded && (
                  <View style={styles.tasksContainer}>
                    {filterTasks(completedTasks).length > 0 ? (
                      sortTasks(filterTasks(completedTasks), 'completed').map((task) => (
                        <TaskRow key={task._id} task={task} isCompleted={true} section="completed" />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <CheckCircle size={48} color={isDark ? '#4b5563' : '#d1d5db'} />
                        <Text style={[styles.emptyText, isDark && styles.darkText]}>No completed tasks yet</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {(!statusFilter || statusFilter === 'incomplete') && (
              <View style={[styles.section, isDark && styles.darkSection]}>
                <SectionHeader 
                  title="Incomplete" 
                  count={incompleteTasks.length} 
                  expanded={incompleteTasksExpanded} 
                  onToggle={() => setIncompleteTasksExpanded(!incompleteTasksExpanded)}
                  icon={<View style={[styles.sectionIcon, { backgroundColor: '#dc2626' }]} />}
                  color="#dc2626"
                />
                {incompleteTasksExpanded && (
                  <View style={styles.tasksContainer}>
                    {filterTasks(incompleteTasks).length > 0 ? (
                      sortTasks(filterTasks(incompleteTasks), 'incomplete').map((task) => (
                        <TaskRow key={task._id} task={task} isOverdue={true} section="incomplete" />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <AlertTriangle size={48} color={isDark ? '#4b5563' : '#d1d5db'} />
                        <Text style={[styles.emptyText, isDark && styles.darkText]}>No incomplete tasks</Text>
                        <Text style={[styles.emptySubtext, isDark && styles.darkSubtitle]}>
                          Overdue tasks will appear here
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.kanbanWrapper}>
          <KanbanViewComponent />
        </View>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTaskModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTask={handleCreateTask}
          currentUser={currentUser}
          groupMembers={currentGroup?.members || []}
        />
      )}

      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          visible={showTaskDetail}
          taskId={selectedTask}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}

      {contextMenu && (
        <TaskContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showRepeatModal && repeatModalTask && (
        <RepeatTaskModal
          visible={showRepeatModal}
          task={repeatModalTask}
          onClose={() => {
            setShowRepeatModal(false);
            setRepeatModalTask(null);
          }}
          onSave={handleRepeatSave}
        />
      )}

      {showActiveTimersPopup && (
        <ActiveTimersPopup
          taskId={showActiveTimersPopup}
          visible={!!showActiveTimersPopup}
          onClose={() => setShowActiveTimersPopup(null)}
        />
      )}

      <FilterModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  darkContainer: { backgroundColor: '#1a202c' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    padding: 16, 
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb' 
  },
  darkHeader: { backgroundColor: '#1f1f1f', borderBottomColor: '#374151' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  folderDescription: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  darkText: { color: '#f7fafc' },
  darkSubtitle: { color: '#a0aec0' },
  
  addButton: { 
    backgroundColor: '#3b82f6', 
    padding: 8, 
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  controls: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb' 
  },
  
  viewModeToggle: { 
    flexDirection: 'row', 
    backgroundColor: '#f3f4f6', 
    borderRadius: 8, 
    padding: 2 
  },
  viewModeButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 6 
  },
  activeViewMode: { backgroundColor: '#3b82f6' },
  viewModeText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#374151', 
    marginLeft: 4 
  },
  activeViewModeText: { color: '#ffffff' },
  
  filterButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    minWidth: 100,
  },
  filterButtonActive: { 
    backgroundColor: '#eff6ff', 
    borderColor: '#3b82f6' 
  },
  filterButtonText: { 
    fontSize: 14, 
    color: '#374151', 
    marginLeft: 6 
  },
  filterButtonTextActive: { 
    color: '#3b82f6', 
    fontWeight: '500' 
  },
  
  tasksList: { flex: 1 },
  kanbanWrapper: { flex: 1 },
  
  sectionsContainer: { padding: 16 },
  section: { 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    marginBottom: 16, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  darkSection: { 
    backgroundColor: '#2d3748',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  
  sectionHeader: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6' 
  },
  sectionHeaderContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  sectionIcon: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    marginLeft: 8 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#374151', 
    marginLeft: 8, 
    flex: 1 
  },
  countBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  countText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  
  tasksContainer: { padding: 8 },
  
  taskRow: { 
    flexDirection: 'row', 
    backgroundColor: '#ffffff', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 8, 
    borderWidth: 1, 
    borderColor: '#f3f4f6',
    alignItems: 'flex-start',
  },
  completedTask: { 
    backgroundColor: '#f9fafb', 
    opacity: 0.8 
  },
  overdueTask: { 
    borderColor: '#fecaca', 
    backgroundColor: '#fef2f2' 
  },
  
  taskContent: { flex: 1 },
  taskHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  priorityDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 8 
  },
  urgentPriority: { backgroundColor: '#dc2626' },
  highPriority: { backgroundColor: '#ea580c' },
  mediumPriority: { backgroundColor: '#d97706' },
  lowPriority: { backgroundColor: '#16a34a' },
  defaultPriority: { backgroundColor: '#6b7280' },
  
  taskTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#374151', 
    flex: 1 
  },
  completedText: { 
    color: '#9ca3af', 
    textDecorationLine: 'line-through' 
  },
  overdueText: { color: '#dc2626' },
  
  taskDetails: { marginLeft: 16 },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6, 
    flexWrap: 'wrap' 
  },
  
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    marginRight: 8 
  },
  todoStatus: { backgroundColor: '#f3f4f6' },
  inProgressStatus: { backgroundColor: '#dbeafe' },
  completedStatus: { backgroundColor: '#dcfce7' },
  incompleteStatus: { backgroundColor: '#fee2e2' },
  defaultStatus: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 12, fontWeight: '500' },
  
  typeBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  financialType: { backgroundColor: '#fef3c7' },
  strategicType: { backgroundColor: '#dcfce7' },
  operationalType: { backgroundColor: '#dbeafe' },
  defaultType: { backgroundColor: '#f3f4f6' },
  typeText: { fontSize: 12, fontWeight: '500' },
  
  dueDate: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 12 
  },
  dueDateText: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginLeft: 4 
  },
  
  priorityBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  priorityText: { 
    fontSize: 12, 
    fontWeight: '500', 
    color: '#ffffff' 
  },
  
  assignees: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarStack: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginLeft: 4 
  },
  avatar: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: -6, 
    borderWidth: 2, 
    borderColor: '#ffffff' 
  },
  currentUserAvatar: { backgroundColor: '#10b981' },
  otherUserAvatar: { backgroundColor: '#3b82f6' },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 12 
  },
  avatarText: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  moreAvatars: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#6b7280', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: -6, 
    borderWidth: 2, 
    borderColor: '#ffffff' 
  },
  moreAvatarsText: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  unassignedText: { 
    fontSize: 12, 
    color: '#9ca3af', 
    marginLeft: 4 
  },
  
  timeInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  timeEstimate: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  timeText: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginLeft: 4 
  },
  
  timerBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ecfdf5', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12, 
    marginRight: 8 
  },
  timerDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: '#10b981', 
    marginRight: 4 
  },
  timerTextRunning: { 
    fontSize: 11, 
    color: '#047857', 
    fontWeight: '600' 
  },
  
  completedTime: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  completedTimeText: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginLeft: 4 
  },
  
  estimatedTime: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  estimatedTimeText: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginLeft: 4 
  },
  
  activeTimersButton: { 
    marginLeft: 4, 
    padding: 2 
  },
  
  taskDescription: { 
    fontSize: 14, 
    color: '#6b7280', 
    lineHeight: 18,
    marginTop: 4,
  },
  
  contextMenuButton: { 
    padding: 4, 
    alignSelf: 'flex-start' 
  },
  
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: '#6b7280' 
  },
  
  emptyState: { 
    padding: 32, 
    alignItems: 'center' 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#6b7280', 
    marginTop: 12, 
    textAlign: 'center' 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#9ca3af', 
    marginTop: 4, 
    textAlign: 'center' 
  },
  emptyButton: { 
    marginTop: 16, 
    backgroundColor: '#3b82f6', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  emptyButtonText: { 
    color: '#ffffff', 
    fontWeight: '500' 
  },
  
  kanbanPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32 
  },
  placeholderText: { 
    fontSize: 18, 
    color: '#6b7280', 
    marginTop: 16 
  },
  
  kanbanContainer: { flex: 1, paddingTop: 16, paddingBottom: 16 },
  kanbanSortIndicator: { 
    backgroundColor: '#dbeafe', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    alignSelf: 'center', 
    marginBottom: 12 
  },
  darkKanbanSortIndicator: { backgroundColor: '#1e3a8a' },
  kanbanSortText: { 
    fontSize: 12, 
    color: '#1e40af', 
    fontWeight: '500' 
  },
  
  kanbanColumnsContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  kanbanColumn: { 
    width: SCREEN_WIDTH * 0.85, 
    marginRight: 12, 
    borderRadius: 12, 
    borderWidth: 1, 
    padding: 12, 
    maxHeight: '100%' 
  },
  kanbanColumnHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12, 
    paddingBottom: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.1)' 
  },
  kanbanColumnHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  kanbanColumnDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 8 
  },
  kanbanColumnTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginRight: 8, 
    flex: 1 
  },
  kanbanColumnCount: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  kanbanColumnCountText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  
  kanbanTaskCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    padding: 12, 
    marginBottom: 8 
  },
  darkKanbanTaskCard: { 
    backgroundColor: '#1f1f1f', 
    borderColor: '#374151' 
  },
  kanbanTaskCardOverdue: { 
    borderColor: '#fecaca', 
    backgroundColor: '#fef2f2' 
  },
  kanbanTaskCardCompleted: { opacity: 0.8 },
  
  kanbanTaskHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 8 
  },
  kanbanTaskTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    flex: 1, 
    marginRight: 8 
  },
  kanbanPriorityBadge: { 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 8 
  },
  kanbanPriorityText: { 
    fontSize: 10, 
    fontWeight: '500', 
    color: '#ffffff' 
  },
  
  kanbanTaskDescription: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginBottom: 8, 
    lineHeight: 16 
  },
  
  kanbanTaskTags: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 8, 
    gap: 4 
  },
  kanbanTag: { 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 8, 
    backgroundColor: '#f3f4f6' 
  },
  kanbanTagText: { 
    fontSize: 10, 
    color: '#374151' 
  },
  
  kanbanTaskFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 8 
  },
  kanbanTaskFooterLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  kanbanAvatars: { 
    flexDirection: 'row', 
    marginRight: 8 
  },
  kanbanAvatar: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    borderWidth: 2, 
    borderColor: '#ffffff', 
    marginLeft: -4, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  kanbanAvatarCurrentUser: { backgroundColor: '#10b981' },
  kanbanAvatarOther: { backgroundColor: '#3b82f6' },
  kanbanAvatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 10 
  },
  kanbanAvatarText: { 
    fontSize: 8, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  
  kanbanTimeInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  
  kanbanDueDate: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 8, 
    backgroundColor: '#f3f4f6' 
  },
  kanbanDueDateOverdue: { backgroundColor: '#fef2f2' },
  kanbanDueDateText: { 
    fontSize: 10, 
    color: '#6b7280', 
    marginLeft: 4, 
    fontWeight: '500' 
  },
  kanbanDueDateTextOverdue: { color: '#dc2626' },
  
  kanbanEmptyState: { 
    alignItems: 'center', 
    paddingVertical: 32 
  },
  kanbanEmptyText: { 
    fontSize: 14, 
    color: '#6b7280', 
    marginTop: 12, 
    textAlign: 'center' 
  },
  
  columnHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  columnHeaderText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#374151', 
    textTransform: 'uppercase' 
  },
  sortIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginLeft: 4 
  },
  sortArrow: { 
    fontSize: 12, 
    color: '#3b82f6' 
  },
  sortOrderBadge: { 
    backgroundColor: '#3b82f6', 
    borderRadius: 8, 
    paddingHorizontal: 4, 
    paddingVertical: 2, 
    marginLeft: 2,
    minWidth: 16,
    alignItems: 'center',
  },
  sortOrderText: { 
    fontSize: 10, 
    color: '#ffffff', 
    fontWeight: 'bold' 
  },
  
  inlineEditContainer: { marginVertical: 4 },
  inlineInput: { 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 6, 
    padding: 8, 
    fontSize: 14 
  },
  darkInlineInput: { 
    backgroundColor: '#374151', 
    borderColor: '#4b5563', 
    color: '#f9fafb' 
  },
  inlineText: { fontSize: 14, color: '#374151' },
  inlineOption: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6, 
    marginRight: 8, 
    backgroundColor: '#f3f4f6' 
  },
  inlineOptionSelected: { backgroundColor: '#3b82f6' },
  inlineOptionText: { fontSize: 14, color: '#374151' },
  inlineOptionTextSelected: { color: '#ffffff' },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  popupContent: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    width: SCREEN_WIDTH * 0.9, 
    maxHeight: SCREEN_WIDTH * 0.8 
  },
  darkPopupContent: { backgroundColor: '#2d3748' },
  popupHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb' 
  },
  popupTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#374151' 
  },
  popupScroll: { maxHeight: SCREEN_WIDTH * 0.6 },
  timerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6' 
  },
  darkTimerRow: { borderBottomColor: '#374151' },
  timerUser: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  timerAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  timerAvatarCurrent: { backgroundColor: '#10b981' },
  timerAvatarOther: { backgroundColor: '#3b82f6' },
  timerAvatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 16 
  },
  timerAvatarText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  timerUserInfo: { marginLeft: 12, flex: 1 },
  timerUserName: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#374151' 
  },
  youBadge: { 
    backgroundColor: '#10b981', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4, 
    alignSelf: 'flex-start', 
    marginTop: 2 
  },
  youBadgeText: { 
    fontSize: 10, 
    color: '#ffffff', 
    fontWeight: '600' 
  },
  timerElapsed: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#10b981' 
  },
  
  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  darkModalContainer: { backgroundColor: '#1a202c' },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb' 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#374151' 
  },
  modalContent: { flex: 1, padding: 16 },
  modalFooter: { 
    flexDirection: 'row', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#e5e7eb' 
  },
  
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 12 
  },
  searchInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderWidth: 1, 
    borderColor: '#e5e7eb' 
  },
  darkSearchInputContainer: { 
    backgroundColor: '#2d3748', 
    borderColor: '#4a5568' 
  },
  filterInput: { 
    flex: 1, 
    marginLeft: 8, 
    fontSize: 16, 
    color: '#374151' 
  },
  
  filterOptions: { flexDirection: 'row' },
  filterOption: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#f3f4f6', 
    marginRight: 8 
  },
  filterOptionSelected: { backgroundColor: '#3b82f6' },
  filterOptionText: { 
    fontSize: 14, 
    color: '#374151' 
  },
  filterOptionTextSelected: { 
    color: '#ffffff', 
    fontWeight: '500' 
  },
  
  clearButton: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 8, 
    backgroundColor: '#f3f4f6', 
    marginRight: 8 
  },
  clearButtonText: { 
    textAlign: 'center', 
    color: '#374151', 
    fontWeight: '500' 
  },
  applyButton: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 8, 
    backgroundColor: '#3b82f6' 
  },
  applyButtonText: { 
    textAlign: 'center', 
    color: '#ffffff', 
    fontWeight: '500' 
  },
});