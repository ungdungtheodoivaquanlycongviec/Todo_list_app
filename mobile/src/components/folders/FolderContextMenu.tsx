import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext'; // Giả định ThemeContext đã có

// Thay thế lucide-react icons bằng Ionicons
const getIconName = (icon: 'Pencil' | 'Trash2' | 'Users' | 'X'): string => {
  switch (icon) {
    case 'Pencil':
      return 'create-outline';
    case 'Trash2':
      return 'trash-outline';
    case 'Users':
      return 'people-outline';
    case 'X':
      return 'close-outline';
    default:
      return '';
  }
};

interface FolderContextMenuProps {
  // Loại bỏ x, y vì Action Sheet không dùng tọa độ chuột
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

// Component Menu Item
interface MenuItemProps {
  icon: 'Pencil' | 'Trash2' | 'Users';
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  disabled: boolean;
  isDark: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  icon, 
  label, 
  onPress, 
  isDestructive = false, 
  disabled, 
  isDark 
}) => {
  const color = isDestructive 
    ? (isDark ? '#f87171' : '#dc2626') // text-red-400 / text-red-600
    : (isDark ? '#d1d5db' : '#4b5563'); // text-gray-300 / text-gray-700
  
  const activeStyle = isDestructive 
    ? { backgroundColor: isDark ? 'rgba(185, 28, 28, 0.2)' : '#fef2f2' } // hover:bg-red-900/20 / hover:bg-red-50
    : { backgroundColor: isDark ? '#3E3E3E' : '#f3f4f6' }; // hover:bg-[#3E3E3E] / hover:bg-gray-100

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.menuItem, 
        { borderColor: isDark ? '#374151' : '#e5e7eb' }, 
        disabled && styles.disabled,
      ]}
      // Sử dụng activeOpacity hoặc style động để mô phỏng hover
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={styles.menuItemContent}>
        <Ionicons name={getIconName(icon) as string} size={20} color={color} />
        <Text style={[styles.menuItemText, { color }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Main Component
export default function FolderContextMenu({
  onClose,
  onEdit,
  onDelete,
  onAssign,
  canEdit,
  canDelete,
  canAssign
}: FolderContextMenuProps) {
  const { isDark } = useTheme();

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const hasActions = canEdit || canAssign || canDelete;

  return (
    <Modal
      transparent={true}
      animationType="fade" // Dùng fade hoặc slide
      visible={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={onClose} // Xử lý click outside
      >
        <View style={styles.menuWrapper}>
          <View style={[
            styles.menuContainer, 
            { 
              backgroundColor: isDark ? '#2E2E2E' : '#ffffff',
              borderColor: isDark ? '#374151' : '#e5e7eb',
            }
          ]}>
            {canEdit && (
              <MenuItem
                icon="Pencil"
                label="Chỉnh sửa tên"
                onPress={() => handleAction(onEdit)}
                disabled={false}
                isDark={isDark}
              />
            )}
            
            {canAssign && (
              <MenuItem
                icon="Users"
                label="Gán folder"
                onPress={() => handleAction(onAssign)}
                disabled={false}
                isDark={isDark}
              />
            )}
            
            {canDelete && (
              <MenuItem
                icon="Trash2"
                label="Xóa folder"
                onPress={() => handleAction(onDelete)}
                isDestructive={true}
                disabled={false}
                isDark={isDark}
              />
            )}
            
            {!hasActions && (
              <View style={styles.noPermissionTextWrapper}>
                <Text style={styles.noPermissionText}>
                  Không có quyền thực hiện
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Global Styles
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // backdrop
    justifyContent: 'flex-end', // Action sheet ở dưới cùng
  },
  menuWrapper: {
    padding: 8, // Khoảng cách xung quanh menu
    width: '100%',
    alignItems: 'center',
  },
  menuContainer: {
    width: '100%',
    maxWidth: Dimensions.get('window').width - 16, // Giới hạn chiều rộng
    borderRadius: 12, // rounded-lg
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },

  // Menu Item Styles
  menuItem: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-2
    borderBottomWidth: 1,
    // Border color sẽ được set trong component con để dễ dàng hơn (hoặc dùng divide-y)
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
  },
  menuItemText: {
    fontSize: 16, // text-sm
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  noPermissionTextWrapper: {
    padding: 16, // px-4 py-2
    borderBottomWidth: 0,
  },
  noPermissionText: {
    fontSize: 14,
    color: '#9ca3af', // text-gray-400
    textAlign: 'center',
  },
});