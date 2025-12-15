import React, { useState, useEffect } from 'react';
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
  RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/group.service';
import { notificationService } from '../services/notification.service';
import { Group, GroupMember } from '../types/group.types';
import { useTheme } from '../context/ThemeContext';
import NoGroupState from '../components/common/NoGroupState';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';


interface GroupMembersViewProps {
  groupId?: string;
}

export default function GroupMembersView({ groupId }: GroupMembersViewProps) {
  const { user, currentGroup } = useAuth();
  const { isDark } = useTheme();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  const targetGroupId = groupId || currentGroup?._id;

  useEffect(() => {
    if (targetGroupId) {
      loadGroupDetails();
    }
  }, [targetGroupId]);

  // Auto-reload every 30 seconds (pause when editing)
  useEffect(() => {
    if (!targetGroupId || isEditingName) return;

    const interval = setInterval(() => {
      loadGroupDetails(true); // Show notification for auto-reloads
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [targetGroupId, isEditingName]);

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
        JSON.stringify(group.members.map(m => typeof m.userId === 'string' ? m.userId : m.userId._id)) !== 
        JSON.stringify(groupData.members.map(m => typeof m.userId === 'string' ? m.userId : m.userId._id))
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGroupDetails();
  };

  const handleInviteUser = async (email: string) => {
    if (!targetGroupId) return;

    try {
      await groupService.inviteUserToGroup(targetGroupId, email);
      await loadGroupDetails();
      setShowInviteModal(false);
      Alert.alert('Success', 'Invitation sent successfully');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to invite user');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!targetGroupId) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupService.removeMember(targetGroupId, memberId);
              await loadGroupDetails();
              Alert.alert('Success', 'Member removed successfully');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const handleStartEditName = () => {
    if (!group) return;
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
      
      Alert.alert('Success', 'Group name updated successfully');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update group name');
    } finally {
      setIsUpdating(false);
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
    if (member.userId && typeof member.userId === 'object' && 'name' in member.userId) {
      return (member.userId as any).name;
    }
    return member.name;
  };

  const getMemberEmail = (member: GroupMember) => {
    if (member.userId && typeof member.userId === 'object' && 'email' in member.userId) {
      return (member.userId as any).email;
    }
    return member.email;
  };

  const getMemberAvatar = (member: GroupMember) => {
    if (member.userId && typeof member.userId === 'object' && 'avatar' in member.userId) {
      return (member.userId as any).avatar;
    }
    return member.avatar;
  };

  const isCurrentUser = (member: GroupMember) => {
    const memberId = typeof member.userId === 'string' ? member.userId : member.userId._id;
    return memberId === user?._id;
  };

  const isCurrentUserAdmin = () => {
    if (!group || !user) return false;
    const currentMember = group.members.find(member => {
      const memberId = typeof member.userId === 'string' ? member.userId : member.userId._id;
      return memberId === user._id;
    });
    return currentMember?.role === 'admin';
  };

  const canRemoveMember = (member: GroupMember) => {
    if (!isCurrentUserAdmin()) return false;
    if (isCurrentUser(member)) return false;
    if (member.role === 'admin') return false;
    return true;
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading members...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, isDark && styles.darkErrorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => loadGroupDetails()}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentGroup) {
    return (
      <NoGroupState 
        title="Join or Create a Group to View Members"
        description="You need to join or create a group to view and manage group members."
      />
    );
  }

  if (!group) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.darkContainer]}>
        <Text style={[styles.emptyText, isDark && styles.darkText]}>No group selected</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Update Notification */}
      {showUpdateNotification && (
        <View style={styles.updateNotification}>
          <Ionicons name="refresh" size={16} color="#ffffff" />
          <Text style={styles.updateNotificationText}>Group updated!</Text>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.header, isDark && styles.darkHeader]}>
          <View style={styles.headerContent}>
            {/* Group Name with Inline Editing */}
            <View style={styles.groupNameContainer}>
              {isEditingName ? (
                <View style={styles.editNameContainer}>
                  <TextInput
                    style={[styles.nameInput, isDark && styles.darkText]}
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                    editable={!isUpdating}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      onPress={handleSaveName}
                      disabled={isUpdating || !editingName.trim()}
                      style={styles.editButton}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#10b981" />
                      ) : (
                        <Ionicons name="checkmark" size={20} color="#10b981" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCancelEditName}
                      disabled={isUpdating}
                      style={styles.editButton}
                    >
                      <Ionicons name="close" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.nameTouchableContainer}
                  onPress={isCurrentUserAdmin() ? handleStartEditName : undefined}
                  onLongPress={isCurrentUserAdmin() ? handleStartEditName : undefined}
                >
                  <Text style={[styles.groupName, isDark && styles.darkText]}>
                    {group.name}
                  </Text>
                  {isCurrentUserAdmin() && (
                    <Ionicons 
                      name="pencil" 
                      size={16} 
                      color={isDark ? '#9ca3af' : '#6b7280'} 
                      style={styles.editIcon}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={[styles.description, isDark && styles.darkSubtitle]}>
              {group.description || 'No description provided'}
            </Text>
            
            <View style={styles.metaInfo}>
              <View style={styles.memberCount}>
                <Ionicons name="people" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={[styles.metaText, isDark && styles.darkSubtitle]}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.lastUpdate}>
                <Ionicons name="time-outline" size={12} color={isDark ? '#6b7280' : '#9ca3af'} />
                <Text style={[styles.lastUpdateText, isDark && styles.darkSubtitle]}>
                  Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => loadGroupDetails()}
              disabled={loading}
              style={[styles.refreshButton, isDark && styles.darkRefreshButton]}
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={isDark ? '#9ca3af' : '#6b7280'} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              style={styles.inviteButton}
            >
              <Ionicons name="person-add" size={18} color="#ffffff" />
              <Text style={styles.inviteButtonText}>Add people</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members List */}
        <View style={styles.membersContainer}>
          <View style={[styles.membersCard, isDark && styles.darkCard]}>
            {/* Table Header */}
            <View style={[styles.tableHeader, isDark && styles.darkTableHeader]}>
              <Text style={[styles.headerText, isDark && styles.darkText]}>Member</Text>
              <Text style={[styles.headerText, isDark && styles.darkText]}>Role</Text>
              <Text style={[styles.headerText, isDark && styles.darkText]}>Status</Text>
              {isCurrentUserAdmin() && (
                <Text style={[styles.headerText, isDark && styles.darkText]}>Actions</Text>
              )}
            </View>

            {/* Members */}
            {members.length === 0 ? (
              <View style={styles.emptyMembers}>
                <Ionicons name="people" size={48} color={isDark ? '#4b5563' : '#9ca3af'} />
                <Text style={[styles.emptyMembersText, isDark && styles.darkSubtitle]}>
                  No members found
                </Text>
                <Text style={[styles.emptyMembersSubtext, isDark && styles.darkSubtitle]}>
                  Invite people to get started
                </Text>
              </View>
            ) : (
              members.map((member) => {
                const memberAvatar = getMemberAvatar(member);
                const memberName = getMemberName(member);
                const memberEmail = getMemberEmail(member);
                
                return (
                  <View 
                    key={typeof member.userId === 'string' ? member.userId : member.userId._id}
                    style={[styles.memberRow, isDark && styles.darkMemberRow]}
                  >
                    {/* Member Info */}
                    <View style={styles.memberInfo}>
                      <View style={styles.avatarContainer}>
                        {memberAvatar ? (
                          <Image 
                            source={{ uri: memberAvatar }}
                            style={styles.avatar}
                            onError={() => {
                              // Fallback handled by initial display
                            }}
                          />
                        ) : (
                          <View style={[
                            styles.avatarFallback,
                            member.role === 'admin' && styles.adminAvatar
                          ]}>
                            <Text style={styles.avatarText}>
                              {memberName ? memberName.charAt(0).toUpperCase() : '?'}
                            </Text>
                          </View>
                        )}
                        {member.role === 'admin' && (
                          <View style={styles.adminBadge}>
                            <Ionicons name="star" size={8} color="#92400e" />
                          </View>
                        )}
                      </View>
                      <View style={styles.memberDetails}>
                        <View style={styles.memberNameContainer}>
                          <Text style={[styles.memberName, isDark && styles.darkText]}>
                            {isCurrentUser(member) ? 'Me' : memberName || 'Unknown'}
                          </Text>
                          {isCurrentUser(member) && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youText}>You</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.memberEmail, isDark && styles.darkSubtitle]}>
                          {memberEmail || 'No email'}
                        </Text>
                      </View>
                    </View>

                    {/* Role */}
                    <View style={styles.roleContainer}>
                      <View style={[
                        styles.roleBadge,
                        member.role === 'admin' ? styles.adminRole : styles.memberRole,
                        isDark && member.role === 'admin' && styles.darkAdminRole
                      ]}>
                        {member.role === 'admin' && (
                          <Ionicons name="star" size={12} color={isDark ? '#f59e0b' : '#92400e'} />
                        )}
                        <Text style={[
                          styles.roleText,
                          member.role === 'admin' ? styles.adminRoleText : styles.memberRoleText
                        ]}>
                          {getRoleDisplayName(member.role)}
                        </Text>
                      </View>
                    </View>

                    {/* Status */}
                    <View style={styles.statusContainer}>
                      <View style={styles.statusIndicator}>
                        <View style={styles.statusDot} />
                        <Text style={[styles.statusText, isDark && styles.darkText]}>Active</Text>
                      </View>
                    </View>

                    {/* Actions */}
                    {isCurrentUserAdmin() && (
                      <View style={styles.actionsContainer}>
                        {canRemoveMember(member) ? (
                          <TouchableOpacity
                            onPress={() => {
                              const memberId = typeof member.userId === 'string' ? member.userId : member.userId._id;
                              handleRemoveMember(memberId, memberName || 'Unknown');
                            }}
                            style={styles.removeButton}
                          >
                            <Text style={styles.removeText}>Remove</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={[styles.noActionText, isDark && styles.darkSubtitle]}>-</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* Add People Link */}
          {members.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              style={styles.addPeopleLink}
            >
              <Text style={[styles.addPeopleText, isDark && styles.darkText]}>
                + Add people
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <InviteUserModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUser}
      />
    </SafeAreaView>
  );
}

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: (email: string) => void;
}

function InviteUserModal({ visible, onClose, onInvite }: InviteUserModalProps) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onInvite(email.trim());
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.modalContainer, isDark && styles.darkContainer]}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, isDark && styles.darkModalIcon]}>
              <Ionicons name="person-add" size={24} color="#ffffff" />
            </View>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>
              Add Team Member
            </Text>
            <Text style={[styles.modalSubtitle, isDark && styles.darkSubtitle]}>
              Invite someone to join your group and collaborate together
            </Text>
          </View>
          
          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.inputLabel, isDark && styles.darkText]}>
              Email Address
            </Text>
            <View style={[styles.inputContainer, isDark && styles.darkInput]}>
              <Ionicons name="mail" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={[styles.emailInput, isDark && styles.darkText]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>

            {error && (
              <View style={[styles.errorBox, isDark && styles.darkErrorBox]}>
                <Ionicons name="warning" size={16} color="#dc2626" />
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                style={[styles.cancelButton, isDark && styles.darkCancelButton]}
              >
                <Text style={[styles.cancelButtonText, isDark && styles.darkText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !email.trim()}
                style={[styles.inviteModalButton, (!email.trim() || loading) && styles.inviteModalButtonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#ffffff" />
                    <Text style={styles.inviteModalButtonText}>Send Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.modalFooter}>
            <Text style={[styles.footerText, isDark && styles.darkSubtitle]}>
              The user will receive an email invitation to join your group
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  darkContainer: {
    backgroundColor: '#1a202c',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  darkErrorContainer: {
    backgroundColor: '#7f1d1d',
    borderColor: '#991b1b',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  retryText: {
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 16,
  },
  darkHeader: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#374151',
  },
  headerContent: {
    flex: 1,
  },
  groupNameContainer: {
    marginBottom: 8,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingVertical: 4,
    marginRight: 8,
  },
  editActions: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Đổi tên style bị trùng
  nameTouchableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  darkText: {
    color: '#f7fafc',
  },
  editIcon: {
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  darkSubtitle: {
    color: '#a0aec0',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginRight: 12,
  },
  darkRefreshButton: {
    backgroundColor: '#374151',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
  },
  inviteButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  membersContainer: {
    padding: 16,
  },
  membersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  darkCard: {
    backgroundColor: '#1f1f1f',
    borderColor: '#374151',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  darkTableHeader: {
    backgroundColor: '#2d3748',
    borderBottomColor: '#4a5568',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  emptyMembers: {
    padding: 32,
    alignItems: 'center',
  },
  emptyMembersText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyMembersSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  darkMemberRow: {
    borderBottomColor: '#374151',
  },
  memberInfo: {
    flex: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatar: {
    backgroundColor: '#f59e0b',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  memberDetails: {
    flex: 1,
  },
  // Đổi tên style bị trùng
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  youBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  youText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e40af',
  },
  memberEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  roleContainer: {
    flex: 1.2,
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminRole: {
    backgroundColor: '#fef3c7',
  },
  darkAdminRole: {
    backgroundColor: '#78350f',
  },
  memberRole: {
    backgroundColor: '#f3f4f6',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  adminRoleText: {
    color: '#92400e',
  },
  memberRoleText: {
    color: '#374151',
  },
  actionsContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
  },
  noActionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  addPeopleLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  addPeopleText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  darkModalIcon: {
    backgroundColor: '#1e40af',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  darkInput: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  emailInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#374151',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  darkErrorBox: {
    backgroundColor: '#7f1d1d',
    borderColor: '#991b1b',
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  darkCancelButton: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  inviteModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    gap: 8,
  },
  inviteModalButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  inviteModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalFooter: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Update Notification
  updateNotification: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  updateNotificationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Last Update
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastUpdateText: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 4,
  },
  // Status
  statusContainer: {
    flex: 1,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10b981',
  },
});