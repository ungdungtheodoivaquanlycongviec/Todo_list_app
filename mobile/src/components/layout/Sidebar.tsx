// Sidebar.tsx - Fixed version with no vertical overscroll
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  PanResponder,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Import Lucide React Native icons
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
  Check,
  User,
  Home,
  AlertCircle,
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react-native';

// Context imports
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFolder } from '../../context/FolderContext';
import { useSocket } from '../../hooks/useSocket';
import { useGroupChange } from '../../hooks/useGroupChange';
import { useConfirm } from '../../context/ConfirmContext';
import { useSafeToast } from '../../context/ToastContext';

// Service imports
import { groupService } from '../../services/group.service';
import { folderService } from '../../services/folder.service';

// Type imports
import { Group } from '../../types/group.types';
import { Folder } from '../../types/folder.types';

// Utils imports
import { GROUP_ROLE_KEYS, GroupRoleKey } from '../constants/groupRoles';
import {
  getMemberRole,
  canManageFolders,
  canAssignFolderMembers,
  canAddMembers,
} from '../../utils/groupRoleUtils';

// Component imports
import { FolderAccessModal } from '../folders/FolderAccessModal';

// ====================================================================
// --- STYLES ABSTRACTION ---
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
  gray100: isDark ? '#374151' : '#F3F4F6',
  gray800: isDark ? '#1F2937' : '#6B7280',
});

