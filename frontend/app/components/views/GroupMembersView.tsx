'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { groupService } from '../../services/group.service';
import { userService } from '../../services/user.service';
import { notificationService } from '../../services/notification.service';
import { Group, GroupMember } from '../../services/types/group.types';
import { useGroupChange } from '../../hooks/useGroupChange';
import NoGroupState from '../common/NoGroupState';
import { Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import { useFolder } from '../../contexts/FolderContext';
import { folderService } from '../../services/folder.service';
import { Folder } from '../../services/types/folder.types';
import {
  getRoleLabel,
  ROLE_SUMMARIES,
  GROUP_ROLE_KEYS,
  GroupRoleKey,
  getRoleSummaries,
  ROLE_BADGE_COLORS
} from '../../constants/groupRoles';
import {
  getMemberId,
  getMemberRole,
  canManageRoles as canManageRolesFor,
  canAddMembers,
  canAssignFolderMembers,
  requiresFolderAssignment as requiresFolderAssignmentHelper
} from '../../utils/groupRoleUtils';
import { FolderAccessModal } from '../folders/FolderAccessModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { TranslationKey } from '../../i18n/translations';
import { useRegional } from '../../contexts/RegionalContext';
import { useConfirm } from '../../contexts/ConfirmContext';

interface GroupMembersViewProps {
  groupId?: string;
}

export default function GroupMembersView({ groupId }: GroupMembersViewProps) {
  const { user, currentGroup } = useAuth();
  const { folders, refreshFolders } = useFolder();
  const { t } = useLanguage();
  const { formatTime } = useRegional();
  const confirmDialog = useConfirm();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [activeFolderForAssignment, setActiveFolderForAssignment] = useState<Folder | null>(null);
  const [folderModalSaving, setFolderModalSaving] = useState(false);
  const [folderModalError, setFolderModalError] = useState<string | null>(null);
  const [folderBlockedUsers, setFolderBlockedUsers] = useState<Array<{
    userId: string;
    userName: string;
    userEmail: string;
    tasks: Array<{ taskId: string; taskTitle: string; taskStatus: string }>;
  }>>([]);

  const targetGroupId = groupId || currentGroup?._id;
  // Use account-level business role (assigned by admin)
  const currentUserRole = ((user as any)?.groupRole || null) as GroupRoleKey | null;
  const isLeader = Boolean((user as any)?.isLeader);
  const canEditRoles = canManageRolesFor();
  const canAddMembersCheck = canAddMembers(currentUserRole, isLeader);
  const showFolderAssignments = Boolean(group?._id && currentGroup?._id && group?._id === currentGroup?._id);
  const folderAssignments = useMemo(() => {
    if (!showFolderAssignments || !Array.isArray(folders)) {
      return new Map<string, string[]>();
    }

    const assignmentMap = new Map<string, string[]>();
    const currentUserId = user?._id;
    const canAssignFolders = canAssignFolderMembers(currentUserRole, isLeader);

    folders.forEach(folder => {
      if (!folder.memberAccess) return;
      folder.memberAccess.forEach(access => {
        if (!access?.userId) return;
        // Only show assignments for current user, unless user is admin
        if (!canAssignFolders && access.userId !== currentUserId) {
          return;
        }
        const existing = assignmentMap.get(access.userId) || [];
        assignmentMap.set(access.userId, [...existing, folder.name]);
      });
    });

    return assignmentMap;
  }, [folders, showFolderAssignments, user?._id, currentUserRole]);

  const getAssignedFolderNames = (memberId?: string | null) => {
    if (!memberId) return [];
    return folderAssignments.get(memberId) || [];
  };

  const assignableFolders = useMemo(() => {
    if (!showFolderAssignments) return [];
    return (folders || []).filter(folder => !folder.isDefault);
  }, [folders, showFolderAssignments]);

  const memberLookup = useMemo(() => {
    const map = new Map<string, GroupMember>();
    members.forEach(member => {
      const id = getMemberId(member);
      if (id) {
        map.set(id, member);
      }
    });
    return map;
  }, [members]);

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

  useEffect(() => {
    if (!group?._id || !currentGroup?._id) return;
    if (group._id !== currentGroup._id) return;
    refreshFolders();
  }, [group?._id, currentGroup?._id, refreshFolders]);

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

      if (!groupData) {
        throw new Error('Group not found or access denied');
      }

      // Check if there are changes
      const hasChanges = group && (
        group.name !== groupData.name ||
        group.members.length !== groupData.members.length ||
        JSON.stringify(group.members.map(m => m.userId)) !== JSON.stringify(groupData.members.map(m => m.userId))
      );

      setGroup(groupData);
      setMembers(groupData.members || []);
      setLastUpdateTime(Date.now());
      setRoleUpdateError(null);

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

  const handleRoleChange = async (member: GroupMember, role: GroupRoleKey) => {
    if (!group?._id) return;
    const memberId = getMemberId(member);
    if (!memberId) return;

    setRoleUpdateError(null);

    try {
      throw new Error('Group member role editing has been removed. Roles are assigned by admin at account level.');
      await loadGroupDetails();
      if (showFolderAssignments) {
        await refreshFolders();
      }
    } catch (err) {
      setRoleUpdateError(err instanceof Error ? err.message : 'Failed to update member role');
    }
  };

  const handleOpenFolderModal = (folder: Folder) => {
    if (!canAssignFolderMembers(currentUserRole, isLeader)) return;
    setFolderModalError(null);
    setFolderBlockedUsers([]);
    setActiveFolderForAssignment(folder);
    setFolderModalOpen(true);
  };

  const handleCloseFolderModal = () => {
    if (folderModalSaving) return;
    setFolderModalOpen(false);
    setActiveFolderForAssignment(null);
    setFolderModalError(null);
    setFolderBlockedUsers([]);
  };

  const handleSaveFolderMembers = async (memberIds: string[]) => {
    if (!group?._id || !activeFolderForAssignment) return;
    setFolderModalSaving(true);
    setFolderModalError(null);
    setFolderBlockedUsers([]);
    try {
      await folderService.setFolderMembers(group._id, activeFolderForAssignment._id, memberIds);
      await refreshFolders(activeFolderForAssignment._id);
      await loadGroupDetails(true);
      setFolderModalOpen(false);
      setActiveFolderForAssignment(null);
    } catch (err: unknown) {
      const error = err as Error & {
        blockedUsers?: Array<{
          userId: string;
          userName: string;
          userEmail: string;
          tasks: Array<{ taskId: string; taskTitle: string; taskStatus: string }>;
        }>
      };
      setFolderModalError(error.message || 'Không thể cập nhật truy cập folder');
      if (error.blockedUsers && Array.isArray(error.blockedUsers)) {
        setFolderBlockedUsers(error.blockedUsers);
      }
    } finally {
      setFolderModalSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!targetGroupId) return;

    const confirmed = await confirmDialog.confirm({
      title: 'Xóa thành viên',
      message: `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm này không?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger',
      icon: 'delete'
    });
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
    if (!group || !canEditRoles) return;
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

  const handleDeleteGroup = async () => {
    if (!targetGroupId) return;

    setIsDeleting(true);
    setError(null);
    try {
      // First, find a fallback group before deleting
      const groupsResponse = await groupService.getAllGroups();
      const allGroups = [...groupsResponse.myGroups, ...groupsResponse.sharedGroups];
      const fallbackGroup = allGroups.find(g => g._id !== targetGroupId);

      // Update user's currentGroupId on server to fallback group before deleting
      if (fallbackGroup) {
        try {
          await userService.updateProfile({ currentGroupId: fallbackGroup._id });
          console.log('Pre-set currentGroupId to fallback group:', fallbackGroup._id);
        } catch (updateError) {
          console.error('Failed to update currentGroupId before delete:', updateError);
        }
      } else {
        // No other groups, clear the currentGroupId
        try {
          await userService.updateProfile({ currentGroupId: undefined });
          console.log('Cleared currentGroupId - no fallback group available');
        } catch (updateError) {
          console.error('Failed to clear currentGroupId:', updateError);
        }
      }

      // Now delete the group
      await groupService.deleteGroup(targetGroupId);

      // Reload the page or redirect after successful deletion
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
      setIsDeleting(false);
    }
  };


  const getMemberName = (member: GroupMember) => {
    // Handle populated userId object - prioritize userId.name if it exists
    if (member.userId && typeof member.userId === 'object' && member.userId._id) {
      const userName = (member.userId as any).name;
      if (userName) return userName;
      // Fallback to member.name if userId.name doesn't exist
      if (member.name) return member.name;
    }
    // Handle direct name property (when userId is a string)
    return member.name;
  };

  const getMemberEmail = (member: GroupMember) => {
    // Handle populated userId object - prioritize userId.email if it exists
    if (member.userId && typeof member.userId === 'object' && member.userId._id) {
      const userEmail = (member.userId as any).email;
      if (userEmail) return userEmail;
      // Fallback to member.email if userId.email doesn't exist
      if (member.email) return member.email;
    }
    // Handle direct email property (when userId is a string)
    return member.email;
  };

  const getMemberAvatar = (member: GroupMember) => {
    // Handle populated userId object - prioritize userId.avatar if it exists
    if (member.userId && typeof member.userId === 'object' && member.userId._id) {
      const userAvatar = (member.userId as any).avatar;
      if (userAvatar) return userAvatar;
      // Fallback to member.avatar if userId.avatar doesn't exist
      if (member.avatar) return member.avatar;
    }
    // Handle direct avatar property (when userId is a string)
    return member.avatar;
  };

  const renderAccessSummary = (member: GroupMember) => {
    const roleSummaries = getRoleSummaries(t as any);
    const memberUser = member.userId && typeof member.userId === 'object' ? (member.userId as any) : null;
    const memberBusinessRole = (memberUser?.groupRole || null) as GroupRoleKey | null;
    const memberIsLeader = Boolean(memberUser?.isLeader);
    const summary = memberBusinessRole ? roleSummaries[memberBusinessRole] : null;
    const memberId = getMemberId(member);
    const assignedFolders = showFolderAssignments ? getAssignedFolderNames(memberId) : [];
    const needsFolderAssignment =
      showFolderAssignments && requiresFolderAssignmentHelper(memberBusinessRole) && assignedFolders.length === 0;

    return (
      <div className="text-sm">
        <p className="font-semibold text-gray-800 dark:text-gray-100">
          {summary?.summary || '---'}
          {memberIsLeader && (
            <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-300">(Lead)</span>
          )}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {summary?.capabilities}
        </p>
        {requiresFolderAssignmentHelper(memberBusinessRole) && showFolderAssignments && (
          <div className="mt-1 text-xs">
            {needsFolderAssignment ? (
              <span className="inline-flex items-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {t('groupMembers.notAssignedFolder')}
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-300">
                {t('groupMembers.folder')}: {assignedFolders.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRoleBadge = (role: GroupRoleKey) => {
    const label = getRoleLabel(role, t as any);
    const gradient = ROLE_BADGE_COLORS[role] || 'from-gray-500 to-gray-600';
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${gradient}`}
      >
        {label}
      </span>
    );
  };

  const renderRoleCell = (member: GroupMember) => {
    const memberUser = member.userId && typeof member.userId === 'object' ? (member.userId as any) : null;
    const memberBusinessRole = (memberUser?.groupRole || null) as GroupRoleKey | null;

    if (!memberBusinessRole) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700">
          No role
        </span>
      );
    }

    return renderRoleBadge(memberBusinessRole);
  };

  const isCurrentUser = (member: GroupMember) => getMemberId(member) === user?._id;

  const canRemoveMember = (member: GroupMember) => {
    if (!canEditRoles) return false;
    if (isCurrentUser(member)) return false;
    const memberUser = member.userId && typeof member.userId === 'object' ? (member.userId as any) : null;
    const memberBusinessRole = memberUser?.groupRole as GroupRoleKey | null | undefined;
    if (memberBusinessRole === GROUP_ROLE_KEYS.PRODUCT_OWNER) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">{t('groupMembers.loadingMembers')}</span>
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
          {t('groupMembers.tryAgain')}
        </button>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <NoGroupState
        title={t('groupMembers.joinOrCreateTitle')}
        description={t('groupMembers.joinOrCreateDesc')}
      />
    );
  }

  if (!group) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('groupMembers.noGroupSelected')}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#1A1A1A] relative">
      {/* Update Notification */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">{t('groupMembers.groupUpdated')}</span>
        </div>
      )}
      {/* Header */}
      <div className="bg-white dark:bg-[#1F1F1F] border-b border-gray-200 dark:border-gray-700 px-6 py-6">
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
                    className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onDoubleClick={canEditRoles ? handleStartEditName : undefined}
                    title={canEditRoles ? 'Double click to edit' : undefined}
                  >
                    {group.name}
                  </h1>
                  {canEditRoles && (
                    <button
                      onClick={handleStartEditName}
                      className="ml-3 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg transition-all"
                      title="Edit group name"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              {group.description || t('groups.noDescription')}
            </p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {members.length} {members.length !== 1 ? t('groups.members') : t('groups.member')}
              </div>
              <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('groups.lastUpdated')}: {formatTime(new Date(lastUpdateTime))}
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
            {canEditRoles && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete group"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {canAddMembersCheck && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('groupMembers.addPeopleButton')}
              </button>
            )}
          </div>
        </div>
      </div>

      {canAssignFolderMembers(currentUserRole, isLeader) && showFolderAssignments && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('groupMembers.folderManagement')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('groupMembers.folderManagementDesc')}
              </p>
            </div>
          </div>
          {assignableFolders.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('groupMembers.noCustomFolders')}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {assignableFolders.map(folder => {
                const assigned = (folder.memberAccess || []).map(access => {
                  const member = memberLookup.get(access.userId);
                  const name = member ? getMemberName(member) : t('groupMembers.memberLeft');
                  const memberUser = member && member.userId && typeof member.userId === 'object' ? (member.userId as any) : null;
                  const memberBusinessRole = memberUser?.groupRole || null;
                  const roleLabel = memberBusinessRole ? getRoleLabel(memberBusinessRole, t as any) : '';
                  return { userId: access.userId, name, roleLabel };
                });

                return (
                  <div
                    key={folder._id}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151515] shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{folder.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('groupMembers.membersAssigned', { count: assigned.length })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenFolderModal(folder)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        {t('groupMembers.manageAccess')}
                      </button>
                    </div>
                    {assigned.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {assigned.slice(0, 3).map(user => (
                          <span
                            key={user.userId}
                            className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                          >
                            {user.name} • {user.roleLabel}
                          </span>
                        ))}
                        {assigned.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('groupMembers.otherMembers', { count: assigned.length - 3 })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t('groupMembers.folderNotAssigned')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="p-6">
        <div className="bg-white dark:bg-[#1F1F1F] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {roleUpdateError && (
            <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border-b border-red-100 dark:border-red-800">
              {roleUpdateError}
            </div>
          )}
          {/* Table Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className={`grid gap-6 items-center ${canEditRoles ? 'grid-cols-5' : 'grid-cols-4'}`}>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('groupMembers.tableHeaderMember')}</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('groupMembers.tableHeaderEmail')}</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('groupMembers.tableHeaderRole')}</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('groupMembers.tableHeaderAccess')}</div>
              {canEditRoles && (
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('groupMembers.tableHeaderActions')}</div>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {members.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-[#2E2E2E] rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">{t('groupMembers.noMembersFound')}</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('groupMembers.inviteToStart')}</p>
              </div>
            ) : (
              members.map((member) => {
                const memberAvatar = getMemberAvatar(member);
                const memberName = getMemberName(member);

                return (
                  <div key={typeof member.userId === 'string' ? member.userId : member.userId._id} className="px-6 py-5 hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors">
                    <div className={`grid gap-6 items-center ${canEditRoles ? 'grid-cols-5' : 'grid-cols-4'}`}>
                      {/* Name with Real Avatar */}
                      <div className="flex items-center">
                        <div className="relative">
                          {memberAvatar ? (
                            <img
                              src={memberAvatar}
                              alt={memberName || 'User avatar'}
                              className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-600"
                              onError={(e) => {
                                // Fallback to initial if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm ${memberAvatar ? 'hidden' : 'flex'}`}
                          >
                            {memberName ? memberName.charAt(0).toUpperCase() : '?'}
                          </div>
                          {(() => {
                            const memberUser =
                              member.userId && typeof member.userId === 'object' ? (member.userId as any) : null;
                            return memberUser?.groupRole === GROUP_ROLE_KEYS.PRODUCT_OWNER;
                          })() && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-white dark:border-gray-800">
                              <svg className="w-2.5 h-2.5 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {isCurrentUser(member) ? t('groupMembers.me') : memberName || 'Unknown'}
                            </span>
                            {isCurrentUser(member) && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                {t('groupMembers.you')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {getMemberEmail(member) || t('groupMembers.noEmail')}
                      </div>

                      {/* Role */}
                      <div>
                        {renderRoleCell(member)}
                      </div>

                      {/* Access */}
                      <div>
                        {renderAccessSummary(member)}
                      </div>

                      {/* Actions */}
                      {canEditRoles && (
                        <div className="flex items-center">
                          {canRemoveMember(member) ? (
                            <button
                              onClick={() => {
                                const memberId = getMemberId(member);
                                if (memberId) {
                                  handleRemoveMember(memberId, memberName || 'Unknown');
                                }
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title={t('groupMembers.remove')}
                            >
                              {t('groupMembers.remove')}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Add People Link */}
        {members.length > 0 && canAddMembersCheck && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
            >
              {t('groupMembers.addPeople')}
            </button>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteUser}
          t={t}
        />
      )}

      {/* Delete Group Modal */}
      {showDeleteModal && (
        <DeleteGroupModal
          groupName={group.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteGroup}
          isDeleting={isDeleting}
        />
      )}

      {folderModalOpen && activeFolderForAssignment && (
        <FolderAccessModal
          folder={activeFolderForAssignment}
          members={members}
          onClose={handleCloseFolderModal}
          onSave={handleSaveFolderMembers}
          saving={folderModalSaving}
          error={folderModalError || undefined}
          blockedUsers={folderBlockedUsers}
        />
      )}
    </div>
  );
}

interface InviteUserModalProps {
  onClose: () => void;
  onInvite: (email: string) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

function InviteUserModal({ onClose, onInvite, t }: InviteUserModalProps) {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('groupMembers.addTeamMember')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('groupMembers.inviteDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
              {t('groupMembers.emailAddress')}
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white text-lg placeholder-gray-400 transition-all duration-200"
                placeholder={t('groupMembers.enterEmail')}
                required
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>
          </div>

          {/* Role selection removed: roles are assigned by admin at account level */}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="flex space-x-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-[#2E2E2E] text-gray-700 dark:text-gray-300 py-4 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-[#3E3E3E] transition-all duration-200 font-medium border border-transparent hover:border-gray-300 dark:hover:border-gray-400"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('groupMembers.sending')}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {t('groupMembers.sendInvite')}
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Tips */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('groupMembers.inviteHint')}
          </p>
        </div>
      </div>
    </div>
  );
}

interface DeleteGroupModalProps {
  groupName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteGroupModal({ groupName, onClose, onConfirm, isDeleting }: DeleteGroupModalProps) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('groupMembers.deleteGroup')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm" dangerouslySetInnerHTML={{ __html: t('groupMembers.deleteGroupConfirm', { name: groupName }) }} />
        </div>

        <div className="flex space-x-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-gray-100 dark:bg-[#2E2E2E] text-gray-700 dark:text-gray-300 py-4 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-[#3E3E3E] transition-all duration-200 font-medium border border-transparent hover:border-gray-300 dark:hover:border-gray-400 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 text-white py-4 px-6 rounded-xl hover:bg-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
          >
            {isDeleting ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('groupMembers.deleting')}
              </div>
            ) : (
              t('groupMembers.deleteGroup')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}