"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Users,
  Folder as FolderIcon,
  Loader2,
  FolderPlus,
  Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { groupService } from '../../services/group.service';
import { Group } from '../../services/types/group.types';
import { useFolder } from '../../contexts/FolderContext';
import { folderService } from '../../services/folder.service';
import { Folder } from '../../services/types/folder.types';
import { DEFAULT_INVITE_ROLE, ROLE_SECTIONS, GROUP_ROLE_KEYS } from '../../constants/groupRoles';
import { getMemberRole, canManageFolders, canAssignFolderMembers } from '../../utils/groupRoleUtils';
import FolderContextMenu from '../folders/FolderContextMenu';
import { FolderAccessModal } from '../folders/FolderAccessModal';
import { useSocket } from '../../hooks/useSocket';

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
              <FolderIcon className="w-5 h-5 text-white" />
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
  onSubmit: (email: string, role: string) => Promise<void>;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ groupName, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(DEFAULT_INVITE_ROLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    try {
      await onSubmit(email.trim(), role);
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign Role *
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none"
                disabled={loading}
              >
                {ROLE_SECTIONS.map(section => (
                  <optgroup key={section.title} label={section.title}>
                    {section.roles.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
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
              disabled={!email.trim() || !role || loading}
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
  const { socket, isConnected } = useSocket();
  const userRole = currentGroup && user ? getMemberRole(currentGroup, user._id) : null;
  const canDeleteFolders = canManageFolders(userRole);
  const canEditFolders = canManageFolders(userRole);
  const canAssignFolders = canAssignFolderMembers(userRole);
  const {
    folders,
    currentFolder,
    loading: foldersLoading,
    selectFolder,
    createFolder,
    deleteFolder,
    refreshFolders,
    error: foldersError
  } = useFolder();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [sharedGroups, setSharedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [groupFoldersMap, setGroupFoldersMap] = useState<
    Record<string, { folders: Folder[]; loading: boolean; error?: string }>
  >({});
  const [folderFormState, setFolderFormState] = useState<{
    groupId: string | null;
    name: string;
    loading: boolean;
    error: string | null;
  }>({
    groupId: null,
    name: '',
    loading: false,
    error: null
  });
  const [pendingFolderSelection, setPendingFolderSelection] = useState<{
    groupId: string;
    folderId: string;
  } | null>(null);
  const [renamingState, setRenamingState] = useState<{
    groupId: string;
    folderId: string;
    name: string;
  } | null>(null);
  const [renamingLoading, setRenamingLoading] = useState(false);
  const [renamingError, setRenamingError] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ folderId: string; message: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    folder: Folder;
    groupId: string;
  } | null>(null);
  const [showFolderAccessModal, setShowFolderAccessModal] = useState(false);
  const [selectedFolderForAccess, setSelectedFolderForAccess] = useState<{
    folder: Folder;
    groupId: string;
  } | null>(null);
  const [assigningMembers, setAssigningMembers] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, Group['members']>>({});

  const loadGroupFolders = useCallback(
    async (groupId: string) => {
      if (!groupId) return;
      setGroupFoldersMap(prev => ({
        ...prev,
        [groupId]: {
          folders: prev[groupId]?.folders || [],
          loading: true,
          error: undefined
        }
      }));

      try {
        const response = await folderService.getFolders(groupId);
        setGroupFoldersMap(prev => ({
          ...prev,
          [groupId]: {
            folders: response.folders || [],
            loading: false,
            error: undefined
          }
        }));
      } catch (error) {
        setGroupFoldersMap(prev => ({
          ...prev,
          [groupId]: {
            folders: prev[groupId]?.folders || [],
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load folders'
          }
        }));
      }
    },
    []
  );

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (!currentGroup?._id) return;
    setExpandedGroups(prev => ({
      ...prev,
      [currentGroup._id]: true
    }));
  }, [currentGroup?._id]);

  useEffect(() => {
    if (!pendingFolderSelection) return;
    if (currentGroup?._id === pendingFolderSelection.groupId) {
      refreshFolders(pendingFolderSelection.folderId);
      setPendingFolderSelection(null);
    }
  }, [pendingFolderSelection, currentGroup?._id, refreshFolders]);

  // Join group rooms for real-time folder updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const joinGroupRooms = async () => {
      const allGroups = [...myGroups, ...sharedGroups];
      for (const group of allGroups) {
        if (group._id) {
          try {
            socket.emit('chat:join', group._id, (response: any) => {
              if (response?.success) {
                console.log(`[Sidebar] Joined group room for folder updates: ${group._id}`);
              }
            });
          } catch (error) {
            console.error(`[Sidebar] Failed to join group room ${group._id}:`, error);
          }
        }
      }
    };

    if (myGroups.length > 0 || sharedGroups.length > 0) {
      joinGroupRooms();
    }
  }, [socket, isConnected, myGroups, sharedGroups]);

  // Listen for folder updates from all groups
  useEffect(() => {
    if (!socket) return;

    const handleFolderUpdate = (data: {
      eventKey: string;
      folder: Folder;
      groupId: string;
    }) => {
      console.log('[Sidebar] Received folder update:', data.eventKey, 'for group:', data.groupId);
      
      // Refresh folders for the affected group
      if (data.groupId === currentGroup?._id) {
        // If it's the current group, refreshFolders will be called by FolderContext
        // But we also need to refresh the groupFoldersMap
        refreshFolders();
      } else {
        // Refresh folders for other groups
        loadGroupFolders(data.groupId);
      }
    };

    socket.on('folders:update', handleFolderUpdate);

    return () => {
      socket.off('folders:update', handleFolderUpdate);
    };
  }, [socket, currentGroup?._id, refreshFolders]);

  // Listen for group updates
  useEffect(() => {
    if (!socket) return;

    const handleGroupUpdate = (data: {
      eventKey: string;
      group: Group;
      groupId: string;
    }) => {
      console.log('[Sidebar] Received group update:', data.eventKey, 'for group:', data.groupId);
      
      // Reload groups list to reflect changes
      loadGroups();
    };

    socket.on('groups:update', handleGroupUpdate);

    return () => {
      socket.off('groups:update', handleGroupUpdate);
    };
  }, [socket]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getAllGroups();
      setMyGroups(response.myGroups);
      setSharedGroups(response.sharedGroups);
      
      // Cache members for all groups
      const membersMap: Record<string, Group['members']> = {};
      [...response.myGroups, ...response.sharedGroups].forEach(group => {
        if (group._id && group.members) {
          membersMap[group._id] = group.members;
        }
      });
      setGroupMembersMap(prev => ({ ...prev, ...membersMap }));
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

  const handleInviteSubmit = async (email: string, role: string) => {
    if (!selectedGroup) return;
    
    try {
      await groupService.inviteUserToGroup(selectedGroup._id, email, role);
      setShowInviteModal(false);
      setSelectedGroup(null);
      // Reload groups to show updated member list
      loadGroups();
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleGroupToggle = (groupId: string) => {
    const willExpand = !expandedGroups[groupId];
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: willExpand
    }));

    if (willExpand) {
      if (currentGroup?._id === groupId) {
        refreshFolders();
      } else if (!groupFoldersMap[groupId]) {
        loadGroupFolders(groupId);
      }
    }
  };

  const handleOpenFolderForm = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: true
    }));

    if (currentGroup?._id === groupId) {
      refreshFolders();
    } else if (!groupFoldersMap[groupId]) {
      loadGroupFolders(groupId);
    }

    setFolderFormState({
      groupId,
      name: '',
      loading: false,
      error: null
    });
  };

  const closeFolderForm = () => {
    setFolderFormState({
      groupId: null,
      name: '',
      loading: false,
      error: null
    });
  };

  const handleFolderFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!folderFormState.groupId || !folderFormState.name.trim()) return;

    setFolderFormState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      if (currentGroup?._id === folderFormState.groupId) {
        await createFolder(folderFormState.name.trim());
      } else {
        await folderService.createFolder(folderFormState.groupId, {
          name: folderFormState.name.trim()
        });
        await loadGroupFolders(folderFormState.groupId);
      }
      closeFolderForm();
    } catch (error) {
      setFolderFormState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create folder'
      }));
    }
  };

  const handleFolderClick = async (groupId: string, folderId: string) => {
    if (groupId === currentGroup?._id) {
      selectFolder(folderId);
      return;
    }

    setPendingFolderSelection({
      groupId,
      folderId
    });
    try {
      await handleWorkspaceChange(groupId);
    } catch (error) {
      console.error('Failed to switch group while selecting folder:', error);
      setPendingFolderSelection(null);
    }
  };

  const startRenamingFolder = (groupId: string, folder: Folder) => {
    setRenamingState({
      groupId,
      folderId: folder._id,
      name: folder.name
    });
    setRenamingError(null);
  };

  const cancelRenaming = () => {
    setRenamingState(null);
    setRenamingError(null);
  };

  const handleRenameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!renamingState || !renamingState.name.trim()) return;

    setRenamingLoading(true);
    setRenamingError(null);

    try {
      await folderService.updateFolder(renamingState.groupId, renamingState.folderId, {
        name: renamingState.name.trim()
      });

      if (currentGroup?._id === renamingState.groupId) {
        await refreshFolders(renamingState.folderId);
      } else {
        await loadGroupFolders(renamingState.groupId);
      }

      setRenamingState(null);
    } catch (error) {
      setRenamingError(error instanceof Error ? error.message : 'Failed to rename folder');
    } finally {
      setRenamingLoading(false);
    }
  };

  const getFolderStateForGroup = (groupId: string) => {
    if (currentGroup?._id === groupId) {
      return {
        folders,
        loading: foldersLoading,
        error: foldersError || undefined
      };
    }

    return groupFoldersMap[groupId] || {
      folders: [],
      loading: false,
      error: undefined
    };
  };

  const handleDeleteFolder = async (groupId: string, folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? This will also delete all tasks and notes in this folder.')) return;

    setDeletingFolderId(folderId);
    setDeleteError(null);
    setContextMenu(null);

    try {
      if (currentGroup?._id === groupId) {
        await deleteFolder(folderId);
      } else {
        await folderService.deleteFolder(groupId, folderId);
        await loadGroupFolders(groupId);
      }

      if (renamingState?.folderId === folderId) {
        setRenamingState(null);
      }
    } catch (error) {
      setDeleteError({
        folderId,
        message: error instanceof Error ? error.message : 'Failed to delete folder'
      });
    } finally {
      setDeletingFolderId(null);
    }
  };

  const handleFolderRightClick = (e: React.MouseEvent, folder: Folder, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canEditFolders && !canDeleteFolders && !canAssignFolders) {
      return;
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder,
      groupId
    });
  };

  const handleContextMenuEdit = () => {
    if (!contextMenu) return;
    startRenamingFolder(contextMenu.groupId, contextMenu.folder);
    setContextMenu(null);
  };

  const handleContextMenuDelete = () => {
    if (!contextMenu) return;
    handleDeleteFolder(contextMenu.groupId, contextMenu.folder._id);
  };

  const handleContextMenuAssign = async () => {
    if (!contextMenu) return;
    
    // Load members if not already loaded
    if (!groupMembersMap[contextMenu.groupId]) {
      try {
        const group = await groupService.getGroupById(contextMenu.groupId);
        setGroupMembersMap(prev => ({
          ...prev,
          [contextMenu.groupId]: group.members || []
        }));
      } catch (error) {
        console.error('Failed to load group members:', error);
      }
    }
    
    setSelectedFolderForAccess({
      folder: contextMenu.folder,
      groupId: contextMenu.groupId
    });
    setShowFolderAccessModal(true);
    setContextMenu(null);
  };

  const handleAssignFolderMembers = async (memberIds: string[]) => {
    if (!selectedFolderForAccess) return;

    setAssigningMembers(true);
    setAssignError(null);

    try {
      await folderService.setFolderMembers(
        selectedFolderForAccess.groupId,
        selectedFolderForAccess.folder._id,
        memberIds
      );

      if (currentGroup?._id === selectedFolderForAccess.groupId) {
        await refreshFolders();
      } else {
        await loadGroupFolders(selectedFolderForAccess.groupId);
      }

      setShowFolderAccessModal(false);
      setSelectedFolderForAccess(null);
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Failed to assign folder members');
    } finally {
      setAssigningMembers(false);
    }
  };

  const renderFolderListForGroup = (group: Group) => {
    const folderState = getFolderStateForGroup(group._id);
    const formVisible = folderFormState.groupId === group._id;

    return (
      <div className="mt-2 space-y-2 pl-9">
        {formVisible && (
          <form onSubmit={handleFolderFormSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="Folder name"
              value={folderFormState.name}
              onChange={(e) =>
                setFolderFormState(prev => ({
                  ...prev,
                  name: e.target.value
                }))
              }
              className="w-full bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              disabled={folderFormState.loading}
            />
            {folderFormState.error && (
              <p className="text-xs text-red-500">{folderFormState.error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 bg-gray-100 dark:bg-[#2E2E2E] text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#3E3E3E] transition-all duration-200 text-sm"
                onClick={closeFolderForm}
                disabled={folderFormState.loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={folderFormState.loading}
              >
                {folderFormState.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </form>
        )}

        {folderState.loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading folders...
          </div>
        ) : folderState.error ? (
          <div className="text-sm text-red-500">{folderState.error}</div>
        ) : folderState.folders.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No folders yet. Create one to start organizing.
          </div>
        ) : (
          <div className="space-y-2">
            {folderState.folders.map(folder => {
              const folderGroupId = folder.groupId || group._id;
              const isActiveGroup = currentGroup?._id === folderGroupId;
              const isActiveFolder = isActiveGroup && currentFolder?._id === folder._id;
              const isEditing =
                renamingState?.folderId === folder._id && renamingState?.groupId === folderGroupId;

              return (
                <div
                  key={folder._id}
                  className={`w-full rounded-lg border transition-all duration-200 ${
                    isActiveFolder
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'bg-white dark:bg-[#1F1F1F] border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {isEditing ? (
                    <form
                      onSubmit={handleRenameSubmit}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={renamingState?.name || ''}
                          onChange={(e) =>
                            setRenamingState(prev =>
                              prev
                                ? {
                                    ...prev,
                                    name: e.target.value
                                  }
                                : prev
                            )
                          }
                          className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none border-none outline-none truncate"
                          autoFocus
                        />
                      </div>
                      <button
                        type="submit"
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg disabled:opacity-50"
                        disabled={renamingLoading}
                      >
                        {renamingLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelRenaming}
                        className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <div
                      className="flex items-center justify-between gap-3 px-3 py-2"
                      onContextMenu={(e) => handleFolderRightClick(e, folder, folderGroupId)}
                    >
                      <button
                        onClick={() => handleFolderClick(folderGroupId, folder._id)}
                        className="flex-1 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isActiveFolder ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium truncate">
                              {folder.name}
                              {folder.isDefault && ' • Default'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {folder.taskCount ?? 0} tasks • {folder.noteCount ?? 0} notes
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                  {isEditing && renamingError && (
                    <p className="px-3 pb-2 text-xs text-red-500">{renamingError}</p>
                  )}
                  {deleteError?.folderId === folder._id && (
                    <p className="px-3 pb-2 text-xs text-red-500">{deleteError.message}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGroupCard = (group: Group, options?: { canInvite?: boolean }) => {
    const isActive = currentGroup?._id === group._id;
    const isExpanded = !!expandedGroups[group._id];

    return (
      <div key={group._id} className="space-y-2">
        <div
          className={`group rounded-xl border transition-all duration-200 ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-white dark:bg-[#1F1F1F] border-transparent hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
          }`}
        >
          <div className="flex items-center gap-3 p-3">
            <button
              type="button"
              onClick={() => handleGroupToggle(group._id)}
              className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <div
              className="flex-1 flex items-center space-x-3 min-w-0 cursor-pointer"
              onClick={() => handleProjectClick(group)}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {group.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {group.members?.length || 0} members
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleOpenFolderForm(group._id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
                title="Add folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              {options?.canInvite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInviteUser(group);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
                  title="Invite team members"
                >
                  <Users className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        {isExpanded && renderFolderListForGroup(group)}
      </div>
    );
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
            <button
              type="button"
              className="flex items-center space-x-2"
              onClick={() => setProjectsExpanded(!projectsExpanded)}
            >
              {projectsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <FolderIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                My Projects
              </span>
            </button>
            <button
              onClick={handleAddProject}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-xl transition-all duration-200"
              title="Create new project"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {projectsExpanded && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm py-2 px-3 text-gray-500 dark:text-gray-400">Loading projects...</div>
              ) : myGroups.length === 0 ? (
                <div className="text-center py-6">
                  <FolderIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet</p>
                  <button
                    onClick={handleAddProject}
                    className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-1"
                  >
                    Create your first project
                  </button>
                </div>
              ) : (
                myGroups.map(group => renderGroupCard(group, { canInvite: true }))
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
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm py-2 px-3 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : sharedGroups.length === 0 ? (
                <div className="text-sm py-2 px-3 text-gray-500 dark:text-gray-400">No shared projects</div>
              ) : (
                sharedGroups.map(group => renderGroupCard(group))
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

      {/* Folder Context Menu */}
      {contextMenu && (
        <FolderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onAssign={handleContextMenuAssign}
          canEdit={canEditFolders}
          canDelete={canDeleteFolders}
          canAssign={canAssignFolders}
        />
      )}

      {/* Folder Access Modal */}
      {showFolderAccessModal && selectedFolderForAccess && (
        <FolderAccessModal
          folder={selectedFolderForAccess.folder}
          members={
            groupMembersMap[selectedFolderForAccess.groupId] ||
            (currentGroup?._id === selectedFolderForAccess.groupId ? currentGroup.members || [] : [])
          }
          onClose={() => {
            setShowFolderAccessModal(false);
            setSelectedFolderForAccess(null);
            setAssignError(null);
          }}
          onSave={handleAssignFolderMembers}
          saving={assigningMembers}
          error={assignError || undefined}
        />
      )}
    </div>
  );
}