"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar as CalendarIcon,
  Clock,
  Filter,
  MoreVertical,
  User,
  AlertTriangle,
  CheckCircle2,
  Circle
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

interface CalendarEvent {
  id: string;
  title: string;
  project?: string;
  date: string;
  time?: string;
  status: string;
  priority?: string;
}

export default function CalendarView() {
  const { user: currentUser, currentGroup } = useAuth();
  const { currentFolder } = useFolder();
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

  // Filter assigned tasks based on search
  const filteredAssignedTasks = assignedTasks.filter(task =>
    task.title.toLowerCase().includes(assignedTasksSearch.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(assignedTasksSearch.toLowerCase())) ||
    (task.category && task.category.toLowerCase().includes(assignedTasksSearch.toLowerCase()))
  );

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
      const response = await taskService.getCalendarView(year, month, currentFolder?._id);
      
      console.log('=== FETCH CALENDAR DEBUG ===');
      console.log('Calendar response:', response);
      
      setCalendarData(response);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching calendar data:', errorMessage);
      
      if (errorMessage.includes("You must join or create a group")) {
        // Don't show error alert for group requirement - let the UI handle it
        console.log("User needs to join/create a group");
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
      // Backend đã filter theo currentGroupId, chỉ cần filter theo assignedTo ở frontend
      const response = await taskService.getAllTasks({ folderId: currentFolder?._id });
      
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
        // Don't show error alert for group requirement - let the UI handle it
        console.log("User needs to join/create a group");
        return;
      }
      
      setAssignedTasks([]);
    } finally {
      setAssignedTasksLoading(false);
    }
  };

  // Gọi API khi currentDate thay đổi
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchCalendarData(year, month);
    fetchAssignedTasks();
  }, [currentDate, currentUser, currentFolder?._id]);

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
        return 'bg-red-500 border-red-500';
      case 'high': 
        return 'bg-orange-500 border-orange-500';
      case 'medium': 
        return 'bg-yellow-500 border-yellow-500';
      case 'low': 
        return 'bg-blue-500 border-blue-500';
      default: 
        return 'bg-gray-500 border-gray-500';
    }
  };

  // Helper để lấy màu nền cho priority
  const getPriorityBackgroundColor = (priority: string) => {
    switch(priority) {
      case 'urgent': 
        return 'bg-red-50 border-red-200';
      case 'high': 
        return 'bg-orange-50 border-orange-200';
      case 'medium': 
        return 'bg-yellow-50 border-yellow-200';
      case 'low': 
        return 'bg-blue-50 border-blue-200';
      default: 
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Helper để lấy icon trạng thái
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'due-today':
        return <Clock className="w-3 h-3 text-orange-500" />;
      default:
        return <Circle className="w-3 h-3 text-gray-400" />;
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
        folderId: currentFolder?._id || undefined
      };

      console.log("Creating task with data:", backendTaskData);
      await taskService.createTask(backendTaskData);
      setShowCreateModal(false);

      // Refresh calendar data và assigned tasks
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      await fetchCalendarData(year, month);
      await fetchAssignedTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task: " + getErrorMessage(error));
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
    // Update the task in assigned tasks list
    setAssignedTasks(prev => 
      prev.map(task => task._id === updatedTask._id ? updatedTask : task)
    );
    
    // Refresh calendar data
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    await fetchCalendarData(year, month);
  };

  const handleTaskDelete = async (taskId: string) => {
    // Remove task from assigned tasks list
    setAssignedTasks(prev => prev.filter(task => task._id !== taskId));
    
    // Refresh calendar data
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    await fetchCalendarData(year, month);
    
    // Close task detail modal
    setShowTaskDetail(false);
    setSelectedTaskId(null);
  };

  const handleDayClick = (day: any) => {
    setSelectedDate(day.fullDate);
    console.log('Day clicked:', day);
  };

  const displayDays = viewMode === 'month' ? getDisplayDays() : getDisplayWeekDays();

  // Check if user has a current group
  if (!currentGroup) {
    return (
      <NoGroupState 
        title="Join or Create a Group to View Calendar"
        description="You need to join or create a group to view your calendar and manage scheduled tasks."
      />
    );
  }

  // Check if user has a current folder
  if (!currentFolder) {
    return <NoFolderState />;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">Manage your schedule and deadlines</p>
          {currentFolder && (
            <p className="text-sm text-gray-500 mt-1">
              Folder: <span className="font-medium text-gray-800">{currentFolder.name}</span>
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
            <button
              className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                viewMode === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('month')}
            >
              <CalendarIcon className="w-4 h-4" />
              Month
            </button>
            <button
              className={`px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('week')}
            >
              <CalendarIcon className="w-4 h-4" />
              Week
            </button>
          </div>

          {/* Add Task Button */}
          <button 
            onClick={handleAddTask}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Calendar */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => navigatePeriod('prev')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewMode === 'month' 
                    ? getMonthYearString(currentDate)
                    : getWeekRangeString(currentDate)
                  }
                </h2>
                
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => navigatePeriod('next')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  onClick={goToToday}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {viewMode === 'month' ? (
                /* Month View */
                <div className="grid grid-cols-7 gap-4">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center p-3 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {displayDays.map((dayInfo) => {
                    const dayTasks = getTasksForDate(dayInfo.dateString);
                    const isToday = new Date().toDateString() === dayInfo.fullDate.toDateString();
                    const isSelected = selectedDate && selectedDate.toDateString() === dayInfo.fullDate.toDateString();
                    const isWeekend = dayInfo.fullDate.getDay() === 0 || dayInfo.fullDate.getDay() === 6;
                    
                    return (
                      <div
                        key={`${dayInfo.date}-${dayInfo.isCurrentMonth}`}
                        className={`min-h-32 p-3 border border-gray-200 rounded-xl transition-all duration-200 cursor-pointer
                          ${isToday ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : ''}
                          ${isSelected ? 'bg-gray-50 border-gray-300 ring-2 ring-gray-100' : ''}
                          ${!dayInfo.isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white hover:bg-gray-50'}
                          ${isWeekend && dayInfo.isCurrentMonth ? 'bg-gray-25' : ''}
                        `}
                        onClick={() => handleDayClick(dayInfo)}
                      >
                        <div className={`flex items-center justify-between mb-2 ${
                          !dayInfo.isCurrentMonth ? 'text-gray-400' : 
                          isToday ? 'text-blue-600 font-semibold' : 
                          isWeekend ? 'text-gray-500' : 'text-gray-900'
                        }`}>
                          <span className="text-sm font-medium">{dayInfo.date}</span>
                          {isToday && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        
                        {/* Tasks for this day */}
                        <div className="space-y-1.5">
                          {dayTasks.slice(0, 4).map((task: Task) => {
                            const status = getTaskStatus(task);
                            return (
                              <div 
                                key={task._id}
                                className={`p-2 rounded-lg border-l-3 cursor-pointer hover:shadow-sm transition-all duration-200 ${
                                  getPriorityBackgroundColor(task.priority || 'medium')
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(task._id);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    getPriorityColor(task.priority || 'medium')
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-gray-900 truncate">
                                      {task.title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      {getStatusIcon(status)}
                                      <span className="text-xs text-gray-500 capitalize">
                                        {status.replace('-', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {dayTasks.length > 4 && (
                            <div className="text-xs text-gray-500 text-center py-1 bg-gray-100 rounded">
                              +{dayTasks.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Week View */
                <div className="space-y-4">
                  {/* Week headers */}
                  <div className="grid grid-cols-7 gap-4">
                    {getDisplayWeekDays().map(dayInfo => {
                      const isToday = new Date().toDateString() === dayInfo.fullDate.toDateString();
                      const isSelected = selectedDate && selectedDate.toDateString() === dayInfo.fullDate.toDateString();
                      
                      return (
                        <div
                          key={dayInfo.dateString}
                          className={`text-center p-3 rounded-lg border transition-colors cursor-pointer ${
                            isToday 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : isSelected
                                ? 'bg-gray-100 border-gray-300'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => handleDayClick(dayInfo)}
                        >
                          <div className="text-sm font-medium">{dayInfo.day.substring(0, 3)}</div>
                          <div className={`text-lg font-bold ${
                            isToday ? 'text-white' : 'text-gray-900'
                          }`}>
                            {dayInfo.date}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tasks for each day */}
                  <div className="grid grid-cols-7 gap-4">
                    {getDisplayWeekDays().map(dayInfo => {
                      const dayTasks = getTasksForDate(dayInfo.dateString);
                      const isToday = new Date().toDateString() === dayInfo.fullDate.toDateString();
                      
                      return (
                        <div key={dayInfo.dateString} className="space-y-2">
                          <div className="min-h-96 p-3 border border-gray-200 rounded-lg bg-white">
                            <div className="space-y-2">
                              {dayTasks.map((task: Task) => {
                                // Calculate task height based on estimated time
                                const getTaskHeight = (estimatedTime: string) => {
                                  if (!estimatedTime) return 'h-20'; // Default height
                                  
                                  // Parse estimated time (e.g., "2h 30m", "1h", "45m")
                                  const timeMatch = estimatedTime.match(/(\d+)h?\s*(\d+)?m?/i);
                                  if (timeMatch) {
                                    const hours = parseInt(timeMatch[1]) || 0;
                                    const minutes = parseInt(timeMatch[2]) || 0;
                                    const totalMinutes = hours * 60 + minutes;
                                    
                                    // Map to Tailwind height classes
                                    if (totalMinutes <= 30) return 'h-16';      // 30 min or less
                                    if (totalMinutes <= 60) return 'h-20';      // 1 hour
                                    if (totalMinutes <= 90) return 'h-24';      // 1.5 hours
                                    if (totalMinutes <= 120) return 'h-28';      // 2 hours
                                    if (totalMinutes <= 180) return 'h-32';      // 3 hours
                                    if (totalMinutes <= 240) return 'h-36';      // 4 hours
                                    return 'h-40';                               // 4+ hours
                                  }
                                  
                                  return 'h-20'; // Default height
                                };
                                
                                const status = getTaskStatus(task);
                                
                                return (
                                  <div
                                    key={task._id}
                                    className={`${getTaskHeight(task.estimatedTime || '')} p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
                                      getPriorityBackgroundColor(task.priority || 'medium')
                                    }`}
                                    onClick={() => handleEventClick(task._id)}
                                  >
                                    <div className="flex items-start justify-between h-full">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate mb-1">
                                          {task.title}
                                        </div>
                                        
                                        {task.description && (
                                          <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                                            {task.description}
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                          <div className="flex items-center gap-1">
                                            {getStatusIcon(status)}
                                            <span className="capitalize">{status.replace('-', ' ')}</span>
                                          </div>
                                          
                                          {task.estimatedTime && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              <span>{task.estimatedTime}</span>
                                            </div>
                                          )}
                                          
                                          {task.category && (
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                              {task.category}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-blue-100 text-blue-800'
                                        }`}>
                                          {task.priority}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Empty state */}
                              {dayTasks.length === 0 && (
                                <div 
                                  className="h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                  onClick={() => {
                                    setSelectedDate(dayInfo.fullDate);
                                    handleAddTask();
                                  }}
                                >
                                  <div className="text-center text-gray-500">
                                    <Plus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">Click to add task</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Day Tasks */}
            {selectedDate && (
              <div className="border-t border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Tasks for {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                    {getTasksForDate(selectedDate.toISOString().split('T')[0]).length} tasks
                  </span>
                </div>

                <div className="space-y-3">
                  {getTasksForDate(selectedDate.toISOString().split('T')[0]).map((task: Task) => {
                    const status = getTaskStatus(task);
                    return (
                      <div 
                        key={task._id}
                        className={`p-4 rounded-xl border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
                          getPriorityBackgroundColor(task.priority || 'medium')
                        }`}
                        onClick={() => handleEventClick(task._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                {getStatusIcon(status)}
                                <span className="capitalize">{status.replace('-', ' ')}</span>
                              </div>
                              
                              {task.estimatedTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.estimatedTime}</span>
                                </div>
                              )}
                              
                              {task.category && (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  {task.category}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {getTasksForDate(selectedDate.toISOString().split('T')[0]).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No tasks scheduled for this day</p>
                      <button 
                        onClick={handleAddTask}
                        className="text-blue-500 hover:text-blue-600 font-medium mt-2"
                      >
                        Add a task
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Assigned Tasks */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search my tasks..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-gray-50"
                  value={assignedTasksSearch}
                  onChange={(e) => setAssignedTasksSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Assigned Tasks Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-gray-900">My Tasks</h3>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                {filteredAssignedTasks.length}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Tasks assigned to you across all projects
            </p>

            {/* Assigned Tasks List */}
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {assignedTasksLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading tasks...</p>
                </div>
              ) : filteredAssignedTasks.map((task) => {
                const status = getTaskStatus(task);
                return (
                  <div 
                    key={task._id}
                    className={`p-4 rounded-xl border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
                      getPriorityBackgroundColor(task.priority || 'medium')
                    }`}
                    onClick={() => handleEventClick(task._id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900 flex-1 pr-2">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getStatusIcon(status)}
                      </div>
                    </div>
                    
                    {task.category && (
                      <div className="text-xs text-gray-600 mb-2">{task.category}</div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="capitalize">{status.replace('-', ' ')}</span>
                        {task.estimatedTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimatedTime}
                          </span>
                        )}
                      </div>
                      
                      {task.dueDate && (
                        <span className={`px-2 py-1 rounded ${
                          status === 'overdue' 
                            ? 'bg-red-100 text-red-700' 
                            : status === 'due-today'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {!assignedTasksLoading && filteredAssignedTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm">
                    {assignedTasksSearch ? 'No tasks found' : 'No tasks assigned to you'}
                  </p>
                  {!assignedTasksSearch && (
                    <button 
                      onClick={handleAddTask}
                      className="text-blue-500 hover:text-blue-600 font-medium mt-2 text-sm"
                    >
                      Create your first task
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTask={handleCreateTask}
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
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}