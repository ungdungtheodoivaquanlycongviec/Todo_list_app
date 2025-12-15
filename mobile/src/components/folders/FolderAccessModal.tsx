import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
// Yêu cầu thư viện icon: npm install react-native-vector-icons
import Ionicons from 'react-native-vector-icons/Ionicons';

// ⚠️ ĐIỀU CHỈNH ĐƯỜNG DẪN IMPORT TƯƠNG ỨNG VỚI VỊ TRÍ FILE NÀY
// Giả định các types và utils cần thiết
import { Folder } from '../../types/folder.types';
import { GroupMember } from '../../types/group.types';
import { getMemberId, requiresFolderAssignment } from '../../utils/groupRoleUtils';
import { getRoleLabel } from '../constants/groupRoles';

// --- Types cho component ---
interface FolderAccessModalProps {
  visible: boolean; // Thêm prop 'visible' cho Modal
  folder: Folder;
  members: GroupMember[];
  onClose: () => void;
  // Giữ chữ ký hàm đơn giản như phiên bản web
  onSave: (memberIds: string[]) => Promise<void>; 
  saving: boolean;
  error?: string | null; // Cập nhật để phù hợp với state lỗi
  theme: string; // Thêm prop theme để hỗ trợ Dark Mode
}

// --- Component Chính: FolderAccessModal ---
export const FolderAccessModal: React.FC<FolderAccessModalProps> = ({
  visible,
  folder,
  members,
  onClose,
  onSave,
  saving,
  error,
  theme,
}) => {
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  // 1. Lọc Thành viên đủ điều kiện
  const eligibleMembers = useMemo(
    () =>
      members.filter(member => {
        const memberId = getMemberId(member);
        // KHẮC PHỤC LỖI 2: Đảm bảo memberId tồn tại trước khi dùng
        if (!memberId) return false; 
        return requiresFolderAssignment(member.role);
      }),
    [members]
  );

  // 2. Load trạng thái ban đầu
  const initialSelected = useMemo(() => {
    // KHẮC PHỤC LỖI 2: Đảm bảo memberAccess là mảng
    if (!Array.isArray(folder.memberAccess)) {
      return [];
    }
    // Giả định memberAccess trong Folder có cấu trúc { userId: string, ... }
    return folder.memberAccess.map(access => access.userId);
  }, [folder.memberAccess]);

  const [selectedMembers, setSelectedMembers] = useState<string[]>(initialSelected);
  const [search, setSearch] = useState('');

  // Cập nhật state khi Modal mở/folder thay đổi
  useEffect(() => {
    setSelectedMembers(initialSelected);
    setSearch('');
  }, [visible, initialSelected]);


  // 3. Lọc thành viên theo từ khóa tìm kiếm
  const filteredMembers = eligibleMembers.filter(member => {
    const name = member.name || (typeof member.userId === 'object' ? member.userId?.name : '');
    const email = member.email || (typeof member.userId === 'object' ? member.userId?.email : '');
    const keyword = search.toLowerCase();
    
    // KHẮC PHỤC LỖI 2: Đảm bảo chuỗi không phải undefined trước khi gọi toLowerCase()
    return (name?.toLowerCase().includes(keyword) || email?.toLowerCase().includes(keyword));
  });

  // 4. Toggle thành viên
  const toggleMember = useCallback((memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  }, []);

  // 5. Xử lý lưu
  const handleSave = async () => {
    if (saving) return;
    await onSave(selectedMembers);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <Ionicons name="people-circle-outline" size={24} color="#3b82f6" style={{ marginRight: 8 }} />
                  <Text style={styles.title}>Quản lý truy cập folder</Text>
                  <Text style={styles.subtitle}>Folder: <Text style={styles.folderName}>{folder.name}</Text></Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  disabled={saving}
                >
                  <Ionicons name="close" size={24} color={isDark ? "#d1d5db" : "#6b7280"} />
                </TouchableOpacity>
              </View>

              <View style={styles.body}>
                <Text style={styles.infoText}>
                  Chỉ những vai trò cần được gán folder (BA, Tech, Team sản phẩm...) mới xuất hiện trong danh sách này.
                </Text>
                
                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={isDark ? "#9ca3af" : "#9ca3af"} style={styles.searchIcon} />
                  <TextInput
                    placeholder="Tìm kiếm theo tên hoặc email"
                    placeholderTextColor={isDark ? "#9ca3af" : "#9ca3af"}
                    value={search}
                    onChangeText={setSearch}
                    style={styles.searchInput}
                    autoCapitalize="none"
                  />
                </View>

                {/* Members List */}
                <ScrollView style={styles.scrollArea}>
                  {filteredMembers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        {eligibleMembers.length === 0 ? 'Không có thành viên nào cần gán quyền.' : 'Không có thành viên phù hợp.'}
                      </Text>
                    </View>
                  ) : (
                    filteredMembers.map(member => {
                      const memberId = getMemberId(member);
                      if (!memberId) return null;
                      const isSelected = selectedMembers.includes(memberId);
                      
                      const displayName =
                        member.name ||
                        (typeof member.userId === 'object' ? member.userId?.name : '') ||
                        'Thành viên';
                      const email =
                        member.email || (typeof member.userId === 'object' ? member.userId?.email : '');

                      return (
                        <TouchableOpacity
                          key={memberId}
                          onPress={() => toggleMember(memberId)}
                          style={[
                            styles.memberRow,
                            isSelected && styles.memberRowSelected,
                          ]}
                          disabled={saving}
                        >
                          <View>
                            <Text style={styles.memberName}>{displayName}</Text>
                            <Text style={styles.memberEmail}>{email}</Text>
                            <Text style={styles.memberRoleLabel}>
                              {getRoleLabel(member.role)}
                            </Text>
                          </View>
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={22}
                            color={isSelected ? "#3b82f6" : (isDark ? "#9ca3af" : "#6b7280")}
                          />
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
                
                {/* Error Display */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={18} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>

              {/* Footer Actions */}
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.button, styles.cancelButton]}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={[
                    styles.button,
                    styles.saveButton,
                    saving && styles.saveButtonDisabled,
                  ]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Lưu phân quyền</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- Styles cho React Native (Hỗ trợ Dark Mode) ---

const getStyles = (isDark: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: isDark ? '#1F1F1F' : '#ffffff',
    borderRadius: 16,
    width: '95%',
    maxWidth: 500,
    maxHeight: Dimensions.get('window').height * 0.85, // Giới hạn chiều cao
    elevation: 10,
    shadowColor: isDark ? '#000' : '#4b5563',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#e5e7eb',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'column',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderName: {
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
  },
  closeButton: {
    padding: 5,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: isDark ? '#a1a1aa' : '#52525b',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#2E2E2E' : '#f9fafb',
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 15,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: isDark ? '#f3f4f6' : '#1f2937',
    height: '100%',
  },
  scrollArea: {
    maxHeight: 256,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: 12,
    marginBottom: 15,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#2E2E2E' : '#f3f4f6',
    backgroundColor: isDark ? '#1F1F1F' : '#ffffff',
  },
  memberRowSelected: {
    backgroundColor: isDark ? '#334155' : '#f0f9ff',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  memberEmail: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  memberRoleLabel: {
    fontSize: 12,
    color: isDark ? '#60a5fa' : '#3b82f6',
    marginTop: 2,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#450a0a' : '#fef2f2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? '#7f1d1d' : '#fecaca',
    marginBottom: 15,
  },
  errorText: {
    color: '#dc2626',
    marginLeft: 8,
    fontSize: 13,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#374151' : '#e5e7eb',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
  },
  cancelButtonText: {
    color: isDark ? '#d1d5db' : '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});