import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView, // Sử dụng SafeAreaView để tránh các vùng như notch
  Platform,
} from 'react-native';

// ⚠️ ĐIỀU CHỈNH ĐƯỜNG DẪN IMPORT CHO MOBILE
// Giả định TopBar nằm trong src/components/layout
import { useTheme } from '../../context/ThemeContext';
import UserMenu from '../common/UserMenu';
import NotificationDropdown from '../../screens/NotificationDropdown';
import { User } from '../../types/auth.types';

// Giữ nguyên interface, đảm bảo tính tương thích với các component phụ thuộc
interface TopBarProps {
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
}

export default function TopBar({ user, onLogout, theme, onThemeChange, onProfileClick }: TopBarProps) {
  return (
    // Sử dụng SafeAreaView và View để thay thế cho div
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.rightContainer}>
            {/* NotificationDropdown (Giả định đã được chuyển đổi sang RN) */}
            <NotificationDropdown />
            
            {/* UserMenu (Giả định đã được chuyển đổi sang RN) */}
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
    // Dùng màu nền cho SafeAreaView để có hiệu ứng liền mạch với status bar
    backgroundColor: '#ffffff', // Tương đương bg-white
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // Tương đương border-gray-200
  },
  container: {
    width: '100%',
    backgroundColor: '#ffffff', // bg-white (Có thể bỏ nếu đã dùng trong safeArea, nhưng giữ để rõ ràng)
    // Loại bỏ border-b vì đã đặt ở safeArea
  },
  content: {
    paddingHorizontal: 16, // px-4 sm:px-6
    paddingVertical: 12, // py-3 md:py-4
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    // Đặt chiều cao tối thiểu cho dễ nhìn trên di động
    minHeight: 56, 
  },
  rightContainer: {
    // max-w-full, flex justify-end, items-center gap-2 sm:gap-3
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Khoảng cách giữa Notification và UserMenu
  },
});