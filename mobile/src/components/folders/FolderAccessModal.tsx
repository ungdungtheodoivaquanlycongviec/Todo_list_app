import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { X, Users, AlertTriangle, Search, Check, Crown } from 'lucide-react-native'; // Thêm Crown icon cho Owner

import { Folder } from '../../types/folder.types';
import { GroupMember } from '../../types/group.types';
import { getMemberId } from '../../utils/groupRoleUtils'; // Bỏ requiresFolderAssignment nếu muốn hiện tất cả
import { getRoleLabel, GROUP_ROLE_KEYS } from '../constants/groupRoles';
import { useLanguage } from '../../context/LanguageContext';

interface BlockedUser {
  userId: string;
  userName: string;
  userEmail: string;
  tasks: Array<{ taskId: string; taskTitle: string; taskStatus: string }>;
}

interface FolderAccessModalProps {
  visible: boolean;
  folder: Folder;
  members: GroupMember[];
  onClose: () => void;
  onSave: (memberIds: string[]) => Promise<void>;
  saving: boolean;
  error?: string | null;
  theme?: 'light' | 'dark';
  blockedUsers?: BlockedUser[];
}

export const FolderAccessModal: React.FC<FolderAccessModalProps> = ({
  visible,
  folder,
  members,
  onClose,
  onSave,
  saving,
  error,
  theme = 'light',
  blockedUsers = []
}) => {
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const colors = getColors(isDark);

  // ✅ FIX: Hiển thị tất cả thành viên trong nhóm để có thể gán quyền
  // (Bỏ requiresFolderAssignment để giống Web hiển thị full list)
  const eligibleMembers = useMemo(
    () => members.filter(member => {
      const memberId = getMemberId(member);
      return Boolean(memberId);
    }),
    [members]
  );

  const initialSelected = useMemo(() => {
    if (!Array.isArray(folder.memberAccess)) return [];
    return folder.memberAccess.map((access: any) => {
        const u = access.userId;
        return (typeof u === 'string' ? u : u?._id) as string;
    }).filter(Boolean);
  }, [folder.memberAccess]);

  const [selectedMembers, setSelectedMembers] = useState<string[]>(initialSelected);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedMembers(initialSelected);
      setSearch('');
    }
  }, [visible, initialSelected]);

  const filteredMembers = eligibleMembers.filter(member => {
    const userObj = member.userId as any;
    const name = member.name || userObj?.name || '';
    const email = member.email || userObj?.email || '';
    const keyword = search.toLowerCase();
    return (name?.toLowerCase().includes(keyword) || email?.toLowerCase().includes(keyword));
  });

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  }, []);

  const handleSave = async () => {
    if (saving) return;
    await onSave(selectedMembers);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayClickArea} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Users size={20} color={colors.bluePrimary} style={{ marginRight: 8 }} />
                <Text style={styles.title}>{t('folderAccess.title' as any) || 'Quản lý truy cập folder'}</Text>
              </View>
              <Text style={styles.subtitle} numberOfLines={1}>
                {t('folderAccess.folderLabel' as any) || 'Folder'}: <Text style={styles.folderName}>{folder.name}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={saving}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <View style={styles.searchContainer}>
              <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                placeholder={t('folderAccess.searchPlaceholder' as any) || "Tìm kiếm thành viên"}
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                autoCapitalize="none"
              />
            </View>

            {(error || (blockedUsers && blockedUsers.length > 0)) && (
              <View style={styles.errorContainer}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                    <AlertTriangle size={18} color={colors.red} />
                    <Text style={styles.errorTitle}>{error || t('folderAccess.cannotRemoveWithActiveTasks' as any) || 'Hành động bị chặn'}</Text>
                </View>
                {blockedUsers && blockedUsers.length > 0 && (
                    <View style={{marginTop: 4}}>
                        <Text style={styles.blockedDesc}>Người dùng sau có task chưa hoàn thành:</Text>
                        {blockedUsers.map(u => (
                            <View key={u.userId} style={{marginTop: 4, paddingLeft: 8}}>
                                <Text style={styles.blockedUserName}>• {u.userName}</Text>
                            </View>
                        ))}
                    </View>
                )}
              </View>
            )}

            <ScrollView style={styles.scrollArea} contentContainerStyle={{flexGrow: 1}}>
              {filteredMembers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {eligibleMembers.length === 0 
                        ? (t('folderAccess.noEligibleMembers' as any) || 'Không có thành viên trong nhóm.') 
                        : (t('folderAccess.noMatchingMembers' as any) || 'Không tìm thấy thành viên.')}
                  </Text>
                </View>
              ) : (
                filteredMembers.map(member => {
                  const memberId = getMemberId(member);
                  if (!memberId) return null;
                  const isSelected = selectedMembers.includes(memberId);
                  
                  const userObj = member.userId as any;
                  const displayName = member.name || userObj?.name || 'Member';
                  const email = member.email || userObj?.email || '';
                  const avatar = userObj?.avatar;
                  const isOwner = member.role === GROUP_ROLE_KEYS.PRODUCT_OWNER; // Check Owner

                  return (
                    <TouchableOpacity
                      key={memberId}
                      onPress={() => toggleMember(memberId)}
                      style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                      disabled={saving}
                    >
                      <View style={styles.memberInfo}>
                         <View style={styles.avatar}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                            )}
                         </View>
                         <View style={{flex: 1}}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Text style={styles.memberName}>{displayName}</Text>
                                {/* ✅ Thêm icon Crown cho Owner */}
                                {isOwner && <Crown size={14} color="#EAB308" style={{marginLeft: 6}} fill="#EAB308" />}
                            </View>
                            <Text style={styles.memberEmail}>{email}</Text>
                            <Text style={styles.memberRoleLabel}>{getRoleLabel(member.role)}</Text>
                         </View>
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected && <Check size={14} color="#FFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]} disabled={saving}>
              <Text style={styles.cancelButtonText}>{t('common.cancel' as any) || 'Hủy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.button, styles.saveButton]} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveButtonText}>{t('folderAccess.savePermissions' as any) || 'Lưu phân quyền'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getColors = (isDark: boolean) => ({
    bg: isDark ? '#1F1F1F' : '#ffffff',
    textPrimary: isDark ? '#f3f4f6' : '#1f2937',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    bluePrimary: isDark ? '#60A5FA' : '#3B82F6',
    blueBg: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff',
    red: isDark ? '#F87171' : '#EF4444',
    redBg: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    hover: isDark ? '#2E2E2E' : '#f9fafb',
});

// --- Styles ---
const getStyles = (isDark: boolean) => {
    const colors = getColors(isDark);
    return StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
        },
        overlayClickArea: {
            position: 'absolute', top:0, left:0, right:0, bottom:0
        },
        modalContent: {
            backgroundColor: colors.bg,
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            minHeight: 450, 
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.bg,
        },
        titleContainer: { flex: 1 },
        title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
        subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
        folderName: { fontWeight: '600', color: colors.textPrimary },
        closeButton: { padding: 4 },
        
        body: {
            flex: 1,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.hover,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
            marginBottom: 12,
        },
        searchIcon: { marginRight: 8 },
        searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, height: '100%' },
        
        // ✅ ĐÃ THÊM: scrollArea bị thiếu
        scrollArea: {
            flex: 1,
            minHeight: 100, // Đảm bảo có chiều cao tối thiểu
        },

        errorContainer: {
            backgroundColor: colors.redBg,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? '#7f1d1d' : '#fecaca',
            marginBottom: 12,
        },
        errorTitle: { color: colors.red, fontSize: 13, fontWeight: '600', marginLeft: 8 },
        blockedDesc: { fontSize: 12, color: colors.textPrimary, marginBottom: 4 },
        blockedUserName: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
        
        footer: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            gap: 12,
            backgroundColor: colors.bg,
        },
        button: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cancelButton: { backgroundColor: colors.hover },
        cancelButtonText: { color: colors.textPrimary, fontWeight: '600' },
        saveButton: { backgroundColor: colors.bluePrimary },
        saveButtonText: { color: '#ffffff', fontWeight: '600' },
        
        emptyContainer: { padding: 24, alignItems: 'center' },
        emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
        memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
        memberRowSelected: { backgroundColor: colors.blueBg },
        memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
        avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        avatarImg: { width: 40, height: 40, borderRadius: 20 },
        avatarText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
        memberName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
        memberEmail: { fontSize: 12, color: colors.textSecondary },
        memberRoleLabel: { fontSize: 11, color: colors.bluePrimary, fontWeight: '500', marginTop: 2 },
        checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center' },
        checkboxChecked: { backgroundColor: colors.bluePrimary, borderColor: colors.bluePrimary },
    });
};