import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Dimensions
} from 'react-native';
// ✅ Import Lucide Icons
import { 
  Trash2, RefreshCw, UserPlus, Star, Check, X, 
  Clock, Folder as FolderIcon, AlertTriangle, Users 
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/group.service';
import { userService } from '../services/user.service';
import { notificationService } from '../services/notification.service';
import { folderService } from '../services/folder.service';
import { Group, GroupMember } from '../types/group.types';
import { Folder } from '../types/folder.types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFolder } from '../context/FolderContext';
import { useRegional } from '../context/RegionalContext';
import NoGroupState from '../components/common/NoGroupState';
import { FolderAccessModal } from '../components/folders/FolderAccessModal';

// Import Utils & Constants
import {
  getRoleLabel,
  GROUP_ROLE_KEYS,
  GroupRoleKey,
} from '../components/constants/groupRoles';
import {
  getMemberId,
  getMemberRole,
  canAddMembers,
  canAssignFolderMembers,
  canManageRoles as canManageRolesFor,
  requiresFolderAssignment as requiresFolderAssignmentHelper
} from '../utils/groupRoleUtils';

interface GroupMembersViewProps {
  groupId?: string;
  navigation?: any;
}

export default function GroupMembersView({ groupId, navigation }: GroupMembersViewProps) {
  const { user, currentGroup, setCurrentGroup } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { formatTime } = useRegional();
  const { folders, refreshFolders } = useFolder();

  // --- STATE ---
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  // Modals State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Folder Access State
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [activeFolderForAssignment, setActiveFolderForAssignment] = useState<Folder | null>(null);
  const [folderModalSaving, setFolderModalSaving] = useState(false);
  const [folderModalError, setFolderModalError] = useState<string | null>(null);
  const [folderBlockedUsers, setFolderBlockedUsers] = useState<any[]>([]);

  const targetGroupId = groupId || currentGroup?._id;

  // --- LOGIC PHÂN QUYỀN (RBAC) ---
  const currentUserRole = ((user as any)?.groupRole || null) as GroupRoleKey | null;
  const isLeader = Boolean((user as any)?.isLeader);
  const canAddMembersCheck = canAddMembers(currentUserRole, isLeader);
  const canRemoveMembersCheck = canAssignFolderMembers(currentUserRole, isLeader);
  
  const showFolderAssignments = Boolean(group?._id && currentGroup?._id && group?._id === currentGroup?._id);
  
  const assignableFolders = useMemo(() => {
    if (!showFolderAssignments) return [];
    return (folders || []).filter(folder => !folder.isDefault);
  }, [folders, showFolderAssignments]);

  const folderAssignments = useMemo(() => {
    if (!showFolderAssignments || !Array.isArray(folders)) {
      return new Map<string, string[]>();
    }
    const assignmentMap = new Map<string, string[]>();
    const currentUserId = user?._id;
    const canAssign = canAssignFolderMembers(currentUserRole, isLeader);

    folders.forEach(folder => {
      if (!folder.memberAccess) return;
      folder.memberAccess.forEach((access: any) => {
        const uid = typeof access.userId === 'string' ? access.userId : access.userId?._id;
        if (!uid) return;
        if (!canAssign && uid !== currentUserId) return;
        
        const existing = assignmentMap.get(uid) || [];
        assignmentMap.set(uid, [...existing, folder.name]);
      });
    });
    return assignmentMap;
  }, [folders, showFolderAssignments, user?._id, currentUserRole, isLeader]);

  const getAssignedFolderNames = (memberId?: string | null) => {
    if (!memberId) return [];
    return folderAssignments.get(memberId) || [];
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (targetGroupId) loadGroupDetails();
  }, [targetGroupId]);

  useEffect(() => {
    if (!targetGroupId || isEditingName) return;
    const interval = setInterval(() => {
      loadGroupDetails(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [targetGroupId, isEditingName]);

  // --- DATA LOADING ---
  const loadGroupDetails = async (isAutoReload = false) => {
    if (!targetGroupId) return;
    try {
      if (!isAutoReload) setLoading(true);
      setError(null);
      const groupData = await groupService.getGroupById(targetGroupId);
      
      // ✅ FIX 1: Kiểm tra null trước khi dùng
      if (!groupData) {
        throw new Error('Group not found');
      }

      setGroup(groupData);
      // ✅ FIX 1: groupData đã được check null ở trên
      setMembers(groupData.members || []);
      setLastUpdateTime(Date.now());

      if (isAutoReload) {
        setShowUpdateNotification(true);
        setTimeout(() => setShowUpdateNotification(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGroupDetails();
    if (showFolderAssignments) refreshFolders();
  };

  // --- ACTIONS ---
  const handleSaveName = async () => {
    if (!targetGroupId || !editingName.trim() || !group) return;
    const oldName = group.name;
    const newName = editingName.trim();

    try {
      setIsUpdating(true);
      const updatedGroup = await groupService.updateGroup(targetGroupId, { name: newName });
      setGroup(updatedGroup);
      setIsEditingName(false);
      
      try {
        await notificationService.createGroupNameChangeNotification(targetGroupId, oldName, newName);
      } catch (e) {}
      
      Alert.alert(t('common.success' as any), t('groupMembers.groupNameUpdated' as any));
    } catch (err: any) {
      Alert.alert(t('common.error' as any), err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInviteUser = async (email: string) => {
    if (!targetGroupId) return;
    try {
      await groupService.inviteUserToGroup(targetGroupId, email);
      await loadGroupDetails();
      setShowInviteModal(false);
      Alert.alert(t('common.success' as any), t('groupMembers.inviteSent' as any));
    } catch (err: any) {
      Alert.alert(t('common.error' as any), err.message);
    }
  };

  const canRemoveMember = (member: GroupMember) => {
    if (!canRemoveMembersCheck) return false;
    const memberId = getMemberId(member);
    if (memberId === user?._id) return false;

    const memberUser = member.userId && typeof member.userId === 'object' ? (member.userId as any) : null;
    const memberRole = (memberUser?.groupRole || null) as GroupRoleKey | null;
    const memberIsLeader = Boolean(memberUser?.isLeader);

    const getPowerLevel = (role: GroupRoleKey | null, leader: boolean) => {
      const isPM = role === GROUP_ROLE_KEYS.PM;
      const isPO = role === GROUP_ROLE_KEYS.PRODUCT_OWNER;
      if (leader && (isPM || isPO)) return 3;
      if (leader || isPM || isPO) return 2;
      return 1;
    };

    const currentLevel = getPowerLevel(currentUserRole, isLeader);
    const memberLevel = getPowerLevel(memberRole, memberIsLeader);

    return currentLevel > memberLevel;
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!targetGroupId) return;
    Alert.alert(
      t('groupMembers.removeMember' as any),
      t('groupMembers.removeConfirm' as any, { name: memberName }),
      [
        { text: t('common.cancel' as any), style: 'cancel' },
        { 
          text: t('common.remove' as any), 
          style: 'destructive',
          onPress: async () => {
            try {
              await groupService.removeMember(targetGroupId, memberId);
              loadGroupDetails();
            } catch (e: any) {
              Alert.alert(t('common.error' as any), e.message);
            }
          }
        }
      ]
    );
  };

  const handleDeleteGroup = async () => {
    if (!targetGroupId) return;
    setIsDeleting(true);
    try {
      const allGroupsRes = await groupService.getAllGroups();
      const allGroups = [...allGroupsRes.myGroups, ...allGroupsRes.sharedGroups];
      const fallback = allGroups.find(g => g._id !== targetGroupId);

      if (fallback) {
        await userService.updateProfile({ currentGroupId: fallback._id });
        setCurrentGroup(fallback);
      } else {
        await userService.updateProfile({ currentGroupId: undefined });
        setCurrentGroup(null);
      }

      await groupService.deleteGroup(targetGroupId);
      setShowDeleteModal(false);
      navigation?.goBack();
    } catch (err: any) {
      Alert.alert(t('common.error' as any), err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenFolderModal = (folder: Folder) => {
    setActiveFolderForAssignment(folder);
    setFolderModalOpen(true);
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
      await loadGroupDetails();
      setFolderModalOpen(false);
      setActiveFolderForAssignment(null);
      Alert.alert(t('common.success' as any), t('folderAccess.saved' as any));
    } catch (err: any) {
      setFolderModalError(err.message || 'Failed to update folder access');
      if (err.blockedUsers) setFolderBlockedUsers(err.blockedUsers);
    } finally {
      setFolderModalSaving(false);
    }
  };

  const getMemberInfo = (member: GroupMember) => {
    const userObj = member.userId && typeof member.userId === 'object' ? member.userId : null;
    return {
      id: getMemberId(member),
      name: userObj?.name || member.name || 'Unknown',
      email: userObj?.email || member.email || 'No email',
      avatar: userObj?.avatar || member.avatar,
      role: (userObj as any)?.groupRole || null, 
      isLeader: (userObj as any)?.isLeader
    };
  };

  const colors = {
    bg: isDark ? '#111827' : '#F9FAFB',
    card: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#111827',
    subText: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    blue: '#3B82F6',
    red: '#EF4444'
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, {backgroundColor: colors.bg}]}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  if (!group) return <NoGroupState />;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {showUpdateNotification && (
        <View style={styles.updateBanner}>
          <RefreshCw size={14} color="#FFF" />
          <Text style={styles.updateText}>{t('groupMembers.groupUpdated' as any)}</Text>
        </View>
      )}

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{paddingBottom: 40}}
      >
        <View style={[styles.header, {backgroundColor: colors.card, borderColor: colors.border}]}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
            <View style={{flex: 1}}>
              {isEditingName ? (
                <View style={styles.editNameRow}>
                  <TextInput 
                    value={editingName} 
                    onChangeText={setEditingName}
                    style={[styles.nameInput, {color: colors.text}]}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveName} disabled={isUpdating}>
                    <Check size={24} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditingName(false)}>
                    <X size={24} color={colors.subText} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  onLongPress={() => {
                    if (canManageRolesFor()) { 
                       // setEditingName(group.name); setIsEditingName(true);
                    }
                  }}
                >
                  <Text style={[styles.groupName, {color: colors.text}]}>{group.name}</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.desc, {color: colors.subText}]}>{group.description || t('groups.noDescription' as any)}</Text>
              
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Users size={14} color={colors.subText} />
                  <Text style={{color: colors.subText, fontSize: 12, marginLeft: 4}}>{members.length} members</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={14} color={colors.subText} />
                  <Text style={{color: colors.subText, fontSize: 12, marginLeft: 4}}>Updated: {formatTime(new Date(lastUpdateTime))}</Text>
                </View>
              </View>
            </View>

            <View style={{flexDirection:'row', gap: 10}}>
              {(canManageRolesFor() || isLeader) && (
                <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.iconBtn}>
                  <Trash2 size={20} color={colors.red} />
                </TouchableOpacity>
              )}
              {canAddMembersCheck && (
                <TouchableOpacity onPress={() => setShowInviteModal(true)} style={[styles.iconBtn, {backgroundColor: colors.blue}]}>
                  <UserPlus size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Folder Assignment */}
        {canAssignFolderMembers(currentUserRole, isLeader) && showFolderAssignments && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>{t('groupMembers.folderManagement' as any)}</Text>
            {assignableFolders.length === 0 ? (
                <Text style={{color: colors.subText, marginTop: 8}}>{t('groupMembers.noCustomFolders' as any)}</Text>
            ) : (
                assignableFolders.map(folder => {
                    const assignedCount = (folder.memberAccess || []).length;
                    return (
                        <View key={folder._id} style={[styles.folderCard, {backgroundColor: colors.card, borderColor: colors.border}]}>
                            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                <View>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <FolderIcon size={16} color={colors.blue} style={{marginRight: 6}} />
                                        <Text style={[styles.folderName, {color: colors.text}]}>{folder.name}</Text>
                                    </View>
                                    <Text style={{color: colors.subText, fontSize: 12, marginTop: 4}}>
                                        {t('groupMembers.membersAssigned' as any, {count: assignedCount})}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => handleOpenFolderModal(folder)}>
                                    <Text style={{color: colors.blue, fontWeight:'600', fontSize: 13}}>
                                        {t('groupMembers.manageAccess' as any)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                })
            )}
          </View>
        )}

        {/* Members List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>{t('groupMembers.tableHeaderMember' as any)}</Text>
          <View style={[styles.listContainer, {backgroundColor: colors.card, borderColor: colors.border}]}>
            {members.map(member => {
              const info = getMemberInfo(member);
              const isMe = info.id === user?._id;
              
              const assignedFolders = showFolderAssignments ? getAssignedFolderNames(info.id) : [];
              const requiresFolder = requiresFolderAssignmentHelper(info.role);
              const needsAssignment = showFolderAssignments && requiresFolder && assignedFolders.length === 0;

              return (
                <View key={info.id} style={[styles.memberRow, {borderBottomColor: colors.border}]}>
                  <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                    {info.avatar ? (
                        <Image source={{uri: info.avatar}} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={{color:'#FFF', fontWeight:'bold'}}>{info.name.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    
                    <View style={{marginLeft: 12, flex: 1}}>
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <Text style={[styles.memberName, {color: colors.text}]}>
                                {isMe ? t('groupMembers.me' as any) : info.name}
                            </Text>
                            {info.role && (
                                <View style={[styles.roleBadge, info.role === GROUP_ROLE_KEYS.PRODUCT_OWNER && {backgroundColor: '#F59E0B'}]}>
                                    {/* ✅ FIX 2: Bỏ tham số t để khớp định nghĩa hàm hiện tại */}
                                    <Text style={styles.roleText}>{getRoleLabel(info.role)}</Text>
                                </View>
                            )}
                            {info.isLeader && <Star size={12} color="#F59E0B" style={{marginLeft: 4}} />}
                        </View>
                        <Text style={{color: colors.subText, fontSize: 12}}>{info.email}</Text>
                        
                        {showFolderAssignments && requiresFolder && (
                            <View style={{marginTop: 4}}>
                                {needsAssignment ? (
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <AlertTriangle size={12} color="#F59E0B" />
                                        <Text style={{color: '#F59E0B', fontSize: 11, marginLeft: 4}}>Not assigned to any folder</Text>
                                    </View>
                                ) : (
                                    <Text style={{color: colors.subText, fontSize: 11}}>
                                        Access: {assignedFolders.slice(0, 2).join(', ')} {assignedFolders.length > 2 ? `+${assignedFolders.length - 2}` : ''}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                  </View>

                  {canRemoveMember(member) && (
                    <TouchableOpacity 
                        onPress={() => handleRemoveMember(info.id || '', info.name)}
                        style={styles.removeBtn}
                    >
                        <Trash2 size={18} color={colors.red} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* --- Modals --- */}
      <InviteUserModal 
        visible={showInviteModal} 
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUser}
        theme={isDark ? 'dark' : 'light'}
        t={t}
      />

      <DeleteGroupModal
        visible={showDeleteModal}
        groupName={group.name}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteGroup}
        isDeleting={isDeleting}
        theme={isDark ? 'dark' : 'light'}
        t={t}
      />

      {folderModalOpen && activeFolderForAssignment && (
        <FolderAccessModal
          visible={folderModalOpen}
          folder={activeFolderForAssignment}
          members={members}
          onClose={() => setFolderModalOpen(false)}
          onSave={handleSaveFolderMembers}
          saving={folderModalSaving}
          error={folderModalError || undefined}
          blockedUsers={folderBlockedUsers}
          theme={isDark ? 'dark' : 'light'}
        />
      )}
    </SafeAreaView>
  );
}

// --- SUB COMPONENTS ---

function InviteUserModal({ visible, onClose, onInvite, theme, t }: any) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const isDark = theme === 'dark';
    const colors = {
        bg: isDark ? '#1F2937' : '#FFFFFF',
        text: isDark ? '#FFF' : '#111827',
        inputBg: isDark ? '#374151' : '#FFFFFF',
        inputBorder: isDark ? '#4B5563' : '#E5E7EB',
        placeholder: isDark ? '#9CA3AF' : '#9CA3AF',
        btnText: '#FFF',
        cancelText: isDark ? '#D1D5DB' : '#374151',
        cancelBg: isDark ? '#374151' : '#F3F4F6',
        primary: '#3B82F6'
    };
    
    const handleSubmit = async () => {
        if(!email.trim()) return;
        setLoading(true);
        try {
            await onInvite(email);
            setEmail('');
        } finally { setLoading(false); }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDark && styles.darkModal]}>
                    <Text style={[styles.modalTitle, {color: colors.text}]}>{t('groupMembers.addTeamMember' as any)}</Text>
                    
                    <TextInput 
                        placeholder={t('groupMembers.emailAddress' as any) || "Email Address"}
                        placeholderTextColor={colors.placeholder}
                        value={email}
                        onChangeText={setEmail}
                        style={[
                            styles.input, 
                            { 
                                backgroundColor: colors.inputBg, 
                                borderColor: colors.inputBorder,
                                color: colors.text
                            }
                        ]}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    
                    <View style={styles.modalBtns}>
                        <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, {backgroundColor: colors.cancelBg}]}>
                            <Text style={{color: colors.cancelText, fontWeight: '600'}}>{t('common.cancel' as any) || 'Hủy'}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={handleSubmit} 
                            style={[styles.confirmBtn, {backgroundColor: colors.primary}]}
                            disabled={loading || !email.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF"/> 
                            ) : (
                                // ✅ ĐÃ SỬA: Dùng key groupMembers.sendInvite thay vì common.send
                                <Text style={{color: colors.btnText, fontWeight: '600'}}>
                                    {t('groupMembers.sendInvite' as any) || 'Gửi lời mời'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function DeleteGroupModal({ visible, groupName, onClose, onConfirm, isDeleting, theme, t }: any) {
    const isDark = theme === 'dark';
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDark && styles.darkModal]}>
                    <View style={{alignItems:'center', marginBottom:16}}>
                        <View style={{width:50, height:50, borderRadius:25, backgroundColor:'#FEE2E2', alignItems:'center', justifyContent:'center'}}>
                            <Trash2 size={24} color="#EF4444" />
                        </View>
                    </View>
                    <Text style={[styles.modalTitle, isDark && {color:'#FFF'}, {textAlign:'center'}]}>{t('groupMembers.deleteGroup' as any)}</Text>
                    <Text style={{textAlign:'center', marginBottom: 20, color:'#6B7280'}}>
                        Are you sure you want to delete <Text style={{fontWeight:'bold'}}>{groupName}</Text>? This action cannot be undone.
                    </Text>
                    <View style={styles.modalBtns}>
                        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text>{t('common.cancel' as any)}</Text></TouchableOpacity>
                        <TouchableOpacity onPress={onConfirm} style={[styles.confirmBtn, {backgroundColor:'#EF4444'}]}>
                            {isDeleting ? <ActivityIndicator color="#FFF"/> : <Text style={{color:'#FFF'}}>{t('common.delete' as any)}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, borderBottomWidth: 1, paddingBottom: 16 },
  groupName: { fontSize: 22, fontWeight: 'bold' },
  desc: { fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  
  // Folder Cards
  folderCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  folderName: { fontWeight: '600' },

  // Members List
  listContainer: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  memberRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  memberName: { fontWeight: '600', fontSize: 15 },
  roleBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  roleText: { fontSize: 10, fontWeight: '600', color: '#374151' },
  removeBtn: { padding: 8 },

  // Edit Name
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  nameInput: { fontSize: 20, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#3B82F6', flex: 1, padding: 0 },

  // Notification
  updateBanner: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: '#10B981', padding: 8, borderRadius: 20, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 6 },
  updateText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  darkModal: { backgroundColor: '#1F2937' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 20 },
  darkInput: { borderColor: '#374151', color: '#FFF', backgroundColor: '#374151' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#3B82F6', alignItems: 'center' }
});