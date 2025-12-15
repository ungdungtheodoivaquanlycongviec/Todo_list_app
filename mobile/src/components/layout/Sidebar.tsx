
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';

// Context imports
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFolder } from '../../context/FolderContext';
import { useSocket } from '../../hooks/useSocket';

// Service imports
import { groupService } from '../../services/group.service';
import { folderService } from '../../services/folder.service';

// Type imports
import { Group } from '../../types/group.types';
import { Folder } from '../../types/folder.types';

// Utils imports
import {
  DEFAULT_INVITE_ROLE,
  ROLE_SECTIONS,
} from '../constants/groupRoles';
import {
  getMemberRole,
  canManageFolders,
  canAssignFolderMembers,
  canAddMembers
} from '../../utils/groupRoleUtils';

// Component imports
import { FolderAccessModal } from '../folders/FolderAccessModal';

// ====================================================================
// --- STYLES ABSTRACTION FOR REACT NATIVE ---
// ====================================================================

const getColors = (isDark: boolean) => ({
  background: isDark ? '#111827' : '#F9FAFB',
  sidebarBg: isDark ? '#1F1F1F' : '#FFFFFF',
  border: isDark ? '#374151' : '#E5E7EB',
  textPrimary: isDark ? '#F9FAFB' : '#1F2937',
  textSecondary: isDark ? '#9CA3AF' : '#6B7280',
  bluePrimary: isDark ? '#60A5FA' : '#3B82F6',
  blueAccentBg: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
  red: isDark ? '#F87171' : '#EF4444',
  green: isDark ? '#34D399' : '#10B981',
});

const getSidebarStyles = (isDark: boolean) => {
  const colors = getColors(isDark);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.sidebarBg,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userInfo: {
      flexDirection: 'column',
      marginBottom: 16,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    userEmail: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    searchContainer: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInputWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      backgroundColor: isDark ? '#2E2E2E' : 'white',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      paddingLeft: 40,
      fontSize: 14,
      color: colors.textPrimary,
    },
    actionButton: {
        padding: 5,
        borderRadius: 5,
        marginLeft: 5,
    }
  });
};

// ====================================================================
// --- MODAL COMPONENTS (RN Conversion) ---
// ====================================================================

