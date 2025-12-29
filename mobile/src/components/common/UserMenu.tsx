import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
// ✅ Thay thế Ionicons bằng Lucide React Native
import { 
  Settings, LogOut, Sun, Moon, Monitor, 
  ChevronDown, ChevronUp, Shield, User as UserIcon, 
  X, Menu, Grid, ArrowLeft 
} from 'lucide-react-native';

import { User } from '../../types/auth.types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext'; // ✅ Import Language Context

interface UserMenuProps {
  currentUser: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
  onMenuPress?: () => void;
  onToolsPress?: () => void;
  onAdminPress?: () => void; // ✅ Thêm prop điều hướng Admin
  showBackButton?: boolean;
  onBackPress?: () => void;
  isCompact?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function UserMenu({ 
  currentUser, 
  onLogout, 
  theme, 
  onThemeChange,
  onProfileClick,
  onMenuPress,
  onToolsPress,
  onAdminPress,
  showBackButton = false,
  onBackPress,
  isCompact = false
}: UserMenuProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage(); // ✅ Sử dụng hook ngôn ngữ
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Colors Helper
  const colors = getColors(isDark);
  const styles = getStyles(isDark);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser.avatar]);

  useEffect(() => {
    if (showUserMenu) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showUserMenu]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={20} color={colors.textSecondary} />;
      case 'dark': return <Moon size={20} color={colors.textSecondary} />;
      case 'auto': return <Monitor size={20} color={colors.textSecondary} />;
      default: return <Monitor size={20} color={colors.textSecondary} />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return t('userMenu.light' as any) || 'Light';
      case 'dark': return t('userMenu.dark' as any) || 'Dark';
      case 'auto': return t('userMenu.auto' as any) || 'Auto';
      default: return t('userMenu.theme' as any) || 'Theme';
    }
  };

  const handleThemeChange = (newTheme: string) => {
    onThemeChange(newTheme);
    setShowThemeOptions(false);
  };

  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);
  const closeUserMenu = () => setShowUserMenu(false);

  const handleLogout = () => {
    closeUserMenu();
    onLogout();
  };

  const handleProfileClick = () => {
    closeUserMenu();
    onProfileClick?.();
  };

  const handleAdminClick = () => {
    closeUserMenu();
    onAdminPress?.();
  }

  // --- CONTENT COMPONENT (Internal) ---
  const UserMenuContent = () => (
    <View style={styles.menuContent}>
      {/* Header */}
      <View style={styles.menuHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.menuTitle}>{t('nav.account' as any) || 'Account'}</Text>
          <TouchableOpacity onPress={closeUserMenu} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatarLarge}>
          {currentUser.avatar && !avatarError ? (
            <Image 
              source={{ uri: currentUser.avatar }} 
              style={styles.avatarImageLarge}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Text style={styles.avatarTextLarge}>
              {getInitials(currentUser.name)}
            </Text>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName} numberOfLines={1}>
            {currentUser.name}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {currentUser.email}
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuItems}>
        {/* Profile Settings */}
        <TouchableOpacity
          onPress={handleProfileClick}
          style={styles.menuItem}
        >
          <Settings size={20} color={colors.textSecondary} />
          <Text style={styles.menuItemText}>{t('userMenu.profileSettings' as any) || 'Profile settings'}</Text>
        </TouchableOpacity>

        {/* ✅ Admin Panel Link (Đồng bộ Web) */}
        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <TouchableOpacity
            onPress={handleAdminClick}
            style={styles.menuItem}
          >
            <Shield size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>{t('nav.admin' as any) || 'Admin Panel'}</Text>
          </TouchableOpacity>
        )}

        {/* Theme Toggle */}
        <View>
          <TouchableOpacity
            onPress={() => setShowThemeOptions(!showThemeOptions)}
            style={styles.menuItem}
          >
            {getThemeIcon()}
            <Text style={styles.menuItemText}>{t('userMenu.theme' as any) || 'Theme'}</Text>
            <View style={styles.themeHeaderRight}>
              <Text style={styles.themeCurrent}>
                {getThemeLabel()}
              </Text>
              {showThemeOptions ? (
                <ChevronUp size={16} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={16} color={colors.textSecondary} />
              )}
            </View>
          </TouchableOpacity>

          {/* Theme Options */}
          {showThemeOptions && (
            <View style={styles.themeOptions}>
              <TouchableOpacity
                onPress={() => handleThemeChange('light')}
                style={[
                  styles.themeOption,
                  theme === 'light' && styles.activeThemeOption,
                ]}
              >
                <Sun size={16} color={theme === 'light' ? colors.blue : colors.textSecondary} />
                <Text style={[
                  styles.themeOptionText,
                  theme === 'light' && styles.activeThemeOptionText,
                ]}>{t('userMenu.light' as any) || 'Light'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleThemeChange('dark')}
                style={[
                  styles.themeOption,
                  theme === 'dark' && styles.activeThemeOption,
                ]}
              >
                <Moon size={16} color={theme === 'dark' ? colors.blue : colors.textSecondary} />
                <Text style={[
                  styles.themeOptionText,
                  theme === 'dark' && styles.activeThemeOptionText,
                ]}>{t('userMenu.dark' as any) || 'Dark'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleThemeChange('auto')}
                style={[
                  styles.themeOption,
                  theme === 'auto' && styles.activeThemeOption,
                ]}
              >
                <Monitor size={16} color={theme === 'auto' ? colors.blue : colors.textSecondary} />
                <Text style={[
                  styles.themeOptionText,
                  theme === 'auto' && styles.activeThemeOptionText,
                ]}>{t('userMenu.auto' as any) || 'Auto'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.menuItem}
        >
          <LogOut size={20} color={colors.red} />
          <Text style={styles.logoutText}>{t('userMenu.logout' as any) || 'Log out'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- RENDER MAIN ---
  if (isCompact) {
    return (
      <View>
        <TouchableOpacity onPress={toggleUserMenu} style={styles.compactContainer}>
          <View style={styles.avatarCompact}>
            {currentUser.avatar && !avatarError ? (
              <Image 
                source={{ uri: currentUser.avatar }} 
                style={styles.avatarImage}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <Text style={styles.avatarTextCompact}>
                {getInitials(currentUser.name)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        
        <Modal
          visible={showUserMenu}
          transparent={true}
          animationType="none"
          onRequestClose={closeUserMenu}
        >
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={closeUserMenu}>
              <Animated.View 
                style={[styles.backdrop, { opacity: fadeAnim }]}
              />
            </TouchableWithoutFeedback>

            <Animated.View 
              style={[
                styles.menuPanel,
                { transform: [{ translateX: slideAnim }] }
              ]}
            >
              <UserMenuContent />
            </Animated.View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Left side - Navigation buttons */}
      <View style={styles.navigationSection}>
        {showBackButton && onBackPress ? (
          <TouchableOpacity onPress={onBackPress} style={styles.navButton}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <>
            {onMenuPress && (
              <TouchableOpacity onPress={onMenuPress} style={styles.navButton}>
                <Menu size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
            {onToolsPress && (
              <TouchableOpacity onPress={onToolsPress} style={styles.navButton}>
                <Grid size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Right side - User menu */}
      <TouchableOpacity onPress={toggleUserMenu} style={styles.userButton}>
        <View style={styles.avatar}>
          {currentUser.avatar && !avatarError ? (
            <Image 
              source={{ uri: currentUser.avatar }} 
              style={styles.avatarImage}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Text style={styles.avatarText}>
              {getInitials(currentUser.name)}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="none"
        onRequestClose={closeUserMenu}
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeUserMenu}>
            <Animated.View 
              style={[styles.backdrop, { opacity: fadeAnim }]}
            />
          </TouchableWithoutFeedback>

          <Animated.View 
            style={[
              styles.menuPanel,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <UserMenuContent />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles & Colors ---

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#1F1F1F' : '#FFFFFF',
  menuBg: isDark ? '#1F2937' : '#FFFFFF',
  textPrimary: isDark ? '#F9FAFB' : '#111827',
  textSecondary: isDark ? '#9CA3AF' : '#6B7280',
  border: isDark ? '#374151' : '#E5E7EB',
  blue: isDark ? '#60A5FA' : '#3B82F6',
  blueBg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
  red: '#EF4444',
  avatarBg: isDark ? '#4B5563' : '#D1D5DB',
  overlay: 'rgba(0, 0, 0, 0.5)',
});

const getStyles = (isDark: boolean) => {
  const colors = getColors(isDark);
  return StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center' },
    navigationSection: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
    navButton: { padding: 8, marginRight: 8 },
    userButton: { padding: 4 },
    compactContainer: { padding: 4 },
    
    // Avatar Styles
    avatar: { width: 32, height: 32, backgroundColor: colors.avatarBg, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarCompact: { width: 32, height: 32, backgroundColor: colors.avatarBg, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarLarge: { width: 48, height: 48, backgroundColor: colors.avatarBg, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    avatarImageLarge: { width: '100%', height: '100%' },
    avatarText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
    avatarTextCompact: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
    avatarTextLarge: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },

    // Modal & Menu Panel
    modalContainer: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
    menuPanel: { 
      width: SCREEN_WIDTH * 0.85, 
      maxWidth: 320,
      backgroundColor: colors.menuBg, 
      height: '100%',
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 5,
    },
    menuContent: { flex: 1 },
    
    // Menu Header
    menuHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    menuTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
    closeButton: { padding: 4 },

    // User Info
    userInfo: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    userDetails: { flex: 1, marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
    userEmail: { fontSize: 14, color: colors.textSecondary },

    // Menu Items
    menuItems: { paddingVertical: 8 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    menuItemText: { flex: 1, fontSize: 16, color: colors.textPrimary, marginLeft: 12 },
    
    // Theme
    themeHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    themeCurrent: { fontSize: 14, color: colors.textSecondary, marginRight: 4 },
    themeOptions: { marginTop: 4, marginLeft: 32, gap: 4, paddingBottom: 8 },
    themeOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
    activeThemeOption: { backgroundColor: colors.blueBg },
    themeOptionText: { fontSize: 14, color: colors.textPrimary, marginLeft: 8, flex: 1 },
    activeThemeOptionText: { color: colors.blue, fontWeight: '500' },

    // Divider
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

    // Logout
    logoutText: { flex: 1, fontSize: 16, color: colors.red, marginLeft: 12, fontWeight: '500' },
  });
};