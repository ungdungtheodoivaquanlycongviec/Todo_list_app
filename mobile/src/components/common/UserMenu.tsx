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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { User } from '../../types/auth.types';
import { useTheme } from '../../context/ThemeContext';

interface UserMenuProps {
  currentUser: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onProfileClick?: () => void;
  onMenuPress?: () => void;
  onToolsPress?: () => void;
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
  showBackButton = false,
  onBackPress,
  isCompact = false
}: UserMenuProps) {
  const { isDark } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reset avatar error khi user thay đổi
  useEffect(() => {
    setAvatarError(false);
  }, [currentUser.avatar]);

  // Animation khi modal mở/đóng
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
      case 'light': return 'sunny';
      case 'dark': return 'moon';
      case 'auto': return 'desktop';
      default: return 'desktop';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'auto': return 'Auto';
      default: return 'Theme';
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

  // Compact version cho TopBar
  if (isCompact) {
    return (
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
        
        <Modal
          visible={showUserMenu}
          transparent={true}
          animationType="none"
          onRequestClose={closeUserMenu}
        >
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={closeUserMenu}>
              <Animated.View 
                style={[
                  styles.backdrop,
                  { opacity: fadeAnim }
                ]}
              />
            </TouchableWithoutFeedback>

            <Animated.View 
              style={[
                styles.menuPanel,
                isDark && styles.darkMenuPanel,
                { transform: [{ translateX: slideAnim }] }
              ]}
            >
              <UserMenuContent
                currentUser={currentUser}
                avatarError={avatarError}
                getInitials={getInitials}
                theme={theme}
                showThemeOptions={showThemeOptions}
                setShowThemeOptions={setShowThemeOptions}
                getThemeIcon={getThemeIcon}
                getThemeLabel={getThemeLabel}
                handleThemeChange={handleThemeChange}
                handleProfileClick={handleProfileClick}
                handleLogout={handleLogout}
                closeUserMenu={closeUserMenu}
                isDark={isDark}
              />
            </Animated.View>
          </View>
        </Modal>
      </TouchableOpacity>
    );
  }

  // Full version với navigation buttons
  return (
    <View style={styles.container}>
      {/* Left side - Navigation buttons */}
      <View style={styles.navigationSection}>
        {showBackButton && onBackPress ? (
          <TouchableOpacity onPress={onBackPress} style={styles.navButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#d1d5db' : '#374151'} />
          </TouchableOpacity>
        ) : (
          <>
            {onMenuPress && (
              <TouchableOpacity onPress={onMenuPress} style={styles.navButton}>
                <Ionicons name="menu" size={24} color={isDark ? '#d1d5db' : '#374151'} />
              </TouchableOpacity>
            )}
            {onToolsPress && (
              <TouchableOpacity onPress={onToolsPress} style={styles.navButton}>
                <Ionicons name="grid" size={24} color={isDark ? '#d1d5db' : '#374151'} />
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

        <Modal
          visible={showUserMenu}
          transparent={true}
          animationType="none"
          onRequestClose={closeUserMenu}
        >
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={closeUserMenu}>
              <Animated.View 
                style={[
                  styles.backdrop,
                  { opacity: fadeAnim }
                ]}
              />
            </TouchableWithoutFeedback>

            <Animated.View 
              style={[
                styles.menuPanel,
                isDark && styles.darkMenuPanel,
                { transform: [{ translateX: slideAnim }] }
              ]}
            >
              <UserMenuContent
                currentUser={currentUser}
                avatarError={avatarError}
                getInitials={getInitials}
                theme={theme}
                showThemeOptions={showThemeOptions}
                setShowThemeOptions={setShowThemeOptions}
                getThemeIcon={getThemeIcon}
                getThemeLabel={getThemeLabel}
                handleThemeChange={handleThemeChange}
                handleProfileClick={handleProfileClick}
                handleLogout={handleLogout}
                closeUserMenu={closeUserMenu}
                isDark={isDark}
              />
            </Animated.View>
          </View>
        </Modal>
      </TouchableOpacity>
    </View>
  );
}

// Separate component for menu content to avoid duplication
interface UserMenuContentProps {
  currentUser: User;
  avatarError: boolean;
  getInitials: (name: string) => string;
  theme: string;
  showThemeOptions: boolean;
  setShowThemeOptions: (show: boolean) => void;
  getThemeIcon: () => string;
  getThemeLabel: () => string;
  handleThemeChange: (theme: string) => void;
  handleProfileClick: () => void;
  handleLogout: () => void;
  closeUserMenu: () => void;
  isDark: boolean;
}

const UserMenuContent: React.FC<UserMenuContentProps> = ({
  currentUser,
  avatarError,
  getInitials,
  theme,
  showThemeOptions,
  setShowThemeOptions,
  getThemeIcon,
  getThemeLabel,
  handleThemeChange,
  handleProfileClick,
  handleLogout,
  closeUserMenu,
  isDark
}) => {
  return (
    <View style={styles.menuContent}>
      {/* Header */}
      <View style={[styles.menuHeader, isDark && styles.darkMenuHeader]}>
        <View style={styles.headerContent}>
          <Text style={[styles.menuTitle, isDark && styles.darkText]}>Account</Text>
          <TouchableOpacity onPress={closeUserMenu} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#d1d5db' : '#374151'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Info */}
      <View style={[styles.userInfo, isDark && styles.darkUserInfo]}>
        <View style={styles.avatarLarge}>
          {currentUser.avatar && !avatarError ? (
            <Image 
              source={{ uri: currentUser.avatar }} 
              style={styles.avatarImageLarge}
              onError={() => {}}
            />
          ) : (
            <Text style={styles.avatarTextLarge}>
              {getInitials(currentUser.name)}
            </Text>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={[styles.userName, isDark && styles.darkText]} numberOfLines={1}>
            {currentUser.name}
          </Text>
          <Text style={[styles.userEmail, isDark && styles.darkSubtext]} numberOfLines={1}>
            {currentUser.email}
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuItems}>
        {/* Profile Settings */}
        <TouchableOpacity
          onPress={handleProfileClick}
          style={[styles.menuItem, isDark && styles.darkMenuItem]}
        >
          <Ionicons name="person" size={20} color={isDark ? '#d1d5db' : '#374151'} />
          <Text style={[styles.menuItemText, isDark && styles.darkText]}>Profile settings</Text>
        </TouchableOpacity>

        {/* Theme Toggle */}
        <View style={[styles.menuItem, isDark && styles.darkMenuItem]}>
          <TouchableOpacity
            onPress={() => setShowThemeOptions(!showThemeOptions)}
            style={styles.themeHeader}
          >
            <Ionicons name={getThemeIcon() as any} size={20} color={isDark ? '#d1d5db' : '#374151'} />
            <Text style={[styles.menuItemText, isDark && styles.darkText]}>Theme</Text>
            <View style={styles.themeHeaderRight}>
              <Text style={[styles.themeCurrent, isDark && styles.darkSubtext]}>
                {getThemeLabel()}
              </Text>
              <Ionicons 
                name={showThemeOptions ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={isDark ? '#9ca3af' : '#6b7280'} 
              />
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
                  isDark && styles.darkThemeOption,
                ]}
              >
                <Ionicons 
                  name="sunny" 
                  size={16} 
                  color={theme === 'light' ? '#3b82f6' : (isDark ? '#9ca3af' : '#6b7280')} 
                />
                <Text style={[
                  styles.themeOptionText,
                  theme === 'light' && styles.activeThemeOptionText,
                  isDark && styles.darkThemeOptionText,
                ]}>Light</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleThemeChange('dark')}
                style={[
                  styles.themeOption,
                  theme === 'dark' && styles.activeThemeOption,
                  isDark && styles.darkThemeOption,
                ]}
              >
                <Ionicons 
                  name="moon" 
                  size={16} 
                  color={theme === 'dark' ? '#3b82f6' : (isDark ? '#9ca3af' : '#6b7280')} 
                />
                <Text style={[
                  styles.themeOptionText,
                  theme === 'dark' && styles.activeThemeOptionText,
                  isDark && styles.darkThemeOptionText,
                ]}>Dark</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleThemeChange('auto')}
                style={[
                  styles.themeOption,
                  theme === 'auto' && styles.activeThemeOption,
                  isDark && styles.darkThemeOption,
                ]}
              >
                <Ionicons 
                  name="desktop" 
                  size={16} 
                  color={theme === 'auto' ? '#3b82f6' : (isDark ? '#9ca3af' : '#6b7280')} 
                />
                <Text style={[
                  styles.themeOptionText,
                  theme === 'auto' && styles.activeThemeOptionText,
                  isDark && styles.darkThemeOptionText,
                ]}>Auto</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.menuItem, styles.logoutItem, isDark && styles.darkMenuItem]}
        >
          <Ionicons name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  navButton: {
    padding: 8,
    marginRight: 8,
  },
  userButton: {
    padding: 4,
  },
  compactContainer: {
    padding: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    backgroundColor: '#d1d5db',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarCompact: {
    width: 32,
    height: 32,
    backgroundColor: '#d1d5db',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarLarge: {
    width: 48,
    height: 48,
    backgroundColor: '#d1d5db',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarImageLarge: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  avatarTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  avatarTextLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuPanel: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  darkMenuPanel: {
    backgroundColor: '#1f2937',
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkMenuHeader: {
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkUserInfo: {
    borderBottomColor: '#374151',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  darkMenuItem: {
    // Additional dark mode styles
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeCurrent: {
    fontSize: 14,
    color: '#6b7280',
  },
  themeOptions: {
    marginTop: 8,
    marginLeft: 32,
    gap: 4,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  darkThemeOption: {
    // Dark mode styles
  },
  activeThemeOption: {
    backgroundColor: '#dbeafe',
  },
  themeOptionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  darkThemeOptionText: {
    color: '#d1d5db',
  },
  activeThemeOptionText: {
    color: '#1e40af',
    fontWeight: '500',
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 12,
    fontWeight: '500',
  },
  darkText: {
    color: '#f9fafb',
  },
  darkSubtext: {
    color: '#d1d5db',
  },
});