// --- Create Group Modal Component ---
interface CreateGroupModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
  theme: 'light' | 'dark';
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onSubmit, theme }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  
  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 20,
    },
    modalView: {
      backgroundColor: isDark ? '#1F1F1F' : 'white',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#3b82f6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    input: {
      backgroundColor: isDark ? '#2E2E2E' : '#ffffff',
      borderColor: isDark ? '#374151' : '#d1d5db',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    buttonContainer: {
      flexDirection: 'row',
      marginTop: 24,
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#d1d5db' : '#374151',
    },
    submitButton: {
      backgroundColor: '#3b82f6',
    },
    submitButtonDisabled: {
      backgroundColor: '#9ca3af',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
    },
    errorContainer: {
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 14,
      color: '#dc2626',
      marginLeft: 8,
      flex: 1,
    },
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({ 
        name: name.trim(), 
        description: description.trim() || undefined 
      });
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={true} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <Ionicons name="folder" size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {t('sidebar.createProject')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('sidebar.createProjectDesc')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textPrimary, marginBottom: 8, fontWeight: '500' }}>
            {t('sidebar.projectName')} *
          </Text>
          <TextInput
            placeholder={t('sidebar.projectNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            style={styles.input}
            editable={!loading}
          />

          <Text style={{ color: colors.textPrimary, marginBottom: 8, fontWeight: '500' }}>
            {t('sidebar.projectDescription')}
          </Text>
          <TextInput
            placeholder={t('sidebar.projectDescPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!name.trim() || loading}
              style={[
                styles.button,
                styles.submitButton,
                (!name.trim() || loading) && styles.submitButtonDisabled
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t('sidebar.createProjectBtn')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- Invite User Modal Component ---
interface InviteUserModalProps {
  groupName: string;
  onClose: () => void;
  onSubmit: (email: string, role: string) => Promise<void>;
  theme: 'light' | 'dark';
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ groupName, onClose, onSubmit, theme }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(DEFAULT_INVITE_ROLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  
  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 20,
    },
    modalView: {
      backgroundColor: isDark ? '#1F1F1F' : 'white',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#10b981',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    groupInfo: {
      backgroundColor: isDark ? '#374151' : '#dbeafe',
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },
    groupInfoText: {
      fontSize: 14,
      color: isDark ? '#f3f4f6' : '#1e40af',
    },
    groupName: {
      fontWeight: '600',
    },
    input: {
      backgroundColor: isDark ? '#2E2E2E' : '#ffffff',
      borderColor: isDark ? '#374151' : '#d1d5db',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 16,
    },
    pickerContainer: {
      backgroundColor: isDark ? '#2E2E2E' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#d1d5db',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
    },
    picker: {
      color: colors.textPrimary,
    },
    buttonContainer: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#d1d5db' : '#374151',
    },
    submitButton: {
      backgroundColor: '#10b981',
    },
    submitButtonDisabled: {
      backgroundColor: '#9ca3af',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
    },
    errorContainer: {
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 14,
      color: '#dc2626',
      marginLeft: 8,
      flex: 1,
    },
  });

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit(email.trim(), role);
      setEmail('');
      setRole(DEFAULT_INVITE_ROLE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={true} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <Ionicons name="people" size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {t('sidebar.inviteTeamMember')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('sidebar.inviteDesc')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.groupInfo}>
            <Text style={styles.groupInfoText}>
              {t('sidebar.invitingTo')}: 
              <Text style={styles.groupName}> {groupName}</Text>
            </Text>
          </View>

          <Text style={{ color: colors.textPrimary, marginBottom: 8, fontWeight: '500' }}>
            {t('sidebar.emailAddress')} *
          </Text>
          <TextInput
            placeholder={t('sidebar.emailPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={{ color: colors.textPrimary, marginBottom: 8, fontWeight: '500' }}>
            {t('sidebar.assignRole')} *
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={role}
              onValueChange={(itemValue) => setRole(itemValue)}
              style={styles.picker}
              enabled={!loading}
            >
              {ROLE_SECTIONS.flatMap(section => 
                section.roles.map((option) => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label}
                    value={option.value}
                    color={colors.textPrimary}
                  />
                ))
              )}
            </Picker>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!email.trim() || !role || loading}
              style={[
                styles.button,
                styles.submitButton,
                (!email.trim() || !role || loading) && styles.submitButtonDisabled
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t('sidebar.sendInvitation')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ====================================================================
// --- MAIN SIDEBAR COMPONENT ---
// ====================================================================

export default function Sidebar({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const { t } = useLanguage();
  const { user, currentGroup, setCurrentGroup } = useAuth();
  const { socket, isConnected } = useSocket();
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const styles = getSidebarStyles(isDark);

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

  const [searchQuery, setSearchQuery] = useState('');
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [sharedGroups, setSharedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Folder state
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
  
  // Context menu & access
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

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Auto-expand current group
  useEffect(() => {
    if (!currentGroup?._id) return;
    setExpandedGroups(prev => ({
      ...prev,
      [currentGroup._id]: true
    }));
  }, [currentGroup?._id]);

  // Socket effects
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

  useEffect(() => {
    if (!socket) return;

    const handleFolderUpdate = (data: {
      eventKey: string;
      folder: Folder;
      groupId: string;
    }) => {
      console.log('[Sidebar] Received folder update:', data.eventKey, 'for group:', data.groupId);
      
      if (data.groupId === currentGroup?._id) {
        refreshFolders();
      } else {
        loadGroupFolders(data.groupId);
      }
    };

    const handleGroupUpdate = (data: {
      eventKey: string;
      group: Group;
      groupId: string;
    }) => {
      console.log('[Sidebar] Received group update:', data.eventKey, 'for group:', data.groupId);
      loadGroups();
    };

    socket.on('folders:update', handleFolderUpdate);
    socket.on('groups:update', handleGroupUpdate);

    return () => {
      socket.off('folders:update', handleFolderUpdate);
      socket.off('groups:update', handleGroupUpdate);
    };
  }, [socket, currentGroup?._id, refreshFolders]);

  // Load group folders
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

  // Load all groups
  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getAllGroups();
      setMyGroups(response.myGroups);
      setSharedGroups(response.sharedGroups);
      
      const membersMap: Record<string, Group['members']> = {};
      [...response.myGroups, ...response.sharedGroups].forEach(group => {
        if (group._id && group.members) {
          membersMap[group._id] = group.members;
        }
      });
      setGroupMembersMap(prev => ({ ...prev, ...membersMap }));
    } catch (error) {
      console.error('Failed to load groups:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleWorkspaceChange = async (groupId: string) => {
    if (groupId === currentGroup?._id) return;
    
    try {
      const result = await groupService.switchToGroup(groupId);
      setCurrentGroup(result.group);
    } catch (error) {
      console.error('Failed to switch group:', error);
      Alert.alert('Error', 'Failed to switch project');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return { myGroups, sharedGroups };
    }
    
    const filterFn = (groups: Group[]) => 
      groups.filter(group => group.name.toLowerCase().includes(query));

    return {
      myGroups: filterFn(myGroups),
      sharedGroups: filterFn(sharedGroups)
    };
  }, [searchQuery, myGroups, sharedGroups]);

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
      throw error;
    }
  };

  const handleInviteUser = (group: Group) => {
    setSelectedGroup(group);
    setShowInviteModal(true);
  };

  // FIX LỖI 2: Điều chỉnh hàm inviteUserToGroup
  const handleInviteSubmit = async (email: string, role: string) => {
    if (!selectedGroup) return;
    
    try {
      // Option 1: Sửa service để nhận 3 params
      await groupService.inviteUserToGroup(selectedGroup._id, email);
      // Hoặc Option 2: Nếu service chỉ nhận 2 params
      // await groupService.inviteUserToGroup(selectedGroup._id, { email, role });
      
      setShowInviteModal(false);
      setSelectedGroup(null);
      loadGroups();
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  };

  // Folder handlers
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
    setExpandedGroups(prev => ({ ...prev, [groupId]: true }));

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

  const handleFolderFormSubmit = async () => {
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
      Alert.alert('Error', 'Failed to switch to folder');
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

  const handleRenameSubmit = async () => {
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

  const handleDeleteFolder = (groupId: string, folderId: string) => {
    Alert.alert(
      'Delete Folder',
      'Are you sure you want to delete this folder? This will also delete all tasks and notes in this folder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
          }
        }
      ]
    );
  };

  const handleFolderLongPress = (e: any, folder: Folder, groupId: string) => {
    if (!canEditFolders && !canDeleteFolders && !canAssignFolders) {
      return;
    }

    const clientX = e.nativeEvent.pageX;
    const clientY = e.nativeEvent.pageY;
    
    setContextMenu({
      x: clientX,
      y: clientY,
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

  // Render folder list
  const renderFolderListForGroup = (group: Group) => {
    const folderState = getFolderStateForGroup(group._id);
    const formVisible = folderFormState.groupId === group._id;
    const folderListStyles = StyleSheet.create({
        container: { paddingLeft: 30, marginTop: 10 },
        folderItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 10,
            borderRadius: 8,
            marginBottom: 5,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.sidebarBg,
        },
        activeFolderItem: {
            backgroundColor: colors.blueAccentBg,
            borderColor: colors.bluePrimary,
        },
    });

    return (
      <View style={folderListStyles.container}>
        {formVisible && (
          <View style={{ marginBottom: 10 }}>
            <TextInput
              placeholder="Folder name"
              placeholderTextColor={colors.textSecondary}
              value={folderFormState.name}
              onChangeText={(text) => setFolderFormState(prev => ({ ...prev, name: text }))}
              style={[styles.searchInput, { marginBottom: 8, paddingLeft: 12 }]}
              editable={!folderFormState.loading}
            />
            {folderFormState.error && <Text style={{ color: colors.red, fontSize: 12 }}>{folderFormState.error}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={closeFolderForm}
                disabled={folderFormState.loading}
                style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
              >
                <Text style={{ textAlign: 'center', color: colors.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFolderFormSubmit}
                disabled={folderFormState.loading}
                style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: colors.bluePrimary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
              >
                {folderFormState.loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {folderState.loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <ActivityIndicator color={colors.textSecondary} size="small" />
            <Text style={{ color: colors.textSecondary }}>Loading folders...</Text>
          </View>
        ) : folderState.error ? (
          <Text style={{ color: colors.red }}>{folderState.error}</Text>
        ) : folderState.folders.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No folders yet</Text>
        ) : (
          folderState.folders.map(folder => {
            const folderGroupId = folder.groupId || group._id;
            const isActiveGroup = currentGroup?._id === folderGroupId;
            const isActiveFolder = isActiveGroup && currentFolder?._id === folder._id;
            const isEditing = renamingState?.folderId === folder._id && renamingState?.groupId === folderGroupId;
            
            return (
              <View
                key={folder._id}
                style={[
                  folderListStyles.folderItem,
                  isActiveFolder && folderListStyles.activeFolderItem
                ]}
              >
                {isEditing ? (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <TextInput
                      value={renamingState?.name || ''}
                      onChangeText={(text) =>
                        setRenamingState(prev => (prev ? { ...prev, name: text } : prev))
                      }
                      style={{ flex: 1, color: colors.textPrimary, padding: 0 }}
                      autoFocus
                      editable={!renamingLoading}
                    />
                    <TouchableOpacity
                      onPress={handleRenameSubmit}
                      disabled={renamingLoading}
                      style={{ padding: 5 }}
                    >
                      <Ionicons name={renamingLoading ? 'ellipsis-horizontal' : 'checkmark'} size={18} color={colors.green} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelRenaming} style={{ padding: 5 }}>
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleFolderClick(folderGroupId, folder._id)}
                    onLongPress={(e) => handleFolderLongPress(e, folder, folderGroupId)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isActiveFolder ? colors.bluePrimary : colors.textSecondary }} />
                      <View>
                        <Text style={{ color: colors.textPrimary, fontWeight: '500' }}>
                          {folder.name}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {folder.taskCount ?? 0} tasks • {folder.noteCount ?? 0} notes
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                {(isEditing && renamingError) && <Text style={{ color: colors.red, fontSize: 12 }}>{renamingError}</Text>}
                {deleteError?.folderId === folder._id && <Text style={{ color: colors.red, fontSize: 12 }}>{deleteError.message}</Text>}
              </View>
            );
          })
        )}
      </View>
    );
  };

  // Render group card
  const renderGroupCard = (group: Group, options?: { canInvite?: boolean }) => {
    const isActive = currentGroup?._id === group._id;
    const isExpanded = !!expandedGroups[group._id];
    const groupUserRole = user ? getMemberRole(group, user._id) : null;
    const canAddFolder = canManageFolders(groupUserRole);

    const groupCardStyles = StyleSheet.create({
        card: {
            borderRadius: 8,
            borderWidth: 1,
            marginBottom: 8,
            borderColor: isActive ? colors.bluePrimary : 'transparent',
            backgroundColor: isActive ? colors.blueAccentBg : colors.sidebarBg,
        },
        content: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
        },
        infoWrapper: {
            flex: 1,
            marginLeft: 10,
        },
        groupName: {
            fontSize: 15,
            fontWeight: '600',
            color: isActive ? colors.bluePrimary : colors.textPrimary,
        },
        actionButton: {
            padding: 5,
            borderRadius: 5,
            marginLeft: 5,
        }
    });

    return (
      <View key={group._id} style={groupCardStyles.card}>
        <View style={groupCardStyles.content}>
            <TouchableOpacity
              onPress={() => handleGroupToggle(group._id)}
              style={groupCardStyles.actionButton}
            >
              <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleProjectClick(group)}
                style={groupCardStyles.infoWrapper}
            >
                <Text style={groupCardStyles.groupName} numberOfLines={1}>{group.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {group.members?.length || 0} members
                </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {canAddFolder && (
                    <TouchableOpacity
                        onPress={() => handleOpenFolderForm(group._id)}
                        style={groupCardStyles.actionButton}
                    >
                        <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
                {options?.canInvite && (
                    <TouchableOpacity
                        onPress={() => handleInviteUser(group)}
                        style={groupCardStyles.actionButton}
                    >
                        <Ionicons name="person-add-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
        
        {isExpanded && renderFolderListForGroup(group)}
      </View>
    );
  };
  
  const { myGroups: finalMyGroups, sharedGroups: finalSharedGroups } = filteredGroups;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with User Info & Workspace Selector */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'User'}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email || 'user@example.com'}
          </Text>
        </View>

        <View style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
          <Picker
            selectedValue={currentGroup?._id || ''}
            onValueChange={(itemValue) => handleWorkspaceChange(itemValue)}
            style={{ 
              width: '100%', 
              color: colors.textPrimary, 
              backgroundColor: isDark ? '#2E2E2E' : 'white',
              height: 48,
            }}
          >
            {loading ? (
              <Picker.Item label="Loading workspaces..." value="" />
            ) : (
              [...myGroups, ...sharedGroups].map(group => (
                <Picker.Item 
                  key={group._id} 
                  label={group.name} 
                  value={group._id} 
                  color={colors.textPrimary}
                />
              ))
            )}
          </Picker>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" style={{ position: 'absolute', left: 10, zIndex: 1 }} size={16} color={colors.textSecondary} />
          <TextInput
            placeholder="Search projects..."
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            onChangeText={handleSearch}
            value={searchQuery}
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* My Projects */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity 
              onPress={() => setProjectsExpanded(!projectsExpanded)} 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name={projectsExpanded ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textSecondary} />
              <Ionicons name="folder-outline" size={16} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>MY PROJECTS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={handleAddProject} 
                style={styles.actionButton}
            >
                <Ionicons name="add-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {projectsExpanded && (
            <View style={{ marginTop: 10 }}>
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary }}>Loading projects...</Text>
                </View>
              ) : finalMyGroups.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Ionicons name="folder-outline" size={32} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No projects yet</Text>
                  <TouchableOpacity onPress={handleAddProject}>
                    <Text style={{ color: colors.bluePrimary, marginTop: 4 }}>Create your first project</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                finalMyGroups.map(group => {
                  const groupUserRole = user ? getMemberRole(group, user._id) : null;
                  return renderGroupCard(group, { canInvite: canAddMembers(groupUserRole) });
                })
              )}
            </View>
          )}
        </View>

        {/* Shared with me */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }}>
          <TouchableOpacity 
            onPress={() => setSharedExpanded(!sharedExpanded)} 
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
          >
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>SHARED WITH ME</Text>
            <Ionicons 
              name={sharedExpanded ? 'chevron-down' : 'chevron-forward'} 
              size={16} 
              color={colors.textSecondary} 
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
          
          {sharedExpanded && (
            <View style={{ marginTop: 10 }}>
              {loading ? (
                <Text style={{ color: colors.textSecondary }}>Loading...</Text>
              ) : finalSharedGroups.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>No shared projects</Text>
              ) : (
                finalSharedGroups.map(group => renderGroupCard(group))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
          theme={isDark ? 'dark' : 'light'}
        />
      )}

      {showInviteModal && selectedGroup && (
        <InviteUserModal
          groupName={selectedGroup.name}
          onClose={() => {
            setShowInviteModal(false);
            setSelectedGroup(null);
          }}
          onSubmit={handleInviteSubmit}
          theme={isDark ? 'dark' : 'light'}
        />
      )}
    </SafeAreaView>
  );
}
