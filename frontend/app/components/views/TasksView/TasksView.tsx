"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { taskService } from '../../../services/task.service';
import { Task } from '../../../services/types/task.types';
import CreateTaskModal from './CreateTaskModal';
import TaskContextMenu from './TaskContextMenu';

export default function TasksView() {
  const [activeTasksExpanded, setActiveTasksExpanded] = useState(true);
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(true);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: Task } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tasks từ API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getAllTasks();
      const tasks = response.tasks;

      // Phân loại tasks: active (chưa completed) và completed
      const active = tasks.filter(task => task.status !== 'completed');
      const completed = tasks.filter(task => task.status === 'completed');

      setActiveTasks(active);
      setCompletedTasks(completed);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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
      // Map frontend data to backend format với validation
      const backendTaskData = {
        title: taskData.title || 'Untitled Task',
        description: taskData.description || '',
        category: taskData.category || 'general',
        status: 'todo', // Default status cho backend
        priority: mapPriorityToBackend(taskData.priority),
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        tags: taskData.tags || [],
        // Thêm các trường required khác nếu backend yêu cầu
      };

      console.log('Creating task with data:', backendTaskData);
      
      await taskService.createTask(backendTaskData);
      setShowCreateModal(false);
      fetchTasks(); // Refresh danh sách tasks
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + (error as Error).message);
    }
  };

  const handleTaskClick = (taskId: string) => {
    // TODO: Open task detail
    console.log('Task clicked:', taskId);
  };

  const handleContextMenu = (event: React.MouseEvent, task: Task) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, task });
  };

  const handleContextMenuAction = (action: string, task: Task) => {
    setContextMenu(null);
    switch (action) {
      case 'complete':
        // Gọi API để đánh dấu task là completed
        taskService.updateTask(task._id, { status: 'completed' })
          .then(() => fetchTasks())
          .catch(console.error);
        break;
      case 'start_timer':
        // TODO: Start timer for the task
        console.log('Start timer for task:', task._id);
        break;
      case 'change_type':
        // TODO: Change type of the task
        console.log('Change type for task:', task._id);
        break;
      case 'repeat':
        // TODO: Repeat the task
        console.log('Repeat task:', task._id);
        break;
      case 'move_to':
        // TODO: Move the task to another group
        console.log('Move task:', task._id);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this task?')) {
          taskService.deleteTask(task._id)
            .then(() => fetchTasks())
            .catch(console.error);
        }
        break;
      default:
        break;
    }
  };

  // Helper function để map priority
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

  // Helper function để map status (nếu cần)
  const mapStatusToBackend = (frontendStatus: string): string => {
    const statusMap: { [key: string]: string } = {
      'New task': 'todo',
      'In Progress': 'in_progress',
      'Completed': 'completed'
    };
    return statusMap[frontendStatus] || 'todo';
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
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
          {/* Tabs View */}
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
            {/* Table Header */}
            <div className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <div className="col-span-2">Active tasks</div>
              <div>Status</div>
              <div>Type</div>
              <div>Due date</div>
              <div>Priority</div>
              <div>Assignee</div>
              <div>Estimated time</div>
            </div>

            {/* Create Task Row */}
            <div 
              className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-blue-600"
              onClick={handleAddTask}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create task</span>
            </div>

            {/* Active Tasks */}
            {activeTasks.map((task) => (
              <div 
                key={task._id}
                className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleTaskClick(task._id)}
                onContextMenu={(e) => handleContextMenu(e, task)}
              >
                <div className="col-span-2 text-sm">{task.title}</div>
                <div>
                  <select 
                    className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer hover:border-gray-300"
                    value={task.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      taskService.updateTask(task._id, { status: e.target.value })
                        .then(() => fetchTasks())
                        .catch(console.error);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded ${getTypeColor(task.category || '')}`}>
                    {task.category || 'No type'}
                  </span>
                </div>
                <div>
                  <input
                    type="date"
                    className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 cursor-pointer hover:border-gray-300"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      taskService.updateTask(task._id, { dueDate: e.target.value })
                        .then(() => fetchTasks())
                        .catch(console.error);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                      {task.assignedTo.length > 0 ? task.assignedTo[0].userId.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-sm text-gray-600">
                      {task.assignedTo.length > 0 ? 'Assigned' : 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="—"
                    className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 w-20 hover:border-gray-300"
                    // TODO: Add estimated time field to backend model
                    value={''}
                    onChange={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            ))}
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
            {/* Table Header */}
            <div className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <div className="col-span-2">Completed tasks</div>
              <div>Status</div>
              <div>Type</div>
              <div>Due date</div>
              <div>Priority</div>
              <div>Assignee</div>
              <div>Estimated time</div>
            </div>

            {/* No Completed Tasks Message */}
            {completedTasks.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No completed tasks yet
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.map((task) => (
              <div 
                key={task._id}
                className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleTaskClick(task._id)}
                onContextMenu={(e) => handleContextMenu(e, task)}
              >
                <div className="col-span-2 text-sm text-gray-600 line-through">{task.title}</div>
                <div>
                  <span className="text-xs text-gray-500">Completed</span>
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
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                      {task.assignedTo.length > 0 ? task.assignedTo[0].userId.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-sm text-gray-600">
                      {task.assignedTo.length > 0 ? 'Assigned' : 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">—</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTask={handleCreateTask}
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