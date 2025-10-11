"use client"

import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, List, Layout } from 'lucide-react';
import { taskService } from '../../../services/task.service';
import { Task } from '../../../services/types/task.types';
import CreateTaskModal from './CreateTaskModal';
import TaskContextMenu from './TaskContextMenu';
import TaskDetailModal from './TaskDetailModal';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

export default function TasksView() {
  const { user: currentUser } = useAuth();
  const [activeTasksExpanded, setActiveTasksExpanded] = useState(true);
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(true);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: Task } | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list'); // Thêm state cho chế độ xem
  const [kanbanData, setKanbanData] = useState<any>(null); // Thêm state cho dữ liệu kanban
  const router = useRouter();

  // Estimated time options
  const estimatedTimeOptions = ['15m', '30m', '1h', '2h', '4h', '1d'];

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

  // Helper để hiển thị assignee
  const getAssigneeInfo = (task: Task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return { 
        displayName: 'Unassigned', 
        initial: 'U',
        isCurrentUser: false 
      };
    }

    const isCurrentUserAssigned = currentUser && 
      task.assignedTo.some(assignment => assignment.userId === currentUser._id);

    if (isCurrentUserAssigned) {
      return { 
        displayName: currentUser.name || 'You', 
        initial: (currentUser.name?.charAt(0) || 'Y').toUpperCase(),
        isCurrentUser: true
      };
    }

    return { 
      displayName: 'Assigned to others', 
      initial: 'O',
      isCurrentUser: false
    };
  };

  // Fetch tasks từ API (chế độ list)
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getAllTasks();
      
      console.log('=== FETCH TASKS DEBUG ===');
      console.log('Full response:', response);
      
      const tasks = response?.tasks || [];
      console.log('Total tasks:', tasks.length);

      const active: Task[] = [];
      const completed: Task[] = [];

      tasks.forEach((task: Task) => {
        if (task?.status === 'completed') {
          completed.push(task);
        } else {
          active.push(task);
        }
      });

      setActiveTasks(active);
      setCompletedTasks(completed);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching tasks:', errorMessage);
      
      if (errorMessage.includes('Authentication failed')) {
        alert('Session expired. Please login again.');
        router.push('/');
      }
      
      setActiveTasks([]);
      setCompletedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch kanban data từ API
  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const response = await taskService.getKanbanView();
      
      console.log('=== FETCH KANBAN DEBUG ===');
      console.log('Kanban response:', response);
      
      setKanbanData(response);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error fetching kanban data:', errorMessage);
      
      if (errorMessage.includes('Authentication failed')) {
        alert('Session expired. Please login again.');
        router.push('/');
      }
      
      setKanbanData(null);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API tương ứng khi chuyển chế độ
  useEffect(() => {
    if (viewMode === 'list') {
      fetchTasks();
    } else {
      fetchKanbanData();
    }
  }, [viewMode]);

  const handleAddTask = () => {
    setShowCreateModal(true);
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      const assignedTo = currentUser ? [{ userId: currentUser._id }] : [];

      const backendTaskData = {
        title: taskData.title || 'Untitled Task',
        description: taskData.description || '',
        category: taskData.category || 'general',
        status: 'todo',
        priority: mapPriorityToBackend(taskData.priority),
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        tags: taskData.tags || [],
        assignedTo: assignedTo,
        estimatedTime: taskData.estimatedTime || '',
      };

      console.log('Creating task with data:', backendTaskData);
      await taskService.createTask(backendTaskData);
      setShowCreateModal(false);
      
      // Refresh data based on current view mode
      if (viewMode === 'list') {
        fetchTasks();
      } else {
        fetchKanbanData();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + getErrorMessage(error));
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    setShowTaskDetail(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    console.log('=== HANDLE TASK UPDATE ===');
    console.log('Updated task:', updatedTask);

    if (viewMode === 'list') {
      setActiveTasks(prev => prev.filter(task => task._id !== updatedTask._id));
      setCompletedTasks(prev => prev.filter(task => task._id !== updatedTask._id));

      if (updatedTask.status === 'completed') {
        setCompletedTasks(prev => [...prev, updatedTask]);
      } else {
        setActiveTasks(prev => [...prev, updatedTask]);
      }
    } else {
      // Refresh kanban data khi có update
      fetchKanbanData();
    }
  };

  const handleTaskDelete = (taskId: string) => {
    if (viewMode === 'list') {
      setActiveTasks(prev => prev.filter(task => task._id !== taskId));
      setCompletedTasks(prev => prev.filter(task => task._id !== taskId));
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
        case 'complete':
          const completedTask = await taskService.updateTask(task._id, { status: 'completed' });
          handleTaskUpdate(completedTask);
          break;
          
        case 'delete':
          if (confirm('Are you sure you want to delete this task?')) {
            await taskService.deleteTask(task._id);
            handleTaskDelete(task._id);
          }
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.error('Error in context menu action:', error);
      alert('Failed to perform action: ' + getErrorMessage(error));
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
    switch(priority) {
      case 'high': 
      case 'urgent': 
        return 'text-red-600 bg-red-50';
      case 'medium': 
        return 'text-orange-600 bg-orange-50';
      case 'low': 
        return 'text-blue-600 bg-blue-50';
      default: 
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Financial': return 'bg-yellow-100 text-yellow-800';
      case 'Strategic': return 'bg-green-100 text-green-800';
      case 'Operational': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Inline update handlers
  const handleInlineUpdate = async (task: Task, field: string, value: any) => {
    try {
      console.log(`=== INLINE UPDATE: ${field} ===`);
      console.log('Task ID:', task._id);
      console.log('Field:', field);
      console.log('Value:', value);

      const updateData = { [field]: value };
      console.log('Update data:', updateData);

      const updatedTask = await taskService.updateTask(task._id, updateData);
      console.log('Updated task response:', updatedTask);
      
      handleTaskUpdate(updatedTask);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert(`Failed to update ${field}: ${getErrorMessage(error)}`);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenu]);

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
      { key: 'todo', title: 'To Do' },
      { key: 'in_progress', title: 'In Progress' },
      { key: 'completed', title: 'Completed' },
      { key: 'archived', title: 'Archived' }
    ];

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map(column => {
          const columnData = kanbanData.kanbanBoard[column.key];
          return (
            <div key={column.key} className="flex-1 min-w-80 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">
                  {column.title} 
                  <span className="ml-2 text-sm text-gray-500 bg-white px-2 py-1 rounded">
                    {columnData?.count || 0}
                  </span>
                </h3>
                <button 
                  onClick={handleAddTask}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                {columnData?.tasks?.map((task: Task) => {
                  const assigneeInfo = getAssigneeInfo(task);
                  return (
                    <div 
                      key={task._id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleTaskClick(task._id)}
                      onContextMenu={(e) => handleContextMenu(e, task)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm text-gray-900 flex-1">
                          {task.title || 'Untitled Task'}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority || 'medium')}`}>
                          {task.priority || 'medium'}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            assigneeInfo.isCurrentUser 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {assigneeInfo.initial}
                          </div>
                          {task.estimatedTime && (
                            <span>⏱️ {task.estimatedTime}</span>
                          )}
                        </div>
                        
                        {task.dueDate && (
                          <span>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {(!columnData?.tasks || columnData.tasks.length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <div className="flex gap-2">
          {/* Toggle button cho chế độ xem */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button 
              className={`px-4 py-2 text-sm flex items-center gap-2 ${
                viewMode === 'list' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button 
              className={`px-4 py-2 text-sm flex items-center gap-2 ${
                viewMode === 'kanban' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setViewMode('kanban')}
            >
              <Layout className="w-4 h-4" />
              Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Hiển thị theo chế độ đã chọn */}
      {viewMode === 'list' ? (
        <>
          {/* Active Tasks Section */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setActiveTasksExpanded(!activeTasksExpanded)}
              >
                {activeTasksExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
                <h2 className="font-medium">Active tasks</h2>
                <span className="text-sm text-gray-500">{activeTasks.length}</span>
              </div>
            </div>

            {activeTasksExpanded && (
              <>
                <div className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
                  <div className="col-span-2">Active tasks</div>
                  <div>Status</div>
                  <div>Type</div>
                  <div>Due date</div>
                  <div>Priority</div>
                  <div>Assignee</div>
                  <div>Estimated time</div>
                </div>

                <div 
                  className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-blue-600"
                  onClick={handleAddTask}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Create task</span>
                </div>

                {activeTasks.length > 0 ? (
                  activeTasks.map((task) => {
                    const assigneeInfo = getAssigneeInfo(task);
                    return (
                      <div 
                        key={task._id}
                        className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTaskClick(task._id)}
                        onContextMenu={(e) => handleContextMenu(e, task)}
                      >
                        <div className="col-span-2 text-sm">{task.title || 'Untitled Task'}</div>
                        
                        {/* Status */}
                        <div>
                          <select 
                            className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer hover:border-gray-300"
                            value={task.status || 'todo'}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleInlineUpdate(task, 'status', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        
                        {/* Type */}
                        <div>
                          <span className={`text-xs px-2 py-1 rounded ${getTypeColor(task.category || '')}`}>
                            {task.category || 'No type'}
                          </span>
                        </div>
                        
                        {/* Due Date */}
                        <div>
                          <input
                            type="date"
                            className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 cursor-pointer hover:border-gray-300"
                            value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleInlineUpdate(task, 'dueDate', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        {/* Priority */}
                        <div>
                          <select
                            className={`text-xs border rounded px-2 py-1 cursor-pointer hover:border-gray-300 ${getPriorityColor(task.priority || 'medium')}`}
                            value={task.priority || 'medium'}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleInlineUpdate(task, 'priority', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        
                        {/* Assignee */}
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              assigneeInfo.isCurrentUser 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-300 text-gray-700'
                            }`}>
                              {assigneeInfo.initial}
                            </div>
                            <span className={`text-sm ${
                              assigneeInfo.isCurrentUser 
                                ? 'text-green-700 font-medium' 
                                : 'text-gray-600'
                            }`}>
                              {assigneeInfo.displayName}
                            </span>
                          </div>
                        </div>
                        
                        {/* Estimated Time */}
                        <div>
                          <div className="flex gap-1 w-full">
                            <input
                              type="text"
                              placeholder="—"
                              className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 flex-1 min-w-0 hover:border-gray-300"
                              value={task.estimatedTime || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                const updatedTasks = activeTasks.map(t => 
                                  t._id === task._id ? { ...t, estimatedTime: e.target.value } : t
                                );
                                setActiveTasks(updatedTasks);
                              }}
                              onBlur={(e) => {
                                if (e.target.value !== task.estimatedTime) {
                                  handleInlineUpdate(task, 'estimatedTime', e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <select
                              className="text-xs border border-gray-200 rounded px-1 py-1 w-16 hover:border-gray-300"
                              value=""
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.value) {
                                  handleInlineUpdate(task, 'estimatedTime', e.target.value);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">⏱️</option>
                              {estimatedTimeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No active tasks
                  </div>
                )}
              </>
            )}
          </div>

          {/* Completed Tasks Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setCompletedTasksExpanded(!completedTasksExpanded)}
              >
                {completedTasksExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                )}
                <h2 className="font-medium">Completed tasks</h2>
                <span className="text-sm text-gray-500">{completedTasks.length}</span>
              </div>
            </div>

            {completedTasksExpanded && (
              <>
                <div className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
                  <div className="col-span-2">Completed tasks</div>
                  <div>Status</div>
                  <div>Type</div>
                  <div>Due date</div>
                  <div>Priority</div>
                  <div>Assignee</div>
                  <div>Estimated time</div>
                </div>

                {completedTasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No completed tasks yet
                  </div>
                ) : (
                  completedTasks.map((task) => {
                    const assigneeInfo = getAssigneeInfo(task);
                    return (
                      <div 
                        key={task._id}
                        className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTaskClick(task._id)}
                        onContextMenu={(e) => handleContextMenu(e, task)}
                      >
                        <div className="col-span-2 text-sm text-gray-600 line-through">{task.title || 'Untitled Task'}</div>
                        
                        <div>
                          <select 
                            className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer hover:border-gray-300"
                            value={task.status || 'completed'}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleInlineUpdate(task, 'status', e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="completed">Completed</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                          </select>
                        </div>
                        
                        <div>
                          <span className={`text-xs px-2 py-1 rounded ${getTypeColor(task.category || '')}`}>
                            {task.category || 'No type'}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        
                        <div>
                          <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority || 'medium')}`}>
                            {task.priority || 'medium'}
                          </span>
                        </div>
                        
                        {/* Assignee */}
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              assigneeInfo.isCurrentUser 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-300 text-gray-700'
                            }`}>
                              {assigneeInfo.initial}
                            </div>
                            <span className={`text-sm ${
                              assigneeInfo.isCurrentUser 
                                ? 'text-green-700 font-medium' 
                                : 'text-gray-600'
                            }`}>
                              {assigneeInfo.displayName}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500">{task.estimatedTime || '—'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <KanbanView />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTask={handleCreateTask}
          currentUser={currentUser}
        />
      )}

      {/* Task Detail Modal */}
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