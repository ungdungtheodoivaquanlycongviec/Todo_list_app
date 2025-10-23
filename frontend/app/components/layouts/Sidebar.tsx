"use client"

import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a2847] rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#FFFFE6]">Create New Group</h2>
          <button
            onClick={onClose}
            className="text-[#839399] hover:text-[#FFFFE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#FFFFE6] mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0F1D40] text-[#FFFFE6] placeholder-[#839399] px-3 py-2 rounded border border-[#2D4071] focus:outline-none focus:ring-1 focus:ring-[#4a5f8f]"
              placeholder="Enter group name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#FFFFE6] mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0F1D40] text-[#FFFFE6] placeholder-[#839399] px-3 py-2 rounded border border-[#2D4071] focus:outline-none focus:ring-1 focus:ring-[#4a5f8f] resize-none"
              placeholder="Enter group description"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#839399] hover:text-[#FFFFE6] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-4 py-2 bg-[#4a5f8f] text-[#FFFFE6] rounded hover:bg-[#5a6f9f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Group'}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a2847] rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#FFFFE6]">Invite User to Group</h2>
          <button
            onClick={onClose}
            className="text-[#839399] hover:text-[#FFFFE6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[#839399] text-sm mb-4">
          Invite a user to join <strong className="text-[#FFFFE6]">{groupName}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#FFFFE6] mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0F1D40] text-[#FFFFE6] placeholder-[#839399] px-3 py-2 rounded border border-[#2D4071] focus:outline-none focus:ring-1 focus:ring-[#4a5f8f]"
              placeholder="Enter user's email address"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#839399] hover:text-[#FFFFE6] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="px-4 py-2 bg-[#4a5f8f] text-[#FFFFE6] rounded hover:bg-[#5a6f9f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Inviting...' : 'Send Invitation'}
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
    // THAY ĐỔI: w-[12.5%] thành w-full vì grid đã xử lý width
    <div className="w-full h-full bg-[#0F1D40] text-[#FFFFE6] flex flex-col">
      {/* Current Workspace Title */}
      <div className="p-4 border-b border-[#2D4071]">
        <select 
          className="w-full bg-[#1a2847] text-[#FFFFE6] text-sm p-2 rounded border-none focus:outline-none focus:ring-1 focus:ring-[#2D4071] cursor-pointer"
          value={currentGroup?._id || ''}
          onChange={(e) => handleWorkspaceChange(e.target.value)}
        >
          {loading ? (
            <option value="">Loading...</option>
          ) : (
            [...myGroups, ...sharedGroups].map(group => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))
          )}
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

      {/* My Groups */}
      <div className="p-4 border-b border-[#2D4071]">
        <div
          className="flex items-center justify-between cursor-pointer mb-2"
          onClick={() => setProjectsExpanded(!projectsExpanded)}
        >
          <span className="text-[#839399] text-xs uppercase tracking-wide">My Groups</span>
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
            {loading ? (
              <div className="text-sm py-1.5 px-2 text-[#839399]">Loading...</div>
            ) : myGroups.length === 0 ? (
              <div className="text-sm py-1.5 px-2 text-[#839399]">No groups yet</div>
            ) : (
              myGroups.map((group) => (
                <div
                  key={group._id}
                  className={`text-sm py-1.5 px-2 hover:bg-[#1a2847] rounded cursor-pointer flex items-center justify-between group ${
                    currentGroup?._id === group._id ? 'bg-[#1a2847] text-[#FFFFE6]' : ''
                  }`}
                >
                  <span
                    className="flex-1"
                    onClick={() => handleProjectClick(group)}
                  >
                    {group.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInviteUser(group);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#839399] hover:text-[#FFFFE6] ml-2"
                    title="Invite user"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
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
            {loading ? (
              <div className="text-sm py-1.5 px-2 text-[#839399]">Loading...</div>
            ) : sharedGroups.length === 0 ? (
              <div className="text-sm py-1.5 px-2 text-[#839399]">No shared groups</div>
            ) : (
              sharedGroups.map((group) => (
                <div
                  key={group._id}
                  className={`text-sm py-1.5 px-2 hover:bg-[#1a2847] rounded cursor-pointer ${
                    currentGroup?._id === group._id ? 'bg-[#1a2847] text-[#FFFFE6]' : ''
                  }`}
                  onClick={() => handleProjectClick(group)}
                >
                  {group.name}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
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