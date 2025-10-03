"use client"

import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  status: string;
  type: string;
  dueDate: string | null;
  priority: string;
  assignee: string;
  estimatedTime: string | null;
  sportTime: string | null;
}

export default function TasksView() {
  const [activeTasksExpanded, setActiveTasksExpanded] = useState(true);
  const [completedTasksExpanded, setCompletedTasksExpanded] = useState(true);
  
  // TODO: Replace with API call to fetch tasks
  const [activeTasks, setActiveTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Watch a 2-min video: How to be productive with Bordio",
      status: "New task",
      type: "Financial",
      dueDate: "2025-10-05",
      priority: "High",
      assignee: "Me",
      estimatedTime: null,
      sportTime: null
    }
  ]);

  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

  const handleAddTask = () => {
    // TODO: Connect to backend API
    console.log('Add new task - connect to API');
  };

  const handleTaskClick = (taskId: number) => {
    // TODO: Open task detail
    console.log('Task clicked:', taskId);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-orange-600 bg-orange-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
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
                key={task.id}
                className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="col-span-2 text-sm">{task.title}</div>
                <div>
                  <select 
                    className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer hover:border-gray-300"
                    value={task.status}
                    onChange={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="New task">New task</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded ${getTypeColor(task.type)}`}>
                    {task.type}
                  </span>
                </div>
                <div>
                  <input
                    type="date"
                    className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 cursor-pointer hover:border-gray-300"
                    value={task.dueDate || ''}
                    onChange={(e) => e.stopPropagation()}
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
                      {task.assignee === 'Me' ? 'M' : 'U'}
                    </div>
                    <span className="text-sm text-gray-600">{task.assignee}</span>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="—"
                    className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 w-20 hover:border-gray-300"
                    value={task.estimatedTime || ''}
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
                key={task.id}
                className="grid grid-cols-8 gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="col-span-2 text-sm text-gray-600 line-through">{task.title}</div>
                <div>
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded ${getTypeColor(task.type)}`}>
                    {task.type}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{task.dueDate}</span>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                      {task.assignee === 'Me' ? 'M' : 'U'}
                    </div>
                    <span className="text-sm text-gray-600">{task.assignee}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{task.estimatedTime || '—'}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ĐÃ XÓA DÒNG "The timer has been successfully deleted" */}
    </div>
  );
}