'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/group.service';
import { Group } from '../services/types/group.types';

interface GroupSelectorProps {
  onGroupChange?: (group: Group | null) => void;
}

export default function GroupSelector({ onGroupChange }: GroupSelectorProps) {
  const { user, updateUser, setCurrentGroup } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getAllGroups();
      setGroups(response.allGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchGroup = async (groupId: string) => {
    try {
      const result = await groupService.switchToGroup(groupId);
      setCurrentGroup(result.group);
      onGroupChange?.(result.group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch group');
    }
  };

  const handleCreateGroup = async (groupData: { name: string; description?: string }) => {
    try {
      const newGroup = await groupService.createGroup(groupData);
      setGroups(prev => [newGroup, ...prev]);
      setCurrentGroup(newGroup);
      onGroupChange?.(newGroup);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const currentGroup = groups.find(g => g._id === user?.currentGroupId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading groups...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadGroups}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Group Display */}
      {currentGroup ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Current Group</h3>
              <p className="text-blue-700">{currentGroup.name}</p>
              {currentGroup.description && (
                <p className="text-sm text-blue-600 mt-1">{currentGroup.description}</p>
              )}
            </div>
            <div className="text-sm text-blue-600">
              {currentGroup.memberCount} member{currentGroup.memberCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            You need to join or create a group to manage tasks.
          </p>
        </div>
      )}

      {/* Group List */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Your Groups</h4>
        {groups.length === 0 ? (
          <p className="text-gray-500 text-sm">No groups found</p>
        ) : (
          <div className="space-y-2">
            {groups.map(group => (
              <div
                key={group._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  group._id === user?.currentGroupId
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => handleSwitchGroup(group._id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">{group.name}</h5>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Create New Group
      </button>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}
    </div>
  );
}

interface CreateGroupModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => void;
}

function CreateGroupModal({ onClose, onSubmit }: CreateGroupModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Group</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter group name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter group description (optional)"
              rows={3}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