const getSidebarStyles = (isDark: boolean) => {
  const colors = getColors(isDark);
  const screenHeight = Dimensions.get('window').height;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.sidebarBg,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      height: screenHeight,
      maxHeight: screenHeight,
      overflow: 'hidden',
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bluePrimary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    userTextContainer: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    userEmail: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    userRoleBadge: {
      backgroundColor: colors.blueAccentBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginTop: 4,
    },
    userRoleText: {
      fontSize: 11,
      color: colors.bluePrimary,
      fontWeight: '500',
    },
    workspaceSelector: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 8,
    },
    workspacePicker: {
      width: '100%',
      color: colors.textPrimary,
      backgroundColor: isDark ? '#2E2E2E' : 'white',
      height: 48,
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
    searchIcon: {
      position: 'absolute',
      left: 12,
      zIndex: 1,
    },
    searchInput: {
      flex: 1,
      backgroundColor: isDark ? '#2E2E2E' : 'white',
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingLeft: 44,
      fontSize: 14,
      color: colors.textPrimary,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionButton: {
      padding: 4,
      borderRadius: 6,
    },
    scrollContent: {
      flex: 1,
      padding: 16,
    },
    scrollContainer: {
      flex: 1,
      maxHeight: screenHeight - 300, // Approximate height calculation
      overflow: 'hidden',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    emptyStateAction: {
      color: colors.bluePrimary,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 4,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 8,
    },
    badge: {
      backgroundColor: colors.bluePrimary,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 8,
    },
    badgeText: {
      color: 'white',
      fontSize: 10,
      fontWeight: '600',
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 100,
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
  });
};

// ====================================================================
// --- MODAL COMPONENTS ---
// ====================================================================

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
  theme: 'light' | 'dark';
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  visible,
  onClose,
  onSubmit,
  theme,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);

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
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <FolderIcon size={24} color="#ffffff" />
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
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>
            {t('sidebar.projectName')} *
          </Text>
          <TextInput
            placeholder={t('sidebar.projectNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            style={styles.input}
            editable={!loading}
            autoFocus
          />

          <Text style={styles.inputLabel}>
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
              <AlertCircle size={16} color={isDark ? '#fca5a5' : '#dc2626'} style={styles.errorIcon} />
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
                (!name.trim() || loading) && styles.submitButtonDisabled,
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

interface InviteUserModalProps {
  visible: boolean;
  groupName: string;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  theme: 'light' | 'dark';
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({
  visible,
  groupName,
  onClose,
  onSubmit,
  theme,
}) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const isDark = theme === 'dark';
  const colors = getColors(isDark);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSubmit(email.trim());
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <Users size={24} color="#ffffff" />
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
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.groupInfo}>
            <Text style={styles.groupInfoText}>
              {t('sidebar.invitingTo')}:
              <Text style={styles.groupName}> {groupName}</Text>
            </Text>
          </View>

          <Text style={styles.inputLabel}>
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
            autoCorrect={false}
            editable={!loading}
            autoFocus
          />

          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={isDark ? '#fca5a5' : '#dc2626'} style={styles.errorIcon} />
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
              disabled={!email.trim() || loading}
              style={[
                styles.button,
                styles.submitButton,
                (!email.trim() || loading) && styles.submitButtonDisabled,
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
// --- STYLES FOR MODALS ---
// ====================================================================

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalView: {
    backgroundColor: '#FFFFFF',
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
    marginBottom: 24,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  groupInfo: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  groupInfoText: {
    fontSize: 14,
    color: '#1e40af',
  },
  groupName: {
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
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
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
  },
});

// ====================================================================
// --- PERMISSION DIALOG ---
// ====================================================================

const PermissionDialogComponent = ({ 
  visible, 
  message, 
  onClose,
  theme 
}: { 
  visible: boolean; 
  message: string; 
  onClose: () => void;
  theme: 'light' | 'dark';
}) => {
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  
  const permissionStyles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    dialog: {
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      width: '80%',
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: 12,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginVertical: 16,
    },
    button: {
      backgroundColor: colors.bluePrimary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={permissionStyles.overlay}>
        <View style={permissionStyles.dialog}>
          <AlertCircle size={32} color="#EF4444" />
          <Text style={permissionStyles.title}>
            Permission Denied
          </Text>
          <Text style={permissionStyles.message}>{message}</Text>
          <TouchableOpacity style={permissionStyles.button} onPress={onClose}>
            <Text style={permissionStyles.buttonText}>
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ====================================================================
// --- FOLDER AND GROUP ITEM COMPONENTS ---
// ====================================================================

interface FolderItemProps {
  folder: Folder;
  groupId: string;
  isActive: boolean;
  isEditing: boolean;
  renamingName: string;
  renamingLoading: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onRenameChange: (name: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  theme: 'light' | 'dark';
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  groupId,
  isActive,
  isEditing,
  renamingName,
  renamingLoading,
  onPress,
  onLongPress,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  theme,
}) => {
  const isDark = theme === 'dark';
  const colors = getColors(isDark);

  const folderItemStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: isActive ? colors.bluePrimary : colors.border,
      backgroundColor: isActive ? colors.blueAccentBg : 'transparent',
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isActive ? colors.bluePrimary : colors.textSecondary,
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    name: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    meta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    editContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    editInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      padding: 0,
      marginRight: 8,
    },
    actionButton: {
      padding: 4,
      borderRadius: 4,
    },
  });

  if (isEditing) {
    return (
      <View style={folderItemStyles.container}>
        <View style={folderItemStyles.editContainer}>
          <TextInput
            value={renamingName}
            onChangeText={onRenameChange}
            style={folderItemStyles.editInput}
            autoFocus
            editable={!renamingLoading}
          />
          <TouchableOpacity
            onPress={onRenameSubmit}
            disabled={renamingLoading}
            style={folderItemStyles.actionButton}
          >
            {renamingLoading ? (
              <Loader2 size={16} color={colors.green} />
            ) : (
              <Check size={16} color={colors.green} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onRenameCancel} style={folderItemStyles.actionButton}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={folderItemStyles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={folderItemStyles.content}>
        <View style={folderItemStyles.indicator} />
        <View style={folderItemStyles.textContainer}>
          <Text style={folderItemStyles.name} numberOfLines={1}>
            {folder.name}
            {folder.isDefault && ' • Default'}
          </Text>
          <Text style={folderItemStyles.meta}>
            {folder.taskCount ?? 0} tasks • {folder.noteCount ?? 0} notes
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface GroupCardProps {
  group: Group;
  isActive: boolean;
  isExpanded: boolean;
  canInvite: boolean;
  canManageFolders: boolean;
  canManageGroup: boolean;
  onToggle: () => void;
  onClick: () => void;
  onInvite: () => void;
  onAddFolder: () => void;
  onLongPress: () => void;
  theme: 'light' | 'dark';
  children?: React.ReactNode;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isActive,
  isExpanded,
  canInvite,
  canManageFolders,
  canManageGroup,
  onToggle,
  onClick,
  onInvite,
  onAddFolder,
  onLongPress,
  theme,
  children,
}) => {
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const isPersonalWorkspace = (group as any).isPersonalWorkspace;

  const groupCardStyles = StyleSheet.create({
    container: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isActive ? colors.bluePrimary : 'transparent',
      backgroundColor: isActive ? colors.blueAccentBg : 'transparent',
      marginBottom: 8,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    toggleButton: {
      padding: 4,
      borderRadius: 4,
      marginRight: 8,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isActive ? colors.bluePrimary : colors.textSecondary,
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontWeight: '600',
      color: isActive ? colors.bluePrimary : colors.textPrimary,
      marginBottom: 2,
    },
    meta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 6,
      borderRadius: 6,
      marginLeft: 4,
    },
    folderContainer: {
      paddingLeft: 44,
      paddingRight: 12,
      paddingBottom: 12,
    },
  });

  return (
    <View style={groupCardStyles.container}>
      <TouchableOpacity style={groupCardStyles.header} onLongPress={onLongPress} delayLongPress={500}>
        <TouchableOpacity onPress={onToggle} style={groupCardStyles.toggleButton}>
          {isExpanded ? (
            <ChevronDown size={18} color={colors.textSecondary} />
          ) : (
            <ChevronRight size={18} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={groupCardStyles.content} onPress={onClick}>
          <View style={groupCardStyles.indicator} />
          <View style={groupCardStyles.textContainer}>
            <Text style={groupCardStyles.name} numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={groupCardStyles.meta}>
              {group.members?.length || 0} members
            </Text>
          </View>
        </TouchableOpacity>

        <View style={groupCardStyles.actions}>
          {canManageFolders && (
            <TouchableOpacity onPress={onAddFolder} style={groupCardStyles.actionButton}>
              <FolderPlus size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {canInvite && !isPersonalWorkspace && (
            <TouchableOpacity onPress={onInvite} style={groupCardStyles.actionButton}>
              <UserPlus size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {canManageGroup && !isPersonalWorkspace && (
            <TouchableOpacity onPress={onLongPress} style={groupCardStyles.actionButton}>
              <MoreVertical size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && <View style={groupCardStyles.folderContainer}>{children}</View>}
    </View>
  );
};

// ====================================================================
// --- MAIN SIDEBAR COMPONENT ---
// ====================================================================

export default function Sidebar({ theme = 'light', onClose }: { theme?: 'light' | 'dark'; onClose?: () => void }) {
  const { t } = useLanguage();
  const { user, currentGroup, setCurrentGroup } = useAuth();
  const { socket, isConnected } = useSocket();
  const confirmDialog = useConfirm();
  const toast = useSafeToast();
  const userRoleInCurrentGroup = currentGroup && user ? getMemberRole(currentGroup, user._id) : null;
  const isLeader = Boolean((user as any)?.isLeader);
  const businessRole = ((user as any)?.groupRole || null) as GroupRoleKey | null;
  const canManageGroups = Boolean(businessRole === GROUP_ROLE_KEYS.PRODUCT_OWNER || isLeader);
  const canDeleteFolders = canManageFolders(userRoleInCurrentGroup, isLeader);
  const canEditFolders = canManageFolders(userRoleInCurrentGroup, isLeader);
  const canAssignFolders = canAssignFolderMembers(userRoleInCurrentGroup, isLeader);
  
  const {
    folders,
    currentFolder,
    loading: foldersLoading,
    selectFolder,
    createFolder,
    deleteFolder,
    refreshFolders,
    error: foldersError,
  } = useFolder();

  const [searchQuery, setSearchQuery] = useState('');
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [personalWorkspace, setPersonalWorkspace] = useState<Group | null>(null);
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
    description: string;
    loading: boolean;
    error: string | null;
  }>({
    groupId: null,
    name: '',
    description: '',
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
  const [groupContextMenu, setGroupContextMenu] = useState<{
    x: number;
    y: number;
    group: Group;
  } | null>(null);
  const [showFolderAccessModal, setShowFolderAccessModal] = useState(false);
  const [selectedFolderForAccess, setSelectedFolderForAccess] = useState<{
    folder: Folder;
    groupId: string;
  } | null>(null);
  const [assigningMembers, setAssigningMembers] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Array<{
    userId: string;
    userName: string;
    userEmail: string;
    tasks: Array<{ taskId: string; taskTitle: string; taskStatus: string }>;
  }>>([]);
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, Group['members']>>({});

  const [permissionDialog, setPermissionDialog] = useState<{
    message: string;
  } | null>(null);

  // State để kiểm soát scroll
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // PanResponder để xử lý vuốt ngang đóng sidebar
  const [panResponderEnabled, setPanResponderEnabled] = useState(true);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => panResponderEnabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ bắt sự kiện khi vuốt ngang nhiều hơn dọc (tỉ lệ 2:1)
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
        return isHorizontalSwipe && panResponderEnabled;
      },
      onPanResponderGrant: () => {
        // Tạm thời disable scroll dọc khi bắt đầu vuốt ngang
        setScrollEnabled(false);
      },
      onPanResponderMove: (_, gestureState) => {
        // Có thể thêm hiệu ứng kéo sidebar nếu cần
      },
      onPanResponderRelease: (_, gestureState) => {
        // Kích hoạt lại scroll dọc
        setScrollEnabled(true);
        
        // Vuốt ngang phải đủ mạnh -> đóng sidebar
        if (Math.abs(gestureState.dx) > 50 && Math.abs(gestureState.vx) > 0.3) {
          onClose?.();
        }
      },
      onPanResponderTerminate: () => {
        // Kích hoạt lại scroll dọc khi kết thúc
        setScrollEnabled(true);
        setPanResponderEnabled(true);
      },
    })
  ).current;

  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const sidebarStyles = getSidebarStyles(isDark);

  useGroupChange(() => {
    loadGroups();
  });

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

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getAllGroups();
      const personal = (response.myGroups || []).find(
        (g: any) => g && (g as any).isPersonalWorkspace
      ) || null;
      const regularMyGroups = (response.myGroups || []).filter(
        (g: any) => !g || !(g as any).isPersonalWorkspace
      );

      setPersonalWorkspace(personal);
      setMyGroups(regularMyGroups);
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
      toast.showError(
        error instanceof Error ? error.message : 'Failed to load projects',
        'Error'
      );
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
      toast.showError('Failed to switch project', 'Error');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return {
        personalWorkspace: personalWorkspace ? [personalWorkspace] : [],
        myGroups,
        sharedGroups,
      };
    }

    const filterFn = (groups: Group[]) =>
      groups.filter(group =>
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query)
      );

    return {
      personalWorkspace: personalWorkspace && personalWorkspace.name.toLowerCase().includes(query) ? [personalWorkspace] : [],
      myGroups: filterFn(myGroups),
      sharedGroups: filterFn(sharedGroups),
    };
  }, [searchQuery, personalWorkspace, myGroups, sharedGroups]);

  const handleAddProject = () => {
    if (!canManageGroups) {
      setPermissionDialog({
        message: 'You do not have permission to create new projects. Only Product Owners or Leaders are allowed.'
      });
      return;
    }
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
      toast.showSuccess('Project created successfully', 'Success');
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
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
      loadGroups();
      toast.showSuccess('Invitation sent successfully', 'Success');
    } catch (error) {
      console.error('Failed to invite user:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to invite user. Please check your permissions.';
      toast.showError(message, 'Error');
      throw error;
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
    const group =
      myGroups.find(g => g._id === groupId) ||
      sharedGroups.find(g => g._id === groupId) ||
      (personalWorkspace && personalWorkspace._id === groupId ? personalWorkspace : null);

    if (group && user) {
      const groupUserRole = getMemberRole(group, user._id);
      const effectiveRole = (businessRole || groupUserRole) as GroupRoleKey | null;
      const canManageThisGroupFolders = canManageFolders(effectiveRole, isLeader);
      if (!canManageThisGroupFolders) {
        setPermissionDialog({
          message: 'You do not have permission to create folders in this group. Only Product Owners or Leaders are allowed.'
        });
        return;
      }
    }

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
      description: '',
      loading: false,
      error: null
    });
  };

  const closeFolderForm = () => {
    setFolderFormState({
      groupId: null,
      name: '',
      description: '',
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
        await createFolder(folderFormState.name.trim(), folderFormState.description.trim() || undefined);
      } else {
        await folderService.createFolder(folderFormState.groupId, {
          name: folderFormState.name.trim(),
          description: folderFormState.description.trim() || undefined
        });
        await loadGroupFolders(folderFormState.groupId);
      }
      closeFolderForm();
      toast.showSuccess('Folder created successfully', 'Success');
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
      toast.showError('Failed to switch to folder', 'Error');
    }
  };

  const handleFolderLongPress = (folder: Folder, groupId: string) => {
    if (!canEditFolders && !canDeleteFolders && !canAssignFolders) {
      return;
    }

    Alert.alert(
      'Folder Actions',
      'Choose an action',
      [
        canEditFolders && {
          text: 'Rename',
          onPress: () => startRenamingFolder(groupId, folder),
        },
        canAssignFolders && {
          text: 'Assign Members',
          onPress: () => handleContextMenuAssign(folder, groupId),
        },
        canDeleteFolders && {
          text: 'Delete',
          style: 'destructive' as const,
          onPress: () => handleDeleteFolder(groupId, folder._id),
        },
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ].filter(Boolean) as any[]
    );
  };

  const handleGroupLongPress = (group: Group) => {
    if (!canManageGroups || (group as any).isPersonalWorkspace) {
      return;
    }

    Alert.alert(
      'Group Actions',
      'Choose an action',
      [
        {
          text: 'Rename',
          onPress: () => handleGroupRename(group),
        },
        {
          text: 'Delete',
          style: 'destructive' as const,
          onPress: () => handleGroupDelete(group),
        },
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
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
      toast.showSuccess('Folder renamed successfully', 'Success');
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
    const group =
      myGroups.find(g => g._id === groupId) ||
      sharedGroups.find(g => g._id === groupId) ||
      (personalWorkspace && personalWorkspace._id === groupId ? personalWorkspace : null);

    if (group && user) {
      const groupUserRole = getMemberRole(group, user._id);
      const effectiveRole = (businessRole || groupUserRole) as GroupRoleKey | null;
      const canManageThisGroupFolders = canManageFolders(effectiveRole, isLeader);
      if (!canManageThisGroupFolders) {
        setPermissionDialog({
          message: 'You do not have permission to delete folders in this group. Only Product Owners or Leaders are allowed.'
        });
        return;
      }
    }

    const confirmed = await confirmDialog.confirm({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder? All tasks and notes in this folder will also be deleted.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'delete'
    });

    if (!confirmed) return;

    setDeletingFolderId(folderId);
    setDeleteError(null);

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
      toast.showSuccess('Folder deleted successfully', 'Success');
    } catch (error) {
      setDeleteError({
        folderId,
        message: error instanceof Error ? error.message : 'Failed to delete folder'
      });
    } finally {
      setDeletingFolderId(null);
    }
  };

  const handleContextMenuAssign = async (folder: Folder, groupId: string) => {
    const group =
      myGroups.find(g => g._id === groupId) ||
      sharedGroups.find(g => g._id === groupId) ||
      (personalWorkspace && personalWorkspace._id === groupId ? personalWorkspace : null);

    if (group && user) {
      const groupUserRole = getMemberRole(group, user._id);
      const effectiveRole = (businessRole || groupUserRole) as GroupRoleKey | null;
      const canAssignThisGroupFolders = canAssignFolderMembers(effectiveRole, isLeader);
      if (!canAssignThisGroupFolders) {
        setPermissionDialog({
          message: 'You do not have permission to assign members to this folder. Only Product Owners or Leaders are allowed.'
        });
        return;
      }
    }

    if (!groupMembersMap[groupId]) {
      try {
        const group = await groupService.getGroupById(groupId);
        if (group) {
          setGroupMembersMap(prev => ({
            ...prev,
            [groupId]: group.members || []
          }));
        }
      } catch (error) {
        console.error('Failed to load group members:', error);
      }
    }

    setSelectedFolderForAccess({
      folder,
      groupId
    });
    setShowFolderAccessModal(true);
  };

  const handleAssignFolderMembers = async (memberIds: string[]) => {
    if (!selectedFolderForAccess) return;

    setAssigningMembers(true);
    setAssignError(null);
    setBlockedUsers([]);

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
      toast.showSuccess('Folder members updated successfully', 'Success');
    } catch (error: unknown) {
      const err = error as Error & {
        blockedUsers?: Array<{
          userId: string;
          userName: string;
          userEmail: string;
          tasks: Array<{ taskId: string; taskTitle: string; taskStatus: string }>;
        }>;
      };
      setAssignError(err.message || 'Failed to assign folder members');
      if (err.blockedUsers && Array.isArray(err.blockedUsers)) {
        setBlockedUsers(err.blockedUsers);
      }
    } finally {
      setAssigningMembers(false);
    }
  };

  const handleGroupRename = async (group: Group) => {
    Alert.prompt(
      'Rename Group',
      'Enter new name for the group',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: async (newName) => {
            if (!newName || newName.trim() === '' || newName === group.name) return;
            try {
              await groupService.updateGroup(group._id, { name: newName.trim() });
              await loadGroups();
              toast.showSuccess('Group renamed successfully', 'Success');
            } catch (error) {
              console.error('Failed to rename group:', error);
              toast.showError('Failed to rename group', 'Error');
            }
          },
        },
      ],
      'plain-text',
      group.name
    );
  };

  const handleGroupDelete = async (group: Group) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? All folders, tasks and notes inside will be deleted.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'delete'
    });

    if (!confirmed) return;

    try {
      await groupService.deleteGroup(group._id);
      await loadGroups();
      if (currentGroup?._id === group._id) {
        const firstGroup = myGroups[0] || sharedGroups[0] || personalWorkspace;
        if (firstGroup) {
          await handleWorkspaceChange(firstGroup._id);
        }
      }
      toast.showSuccess('Group deleted successfully', 'Success');
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.showError('Failed to delete group', 'Error');
    }
  };

  const renderFolderListForGroup = (group: Group) => {
    const folderState = getFolderStateForGroup(group._id);
    const formVisible = folderFormState.groupId === group._id;

    const folderListStyles = StyleSheet.create({
      container: {
        gap: 8,
      },
      loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
      },
      loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginLeft: 8,
      },
      emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
      },
      emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
      },
      formContainer: {
        gap: 8,
        marginBottom: 12,
      },
      formInput: {
        backgroundColor: isDark ? '#2E2E2E' : 'white',
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: colors.textPrimary,
      },
      formTextArea: {
        height: 80,
        textAlignVertical: 'top',
      },
      formButtons: {
        flexDirection: 'row',
        gap: 8,
      },
      formButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
      },
      cancelButton: {
        backgroundColor: isDark ? '#374151' : '#E5E7EB',
      },
      cancelButtonText: {
        color: colors.textPrimary,
        fontWeight: '500',
      },
      createButton: {
        backgroundColor: colors.bluePrimary,
      },
      createButtonDisabled: {
        backgroundColor: colors.gray800,
      },
      createButtonText: {
        color: 'white',
        fontWeight: '500',
      },
      errorText: {
        fontSize: 12,
        color: colors.red,
        marginTop: 4,
      },
    });

    return (
      <View style={folderListStyles.container}>
        {formVisible && (
          <View style={folderListStyles.formContainer}>
            <TextInput
              placeholder="Folder name"
              placeholderTextColor={colors.textSecondary}
              value={folderFormState.name}
              onChangeText={(text) =>
                setFolderFormState(prev => ({ ...prev, name: text }))
              }
              style={folderListStyles.formInput}
              editable={!folderFormState.loading}
            />
            <TextInput
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={folderFormState.description}
              onChangeText={(text) =>
                setFolderFormState(prev => ({ ...prev, description: text }))
              }
              style={[folderListStyles.formInput, folderListStyles.formTextArea]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!folderFormState.loading}
            />
            {folderFormState.error && (
              <Text style={folderListStyles.errorText}>{folderFormState.error}</Text>
            )}
            <View style={folderListStyles.formButtons}>
              <TouchableOpacity
                onPress={closeFolderForm}
                disabled={folderFormState.loading}
                style={[folderListStyles.formButton, folderListStyles.cancelButton]}
              >
                <Text style={folderListStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFolderFormSubmit}
                disabled={!folderFormState.name.trim() || folderFormState.loading}
                style={[
                  folderListStyles.formButton,
                  folderListStyles.createButton,
                  (!folderFormState.name.trim() || folderFormState.loading) && folderListStyles.createButtonDisabled,
                ]}
              >
                {folderFormState.loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={folderListStyles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {folderState.loading ? (
          <View style={folderListStyles.loadingContainer}>
            <ActivityIndicator color={colors.textSecondary} size="small" />
            <Text style={folderListStyles.loadingText}>Loading folders...</Text>
          </View>
        ) : folderState.error ? (
          <Text style={{ color: colors.red, fontSize: 14, textAlign: 'center' }}>
            {folderState.error}
          </Text>
        ) : folderState.folders.length === 0 && !formVisible ? (
          <View style={folderListStyles.emptyState}>
            <FolderIcon size={32} color={colors.textSecondary} />
            <Text style={folderListStyles.emptyStateText}>
              No folders yet. Create one to start organizing.
            </Text>
          </View>
        ) : (
          folderState.folders.map((folder) => {
            const folderGroupId = folder.groupId || group._id;
            const isActiveGroup = currentGroup?._id === folderGroupId;
            const isActiveFolder = isActiveGroup && currentFolder?._id === folder._id;
            const isEditing =
              renamingState?.folderId === folder._id && renamingState?.groupId === folderGroupId;

            return (
              <FolderItem
                key={folder._id}
                folder={folder}
                groupId={folderGroupId}
                isActive={isActiveFolder}
                isEditing={isEditing}
                renamingName={renamingState?.name || ''}
                renamingLoading={renamingLoading}
                onPress={() => handleFolderClick(folderGroupId, folder._id)}
                onLongPress={() => handleFolderLongPress(folder, folderGroupId)}
                onRenameChange={(name) =>
                  setRenamingState((prev) =>
                    prev ? { ...prev, name } : prev
                  )
                }
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={cancelRenaming}
                theme={theme}
              />
            );
          })
        )}
      </View>
    );
  };

  const renderGroupCard = (group: Group, options?: {
    canInvite?: boolean;
    canManageFolders?: boolean;
    canManageGroup?: boolean;
  }) => {
    const isActive = currentGroup?._id === group._id;
    const isExpanded = !!expandedGroups[group._id];
    const isPersonalWorkspace = (group as any).isPersonalWorkspace;

    return (
      <GroupCard
        key={group._id}
        group={group}
        isActive={isActive}
        isExpanded={isExpanded}
        canInvite={options?.canInvite || false}
        canManageFolders={options?.canManageFolders || false}
        canManageGroup={options?.canManageGroup || false}
        onToggle={() => handleGroupToggle(group._id)}
        onClick={() => handleProjectClick(group)}
        onInvite={() => handleInviteUser(group)}
        onAddFolder={() => handleOpenFolderForm(group._id)}
        onLongPress={() => handleGroupLongPress(group)}
        theme={theme}
      >
        {renderFolderListForGroup(group)}
      </GroupCard>
    );
  };

  const { personalWorkspace: filteredPersonal, myGroups: filteredMyGroups, sharedGroups: filteredSharedGroups } = filteredGroups;

  // Nội dung scrollable
  const ScrollableContent = () => (
    <View style={{ flex: 1 }}>
      {/* Personal Workspace */}
      {filteredPersonal.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <View style={sidebarStyles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Home size={16} color={colors.bluePrimary} style={{ marginRight: 8 }} />
              <Text style={sidebarStyles.sectionTitle}>
                Personal Workspace
              </Text>
            </View>
          </View>
          {filteredPersonal.map((group) => {
            const groupUserRole = user ? getMemberRole(group, user._id) : null;
            const effectiveRole = (businessRole || groupUserRole) as GroupRoleKey | null;
            const canManageFoldersForPersonal = canManageFolders(effectiveRole, isLeader);
            return renderGroupCard(group, {
              canManageFolders: canManageFoldersForPersonal,
              canManageGroup: false,
            });
          })}
        </View>
      )}

      {/* My Projects */}
      <View style={{ marginBottom: 24 }}>
        <View style={sidebarStyles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FolderIcon size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={sidebarStyles.sectionTitle}>
              My Projects
            </Text>
            {filteredMyGroups.length > 0 && (
              <View style={sidebarStyles.badge}>
                <Text style={sidebarStyles.badgeText}>{filteredMyGroups.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleAddProject}
            style={sidebarStyles.sectionButton}
            disabled={!canManageGroups}
          >
            <Plus size={20} color={canManageGroups ? colors.textPrimary : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {projectsExpanded && (
          <View style={{ marginTop: 8 }}>
            {loading ? (
              <View style={sidebarStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={sidebarStyles.loadingText}>
                  Loading projects...
                </Text>
              </View>
            ) : filteredMyGroups.length === 0 ? (
              <View style={sidebarStyles.emptyState}>
                <FolderIcon size={40} color={colors.textSecondary} />
                <Text style={sidebarStyles.emptyStateText}>
                  No projects yet
                </Text>
                {canManageGroups && (
                  <TouchableOpacity onPress={handleAddProject}>
                    <Text style={sidebarStyles.emptyStateAction}>
                      Create your first project
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredMyGroups.map((group) => {
                const groupUserRole = user ? getMemberRole(group, user._id) : null;
                const effectiveRole = (businessRole || groupUserRole) as GroupRoleKey | null;
                const canInvite = canAddMembers(effectiveRole, isLeader);
                const canManageFoldersForGroup = canManageFolders(effectiveRole, isLeader);
                return renderGroupCard(group, {
                  canInvite,
                  canManageFolders: canManageFoldersForGroup,
                  canManageGroup: canManageGroups,
                });
              })
            )}
          </View>
        )}
      </View>

      {/* Shared with me */}
      <View style={{ marginBottom: 24 }}>
        <TouchableOpacity
          style={sidebarStyles.sectionHeader}
          onPress={() => setSharedExpanded(!sharedExpanded)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Users size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={sidebarStyles.sectionTitle}>
              Shared with me
            </Text>
            {filteredSharedGroups.length > 0 && (
              <View style={sidebarStyles.badge}>
                <Text style={sidebarStyles.badgeText}>{filteredSharedGroups.length}</Text>
              </View>
            )}
          </View>
          {sharedExpanded ? (
            <ChevronDown size={20} color={colors.textSecondary} />
          ) : (
            <ChevronRight size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {sharedExpanded && (
          <View style={{ marginTop: 8 }}>
            {loading ? (
              <View style={sidebarStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={sidebarStyles.loadingText}>
                  Loading...
                </Text>
              </View>
            ) : filteredSharedGroups.length === 0 ? (
              <View style={sidebarStyles.emptyState}>
                <Users size={40} color={colors.textSecondary} />
                <Text style={sidebarStyles.emptyStateText}>
                  No shared projects
                </Text>
              </View>
            ) : (
              filteredSharedGroups.map((group) => {
                const groupUserRole = user ? getMemberRole(group, user._id) : null;
                const effectiveRole = (businessRole || groupUserRole) as GroupRoleKey | null;
                const canManageFoldersForGroup = canManageFolders(effectiveRole, isLeader);
                return renderGroupCard(group, {
                  canInvite: false,
                  canManageFolders: canManageFoldersForGroup,
                  canManageGroup: false,
                });
              })
            )}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={sidebarStyles.container}>
      {/* Permission Dialog */}
      <PermissionDialogComponent
        visible={!!permissionDialog}
        message={permissionDialog?.message || ''}
        onClose={() => setPermissionDialog(null)}
        theme={theme}
      />

      {/* Nút đóng sidebar */}
      {onClose && (
        <TouchableOpacity 
          style={sidebarStyles.closeButton}
          onPress={onClose}
        >
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Header with User Info */}
      <View style={sidebarStyles.header}>
        <View style={sidebarStyles.userInfo}>
          <View style={sidebarStyles.userAvatar}>
            <User size={20} color="white" />
          </View>
          <View style={sidebarStyles.userTextContainer}>
            <Text style={sidebarStyles.userName} numberOfLines={1}>
              {user?.name || 'User'}
            </Text>
            <Text style={sidebarStyles.userEmail} numberOfLines={1}>
              {user?.email || 'user@example.com'}
            </Text>
            {(businessRole || isLeader) && (
              <View style={sidebarStyles.userRoleBadge}>
                <Text style={sidebarStyles.userRoleText}>
                  {isLeader ? 'Leader' : businessRole === GROUP_ROLE_KEYS.PRODUCT_OWNER ? 'Product Owner' : 'Member'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Workspace Selector */}
        <View style={sidebarStyles.workspaceSelector}>
          <Picker
            selectedValue={currentGroup?._id || ''}
            onValueChange={(itemValue) => handleWorkspaceChange(itemValue)}
            style={sidebarStyles.workspacePicker}
          >
            {loading ? (
              <Picker.Item label="Loading workspaces..." value="" />
            ) : (
              [
                ...(personalWorkspace ? [personalWorkspace] : []),
                ...myGroups,
                ...sharedGroups,
              ].map((group) => (
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
      <View style={sidebarStyles.searchContainer}>
        <View style={sidebarStyles.searchInputWrapper}>
          <Search size={18} color={colors.textSecondary} style={sidebarStyles.searchIcon} />
          <TextInput
            placeholder="Search projects..."
            placeholderTextColor={colors.textSecondary}
            style={sidebarStyles.searchInput}
            onChangeText={handleSearch}
            value={searchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* FIXED: Scrollable Content với container giới hạn */}
      <View 
        style={sidebarStyles.scrollContainer}
        {...panResponder.panHandlers}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={sidebarStyles.scrollContent}
          showsVerticalScrollIndicator={true}
          scrollEnabled={scrollEnabled}
          // Ngăn overscroll vertical
          overScrollMode="never"
          // Ngăn nested scrolling issues
          nestedScrollEnabled={true}
          // Scroll boundaries
          maximumZoomScale={1}
          minimumZoomScale={1}
          // Event handlers để kiểm soát pan responder
          onScrollBeginDrag={() => {
            // Khi bắt đầu scroll dọc, disable pan responder
            setPanResponderEnabled(false);
          }}
          onScrollEndDrag={() => {
            // Khi kết thúc scroll, kích hoạt lại pan responder sau delay
            setTimeout(() => {
              setPanResponderEnabled(true);
            }, 100);
          }}
          onMomentumScrollEnd={() => {
            setPanResponderEnabled(true);
          }}
          scrollEventThrottle={16}
          // Kiểm tra scroll boundaries
          onScroll={(event) => {
            const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
            const isAtTop = contentOffset.y <= 10;
            const isAtBottom = contentOffset.y >= contentSize.height - layoutMeasurement.height - 10;
            
            // Nếu ở biên trên hoặc dưới, có thể kích hoạt pan responder
            if (isAtTop || isAtBottom) {
              setPanResponderEnabled(true);
            }
          }}
        >
          <ScrollableContent />
        </ScrollView>
      </View>

      {/* Modals */}
      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
        theme={theme}
      />

      <InviteUserModal
        visible={showInviteModal}
        groupName={selectedGroup?.name || ''}
        onClose={() => {
          setShowInviteModal(false);
          setSelectedGroup(null);
        }}
        onSubmit={handleInviteSubmit}
        theme={theme}
      />

      {/* Folder Access Modal */}
      {showFolderAccessModal && selectedFolderForAccess && (
        <FolderAccessModal
          visible={showFolderAccessModal}
          folder={selectedFolderForAccess.folder}
          members={
            groupMembersMap[selectedFolderForAccess.groupId] ||
            (currentGroup?._id === selectedFolderForAccess.groupId ? currentGroup.members || [] : [])
          }
          onClose={() => {
            setShowFolderAccessModal(false);
            setSelectedFolderForAccess(null);
            setAssignError(null);
            setBlockedUsers([]);
          }}
          onSave={handleAssignFolderMembers}
          saving={assigningMembers}
          error={assignError || undefined}
          blockedUsers={blockedUsers}
          theme={theme}
        />
      )}
    </SafeAreaView>
  );
}