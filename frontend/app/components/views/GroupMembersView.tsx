'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { groupService } from '../../services/group.service';
import { notificationService } from '../../services/notification.service';
import { Group, GroupMember } from '../../services/types/group.types';
import { useGroupChange } from '../../hooks/useGroupChange';

interface GroupMembersViewProps {
  groupId?: string;
}

export default function GroupMembersView({ groupId }: GroupMembersViewProps) {
  const { user, currentGroup } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [showEditButton, setShowEditButton] = useState(false);

  const targetGroupId = groupId || currentGroup?._id;

  useEffect(() => {
    if (targetGroupId) {
      loadGroupDetails();
    }
  }, [targetGroupId]);

  // Reload when currentGroup changes
  useEffect(() => {
    if (currentGroup?._id && currentGroup._id !== targetGroupId) {
      loadGroupDetails();
    }
  }, [currentGroup?._id]);

  // Listen for global group change events
  useGroupChange(() => {
    console.log('Group change detected, reloading GroupMembersView');
    loadGroupDetails();
  });

  // Smart auto-reload effect - reload every 30 seconds, but pause when user is editing
  useEffect(() => {
    if (!targetGroupId || isEditingName) return;

    const interval = setInterval(() => {
      loadGroupDetails(true); // Show notification for auto-reloads
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [targetGroupId, isEditingName]);

  // Auto-reload when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (targetGroupId) {
        loadGroupDetails();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [targetGroupId]);

  const loadGroupDetails = async (showNotification = false) => {
    if (!targetGroupId) return;

    try {
      setLoading(true);
      setError(null);
      const groupData = await groupService.getGroupById(targetGroupId);
      
      // Check if there are changes
      const hasChanges = group && (
        group.name !== groupData.name ||
        group.members.length !== groupData.members.length ||
        JSON.stringify(group.members.map(m => m.userId)) !== JSON.stringify(groupData.members.map(m => m.userId))
      );
      
      setGroup(groupData);
      setMembers(groupData.members || []);
      setLastUpdateTime(Date.now());
      
      // Show notification if there are changes and not the initial load
      if (showNotification && hasChanges && group) {
        setShowUpdateNotification(true);
        setTimeout(() => setShowUpdateNotification(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (email: string) => {
    if (!targetGroupId) return;

    try {
      await groupService.inviteUserToGroup(targetGroupId, email);
      // Reload group details to get updated member list
      await loadGroupDetails();
      setShowInviteModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!targetGroupId) return;

    const confirmed = window.confirm(`Are you sure you want to remove ${memberName} from this group?`);
    if (!confirmed) return;

    try {
      await groupService.removeMember(targetGroupId, memberId);
      // Reload group details to get updated member list
      await loadGroupDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleStartEditName = () => {
    if (!group) return;
    console.log('Starting edit name:', { group, user, isAdmin: isCurrentUserAdmin() });
    setEditingName(group.name);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  const handleSaveName = async () => {
    if (!targetGroupId || !editingName.trim() || !group) return;

    const oldName = group.name;
    const newName = editingName.trim();

    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedGroup = await groupService.updateGroup(targetGroupId, {
        name: newName
      });
      
      setGroup(updatedGroup);
      setIsEditingName(false);
      setEditingName('');
      
      // Send notification to all group members about name change
      try {
        await notificationService.createGroupNameChangeNotification(targetGroupId, oldName, newName);
      } catch (notifErr) {
        console.warn('Failed to send notification:', notifErr);
      }
      
      // Update current group in context if this is the current group
      if (currentGroup?._id === targetGroupId) {
        // You might want to update the context here
        window.location.reload(); // Simple reload for now
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group name');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEditName();
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Project owner';
      case 'member':
        return 'Member';
      default:
        return role;
    }
  };

  const getMemberName = (member: GroupMember) => {
    // Handle populated userId object
    if (member.userId && typeof member.userId === 'object' && 'name' in member.userId) {
      return (member.userId as any).name;
    }
    // Handle direct name property
    return member.name;
  };

  const getMemberEmail = (member: GroupMember) => {
    // Handle populated userId object
    if (member.userId && typeof member.userId === 'object' && 'email' in member.userId) {
      return (member.userId as any).email;
    }
    // Handle direct email property
    return member.email;
  };

  const getStatusDisplay = (member: GroupMember) => {
    // For now, all members are considered active
    // You can extend this based on your business logic
    return (
      <div className="flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
        <span className="text-sm font-medium text-green-700 dark:text-green-400">Active</span>
      </div>
    );
  };

  const isCurrentUser = (member: GroupMember) => {
    const memberId = typeof member.userId === 'string' ? member.userId : member.userId._id;
    return memberId === user?._id;
  };

  const isCurrentUserAdmin = () => {
    if (!group || !user) {
      console.log('isCurrentUserAdmin: No group or user', { group: !!group, user: !!user });
      return false;
    }
    const currentMember = group.members.find(member => {
      const memberId = typeof member.userId === 'string' ? member.userId : member.userId._id;
      return memberId === user._id;
    });
    const isAdmin = currentMember?.role === 'admin';
    console.log('isCurrentUserAdmin:', { 
      currentMember, 
      isAdmin, 
      userRole: currentMember?.role,
      userId: user._id,
      members: group.members.map(m => ({ 
        id: typeof m.userId === 'string' ? m.userId : m.userId._id, 
        role: m.role 
      }))
    });
    return isAdmin;
  };

  const canRemoveMember = (member: GroupMember) => {
    if (!isCurrentUserAdmin()) return false;
    if (isCurrentUser(member)) return false; // Can't remove yourself
    if (member.role === 'admin') return false; // Can't remove other admins (only owner can)
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => loadGroupDetails()}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No group selected</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 relative">
      {/* Update Notification */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">Group updated!</span>
        </div>
      )}
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Group Name with Inline Editing */}
            <div className="flex items-center group">
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 px-1 py-1 min-w-0 flex-1"
                    autoFocus
                    disabled={isUpdating}
                  />
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleSaveName}
                      disabled={isUpdating || !editingName.trim()}
                      className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save"
                    >
                      {isUpdating ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEditName}
                      disabled={isUpdating}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-center"
                  onMouseEnter={() => setShowEditButton(true)}
                  onMouseLeave={() => setShowEditButton(false)}
                >
                  <h1 
                    className="text-3xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onDoubleClick={isCurrentUserAdmin() ? handleStartEditName : undefined}
                    title={isCurrentUserAdmin() ? "Double click to edit" : undefined}
                  >
                    {group.name}
                  </h1>
                  {/* Always show edit button for debugging */}
                  <button
                    onClick={handleStartEditName}
                    className="ml-3 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                    title="Edit group name"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {/* Debug info */}
                  <div className="ml-2 text-xs text-gray-500">
                    Admin: {isCurrentUserAdmin() ? 'Yes' : 'No'}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              {group.description || 'No description provided'}
            </p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadGroupDetails()}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add people
            </button>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className={`grid gap-6 items-center ${isCurrentUserAdmin() ? 'grid-cols-5' : 'grid-cols-4'}`}>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Member</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Email</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Role</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Status</div>
              {isCurrentUserAdmin() && (
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Actions</div>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {members.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">No members found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Invite people to get started</p>
              </div>
            ) : (
              members.map((member) => (
                <div key={typeof member.userId === 'string' ? member.userId : member.userId._id} className="px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className={`grid gap-6 items-center ${isCurrentUserAdmin() ? 'grid-cols-5' : 'grid-cols-4'}`}>
                    {/* Name */}
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                          {getMemberName(member) ? getMemberName(member).charAt(0).toUpperCase() : '?'}
                        </div>
                        {member.role === 'admin' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="flex items-center">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {isCurrentUser(member) ? 'Me' : getMemberName(member) || 'Unknown'}
                          </span>
                          {isCurrentUser(member) && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getMemberEmail(member) || 'No email'}
                    </div>

                    {/* Role */}
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'admin' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {member.role === 'admin' && (
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                        {getRoleDisplayName(member.role)}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      {getStatusDisplay(member)}
                    </div>

                    {/* Actions */}
                    {isCurrentUserAdmin() && (
                      <div className="flex items-center">
                        {canRemoveMember(member) ? (
                          <button
                            onClick={() => {
                              const memberId = typeof member.userId === 'string' ? member.userId : member.userId._id;
                              handleRemoveMember(memberId, getMemberName(member) || 'Unknown');
                            }}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove member"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add People Link */}
        {members.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
            >
              + Add people
            </button>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteUser}
        />
      )}
    </div>
  );
}

interface InviteUserModalProps {
  onClose: () => void;
  onInvite: (email: string) => void;
}

function InviteUserModal({ onClose, onInvite }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onInvite(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Invite User to Group
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter user's email address"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
