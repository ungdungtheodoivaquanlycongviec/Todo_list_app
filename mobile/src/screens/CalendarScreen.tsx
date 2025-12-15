import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  RefreshControl,
  Animated,
  PanResponder
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { taskService } from '../services/task.service';
import { Task } from '../types/task.types';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import NoGroupState from '../components/common/NoGroupState';
import { useTheme } from '../context/ThemeContext';
import { useGroupChange } from '../hooks/useGroupChange';

// Sử dụng @expo/vector-icons như các component khác
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CalendarScreen({ navigation }: any) {
  const { user: currentUser, currentGroup } = useAuth();
  const { isDark, theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignedTasksSearch, setAssignedTasksSearch] = useState('');
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [assignedTasksLoading, setAssignedTasksLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarAnim] = useState(new Animated.Value(0));
  

  // Swipe gestures
  const [swipeAnim] = useState(new Animated.Value(0));

  // Filter assigned tasks based on search
  const filteredAssignedTasks = assignedTasks.filter(task =>
    task.title.toLowerCase().includes(assignedTasksSearch.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(assignedTasksSearch.toLowerCase())) ||
    (task.category && task.category.toLowerCase().includes(assignedTasksSearch.toLowerCase()))
  );

  // PanResponder for swipe gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        swipeAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 50) {
          if (gestureState.dx > 0) {
            // Swipe right - previous period
            navigatePeriod('prev');
          } else {
            // Swipe left - next period
            navigatePeriod('next');
          }
        }
        Animated.spring(swipeAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Helper để lấy error message
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'An unknown error occurred';
  };

  // Fetch calendar data từ API
  const fetchCalendarData = async (year: number, month: number) => {
    try {
      setLoading(true);
      const response = await taskService.getCalendarView(year, month);
      setCalendarData(response);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching calendar data:', errorMessage);
      
      if (errorMessage.includes("You must join or create a group")) {
        return;
      }
      
      setCalendarData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assigned tasks
  const fetchAssignedTasks = async () => {
    if (!currentUser) return;
  
    try {
      setAssignedTasksLoading(true);
      const response = await taskService.getAllTasks({}, {});
      
      const tasksAssignedToUser = response.tasks.filter((task: Task) =>
        task.assignedTo.some((assignee: any) => 
          assignee.userId?._id === currentUser._id || assignee.userId === currentUser._id
        )
      );
      
      setAssignedTasks(tasksAssignedToUser);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching assigned tasks:', errorMessage);
      
      if (errorMessage.includes("You must join or create a group")) {
        return;
      }
      
      setAssignedTasks([]);
    } finally {
      setAssignedTasksLoading(false);
    }
  };

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    await Promise.all([
      fetchCalendarData(year, month),
      fetchAssignedTasks()
    ]);
    setRefreshing(false);
  };

  // Gọi API khi currentDate thay đổi
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchCalendarData(year, month);
    fetchAssignedTasks();
  }, [currentDate, currentUser]);

  // Listen for global group change events
  useGroupChange(() => {
    console.log('Group change detected, reloading CalendarView');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchCalendarData(year, month);
    fetchAssignedTasks();
  });

  // Hàm chuyển tháng/tuần
  const navigatePeriod = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        if (direction === 'prev') {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
      } else {
        if (direction === 'prev') {
          newDate.setDate(prev.getDate() - 7);
        } else {
          newDate.setDate(prev.getDate() + 7);
        }
      }
      return newDate;
    });
  };

  // Hàm về ngày hiện tại
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    if (showSidebar) {
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSidebar(false));
    } else {
      setShowSidebar(true);
      Animated.timing(sidebarAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Lấy thông tin tháng và năm
  const getMonthYearString = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Lấy thông tin tuần
  const getWeekRangeString = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Lấy các ngày trong tháng để hiển thị
  const getDisplayDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDay = firstDayOfMonth.getDay();
    
    const displayDays = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
      const prevMonthDate = new Date(year, month, -i);
      displayDays.push({
        date: prevMonthDate.getDate(),
        day: prevMonthDate.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: prevMonthDate,
        dateString: prevMonthDate.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }
    
    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      displayDays.push({
        date: i,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: date,
        dateString: date.toISOString().split('T')[0],
        isCurrentMonth: true
      });
    }
    
    return displayDays;
  };

  // Lấy các ngày trong tuần để hiển thị
  const getDisplayWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push({
        date: date.getDate(),
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        fullDate: date,
        dateString: date.toISOString().split('T')[0],
        isCurrentMonth: date.getMonth() === currentDate.getMonth()
      });
    }
    return weekDays;
  };

  // Lấy tasks cho một ngày cụ thể
  const getTasksForDate = (dateString: string) => {
    if (!calendarData?.tasksByDate) return [];
    return calendarData.tasksByDate[dateString] || [];
  };

  // Helper để xác định trạng thái task
  const getTaskStatus = (task: Task) => {
    if (task.status === 'completed') return 'completed';
    
    const today = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    if (dueDate) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (dueDate < yesterday) {
        return 'overdue';
      } else if (dueDate.toDateString() === today.toDateString()) {
        return 'due-today';
      }
    }
    
    return 'upcoming';
  };

  // Helper để lấy màu sắc cho priority
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': 
        return '#ef4444';
      case 'high': 
        return '#f97316';
      case 'medium': 
        return '#eab308';
      case 'low': 
        return '#3b82f6';
      default: 
        return '#6b7280';
    }
  };

  // Helper để lấy màu nền cho priority
  const getPriorityBackgroundColor = (priority: string) => {
    switch(priority) {
      case 'urgent': 
        return isDark ? '#7f1d1d' : '#fef2f2';
      case 'high': 
        return isDark ? '#7c2d12' : '#fff7ed';
      case 'medium': 
        return isDark ? '#713f12' : '#fefce8';
      case 'low': 
        return isDark ? '#1e3a8a' : '#eff6ff';
      default: 
        return isDark ? '#374151' : '#f9fafb';
    }
  };

  // Helper để lấy icon trạng thái
  const getStatusIcon = (status: string) => {
    const iconColor = isDark ? '#e5e7eb' : '#374151';
    switch(status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={14} color="#10b981" />;
      case 'overdue':
        return <Ionicons name="warning" size={14} color="#ef4444" />;
      case 'due-today':
        return <Ionicons name="time" size={14} color="#f97316" />;
      default:
        return <Ionicons name="ellipse-outline" size={14} color={iconColor} />;
    }
  };

  // Thay đổi hàm handleAddEvent để mở modal
  const handleAddTask = () => {
    setShowCreateModal(true);
  };

  // Hàm xử lý tạo task mới
  const handleCreateTask = async (taskData: any) => {
    try {
      const assignedTo = currentUser ? [{ userId: currentUser._id }] : [];

      const backendTaskData = {
        title: taskData.title || "Untitled Task",
        description: taskData.description || "",
        category: taskData.category || "general",
        status: "todo",
        priority: mapPriorityToBackend(taskData.priority),
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        tags: taskData.tags || [],
        assignedTo: assignedTo,
        estimatedTime: taskData.estimatedTime || "",
      };

      await taskService.createTask(backendTaskData);
      setShowCreateModal(false);

      // Refresh calendar data và assigned tasks
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      await fetchCalendarData(year, month);
      await fetchAssignedTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      Alert.alert("Error", "Failed to create task: " + getErrorMessage(error));
    }
  };

  // Helper function để map priority
  const mapPriorityToBackend = (frontendPriority: string): string => {
    const priorityMap: { [key: string]: string } = {
      None: "low",
      Low: "low",
      Medium: "medium",
      High: "high",
      Urgent: "urgent",
    };
    return priorityMap[frontendPriority] || "medium";
  };

  const handleEventClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskDetail(true);
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    setAssignedTasks(prev => 
      prev.map(task => task._id === updatedTask._id ? updatedTask : task)
    );
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    await fetchCalendarData(year, month);
  };

  const handleTaskDelete = async (taskId: string) => {
    setAssignedTasks(prev => prev.filter(task => task._id !== taskId));
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    await fetchCalendarData(year, month);
    
    setShowTaskDetail(false);
    setSelectedTaskId(null);
  };

  const handleDayClick = (day: any) => {
    setSelectedDate(day.fullDate);
  };

  const displayDays = viewMode === 'month' ? getDisplayDays() : getDisplayWeekDays();

  // Sidebar animation
  const sidebarTranslateX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  // Swipe animation
  const swipeTranslateX = swipeAnim;

  // Check if user has a current group
  if (!currentGroup) {
    return (
      <NoGroupState 
        title="Join or Create a Group to View Calendar"
        description="You need to join or create a group to view your calendar and manage scheduled tasks."
      />
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Main Header */}
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={toggleSidebar}
          >
            <Ionicons name="menu" size={20} color={isDark ? '#e5e7eb' : '#374151'} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, isDark && styles.darkText]}>Calendar</Text>
            <Text style={[styles.subtitle, isDark && styles.darkSubtitle]}>Manage your schedule</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddTask}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <View style={[styles.viewModeToggle, isDark && styles.darkViewModeToggle]}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'month' && styles.activeViewModeButton,
            ]}
            onPress={() => setViewMode('month')}
          >
            <Ionicons name="calendar" size={16} color={viewMode === 'month' ? '#ffffff' : (isDark ? '#e5e7eb' : '#374151')} />
            <Text style={[
              styles.viewModeText,
              viewMode === 'month' && styles.activeViewModeText,
            ]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'week' && styles.activeViewModeButton,
            ]}
            onPress={() => setViewMode('week')}
          >
            <Ionicons name="calendar-outline" size={16} color={viewMode === 'week' ? '#ffffff' : (isDark ? '#e5e7eb' : '#374151')} />
            <Text style={[
              styles.viewModeText,
              viewMode === 'week' && styles.activeViewModeText,
            ]}>
              Week
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View 
        style={[
          styles.content,
          { transform: [{ translateX: swipeTranslateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#3b82f6']}
              tintColor={isDark ? '#3b82f6' : '#3b82f6'}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar Section */}
          <View style={styles.calendarSection}>
            <View style={[styles.calendarContainer, isDark && styles.darkCard]}>
              {/* Calendar Header */}
              <View style={[styles.calendarHeader, isDark && styles.darkBorder]}>
                <View style={styles.calendarNavigation}>
                  <TouchableOpacity 
                    style={[styles.navButton, isDark && styles.darkNavButton]}
                    onPress={() => navigatePeriod('prev')}
                  >
                    <Ionicons name="chevron-back" size={20} color={isDark ? '#e5e7eb' : '#374151'} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.calendarTitle, isDark && styles.darkText]}>
                    {viewMode === 'month' 
                      ? getMonthYearString(currentDate)
                      : getWeekRangeString(currentDate)
                    }
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.navButton, isDark && styles.darkNavButton]}
                    onPress={() => navigatePeriod('next')}
                  >
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#e5e7eb' : '#374151'} />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={[styles.todayButton, isDark && styles.darkTodayButton]}
                  onPress={goToToday}
                >
                  <Text style={[styles.todayButtonText, isDark && styles.darkText]}>Today</Text>
                </TouchableOpacity>
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {viewMode === 'month' ? (
                  /* Month View - Mobile Optimized */
                  <View style={styles.monthView}>
                    {/* Day headers */}
                    <View style={styles.weekDaysHeader}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <Text key={day} style={[styles.weekDayText, isDark && styles.darkSubtitle]}>
                          {day}
                        </Text>
                      ))}
                    </View>
                    
                    {/* Calendar days */}
                    <View style={styles.monthGrid}>
                      {displayDays.map((dayInfo) => {
                        const dayTasks = getTasksForDate(dayInfo.dateString);
                        const isToday = new Date().toDateString() === dayInfo.fullDate.toDateString();
                        const isSelected = selectedDate && selectedDate.toDateString() === dayInfo.fullDate.toDateString();
                        const isWeekend = dayInfo.fullDate.getDay() === 0 || dayInfo.fullDate.getDay() === 6;
                        
                        return (
                          <TouchableOpacity
                            key={`${dayInfo.date}-${dayInfo.isCurrentMonth}`}
                            style={[
                              styles.dayCell,
                              isToday && styles.todayCell,
                              isSelected && styles.selectedCell,
                              !dayInfo.isCurrentMonth && styles.otherMonthCell,
                              isDark && styles.darkDayCell
                            ]}
                            onPress={() => handleDayClick(dayInfo)}
                          >
                            <View style={styles.dayHeader}>
                              <Text style={[
                                styles.dayNumber,
                                !dayInfo.isCurrentMonth && styles.otherMonthText,
                                isToday && styles.todayText,
                                isWeekend && styles.weekendText,
                                isDark && styles.darkText
                              ]}>
                                {dayInfo.date}
                              </Text>
                              {isToday && (
                                <View style={styles.todayIndicator} />
                              )}
                            </View>
                            
                            {/* Task indicators */}
                            <View style={styles.taskIndicators}>
                              {dayTasks.slice(0, 3).map((task: Task) => {
                                const priorityColor = getPriorityColor(task.priority || 'medium');
                                return (
                                  <View
                                    key={task._id}
                                    style={[styles.taskDot, { backgroundColor: priorityColor }]}
                                  />
                                );
                              })}
                              {dayTasks.length > 3 && (
                                <Text style={[styles.moreTasksText, isDark && styles.darkSubtitle]}>
                                  +{dayTasks.length - 3}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  /* Week View - Mobile Optimized */
                  <View style={styles.weekView}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.weekDaysContainer}>
                        {getDisplayWeekDays().map(dayInfo => {
                          const dayTasks = getTasksForDate(dayInfo.dateString);
                          const isToday = new Date().toDateString() === dayInfo.fullDate.toDateString();
                          
                          return (
                            <View key={dayInfo.dateString} style={styles.weekDayColumn}>
                              <TouchableOpacity
                                style={[
                                  styles.weekDayHeader,
                                  isToday && styles.todayWeekHeader,
                                  isDark && styles.darkWeekHeader
                                ]}
                                onPress={() => handleDayClick(dayInfo)}
                              >
                                <Text style={[
                                  styles.weekDayName,
                                  isToday && styles.todayWeekText,
                                  isDark && styles.darkText
                                ]}>
                                  {dayInfo.day.substring(0, 3)}
                                </Text>
                                <Text style={[
                                  styles.weekDayNumber,
                                  isToday && styles.todayWeekText,
                                  isDark && styles.darkText
                                ]}>
                                  {dayInfo.date}
                                </Text>
                              </TouchableOpacity>

                              <View style={styles.weekDayTasks}>
                                {dayTasks.map((task: Task) => {
                                  const status = getTaskStatus(task);
                                  const priorityColor = getPriorityColor(task.priority || 'medium');
                                  
                                  return (
                                    <TouchableOpacity
                                      key={task._id}
                                      style={[
                                        styles.weekTaskItem,
                                        { borderLeftColor: priorityColor },
                                        { backgroundColor: getPriorityBackgroundColor(task.priority || 'medium') }
                                      ]}
                                      onPress={() => handleEventClick(task._id)}
                                    >
                                      <Text style={[styles.weekTaskTitle, isDark && styles.darkText]} numberOfLines={2}>
                                        {task.title}
                                      </Text>
                                      <View style={styles.weekTaskMeta}>
                                        {getStatusIcon(status)}
                                        {task.estimatedTime && (
                                          <Text style={[styles.weekTaskTime, isDark && styles.darkSubtitle]}>
                                            {task.estimatedTime}
                                          </Text>
                                        )}
                                      </View>
                                    </TouchableOpacity>
                                  );
                                })}
                                
                                {dayTasks.length === 0 && (
                                  <TouchableOpacity
                                    style={[styles.emptyDaySlot, isDark && styles.darkEmptySlot]}
                                    onPress={() => {
                                      setSelectedDate(dayInfo.fullDate);
                                      handleAddTask();
                                    }}
                                  >
                                    <Ionicons name="add" size={16} color={isDark ? '#6b7280' : '#9ca3af'} />
                                    <Text style={[styles.emptyDayText, isDark && styles.darkSubtitle]}>Add task</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Selected Date Tasks */}
              {selectedDate && (
                <View style={[styles.selectedDateSection, isDark && styles.darkBorder]}>
                  <View style={styles.selectedDateHeader}>
                    <Text style={[styles.selectedDateTitle, isDark && styles.darkText]}>
                      Tasks for {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <View style={styles.selectedDateCount}>
                      <Text style={styles.selectedDateCountText}>
                        {getTasksForDate(selectedDate.toISOString().split('T')[0]).length}
                      </Text>
                    </View>
                  </View>

                  <ScrollView style={styles.selectedDateTasks} showsVerticalScrollIndicator={false}>
                    {getTasksForDate(selectedDate.toISOString().split('T')[0]).map((task: Task) => {
                      const status = getTaskStatus(task);
                      const priorityColor = getPriorityColor(task.priority || 'medium');
                      
                      return (
                        <TouchableOpacity
                          key={task._id}
                          style={[
                            styles.selectedDateTaskItem,
                            { borderLeftColor: priorityColor },
                            { backgroundColor: getPriorityBackgroundColor(task.priority || 'medium') }
                          ]}
                          onPress={() => handleEventClick(task._id)}
                        >
                          <View style={styles.selectedDateTaskContent}>
                            <Text style={[styles.selectedDateTaskTitle, isDark && styles.darkText]}>
                              {task.title}
                            </Text>
                            <View style={styles.selectedDateTaskMeta}>
                              <View style={styles.selectedDateTaskStatus}>
                                {getStatusIcon(status)}
                                <Text style={[styles.selectedDateTaskStatusText, isDark && styles.darkSubtitle]}>
                                  {status.replace('-', ' ')}
                                </Text>
                              </View>
                              {task.estimatedTime && (
                                <Text style={[styles.selectedDateTaskTime, isDark && styles.darkSubtitle]}>
                                  {task.estimatedTime}
                                </Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    
                    {getTasksForDate(selectedDate.toISOString().split('T')[0]).length === 0 && (
                      <View style={styles.noTasksForDate}>
                        <Ionicons name="calendar" size={32} color={isDark ? '#4b5563' : '#9ca3af'} />
                        <Text style={[styles.noTasksForDateText, isDark && styles.darkSubtitle]}>
                          No tasks scheduled
                        </Text>
                        <TouchableOpacity onPress={handleAddTask}>
                          <Text style={styles.noTasksForDateAction}>Add a task</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <TouchableOpacity 
          style={styles.sidebarOverlay}
          onPress={toggleSidebar}
          activeOpacity={1}
        />
      )}

      {/* Sidebar */}
      <Animated.View 
        style={[
          styles.sidebar,
          isDark && styles.darkCard,
          { transform: [{ translateX: sidebarTranslateX }] }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, isDark && styles.darkText]}>My Tasks</Text>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#e5e7eb' : '#374151'} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInput, isDark && styles.darkSearchInput]}>
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              style={[styles.searchText, isDark && styles.darkText]}
              placeholder="Search my tasks..."
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              value={assignedTasksSearch}
              onChangeText={setAssignedTasksSearch}
            />
          </View>
        </View>

        {/* Assigned Tasks List */}
        <ScrollView style={styles.sidebarTasks} showsVerticalScrollIndicator={false}>
          {assignedTasksLoading ? (
            <View style={styles.loadingTasks}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={[styles.loadingTasksText, isDark && styles.darkSubtitle]}>Loading tasks...</Text>
            </View>
          ) : filteredAssignedTasks.map((task) => {
            const status = getTaskStatus(task);
            const priorityColor = getPriorityColor(task.priority || 'medium');
            
            return (
              <TouchableOpacity
                key={task._id}
                style={[
                  styles.sidebarTaskItem,
                  { borderLeftColor: priorityColor },
                  { backgroundColor: getPriorityBackgroundColor(task.priority || 'medium') },
                ]}
                onPress={() => {
                  handleEventClick(task._id);
                  toggleSidebar();
                }}
              >
                <View style={styles.sidebarTaskContent}>
                  <Text style={[styles.sidebarTaskTitle, isDark && styles.darkText]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  
                  <View style={styles.sidebarTaskMeta}>
                    <View style={styles.sidebarTaskStatus}>
                      {getStatusIcon(status)}
                      <Text style={[styles.sidebarTaskStatusText, isDark && styles.darkSubtitle]}>
                        {status.replace('-', ' ')}
                      </Text>
                    </View>
                    
                    {task.dueDate && (
                      <Text style={[
                        styles.sidebarTaskDueDate,
                        status === 'overdue' && styles.overdueDate,
                        status === 'due-today' && styles.dueTodayDate
                      ]}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          
          {!assignedTasksLoading && filteredAssignedTasks.length === 0 && (
            <View style={styles.emptyTasks}>
              <View style={[styles.emptyTasksIcon, isDark && styles.darkEmptyIcon]}>
                <Ionicons name="person" size={24} color={isDark ? '#6b7280' : '#9ca3af'} />
              </View>
              <Text style={[styles.emptyTasksText, isDark && styles.darkSubtitle]}>
                {assignedTasksSearch ? 'No tasks found' : 'No tasks assigned'}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleAddTask}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTask={handleCreateTask}
        currentUser={currentUser}
        initialDueDate={selectedDate || undefined}
      />

      {/* Task Detail Modal - ĐÃ SỬA LỖI */}
      <TaskDetailModal
        taskId={selectedTaskId || ''}
        visible={showTaskDetail}
        onClose={() => {
          setShowTaskDetail(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        currentUser={currentUser}
      />
    </SafeAreaView>
  );
}

// Styles giữ nguyên
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkHeader: {
    backgroundColor: '#2d3748',
    borderBottomColor: '#4a5568',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  darkText: {
    color: '#f7fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  darkSubtitle: {
    color: '#a0aec0',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  viewModeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
  },
  darkViewModeToggle: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  activeViewModeButton: {
    backgroundColor: '#3b82f6',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeViewModeText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  calendarSection: {
    flex: 1,
    padding: 16,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  darkCard: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkBorder: {
    borderBottomColor: '#4a5568',
  },
  calendarNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  darkNavButton: {
    backgroundColor: '#4a5568',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 160,
    textAlign: 'center',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  darkTodayButton: {
    backgroundColor: '#4a5568',
    borderColor: '#6b7280',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  calendarGrid: {
    padding: 12,
  },
  monthView: {
    gap: 8,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: (screenWidth - 64) / 7 - 4,
    height: 60,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  darkDayCell: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  todayCell: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  selectedCell: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  otherMonthCell: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  otherMonthText: {
    color: '#9ca3af',
  },
  todayText: {
    color: '#1d4ed8',
    fontWeight: 'bold',
  },
  weekendText: {
    color: '#6b7280',
  },
  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  taskIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    marginTop: 4,
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreTasksText: {
    fontSize: 10,
    color: '#6b7280',
  },
  weekView: {
    gap: 12,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  weekDayColumn: {
    width: screenWidth * 0.7,
  },
  weekDayHeader: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  darkWeekHeader: {
    backgroundColor: '#4a5568',
  },
  todayWeekHeader: {
    backgroundColor: '#3b82f6',
  },
  weekDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  todayWeekText: {
    color: '#ffffff',
  },
  weekDayTasks: {
    gap: 6,
    minHeight: 200,
  },
  weekTaskItem: {
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  weekTaskTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  weekTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekTaskTime: {
    fontSize: 10,
    color: '#6b7280',
  },
  emptyDaySlot: {
    height: 60,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  darkEmptySlot: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  emptyDayText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  selectedDateSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  selectedDateCount: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectedDateCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  selectedDateTasks: {
    maxHeight: 200,
  },
  selectedDateTaskItem: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  selectedDateTaskContent: {
    flex: 1,
  },
  selectedDateTaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  selectedDateTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedDateTaskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedDateTaskStatusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedDateTaskTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  noTasksForDate: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  noTasksForDateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  noTasksForDateAction: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    zIndex: 999,
    padding: 16,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  darkSearchInput: {
    backgroundColor: '#4a5568',
    borderColor: '#6b7280',
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  sidebarTasks: {
    flex: 1,
  },
  sidebarTaskItem: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  sidebarTaskContent: {
    flex: 1,
  },
  sidebarTaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  sidebarTaskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTaskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sidebarTaskStatusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  sidebarTaskDueDate: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  overdueDate: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  dueTodayDate: {
    backgroundColor: '#fffbeb',
    color: '#d97706',
  },
  loadingTasks: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  loadingTasksText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyTasks: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  emptyTasksIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  darkEmptyIcon: {
    backgroundColor: '#4a5568',
  },
  emptyTasksText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 997,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
});