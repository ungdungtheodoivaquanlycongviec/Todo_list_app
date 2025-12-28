import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';

// --- Imports ---
import UserMenu from '../common/UserMenu';
import NotificationDropdown from '../../screens/NotificationDropdown';
import { User } from '../../types/auth.types';
import { getRoleLabel } from '../constants/groupRoles';

interface TopBarProps {
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
  onViewChange: (view: string) => void;
}

export default function TopBar({
  user,
  onLogout,
  theme,
  onThemeChange,
  onProfileClick,
  onViewChange
}: TopBarProps) {
  
  // Logic lấy role
  const businessRole = (user as any)?.groupRole as string | null | undefined;
  const isLeader = Boolean((user as any)?.isLeader);
  
  // Logic check Theme
  const isDark = theme === 'dark';

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      {/* Cập nhật StatusBar theo theme */}
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={styles.content}>
          
          {/* --- LEFT: User Info --- */}
          <View style={styles.userInfoContainer}>
            <Text 
              style={[styles.userName, isDark && styles.textWhite]} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {user.name}
            </Text>
            
            <View style={styles.roleRow}>
              <Text style={[styles.roleText, isDark && styles.textGray200]}>
                {businessRole ? getRoleLabel(businessRole) : 'No role'}
              </Text>

              {isLeader && (
                <>
                  <Text style={[styles.dotSeparator, isDark && styles.textGray400]}>•</Text>
                  <View style={[styles.leadBadge, isDark && styles.leadBadgeDark]}>
                    <Text style={[styles.leadText, isDark && styles.leadTextDark]}>Lead</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* --- RIGHT: Controls --- */}
          <View style={styles.rightContainer}>
            {/* Đã xóa LanguageSwitcher ở đây */}

            {/* ✅ Notification Dropdown */}
            <NotificationDropdown onNavigate={onViewChange} />
            
            {/* ✅ User Menu */}
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
  // Container Styles
  safeArea: {
    backgroundColor: '#ffffff',
    zIndex: 10,
    // Shadow cho iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Elevation cho Android
    elevation: 2, 
  },
  safeAreaDark: {
    backgroundColor: '#1f2937', // gray-800
    shadowColor: '#ffffff', 
    shadowOpacity: 0.0,
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // gray-700
  },
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // gray-200
  },
  containerDark: {
    backgroundColor: '#1f2937', // gray-800
    borderBottomColor: '#374151', // gray-700
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },

  // User Info Styles
  userInfoContainer: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827', // text-gray-900
    marginBottom: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    color: '#374151', // text-gray-700
    fontWeight: '500',
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: '#9CA3AF', // text-gray-400
    fontSize: 10,
  },
  
  // Badge Styles
  leadBadge: {
    backgroundColor: '#EFF6FF', // bg-blue-50
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadBadgeDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)', // Dark mode blue bg transparent
  },
  leadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB', // text-blue-600
  },
  leadTextDark: {
    color: '#93c5fd', // text-blue-300
  },

  // Right Side Styles
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, 
  },

  // Common Dark Mode Utils
  textWhite: {
    color: '#ffffff',
  },
  textGray200: {
    color: '#e5e7eb',
  },
  textGray400: {
    color: '#9ca3af',
  },
});