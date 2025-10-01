"use client"

import React, { useState } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, CheckSquare, Calendar, FileText } from 'lucide-react';

export default function BordioInterface() {
  const [activeView, setActiveView] = useState('tasks');
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  
  // TODO: Replace with API call to fetch workspaces
  const [currentWorkspace] = useState('Personal Workspace');
  
  // TODO: Replace with API call to fetch projects
  const [projects] = useState(['test']);
  
  // TODO: Replace with API call to fetch shared projects
  const [sharedProjects] = useState(['gym']);

  const handleWorkspaceChange = (workspace) => {
    // TODO: Implement API call to switch workspace
    console.log('Switch workspace:', workspace);
  };

  const handleSearch = (query) => {
    // TODO: Implement API call to search projects
    console.log('Search projects:', query);
  };

  const handleAddProject = () => {
    // TODO: Implement API call to add new project
    console.log('Add new project - connect to API');
  };

  const handleProjectClick = (projectName) => {
    // TODO: Implement API call to load project details
    console.log('Project clicked:', projectName);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* First Column - Personal Workspace (2/16) */}
      <div className="w-[12.5%] bg-[#0F1D40] text-[#FFFFE6] flex flex-col">
        {/* Section 1: Personal Workspace Title */}
        <div className="p-4 border-b border-[#2D4071]">
          <select 
            className="w-full bg-[#1a2847] text-[#FFFFE6] text-sm p-2 rounded border-none focus:outline-none focus:ring-1 focus:ring-[#2D4071] cursor-pointer"
            value={currentWorkspace}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
          >
            <option value="Personal Workspace">Personal Workspace</option>
            {/* TODO: Add more workspaces from API */}
          </select>
        </div>

        {/* Section 2: Search and All my activities */}
        <div className="p-4 border-b border-[#2D4071]">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-2 w-4 h-4 text-[#839399]" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-[#1a2847] text-[#FFFFE6] placeholder-[#839399] pl-8 pr-3 py-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#2D4071]"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div 
            className="flex items-center gap-2 p-2 bg-[#1a2847] rounded cursor-pointer hover:bg-[#243152]"
            onClick={() => console.log('All my activities clicked - connect to API')}
          >
            <div className="w-6 h-6 bg-[#4a5f8f] rounded-full flex items-center justify-center text-xs">
              A
            </div>
            <span className="text-sm">All my activities</span>
          </div>
        </div>

        {/* Section 3: Projects */}
        <div className="p-4 border-b border-[#2D4071]">
          <div
            className="flex items-center justify-between cursor-pointer mb-2"
            onClick={() => setProjectsExpanded(!projectsExpanded)}
          >
            <span className="text-[#839399] text-xs uppercase tracking-wide">Projects</span>
            <Plus 
              className="w-4 h-4 text-[#839399] hover:text-[#FFFFE6]" 
              onClick={(e) => {
                e.stopPropagation();
                handleAddProject();
              }}
            />
          </div>
          {projectsExpanded && (
            <div className="space-y-1">
              {projects.map((project, idx) => (
                <div
                  key={idx}
                  className="text-sm py-1.5 px-2 hover:bg-[#1a2847] rounded cursor-pointer"
                  onClick={() => handleProjectClick(project)}
                >
                  {project}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Shared with me */}
        <div className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer mb-2"
            onClick={() => setSharedExpanded(!sharedExpanded)}
          >
            <span className="text-[#839399] text-xs uppercase tracking-wide">Shared with me</span>
            {sharedExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#839399]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#839399]" />
            )}
          </div>
          {sharedExpanded && (
            <div className="space-y-1">
              {sharedProjects.map((project, idx) => (
                <div
                  key={idx}
                  className="text-sm py-1.5 px-2 hover:bg-[#1a2847] rounded cursor-pointer"
                  onClick={() => handleProjectClick(project)}
                >
                  {project}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second Column - Tools (1/16) */}
      <div className="w-[6.25%] bg-white border-r border-gray-200 flex flex-col pt-4">
        <h2 className="px-3 mb-3 text-xs font-medium text-gray-600">Tools</h2>
        
        <div
          className={`flex flex-col items-center gap-2 py-3 px-2 cursor-pointer ${
            activeView === 'tasks' ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
          }`}
          onClick={() => setActiveView('tasks')}
        >
          <CheckSquare className={`w-5 h-5 ${activeView === 'tasks' ? 'text-blue-500' : 'text-gray-600'}`} />
          <span className={`text-xs ${activeView === 'tasks' ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
            Tasks
          </span>
        </div>

        <div
          className={`flex flex-col items-center gap-2 py-3 px-2 cursor-pointer ${
            activeView === 'calendar' ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
          }`}
          onClick={() => setActiveView('calendar')}
        >
          <Calendar className={`w-5 h-5 ${activeView === 'calendar' ? 'text-blue-500' : 'text-gray-600'}`} />
          <span className={`text-xs ${activeView === 'calendar' ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
            Calendar
          </span>
        </div>

        <div
          className={`flex flex-col items-center gap-2 py-3 px-2 cursor-pointer ${
            activeView === 'notes' ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
          }`}
          onClick={() => setActiveView('notes')}
        >
          <FileText className={`w-5 h-5 ${activeView === 'notes' ? 'text-blue-500' : 'text-gray-600'}`} />
          <span className={`text-xs ${activeView === 'notes' ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
            Notes
          </span>
        </div>
      </div>

      {/* Third Column - Main Content Area (13/16) */}
      <div className="flex-1 bg-white overflow-auto">
        {activeView === 'tasks' && <TasksView />}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'notes' && <NotesView />}
      </div>
    </div>
  );
}

function TasksView() {
  // TODO: Replace with API call to fetch tasks
  const [tasks, setTasks] = useState([
    { 
      id: 1,
      title: "Watch a 2-min video: How to be productive w...", 
      status: "New task",
      type: "Financial", 
      dueDate: "2025-10-05",
      priority: "High",
      estimatedTime: null,
      assignee: "Me",
      createdIn: "Personal Workspace"
    },
    { 
      id: 2,
      title: "Download Bordio's mobile app on your phone", 
      status: "In Progress",
      type: "Financial", 
      dueDate: "2025-10-03",
      priority: "Medium",
      estimatedTime: "0:15h",
      assignee: "Me",
      createdIn: "Personal Workspace"
    },
    { 
      id: 3,
      title: "Do a mind sweep: Write down all your to-dos ...", 
      status: "New task",
      type: "Strategic", 
      dueDate: null,
      priority: "Low",
      estimatedTime: "0:45h",
      assignee: "Me",
      createdIn: "test"
    },
  ]);

  const [tasksExpanded, setTasksExpanded] = useState(true);

  const handleAddTask = () => {
    // TODO: Implement API call to add new task
    console.log('Add new task - connect to API');
  };

  const handleTaskClick = (taskId) => {
    // TODO: Implement API call to get task details
    console.log('Task clicked:', taskId);
  };

  const handleStatusChange = (taskId, newStatus) => {
    // TODO: Implement API call to update task status
    console.log('Update status:', taskId, newStatus);
  };

  const handlePriorityChange = (taskId, newPriority) => {
    // TODO: Implement API call to update task priority
    console.log('Update priority:', taskId, newPriority);
  };

  const handleDueDateChange = (taskId, newDate) => {
    // TODO: Implement API call to update due date
    console.log('Update due date:', taskId, newDate);
  };

  const handleTypeChange = (taskId, newType) => {
    // TODO: Implement API call to update task type
    console.log('Update type:', taskId, newType);
  };

  const handleEstimatedTimeChange = (taskId, newTime) => {
    // TODO: Implement API call to update estimated time
    console.log('Update estimated time:', taskId, newTime);
  };

  const handleDeleteTask = (taskId) => {
    // TODO: Implement API call to delete task
    console.log('Delete task:', taskId);
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-orange-600 bg-orange-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeColor = (type) => {
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
          <button 
            className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 flex items-center gap-2"
            onClick={() => console.log('Filter tasks - connect to API')}
          >
            Filter
          </button>
          <button 
            onClick={handleAddTask}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add new
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div className="p-4 border-b border-gray-200">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setTasksExpanded(!tasksExpanded)}
          >
            {tasksExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
            <h2 className="font-medium">Active tasks</h2>
            <span className="text-sm text-gray-500">{tasks.length}</span>
          </div>
        </div>

        {tasksExpanded && (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-gray-600 min-w-[300px]">Task</th>
                <th className="text-left p-3 text-xs font-medium text-gray-600">Status</th>
                <th className="text-left p-3 text-xs font-medium text-gray-600">Type</th>
                <th className="text-left p-3 text-xs font-medium text-gray-600">Due Date</th>
                <th className="text-left p-3 text-xs font-medium text-gray-600">Priority</th>
                <th className="text-left p-3 text-xs font-medium text-gray-600">Estimated Time</th>
                <th className="text-left p-3 text-xs font-medium text-gray-600">Assignee</th>
                <th className="text-left p-3 text-xs font-medium text-gray-600">Created In</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr 
                  key={task.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <td className="p-3 text-sm">{task.title}</td>
                  <td className="p-3">
                    <select 
                      className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 bg-white cursor-pointer hover:border-gray-300"
                      value={task.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="New task">New task</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      className={`text-xs px-2 py-1 rounded cursor-pointer border-0 ${getTypeColor(task.type)}`}
                      value={task.type}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleTypeChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="Financial">Financial</option>
                      <option value="Strategic">Strategic</option>
                      <option value="Operational">Operational</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 cursor-pointer hover:border-gray-300"
                      value={task.dueDate || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleDueDateChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-3">
                    <select
                      className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${getPriorityColor(task.priority)}`}
                      value={task.priority}
                      onChange={(e) => {
                        e.stopPropagation();
                        handlePriorityChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="">None</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      placeholder="—"
                      className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 w-20 hover:border-gray-300"
                      value={task.estimatedTime || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleEstimatedTimeChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                      <span className="text-sm">{task.assignee}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs text-gray-500">{task.createdIn}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CalendarView() {
  // TODO: Replace with API call to fetch calendar events
  const [events] = useState([
    {
      id: 1,
      title: "Sóc lọ",
      project: "gym",
      time: "24h",
      status: "Exp. yesterday",
      date: "2025-09-27"
    }
  ]);

  // TODO: Replace with API call to fetch waiting list
  const [waitingList] = useState([
    { id: 1, title: "📱 Install updates on PC and smartphone", time: "0:30h", type: "tech" },
    { id: 2, title: "💪 Sign up for the gym", time: null, type: "health" },
    { id: 3, title: "🔔 Check your health", time: null, type: "health" },
    { id: 4, title: "🔧 Clean your house", time: "2h", type: "home" },
    { id: 5, title: "💰 Get personal finances in order", time: "1:30h", type: "finance" },
  ]);

  const handleAddEvent = () => {
    // TODO: Implement API call to add new calendar event
    console.log('Add new event - connect to API');
  };

  const handleEventClick = (eventId) => {
    // TODO: Implement API call to get event details
    console.log('Event clicked:', eventId);
  };

  const handleDateChange = (direction) => {
    // TODO: Implement API call to change calendar date range
    console.log('Change date:', direction);
  };

  const handleWaitingListItemClick = (itemId) => {
    // TODO: Implement API call to get waiting list item details
    console.log('Waiting list item clicked:', itemId);
  };

  const handleMoveToCalendar = (itemId, date) => {
    // TODO: Implement API call to move item from waiting list to calendar
    console.log('Move to calendar:', itemId, date);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <button 
          onClick={handleAddEvent}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add new
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button 
                  className="text-gray-600 hover:text-gray-800"
                  onClick={() => handleDateChange('prev')}
                >
                  ←
                </button>
                <h2 className="font-medium">September 2025</h2>
                <button 
                  className="text-gray-600 hover:text-gray-800"
                  onClick={() => handleDateChange('next')}
                >
                  →
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  onClick={() => console.log('Go to today - connect to API')}
                >
                  Today
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {['27 Sat', '28 Sun', '29 Mon', '30 Tue', '1 Wed'].map((day, idx) => (
                <div 
                  key={idx}
                  className={`text-center text-sm font-medium p-2 rounded cursor-pointer ${
                    idx === 2 ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => console.log('Date clicked:', day)}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="bg-red-100 p-3 rounded cursor-pointer hover:bg-red-200"
                  onClick={() => handleEventClick(event.id)}
                >
                  <div className="font-medium text-sm">{event.title}</div>
                  <div className="text-xs text-gray-600">{event.project}</div>
                  <div className="text-xs text-gray-500">{event.time} | {event.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-80">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Waiting list</h3>
              <span className="text-sm text-gray-500">{waitingList.length}</span>
            </div>
            <div className="space-y-2">
              {waitingList.map((item) => (
                <div 
                  key={item.id}
                  className="bg-blue-100 p-3 rounded cursor-pointer hover:bg-blue-200"
                  onClick={() => handleWaitingListItemClick(item.id)}
                >
                  <div className="text-sm">{item.title}</div>
                  {item.time && <div className="text-xs text-gray-600 mt-1">{item.time}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesView() {
  // TODO: Replace with API call to fetch notes
  const [notes] = useState([
    {
      id: 1,
      title: "New note",
      content: "",
      lastEdited: "Today"
    }
  ]);

  const [selectedNote, setSelectedNote] = useState(notes[0]);

  const handleAddNote = () => {
    // TODO: Implement API call to add new note
    console.log('Add new note - connect to API');
  };

  const handleNoteClick = (noteId) => {
    // TODO: Implement API call to get note details
    console.log('Note clicked:', noteId);
    const note = notes.find(n => n.id === noteId);
    if (note) setSelectedNote(note);
  };

  const handleNoteTitleChange = (noteId, newTitle) => {
    // TODO: Implement API call to update note title
    console.log('Update note title:', noteId, newTitle);
  };

  const handleNoteContentChange = (noteId, newContent) => {
    // TODO: Implement API call to update note content
    console.log('Update note content:', noteId, newContent);
  };

  const handleDeleteNote = (noteId) => {
    // TODO: Implement API call to delete note
    console.log('Delete note:', noteId);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <button 
          onClick={handleAddNote}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add new
        </button>
      </div>

      <div className="flex gap-4">
        <div className="w-64 bg-white rounded-lg border border-gray-200 p-4">
          <div className="space-y-2">
            {notes.map((note) => (
              <div 
                key={note.id}
                className={`p-3 rounded cursor-pointer ${
                  selectedNote?.id === note.id 
                    ? 'bg-blue-50 border-l-2 border-blue-500' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleNoteClick(note.id)}
              >
                <div className="font-medium text-sm">{note.title}</div>
                <div className="text-xs text-gray-500">
                  {note.content ? note.content.substring(0, 50) + '...' : 'No text yet'}
                </div>
                <div className="text-xs text-gray-400 mt-1">{note.lastEdited}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
          {selectedNote ? (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Title"
                  className="w-full text-3xl font-bold text-gray-800 border-none focus:outline-none placeholder-gray-400"
                  value={selectedNote.title}
                  onChange={(e) => handleNoteTitleChange(selectedNote.id, e.target.value)}
                />
              </div>
              <div className="border-t border-gray-200 pt-4">
                <textarea
                  placeholder="Write your text here..."
                  className="w-full h-96 text-gray-600 border-none focus:outline-none resize-none"
                  value={selectedNote.content}
                  onChange={(e) => handleNoteContentChange(selectedNote.id, e.target.value)}
                />
              </div>
              <div className="mt-4 text-xs text-gray-400">
                Last edited: {selectedNote.lastEdited}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a note to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}