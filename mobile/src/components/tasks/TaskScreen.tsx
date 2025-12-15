import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Dimensions,
  FlatList,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { Task } from '../../types/task.types';
import { taskService } from '../../services/task.service';
import CreateTaskModal from './CreateTaskModal';
import TaskContextMenu from './TaskContextMenu';
import TaskDetailModal from './TaskDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NoGroupState from '../common/NoGroupState';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TasksView() {
  const { currentGroup, user: currentUser } = useAuth();
  const { isDark } = useTheme();
  const [activeTasksExpanded, setActiveTasksExpanded] = useState(true);
  const [uncompletedTasksExpanded, setUncompletedTasksExpanded] = useState(true);
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(true);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [uncompletedTasks, setUncompletedTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const estimatedTimeOptions = ['15m', '30m', '1h', '2h', '4h', '1d'];
  const priorityOptions = ['low', 'medium', 'high', 'urgent'];
  const statusOptions = ['todo', 'in_progress', 'completed'];
  const typeOptions = ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'];

  const sortOptions = [
    { key: 'title', label: 'Task name', asc: 'A → Z', desc: 'Z → A' },
    { key: 'status', label: 'Status', asc: 'A → Z', desc: 'Z → A' },
    { key: 'category', label: 'Type', asc: 'A → Z', desc: 'Z → A' },
    { key: 'dueDate', label: 'Due date', asc: 'Oldest first', desc: 'Newest first' },
    { key: 'priority', label: 'Priority', asc: 'Low to high', desc: 'High to low' },
    { key: 'estimatedTime', label: 'Estimated time', asc: 'Shortest first', desc: 'Longest first' },
    { key: 'createdAt', label: 'Created date', asc: 'Oldest first', desc: 'Newest first' },
  ];

  // Get error message helper
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  };

  // Get detailed assignees
  const getDetailedAssignees = (task: Task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return {
        hasAssignees: false,
        assignees: [],
        currentUserIsAssigned: false,
        totalCount: 0
      };
    }

    const assignees = task.assignedTo
      .filter(assignment => assignment.userId)
      .map(assignment => {
        let userData;
        
        if (typeof assignment.userId === 'string') {
          userData = {
            _id: assignment.userId,
            name: 'Loading...',
            email: '',
            avatar: undefined
          };
          
          if (currentUser && assignment.userId === currentUser._id) {
            userData = {
              _id: currentUser._id,
              name: currentUser.name || 'You',
              email: currentUser.email,
              avatar: currentUser.avatar
            };
          }
        } else {
          userData = {
            _id: assignment.userId._id,
            name: assignment.userId.name || 'Unknown User',
            email: assignment.userId.email,
            avatar: assignment.userId.avatar
          };
        }

        return {
          ...userData,
          initial: (userData.name?.charAt(0) || 'U').toUpperCase()
        };
      });

    const currentUserIsAssigned = currentUser && 
      assignees.some(assignee => assignee._id === currentUser._id);

    return {
      hasAssignees: assignees.length > 0,
      assignees,
      currentUserIsAssigned,
      totalCount: assignees.length
    };
  };

  // Helper to check if task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    if (!task.dueDate) return false;
    if (task.status === 'completed') return false;

    try {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return dueDateOnly < todayOnly;
    } catch (error) {
      console.error('Error parsing due date:', error);
      return false;
    }
  };

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getAllTasks();
      const tasks = response?.tasks || [];

      const active: Task[] = [];
      const uncompleted: Task[] = [];
      const completed: Task[] = [];

      tasks.forEach((task: Task) => {
        if (!task || !task._id) return;

        if (task.status === 'completed') {
          completed.push(task);
        } else {
          if (isTaskOverdue(task)) {
            uncompleted.push(task);
          } else {
            active.push(task);
          }
        }
      });

      setActiveTasks(active);
      setUncompletedTasks(uncompleted);
      setCompletedTasks(completed);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching tasks:', errorMessage);
      
      if (errorMessage.includes('You must join or create a group')) {
        console.log('User needs to join/create a group');
        return;
      }

      Alert.alert('Error', 'Failed to fetch tasks: ' + errorMessage);
      setActiveTasks([]);
      setUncompletedTasks([]);
      setCompletedTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch kanban data
  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const response = await taskService.getKanbanView();
      setKanbanData(response);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching kanban data:', errorMessage);
      
      if (errorMessage.includes('You must join or create a group')) {
        return;
      }

      Alert.alert('Error', 'Failed to fetch kanban data: ' + errorMessage);
      setKanbanData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data based on view mode
  useEffect(() => {
    if (viewMode === 'list') {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  }, [viewMode]);

  const onRefresh = () => {
    setRefreshing(true);
    if (viewMode === 'list') {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  };

  // Sort tasks function
  const sortTasks = (tasks: Task[]) => {
    if (!sortConfig) return tasks;

    const sortedTasks = [...tasks].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Task];
      let bValue: any = b[sortConfig.key as keyof Task];

      switch (sortConfig.key) {
        case 'dueDate':
        case 'createdAt':
          aValue = aValue ? new Date(aValue).getTime() : Number.MAX_SAFE_INTEGER;
          bValue = bValue ? new Date(bValue).getTime() : Number.MAX_SAFE_INTEGER;
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, critical: 1, high: 2, medium: 3, low: 4 };
          aValue = priorityOrder[aValue as keyof typeof priorityOrder] ?? 5;
          bValue = priorityOrder[bValue as keyof typeof priorityOrder] ?? 5;
          break;
        case 'estimatedTime':
          aValue = convertTimeToMinutes(aValue || '');
          bValue = convertTimeToMinutes(bValue || '');
          break;
        default:
          aValue = aValue || '';
          bValue = bValue || '';
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedTasks;
  };

  const convertTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const hoursMatch = timeStr.match(/(\d+)h/);
    const minutesMatch = timeStr.match(/(\d+)m/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    return hours * 60 + minutes;
  };

  const handleSortSelect = (key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
    setShowSortDropdown(false);
  };

  const handleClearSort = () => {
    setSortConfig(null);
    setShowSortDropdown(false);
  };

  const getCurrentSortText = () => {
    if (!sortConfig) return 'Sort';
    const option = sortOptions.find((opt) => opt.key === sortConfig.key);
    if (!option) return 'Sort';
    const directionText = sortConfig.direction === 'asc' ? option.asc : option.desc;
    return `${option.label} • ${directionText}`;
  };

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
        assignedTo
      };

      await taskService.createTask(backendTaskData);
      setShowCreateModal(false);

      if (viewMode === 'list') {
        fetchTasks();
      } else {
        fetchKanbanData();
      }
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
    if (viewMode === 'list') {
      setActiveTasks(prev => prev.filter(task => task._id !== updatedTask._id));
      setUncompletedTasks(prev => prev.filter(task => task._id !== updatedTask._id));
      setCompletedTasks(prev => prev.filter(task => task._id !== updatedTask._id));

      if (updatedTask.status === 'completed') {
        setCompletedTasks(prev => [...prev, updatedTask]);
      } else if (isTaskOverdue(updatedTask)) {
        setUncompletedTasks(prev => [...prev, updatedTask]);
      } else {
        setActiveTasks(prev => [...prev, updatedTask]);
      }
    } else {
      fetchKanbanData();
    }
  };

  const handleTaskDelete = (taskId: string) => {
    if (viewMode === 'list') {
      setActiveTasks(prev => prev.filter(task => task._id !== taskId));
      setUncompletedTasks(prev => prev.filter(task => task._id !== taskId));
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

  const handleContextMenuAction = async (action: string, task: Task) => {
    setContextMenu(null);

    try {
      switch (action) {
        case 'complete':
          const completedTask = await taskService.updateTask(task._id, { status: 'completed' });
          handleTaskUpdate(completedTask);
          break;
        case 'delete':
          Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                  await taskService.deleteTask(task._id);
                  handleTaskDelete(task._id);
                }
              }
            ]
          );
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error in context menu action:', error);
      Alert.alert('Error', 'Failed to perform action: ' + getErrorMessage(error));
    }
  };

  // Helper functions
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
          <Ionicons name="grid" size={64} color={isDark ? '#4b5563' : '#d1d5db'} />
          <Text style={[styles.placeholderText, isDark && styles.darkText]}>
            No kanban data available
          </Text>
        </View>
      );
    }

    // Calculate incompleted tasks (overdue tasks)
    const allTasks = [
      ...(kanbanData.kanbanBoard.todo?.tasks || []),
      ...(kanbanData.kanbanBoard.in_progress?.tasks || []),
      ...(kanbanData.kanbanBoard.completed?.tasks || []),
    ];

    const incompletedTasks = allTasks.filter(task => 
      task && isTaskOverdue(task) && task.status !== 'completed'
    );

    const statusColumns = [
      { 
        key: 'todo', 
        title: 'To Do', 
        count: kanbanData.kanbanBoard.todo?.count || 0,
        color: '#f3f4f6',
        borderColor: '#e5e7eb',
        textColor: '#374151'
      },
      { 
        key: 'in_progress', 
        title: 'In Progress', 
        count: kanbanData.kanbanBoard.in_progress?.count || 0,
        color: '#dbeafe',
        borderColor: '#93c5fd',
        textColor: '#1e40af'
      },
      { 
        key: 'completed', 
        title: 'Completed', 
        count: kanbanData.kanbanBoard.completed?.count || 0,
        color: '#dcfce7',
        borderColor: '#86efac',
        textColor: '#166534'
      },
      { 
        key: 'incompleted', 
        title: 'Incompleted Tasks', 
        count: incompletedTasks.length,
        color: '#fef2f2',
        borderColor: '#fecaca',
        textColor: '#991b1b'
      },
    ];

    const getTasksForColumn = (columnKey: string) => {
      let tasks = [];
      if (columnKey === 'incompleted') {
        tasks = incompletedTasks;
      } else {
        tasks = kanbanData.kanbanBoard[columnKey]?.tasks || [];
      }
      
      // Apply sorting to Kanban tasks
      return sortTasks(tasks);
    };

    return (
      <View style={styles.kanbanContainer}>
        {/* Sort Indicator */}
        {sortConfig && (
          <View style={styles.kanbanSortIndicator}>
            <Text style={[styles.kanbanSortText, isDark && styles.darkText]}>
              Sorted by {sortOptions.find(opt => opt.key === sortConfig.key)?.label} {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </Text>
          </View>
        )}

        {/* Kanban Columns */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kanbanColumnsContainer}
        >
          {statusColumns.map((column) => {
            const columnTasks = getTasksForColumn(column.key);
            
            return (
              <View
                key={column.key}
                style={[
                  styles.kanbanColumn,
                  { backgroundColor: isDark ? '#2d3748' : column.color },
                  { borderColor: isDark ? '#4a5568' : column.borderColor }
                ]}
              >
                {/* Column Header */}
                <View style={[styles.kanbanColumnHeader, isDark && styles.darkKanbanHeader]}>
                  <View style={styles.kanbanColumnHeaderLeft}>
                    <View style={[styles.kanbanColumnDot, { backgroundColor: column.borderColor }]} />
                    <Text style={[styles.kanbanColumnTitle, { color: isDark ? '#e5e7eb' : column.textColor }]}>
                      {column.title}
                    </Text>
                    <View style={[styles.kanbanColumnCount, { backgroundColor: isDark ? '#4a5568' : 'rgba(255,255,255,0.8)' }]}>
                      <Text style={[styles.kanbanColumnCountText, { color: isDark ? '#e5e7eb' : column.textColor }]}>
                        {column.count}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Task List */}
                <ScrollView 
                  style={styles.kanbanTaskList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {columnTasks.map((task: Task) => {
                    const assigneeInfo = getDetailedAssignees(task);
                    const isOverdue = isTaskOverdue(task);

                    return (
                      <TouchableOpacity
                        key={task._id}
                        style={[
                          styles.kanbanTaskCard,
                          isOverdue && styles.kanbanTaskCardOverdue,
                          column.key === 'completed' && styles.kanbanTaskCardCompleted,
                          isDark && styles.darkKanbanTaskCard
                        ]}
                        onPress={() => handleTaskClick(task._id)}
                        onLongPress={(event) => {
                          const { pageX, pageY } = event.nativeEvent;
                          handleContextMenu(task, pageX, pageY);
                        }}
                      >
                        {/* Task Header */}
                        <View style={styles.kanbanTaskHeader}>
                          <Text 
                            style={[styles.kanbanTaskTitle, isDark && styles.darkText]}
                            numberOfLines={2}
                          >
                            {task.title || 'Untitled Task'}
                          </Text>
                          {task.priority && task.priority !== 'medium' && (
                            <View style={[styles.kanbanPriorityBadge, getPriorityColor(task.priority)]}>
                              <Text style={styles.kanbanPriorityText}>
                                {task.priority}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Description */}
                        {task.description && (
                          <Text 
                            style={[styles.kanbanTaskDescription, isDark && styles.darkSubtitle]}
                            numberOfLines={2}
                          >
                            {task.description}
                          </Text>
                        )}

                        {/* Tags and Category */}
                        <View style={styles.kanbanTaskTags}>
                          {task.category && task.category !== 'Other' && (
                            <View style={[styles.kanbanTag, getTypeColor(task.category)]}>
                              <Text style={styles.kanbanTagText}>
                                {task.category}
                              </Text>
                            </View>
                          )}
                          {task.tags?.slice(0, 2).map((tag, index) => (
                            <View key={index} style={styles.kanbanTag}>
                              <Text style={styles.kanbanTagText}>{tag}</Text>
                            </View>
                          ))}
                          {task.tags && task.tags.length > 2 && (
                            <View style={styles.kanbanTag}>
                              <Text style={styles.kanbanTagText}>+{task.tags.length - 2}</Text>
                            </View>
                          )}
                        </View>

                        {/* Task Footer */}
                        <View style={styles.kanbanTaskFooter}>
                          <View style={styles.kanbanTaskFooterLeft}>
                            {/* Assignee Avatars */}
                            <View style={styles.kanbanAvatars}>
                              {assigneeInfo.assignees.slice(0, 2).map((assignee) => (
                                <View
                                  key={assignee._id}
                                  style={[
                                    styles.kanbanAvatar,
                                    assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id
                                      ? styles.kanbanAvatarCurrentUser
                                      : styles.kanbanAvatarOther
                                  ]}
                                >
                                  {assignee.avatar ? (
                                    <Image source={{ uri: assignee.avatar }} style={styles.kanbanAvatarImage} />
                                  ) : (
                                    <Text style={styles.kanbanAvatarText}>{assignee.initial}</Text>
                                  )}
                                </View>
                              ))}
                              {assigneeInfo.totalCount > 2 && (
                                <View style={styles.kanbanAvatarMore}>
                                  <Text style={styles.kanbanAvatarMoreText}>+{assigneeInfo.totalCount - 2}</Text>
                                </View>
                              )}
                            </View>

                            {/* Time Estimate */}
                            {task.estimatedTime && (
                              <View style={styles.kanbanTimeEstimate}>
                                <Ionicons name="time-outline" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                                <Text style={[styles.kanbanTimeText, isDark && styles.darkSubtitle]}>
                                  {task.estimatedTime}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Due Date */}
                          {task.dueDate && (
                            <View style={[
                              styles.kanbanDueDate,
                              isOverdue && styles.kanbanDueDateOverdue
                            ]}>
                              <Ionicons 
                                name="calendar-outline" 
                                size={12} 
                                color={isOverdue ? '#dc2626' : (isDark ? '#9ca3af' : '#6b7280')} 
                              />
                              <Text style={[
                                styles.kanbanDueDateText,
                                isOverdue && styles.kanbanDueDateTextOverdue,
                                isDark && styles.darkSubtitle
                              ]}>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Empty State */}
                  {columnTasks.length === 0 && (
                    <View style={styles.kanbanEmptyState}>
                      <Ionicons 
                        name={column.key === 'incompleted' ? 'alert-circle' : column.key === 'completed' ? 'checkmark-done-circle' : 'add-circle-outline'} 
                        size={48} 
                        color={isDark ? '#4b5563' : '#d1d5db'} 
                      />
                      <Text style={[styles.kanbanEmptyText, isDark && styles.darkSubtitle]}>
                        {column.key === 'incompleted' 
                          ? 'No overdue tasks' 
                          : column.key === 'completed'
                          ? 'No completed tasks'
                          : 'No tasks'
                        }
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Task Row Component
  const TaskRow = ({ task, isOverdue = false, isCompleted = false }: { 
    task: Task; 
    isOverdue?: boolean; 
    isCompleted?: boolean;
  }) => {
    const assigneeInfo = getDetailedAssignees(task);

    return (
      <TouchableOpacity
        style={[
          styles.taskRow,
          isCompleted && styles.completedTask,
          isOverdue && styles.overdueTask,
        ]}
        onPress={() => handleTaskClick(task._id)}
        onLongPress={(event) => {
          const { pageX, pageY } = event.nativeEvent;
          handleContextMenu(task, pageX, pageY);
        }}
      >
        <View style={styles.taskContent}>
          {/* Task Header */}
          <View style={styles.taskHeader}>
            <View style={[styles.priorityDot, getPriorityColor(task.priority || 'medium')]} />
            <Text 
              style={[
                styles.taskTitle,
                isCompleted && styles.completedText,
                isOverdue && styles.overdueText,
              ]}
              numberOfLines={2}
            >
              {task.title || 'Untitled Task'}
            </Text>
          </View>

          {/* Task Details */}
          <View style={styles.taskDetails}>
            <View style={styles.detailRow}>
              <View style={[styles.statusBadge, getStatusColor(task.status || 'todo')]}>
                <Text style={styles.statusText}>
                  {getStatusDisplay(task.status || 'todo')}
                </Text>
              </View>

              <View style={[styles.typeBadge, getTypeColor(task.category || '')]}>
                <Text style={styles.typeText}>
                  {task.category || 'No type'}
                </Text>
              </View>
            </View>

            {/* Due Date and Priority */}
            <View style={styles.detailRow}>
              {task.dueDate && (
                <View style={styles.dueDate}>
                  <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                  <Text style={[styles.dueDateText, isOverdue && styles.overdueText]}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={[styles.priorityBadge, getPriorityColor(task.priority || 'medium')]}>
                <Text style={styles.priorityText}>
                  {task.priority || 'medium'}
                </Text>
              </View>
            </View>

            {/* Assignees and Time Estimate */}
            <View style={styles.detailRow}>
              <View style={styles.assignees}>
                <Ionicons name="people-outline" size={14} color="#6b7280" />
                {assigneeInfo.hasAssignees ? (
                  <View style={styles.avatarStack}>
                    {assigneeInfo.assignees.slice(0, 3).map((assignee, index) => (
                      <View
                        key={assignee._id}
                        style={[
                          styles.avatar,
                          assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id
                            ? styles.currentUserAvatar
                            : styles.otherUserAvatar,
                        ]}
                      >
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

              {task.estimatedTime && (
                <View style={styles.timeEstimate}>
                  <Ionicons name="time-outline" size={14} color="#6b7280" />
                  <Text style={styles.timeText}>{task.estimatedTime}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            {task.description && (
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}
          </View>
        </View>

        {/* Context Menu Button */}
        <TouchableOpacity
          style={styles.contextMenuButton}
          onPress={(event) => {
            const { pageX, pageY } = event.nativeEvent;
            handleContextMenu(task, pageX, pageY);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#9ca3af" />
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
    icon: string;
    color: string;
  }) => (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
      <View style={styles.sectionHeaderContent}>
        {expanded ? (
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        )}
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: color }]}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Sort Dropdown Component
  const SortDropdown = () => (
    <View style={styles.sortContainer}>
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortDropdown(!showSortDropdown)}
      >
        <Ionicons name="filter" size={16} color="#374151" />
        <Text style={styles.sortButtonText}>{getCurrentSortText()}</Text>
        <Ionicons 
          name={showSortDropdown ? "chevron-up" : "chevron-down"} 
          size={16} 
          color="#374151" 
        />
      </TouchableOpacity>

      {showSortDropdown && (
        <View style={styles.sortDropdown}>
          <ScrollView style={styles.sortOptions}>
            {sortOptions.map((option) => (
              <View key={option.key} style={styles.sortOptionGroup}>
                <Text style={styles.sortOptionLabel}>{option.label}</Text>
                <TouchableOpacity
                  style={styles.sortOption}
                  onPress={() => handleSortSelect(option.key, 'asc')}
                >
                  <Text style={styles.sortOptionText}>{option.asc}</Text>
                  {sortConfig?.key === option.key && sortConfig.direction === 'asc' && (
                    <Ionicons name="checkmark" size={16} color="#3b82f6" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sortOption}
                  onPress={() => handleSortSelect(option.key, 'desc')}
                >
                  <Text style={styles.sortOptionText}>{option.desc}</Text>
                  {sortConfig?.key === option.key && sortConfig.direction === 'desc' && (
                    <Ionicons name="checkmark" size={16} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          
          {sortConfig && (
            <TouchableOpacity style={styles.clearSortButton} onPress={handleClearSort}>
              <Text style={styles.clearSortText}>Clear Sort</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // Check if user has a current group
  if (!currentGroup) {
    return (
      <NoGroupState 
        title="Join or Create a Group to Manage Tasks"
        description="You need to join or create a group to manage tasks and collaborate with your team."
      />
    );
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
      
      {/* Header */}
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <View>
          <Text style={[styles.title, isDark && styles.darkText]}>Tasks</Text>
          <Text style={[styles.subtitle, isDark && styles.darkSubtitle]}>
            Manage your team's tasks and projects
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle and Sort */}
      <View style={styles.controls}>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'list' && styles.activeViewMode,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons 
              name="list" 
              size={16} 
              color={viewMode === 'list' ? '#ffffff' : '#374151'} 
            />
            <Text style={[
              styles.viewModeText,
              viewMode === 'list' && styles.activeViewModeText,
            ]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'kanban' && styles.activeViewMode,
            ]}
            onPress={() => setViewMode('kanban')}
          >
            <Ionicons 
              name="grid" 
              size={16} 
              color={viewMode === 'kanban' ? '#ffffff' : '#374151'} 
            />
            <Text style={[
              styles.viewModeText,
              viewMode === 'kanban' && styles.activeViewModeText,
            ]}>
              Kanban
            </Text>
          </TouchableOpacity>
        </View>

        <SortDropdown />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isDark && styles.darkSearchContainer]}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isDark && styles.darkText]}
          placeholder="Search tasks..."
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tasks List */}
      {viewMode === 'list' ? (
        <ScrollView
          style={styles.tasksList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.sectionsContainer}>
            {/* Active Tasks Section */}
            <View style={[styles.section, isDark && styles.darkSection]}>
              <SectionHeader
                title="Active Tasks"
                count={activeTasks.length}
                expanded={activeTasksExpanded}
                onToggle={() => setActiveTasksExpanded(!activeTasksExpanded)}
                icon="play-circle"
                color="#3b82f6"
              />
              {activeTasksExpanded && (
                <View style={styles.tasksContainer}>
                  {sortTasks(activeTasks).length > 0 ? (
                    sortTasks(activeTasks).map((task) => (
                      <TaskRow key={task._id} task={task} />
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="play-circle" size={48} color="#d1d5db" />
                      <Text style={[styles.emptyText, isDark && styles.darkText]}>
                        No active tasks yet
                      </Text>
                      <TouchableOpacity style={styles.emptyButton} onPress={handleAddTask}>
                        <Text style={styles.emptyButtonText}>Create your first task</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Uncompleted Tasks Section */}
            <View style={[styles.section, isDark && styles.darkSection]}>
              <SectionHeader
                title="Incompleted Tasks"
                count={uncompletedTasks.length}
                expanded={uncompletedTasksExpanded}
                onToggle={() => setUncompletedTasksExpanded(!uncompletedTasksExpanded)}
                icon="alert-circle"
                color="#dc2626"
              />
              {uncompletedTasksExpanded && (
                <View style={styles.tasksContainer}>
                  {sortTasks(uncompletedTasks).length > 0 ? (
                    sortTasks(uncompletedTasks).map((task) => (
                      <TaskRow key={task._id} task={task} isOverdue={true} />
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="alert-circle" size={48} color="#d1d5db" />
                      <Text style={[styles.emptyText, isDark && styles.darkText]}>
                        No overdue tasks
                      </Text>
                      <Text style={[styles.emptySubtext, isDark && styles.darkSubtitle]}>
                        Tasks that pass their due date will appear here
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Completed Tasks Section */}
            <View style={[styles.section, isDark && styles.darkSection]}>
              <SectionHeader
                title="Completed Tasks"
                count={completedTasks.length}
                expanded={completedTasksExpanded}
                onToggle={() => setCompletedTasksExpanded(!completedTasksExpanded)}
                icon="checkmark-done-circle"
                color="#10b981"
              />
              {completedTasksExpanded && (
                <View style={styles.tasksContainer}>
                  {sortTasks(completedTasks).length > 0 ? (
                    sortTasks(completedTasks).map((task) => (
                      <TaskRow key={task._id} task={task} isCompleted={true} />
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Ionicons name="checkmark-done-circle" size={48} color="#d1d5db" />
                      <Text style={[styles.emptyText, isDark && styles.darkText]}>
                        No completed tasks yet
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      ) : (
        // Kanban View
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

      {/* Context Menu */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  darkContainer: {
    backgroundColor: '#1a202c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkHeader: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  darkText: {
    color: '#f7fafc',
  },
  darkSubtitle: {
    color: '#a0aec0',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkControls: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#374151',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeViewMode: {
    backgroundColor: '#3b82f6',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  activeViewModeText: {
    color: '#ffffff',
  },
  sortContainer: {
    position: 'relative',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#374151',
    marginHorizontal: 8,
    flex: 1,
  },
  sortDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
    maxHeight: 300,
    zIndex: 1000,
  },
  sortOptions: {
    maxHeight: 250,
  },
  sortOptionGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sortOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  clearSortButton: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 12,
  },
  clearSortText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  darkSearchContainer: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#374151',
  },
  tasksList: {
    flex: 1,
  },
  kanbanWrapper: {
    flex: 1,
  },
  sectionsContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  darkSection: {
    backgroundColor: '#2d3748',
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  tasksContainer: {
    padding: 8,
  },
  taskRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  completedTask: {
    backgroundColor: '#f9fafb',
    opacity: 0.8,
  },
  overdueTask: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
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
    flex: 1,
  },
  completedText: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  overdueText: {
    color: '#dc2626',
  },
  taskDetails: {
    marginLeft: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  todoStatus: { backgroundColor: '#f3f4f6' },
  inProgressStatus: { backgroundColor: '#dbeafe' },
  completedStatus: { backgroundColor: '#dcfce7' },
  defaultStatus: { backgroundColor: '#f3f4f6' },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  financialType: { backgroundColor: '#fef3c7' },
  strategicType: { backgroundColor: '#dcfce7' },
  operationalType: { backgroundColor: '#dbeafe' },
  defaultType: { backgroundColor: '#f3f4f6' },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  dueDateText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  assignees: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  currentUserAvatar: {
    backgroundColor: '#10b981',
  },
  otherUserAvatar: {
    backgroundColor: '#3b82f6',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
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
    borderColor: '#ffffff',
  },
  moreAvatarsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  unassignedText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  contextMenuButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  kanbanPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  // Kanban View Styles
  kanbanContainer: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  kanbanSortIndicator: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 12,
  },
  kanbanSortText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
  },
  kanbanColumnsContainer: {
    paddingBottom: 16,
  },
  kanbanColumn: {
    width: SCREEN_WIDTH * 0.85,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    maxHeight: '100%',
  },
  kanbanColumnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  darkKanbanHeader: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  kanbanColumnHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  kanbanColumnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  kanbanColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    flex: 1,
  },
  kanbanColumnCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kanbanColumnCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kanbanTaskList: {
    flex: 1,
  },
  kanbanTaskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
  },
  darkKanbanTaskCard: {
    backgroundColor: '#1f1f1f',
    borderColor: '#374151',
  },
  kanbanTaskCardOverdue: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  kanbanTaskCardCompleted: {
    opacity: 0.8,
  },
  kanbanTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  kanbanTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  kanbanPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  kanbanPriorityText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#ffffff',
  },
  kanbanTaskDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  kanbanTaskTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  kanbanTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kanbanTagText: {
    fontSize: 10,
    color: '#374151',
  },
  kanbanTaskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  kanbanTaskFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  kanbanAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  kanbanAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginLeft: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kanbanAvatarCurrentUser: {
    backgroundColor: '#10b981',
  },
  kanbanAvatarOther: {
    backgroundColor: '#3b82f6',
  },
  kanbanAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  kanbanAvatarText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  kanbanAvatarMore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6b7280',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginLeft: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kanbanAvatarMoreText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  kanbanTimeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  kanbanTimeText: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 4,
  },
  kanbanDueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  kanbanDueDateOverdue: {
    backgroundColor: '#fef2f2',
  },
  kanbanDueDateText: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  kanbanDueDateTextOverdue: {
    color: '#dc2626',
  },
  kanbanEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  kanbanEmptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
});