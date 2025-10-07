"use client"

import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
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

  // Helper để hiển thị assignee - ĐÃ SỬA: Hiển thị tên user cụ thể
  const getAssigneeInfo = (task: Task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return { 
        displayName: 'Unassigned', 
        initial: 'U',
        isCurrentUser: false 
      };
    }

    // Kiểm tra xem task có được assign cho current user không
    const isCurrentUserAssigned = currentUser && 
      task.assignedTo.some(assignment => assignment.userId === currentUser._id);

    if (isCurrentUserAssigned) {
      return { 
        displayName: currentUser.name || 'You', 
        initial: (currentUser.name?.charAt(0) || 'Y').toUpperCase(),
        isCurrentUser: true
      };
    }

    // Nếu được assign cho user khác
    return { 
      displayName: 'Assigned to others', 
      initial: 'O',
      isCurrentUser: false
    };
  };

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getAllTasks();
      
      console.log('=== FETCH TASKS DEBUG ===');
      console.log('Full response:', response);
      
      const tasks = response?.tasks || [];
      console.log('Total tasks:', tasks.length);

      // Phân loại tasks
      const active: Task[] = [];
      const completed: Task[] = [];

      tasks.forEach((task: Task) => {
        if (task?.status === 'completed') {
          completed.push(task);
        } else {
          active.push(task);
        }
      });

      console.log('Active tasks:', active.length);
      console.log('Completed tasks:', completed.length);

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

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = () => {
    setShowCreateModal(true);
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      // Tự động assign task cho user hiện tại
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
      fetchTasks();
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

    // Xóa task khỏi cả 2 list
    setActiveTasks(prev => prev.filter(task => task._id !== updatedTask._id));
    setCompletedTasks(prev => prev.filter(task => task._id !== updatedTask._id));

    // Thêm vào đúng list
    if (updatedTask.status === 'completed') {
      setCompletedTasks(prev => [...prev, updatedTask]);
    } else {
      setActiveTasks(prev => [...prev, updatedTask]);
    }
  };

  const handleTaskDelete = (taskId: string) => {
    setActiveTasks(prev => prev.filter(task => task._id !== taskId));
    setCompletedTasks(prev => prev.filter(task => task._id !== taskId));
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

  // Inline update handlers - ĐÃ SỬA: Thêm log để debug estimatedTime
  const handleInlineUpdate = async (task: Task, field: string, value: any) => {
    try {
      console.log(`=== INLINE UPDATE: ${field} ===`);
      console.log('Task ID:', task._id);
      console.log('Field:', field);
      console.log('Value:', value);
      console.log('Full task:', task);

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
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button className="px-4 py-2 text-sm bg-blue-500 text-white">
              List
            </button>
            <button className="px-4 py-2 text-sm bg-white text-gray-700 hover:bg-gray-50">
              Section board
            </button>
          </div>
        </div>
      </div>

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
                    
                    {/* Assignee - ĐÃ SỬA: Hiển thị tên user cụ thể */}
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
                    
                    {/* Estimated Time - ĐÃ SỬA: Sửa input để update đúng cách */}
                    <div>
                      <div className="flex gap-1 w-full">
                        <input
                          type="text"
                          placeholder="—"
                          className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 flex-1 min-w-0 hover:border-gray-300"
                          value={task.estimatedTime || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            // Không gọi API ngay lập tức, chỉ update local state
                            const updatedTasks = activeTasks.map(t => 
                              t._id === task._id ? { ...t, estimatedTime: e.target.value } : t
                            );
                            setActiveTasks(updatedTasks);
                          }}
                          onBlur={(e) => {
                            // Gọi API khi blur khỏi input
                            if (e.target.value !== task.estimatedTime) {
                              handleInlineUpdate(task, 'estimatedTime', e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Gọi API khi nhấn Enter
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
                    
                    {/* Assignee - ĐÃ SỬA: Hiển thị tên user cụ thể */}
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