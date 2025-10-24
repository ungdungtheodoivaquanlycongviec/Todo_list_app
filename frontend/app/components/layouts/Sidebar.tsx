"use client";

import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, X, Users, Folder} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { groupService } from '../../services/group.service';
import { Group } from '../../services/types/group.types';

// Create Group Modal Component
interface CreateGroupModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined });
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Folder className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add a new project to your workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter project name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
              placeholder="Enter project description"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-[#2E2E2E] text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-[#3E3E3E] transition-all duration-200 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invite User Modal Component
interface InviteUserModalProps {
  groupName: string;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ groupName, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    try {
      await onSubmit(email.trim());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invite Team Member</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add someone to your project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Inviting to: <strong className="text-blue-800 dark:text-blue-200">{groupName}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter user's email address"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <div className="flex items-center">
                <X className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-[#2E2E2E] text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-[#3E3E3E] transition-all duration-200 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending...
                </div>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Sidebar() {
  const { user, currentGroup, setCurrentGroup } = useAuth();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [sharedGroups, setSharedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getAllGroups();
      setMyGroups(response.myGroups);
      setSharedGroups(response.sharedGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceChange = async (groupId: string) => {
    if (groupId === currentGroup?._id) return;
    
    try {
      const result = await groupService.switchToGroup(groupId);
      setCurrentGroup(result.group);
    } catch (error) {
      console.error('Failed to switch group:', error);
    }
  };

  const handleSearch = (query: string) => {
    console.log('Search groups:', query);
    // TODO: Implement search functionality
  };

  const handleAddProject = () => {
    setShowCreateModal(true);
  };

  const handleProjectClick = async (group: Group) => {
    await handleWorkspaceChange(group._id);
  };

  const handleCreateGroup = async (groupData: { name: string; description?: string }) => {
    try {
      const newGroup = await groupService.createGroup(groupData);
      setMyGroups(prev => [newGroup, ...prev]);
      setCurrentGroup(newGroup);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleInviteUser = (group: Group) => {
    setSelectedGroup(group);
    setShowInviteModal(true);
  };

  const handleInviteSubmit = async (email: string) => {
    if (!selectedGroup) return;
    
    try {
      await groupService.inviteUserToGroup(selectedGroup._id, email);
      setShowInviteModal(false);
      setSelectedGroup(null);
      // Reload groups to show updated member list
      loadGroups();
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-50 to-gray-100 dark:bg-[#1F1F1F] text-gray-900 dark:text-white flex flex-col border-r border-gray-200 dark:border-gray-700">
      {/* Header with User Info */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email || 'user@example.com'}</p>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="relative">
          <select 
            className="w-full bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white text-sm p-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer shadow-sm transition-all duration-200"
            value={currentGroup?._id || ''}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
          >
            {loading ? (
              <option value="">Loading workspaces...</option>
            ) : (
              [...myGroups, ...sharedGroups].map(group => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects, tasks..."
            className="w-full bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* My Projects */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">My Projects</span>
            </div>
            <button
              onClick={handleAddProject}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-xl transition-all duration-200"
              title="Create new project"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {projectsExpanded && (
            <div className="space-y-1">
              {loading ? (
                <div className="text-sm py-2 px-3 text-gray-500 dark:text-gray-400">Loading projects...</div>
              ) : myGroups.length === 0 ? (
                <div className="text-center py-6">
                  <Folder className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet</p>
                  <button
                    onClick={handleAddProject}
                    className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-1"
                  >
                    Create your first project
                  </button>
                </div>
              ) : (
                myGroups.map((group) => (
                  <div
                    key={group._id}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      currentGroup?._id === group._id 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                        : 'hover:bg-gray-50 dark:hover:bg-[#2E2E2E] border border-transparent'
                    }`}
                  >
                    <div
                      className="flex-1 flex items-center space-x-3 min-w-0"
                      onClick={() => handleProjectClick(group)}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        currentGroup?._id === group._id 
                          ? 'bg-blue-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          currentGroup?._id === group._id 
                            ? 'text-blue-700 dark:text-blue-300' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {group.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {group.members?.length || 0} members
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInviteUser(group);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-white dark:hover:bg-[#2E2E2E] rounded-lg"
                      title="Invite team members"
                    >
                      <Users className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Shared with me */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setSharedExpanded(!sharedExpanded)}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Shared with me</span>
            </div>
            {sharedExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
          {sharedExpanded && (
            <div className="space-y-1">
              {loading ? (
                <div className="text-sm py-2 px-3 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : sharedGroups.length === 0 ? (
                <div className="text-sm py-2 px-3 text-gray-500 dark:text-gray-400">No shared projects</div>
              ) : (
                sharedGroups.map((group) => (
                  <div
                    key={group._id}
                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      currentGroup?._id === group._id 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                        : 'hover:bg-gray-50 dark:hover:bg-[#2E2E2E] border border-transparent'
                    }`}
                    onClick={() => handleProjectClick(group)}
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        currentGroup?._id === group._id 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Shared project</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {/* Invite User Modal */}
      {showInviteModal && selectedGroup && (
        <InviteUserModal
          groupName={selectedGroup.name}
          onClose={() => {
            setShowInviteModal(false);
            setSelectedGroup(null);
          }}
          onSubmit={handleInviteSubmit}
        />
      )}
    </div>
  );
}