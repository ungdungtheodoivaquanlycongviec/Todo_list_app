"use client";

import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { taskService } from '../../services/task.service';
import { Task } from '../../services/types/task.types';
import { useAuth } from '../../contexts/AuthContext';
import CreateTaskModal from './TasksView/CreateTaskModal'; // Thêm import

interface CalendarEvent {
  id: string;
  title: string;
  project?: string;
  date: string;
  time?: string;
  status: string;
  priority?: string;
}

interface WaitingListItem {
  id: number;
  title: string;
  time: string | null;
  type: string;
}

export default function CalendarView() {
  const { user: currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false); // Thêm state cho modal
  
  // Mock waiting list data (giữ nguyên từ ảnh)
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([
    { id: 1, title: "📱 Install updates on PC and smartphone", time: "0:30h", type: "tech" },
    { id: 2, title: "💪 Sign up for the gym", time: null, type: "health" },
    { id: 3, title: "🔔 Check your health", time: null, type: "health" },
    { id: 4, title: "🔧 Clean your house", time: "2h", type: "home" },
    { id: 5, title: "💰 Get personal finances in order", time: "1:30h", type: "finance" },
  ]);

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
      
      console.log('=== FETCH CALENDAR DEBUG ===');
      console.log('Calendar response:', response);
      
      setCalendarData(response);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching calendar data:', errorMessage);
      setCalendarData(null);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi currentDate thay đổi
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Tháng trong JS từ 0-11
    fetchCalendarData(year, month);
  }, [currentDate]);

  // Hàm chuyển tháng
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Hàm về tháng hiện tại
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Lấy thông tin tháng và năm
  const getMonthYearString = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Lấy các ngày trong tháng để hiển thị
  const getDisplayDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const displayDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      displayDays.push({
        date: i,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: date,
        dateString: date.toISOString().split('T')[0] // YYYY-MM-DD
      });
    }
    
    return displayDays;
  };

  // Lấy tasks cho một ngày cụ thể
  const getTasksForDate = (dateString: string) => {
    if (!calendarData?.tasksByDate) return [];
    return calendarData.tasksByDate[dateString] || [];
  };

  // Helper để xác định trạng thái task
  const getTaskStatus = (task: Task) => {
    if (task.status === 'completed') return 'Completed';
    
    const today = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    if (dueDate) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (dueDate < yesterday) {
        return 'Exp. yesterday';
      } else if (dueDate.toDateString() === today.toDateString()) {
        return 'Due today';
      } else if (dueDate.toDateString() === yesterday.toDateString()) {
        return 'Due yesterday';
      }
    }
    
    return 'Upcoming';
  };

  // Helper để lấy màu sắc cho priority
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': 
      case 'urgent': 
        return 'bg-red-100 border-red-500 text-red-800';
      case 'medium': 
        return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'low': 
        return 'bg-blue-100 border-blue-500 text-blue-800';
      default: 
        return 'bg-gray-100 border-gray-500 text-gray-800';
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

      console.log("Creating task with data:", backendTaskData);
      await taskService.createTask(backendTaskData);
      setShowCreateModal(false);

      // Refresh calendar data
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      fetchCalendarData(year, month);
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
    // TODO: Open task details
    console.log('Task clicked:', taskId);
  };

  const handleWaitingListItemClick = (itemId: number) => {
    // TODO: Open waiting list item details
    console.log('Waiting list item clicked:', itemId);
  };

  const handleDayClick = (day: any) => {
    console.log('Day clicked:', day);
    // TODO: Open day view or add event modal
  };

  const displayDays = getDisplayDays();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        {/* Thay đổi nút thành Add Task và tích hợp chức năng từ TaskView */}
        <button 
          onClick={handleAddTask}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main Calendar */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold">
                  {getMonthYearString(currentDate)}
                </h2>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button 
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={goToToday}
              >
                Today
              </button>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center p-2 text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {displayDays.map((dayInfo) => {
                const dayTasks = getTasksForDate(dayInfo.dateString);
                const isToday = new Date().toDateString() === dayInfo.fullDate.toDateString();
                
                return (
                  <div
                    key={dayInfo.date}
                    className={`min-h-32 p-2 border border-gray-200 rounded-lg ${
                      isToday ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    } cursor-pointer transition-colors`}
                    onClick={() => handleDayClick(dayInfo)}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {dayInfo.date}
                    </div>
                    
                    {/* Tasks for this day */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task: Task) => (
                        <div 
                          key={task._id}
                          className={`text-xs p-1 rounded border-l-2 cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(task.priority || 'medium')}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(task._id);
                          }}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-gray-600 text-xs">
                            {task.estimatedTime && `⏱️ ${task.estimatedTime}`}
                            {task.estimatedTime && ' • '}
                            {getTaskStatus(task)}
                          </div>
                        </div>
                      ))}
                      
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Today's Events Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-700">Today</h3>
                <span className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Today's Events List */}
              <div className="space-y-3">
                {getTasksForDate(new Date().toISOString().split('T')[0]).map((task: Task) => (
                  <div 
                    key={task._id}
                    className={`p-4 rounded-r-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(task.priority || 'medium')}`}
                    onClick={() => handleEventClick(task._id)}
                  >
                    <div className="font-medium text-sm">{task.title}</div>
                    {task.category && (
                      <div className="text-xs text-gray-600 mt-1">{task.category}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {task.estimatedTime && `⏱️ ${task.estimatedTime} • `}
                      {getTaskStatus(task)}
                    </div>
                  </div>
                ))}
                
                {getTasksForDate(new Date().toISOString().split('T')[0]).length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No tasks for today
                  </div>
                )}
              </div>

              {/* Upcoming Days */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-3">Upcoming</h3>
                <div className="space-y-2">
                  {displayDays
                    .filter(day => day.fullDate > new Date())
                    .slice(0, 5)
                    .map(dayInfo => {
                      const dayTasks = getTasksForDate(dayInfo.dateString);
                      return (
                        <div
                          key={dayInfo.date}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleDayClick(dayInfo)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-lg font-semibold text-gray-900 w-8 text-center">
                              {dayInfo.date}
                            </div>
                            <div className="text-sm text-gray-600">
                              {dayInfo.day}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {dayTasks.length > 0 ? `${dayTasks.length} tasks` : 'No events'}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting List Sidebar */}
        <div className="w-80">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Waiting List Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Waiting list</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {waitingList.length}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Put unscheduled tasks here and come back to them later
            </p>

            {/* Waiting List Items */}
            <div className="space-y-3">
              {waitingList.map((item) => (
                <div 
                  key={item.id}
                  className="bg-gray-50 border border-gray-200 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleWaitingListItemClick(item.id)}
                >
                  <div className="text-sm text-gray-800">{item.title}</div>
                  {item.time && (
                    <div className="text-xs text-gray-500 mt-1">{item.time}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Thêm CreateTaskModal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTask={handleCreateTask}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}