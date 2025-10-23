"use client"

import React, { useState } from 'react';
import { Search, Plus, ChevronDown, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  
  // TODO: Replace with API calls
  const [currentWorkspace] = useState('Personal Workspace');
  const [projects] = useState(['test']);
  const [sharedProjects] = useState(['gym']);

  const handleWorkspaceChange = (workspace: string) => {
    console.log('Switch workspace:', workspace);
  };

  const handleSearch = (query: string) => {
    console.log('Search projects:', query);
  };

  const handleAddProject = () => {
    console.log('Add new project - connect to API');
  };

  const handleProjectClick = (projectName: string) => {
    console.log('Project clicked:', projectName);
  };

  return (
    // THAY ĐỔI: w-[12.5%] thành w-full vì grid đã xử lý width
    <div className="w-full h-full bg-[#0F1D40] text-[#FFFFE6] flex flex-col">
      {/* Personal Workspace Title */}
      <div className="p-4 border-b border-[#2D4071]">
        <select 
          className="w-full bg-[#1a2847] text-[#FFFFE6] text-sm p-2 rounded border-none focus:outline-none focus:ring-1 focus:ring-[#2D4071] cursor-pointer"
          value={currentWorkspace}
          onChange={(e) => handleWorkspaceChange(e.target.value)}
        >
          <option value="Personal Workspace">Personal Workspace</option>
        </select>
      </div>

      {/* Search and All my activities */}
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

      {/* Projects */}
      <div className="p-4 border-b border-[#2D4071]">
        <div
          className="flex items-center justify-between cursor-pointer mb-2"
          onClick={() => setProjectsExpanded(!projectsExpanded)}
        >
          <span className="text-[#839399] text-xs uppercase tracking-wide">Groups</span>
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

      {/* Shared with me */}
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
  );
}