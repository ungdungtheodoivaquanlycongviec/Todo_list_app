import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { Pencil, Trash2, X } from 'lucide-react-native';

interface GroupContextMenuProps {
  visible: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  canRename: boolean;
  canDelete: boolean;
}

export default function GroupContextMenu({
  visible,
  onClose,
  onRename,
  onDelete,
  canRename,
  canDelete,
}: GroupContextMenuProps) {
  
  // Hàm wrapper để đóng menu sau khi chọn action
  const handleAction = (action: () => void) => {
    onClose();
    // Thêm timeout nhỏ nếu cần animation đóng chạy xong trước khi action chạy
    setTimeout(() => {
      action();
    }, 200);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose} // Xử lý nút back cứng trên Android
      statusBarTranslucent
    >
      {/* Backdrop: Bấm vào vùng tối để tắt */}
      <Pressable style={styles.overlay} onPress={onClose}>
        
        {/* Phần nội dung menu - Chặn sự kiện bấm xuyên qua */}
        <Pressable 
            style={styles.contentContainer} 
            onPress={(e) => e.stopPropagation()}
        >
          {/* Thanh nắm kéo (Visual indicator) */}
          <View style={styles.dragIndicatorWrapper}>
            <View style={styles.dragIndicator} />
          </View>

          <Text style={styles.title}>Tùy chọn nhóm</Text>

          {/* Nút Đổi tên */}
          {canRename && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(onRename)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, styles.iconBlue]}>
                <Pencil size={20} color="#3b82f6" />
              </View>
              <Text style={styles.actionText}>Đổi tên nhóm</Text>
            </TouchableOpacity>
          )}

          {/* Nút Xóa */}
          {canDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(onDelete)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, styles.iconRed]}>
                <Trash2 size={20} color="#ef4444" />
              </View>
              <Text style={[styles.actionText, styles.textRed]}>Xóa nhóm này</Text>
            </TouchableOpacity>
          )}

          {/* Thông báo nếu không có quyền */}
          {!canRename && !canDelete && (
            <View style={styles.disabledMessage}>
              <Text style={styles.disabledText}>Bạn không có quyền thực hiện</Text>
            </View>
          )}

          {/* Nút Hủy/Đóng */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>
          
          {/* Khoảng trống an toàn cho iPhone tai thỏ/dynamic island phía dưới */}
          <View style={styles.safeAreaBottom} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    backgroundColor: 'white', // Thay đổi màu này nếu có Dark Mode (ví dụ: #1F1F1F)
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dragIndicatorWrapper: {
    alignItems: 'center',
    paddingBottom: 15,
    paddingTop: 5,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB', // gray-200
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280', // gray-500
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB', // gray-50
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: 'white',
    // Shadow nhẹ cho icon
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBlue: {
    backgroundColor: '#EFF6FF', // blue-50
  },
  iconRed: {
    backgroundColor: '#FEF2F2', // red-50
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151', // gray-700
  },
  textRed: {
    color: '#EF4444', // red-500
  },
  disabledMessage: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 20,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  closeButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  safeAreaBottom: {
    height: Platform.OS === 'ios' ? 20 : 0, // Padding đáy cho iOS
  }
});