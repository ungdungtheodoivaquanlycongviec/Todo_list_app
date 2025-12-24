import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  TouchableOpacity
} from 'react-native';

// ⚠️ ĐIỀU CHỈNH ĐƯỜNG DẪN IMPORT CHO MOBILE
import { useTheme } from '../../context/ThemeContext'; // Nếu có dùng
import UserMenu from '../common/UserMenu';
import NotificationDropdown from '../../screens/NotificationDropdown';
import { User } from '../../types/auth.types';
import { getRoleLabel } from '../constants/groupRoles'; // Import hàm này từ logic chung

interface TopBarProps {
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
  onViewChange: (view: string) => void; // Đã thêm lại prop này để khớp logic Notification
}

export default function TopBar({
  user,
  onLogout,
  theme,
  onThemeChange,
  onProfileClick,
  onViewChange
}: TopBarProps) {
  
  // Logic lấy role giống hệt bản Web
  const businessRole = (user as any)?.groupRole as string | null | undefined;
  const isLeader = Boolean((user as any)?.isLeader);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          
          {/* --- LEFT SIDE: User Info (Đã thêm lại) --- */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {user.name}
            </Text>
            
            <View style={styles.roleRow}>
              <Text style={styles.roleText}>
                {businessRole ? getRoleLabel(businessRole) : 'No role'}
              </Text>

              {isLeader && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={styles.leadBadge}>
                    <Text style={styles.leadText}>Lead</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* --- RIGHT SIDE: Controls --- */}
          <View style={styles.rightContainer}>
            {/* Truyền prop onNavigate/onViewChange cho Notification nếu cần */}
            <NotificationDropdown onNavigate={onViewChange} />
            
            <UserMenu 
              currentUser={user} 
              onLogout={onLogout}
              theme={theme}
              onThemeChange={onThemeChange}
              onProfileClick={onProfileClick}
            />
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    // Shadow nhẹ thay vì border cứng để đẹp hơn trên mobile
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2, // Cho Android
    zIndex: 10, // Đảm bảo nổi lên trên nội dung khác
  },
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between', // QUAN TRỌNG: Đẩy 2 phần sang 2 bên
    alignItems: 'center',
    minHeight: 60, // Tăng nhẹ chiều cao chuẩn
  },
  
  // Styles cho User Info (Bên trái)
  userInfoContainer: {
    flex: 1, // Để text có thể truncate nếu quá dài
    paddingRight: 10,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700', // font-semibold -> bold
    color: '#111827', // text-gray-900
    marginBottom: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    color: '#4B5563', // text-gray-700
    fontWeight: '500',
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: '#9CA3AF', // text-gray-400
    fontSize: 10,
  },
  leadBadge: {
    backgroundColor: '#EFF6FF', // bg-blue-50
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB', // text-blue-600
  },

  // Styles cho Controls (Bên phải)
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Khoảng cách giữa các nút
  },
});