import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  BackHandler,
  Platform,
} from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import Sidebar from './Sidebar';
import ToolsSidebar from './ToolsSidebar';
import TopBar from './Topbar';
import ProfileSettings from '../../screens/ProfileSettings';
import type { User } from '../../types/auth.types';
import { useFolder } from '../../context/FolderContext';
import { useLanguage } from '../../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

// Destructure icons từ LucideIcons object
const {
  Menu, 
  X, 
  LayoutDashboard, 
} = LucideIcons;

// Chiều rộng cho drawers
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;
const MAX_DRAWER_WIDTH = 350;

export default function MainLayout({
  children,
  activeView,
  onViewChange,
  user,
  onLogout,
  theme,
  onThemeChange,
}: MainLayoutProps) {
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolsSidebarOpen, setIsToolsSidebarOpen] = useState(false);
  
  const { currentFolder } = useFolder();
  const { t } = useLanguage();
  
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  // Luôn hiển thị sidebar cho non-admin users (giống web)
  const showSidebar = !isAdmin;
  const hasFolder = !!currentFolder;

  // Sửa lỗi 1: Handle theme change với validation
  const handleThemeChange = useCallback((newTheme: string) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      onThemeChange(newTheme);
    } else {
      onThemeChange('light'); // Default fallback
    }
  }, [onThemeChange]);

  // Helper function để lấy translation với fallback
  const getTranslatedText = useCallback((key: string, fallback: string) => {
    try {
      const translated = t(key as any);
      return translated || fallback;
    } catch (error) {
      return fallback;
    }
  }, [t]);

  // Handle Android/iOS back button
  useEffect(() => {
    const backAction = () => {
      if (isSidebarOpen || isToolsSidebarOpen) {
        closeAllPanels();
        return true;
      }
      if (showProfileSettings) {
        setShowProfileSettings(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isSidebarOpen, isToolsSidebarOpen, showProfileSettings]);

  // Handle escape key on web (if running in browser)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeAllPanels();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const handleViewChange = useCallback((view: string) => {
    if (view === 'profile') {
      setShowProfileSettings(true);
    } else {
      onViewChange(view);
      setShowProfileSettings(false);
    }
  }, [onViewChange]);

  const closeAllPanels = useCallback(() => {
    setIsSidebarOpen(false);
    setIsToolsSidebarOpen(false);
  }, []);

  // Sửa lỗi 2: Handler cho sidebar item press
  const handleSidebarNavigation = useCallback(() => {
    closeAllPanels();
  }, [closeAllPanels]);

  // Handle profile settings close
  const handleProfileSettingsClose = useCallback(() => {
    setShowProfileSettings(false);
  }, []);

  // Handle logout with confirmation
  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  // Check if user can access tools
  const canAccessTools = useCallback(() => {
    return hasFolder && !isAdmin;
  }, [hasFolder, isAdmin]);

  // Determine theme for styling
  const currentTheme = theme === 'dark' ? 'dark' : 'light';

  // --- Mobile Header ---
  const MobileHeader = (
    <View 
      style={[
        styles.mobileHeader, 
        { 
          backgroundColor: currentTheme === 'dark' ? '#1f2937' : '#ffffff',
          borderBottomColor: currentTheme === 'dark' ? '#374151' : '#e5e7eb'
        }
      ]}
    >
      <View style={styles.row}>
        {/* Open Sidebar Button (Menu trái) - Chỉ hiện khi có quyền */}
        {showSidebar && (
          <TouchableOpacity
            accessibilityLabel="Open navigation menu"
            accessibilityRole="button"
            style={[
              styles.headerButton,
              { borderColor: currentTheme === 'dark' ? '#374151' : '#e5e7eb' }
            ]}
            onPress={() => setIsSidebarOpen(true)}
            activeOpacity={0.7}
          >
            <Menu 
              size={20} 
              color={currentTheme === 'dark' ? '#d1d5db' : '#374151'}
            />
          </TouchableOpacity>
        )}

        {/* Folder/Workspace Info */}
        <View style={styles.headerInfo}>
          <Text 
            style={[
              styles.headerSubtitle, 
              { color: currentTheme === 'dark' ? '#9ca3af' : '#6b7280' }
            ]} 
            numberOfLines={1}
          >
            {isAdmin ? 'Admin Panel' : 'Workspace'}
          </Text>
          <Text 
            style={[
              styles.headerTitle, 
              { color: currentTheme === 'dark' ? '#f3f4f6' : '#1f2937' }
            ]} 
            numberOfLines={1}
          >
            {isAdmin ? 'Admin Dashboard' : (currentFolder?.name || 'My dashboard')}
          </Text>
        </View>
      </View>

      {/* Open Tools Sidebar Button (Menu phải) */}
      {(isAdmin || showSidebar) && (
        <TouchableOpacity
          accessibilityLabel="Open tools menu"
          accessibilityRole="button"
          style={[
            styles.headerButton,
            { borderColor: currentTheme === 'dark' ? '#374151' : '#e5e7eb' }
          ]}
          onPress={() => setIsToolsSidebarOpen(true)}
          activeOpacity={0.7}
        >
          <LayoutDashboard 
            size={20} 
            color={currentTheme === 'dark' ? '#d1d5db' : '#374151'}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // Drawer Header Component
  const DrawerHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
    <View 
      style={[
        styles.drawerHeader, 
        { borderBottomColor: currentTheme === 'dark' ? '#374151' : '#e5e7eb' }
      ]}
    >
      <Text 
        style={[
          styles.drawerTitle, 
          { color: currentTheme === 'dark' ? '#d1d5db' : '#4b5563' }
        ]}
      >
        {title}
      </Text>
      <TouchableOpacity 
        onPress={onClose} 
        style={styles.drawerCloseButton}
        accessibilityLabel="Close drawer"
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <X size={24} color={currentTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
      </TouchableOpacity>
    </View>
  );

  // --- Main Render ---
  return (
    <SafeAreaView style={[
      styles.safeArea, 
      { backgroundColor: currentTheme === 'dark' ? '#111827' : '#f3f4f6' }
    ]}>
      <View style={styles.container}>
        
        {/* 1. Mobile Header */}
        {MobileHeader}

        {/* 2. Main Content Area */}
        <View style={styles.mainContentContainer}>
          <TopBar
            user={user}
            onLogout={handleLogout}
            theme={theme}
            onThemeChange={handleThemeChange}
            onProfileClick={() => setShowProfileSettings(true)}
            onViewChange={handleViewChange}
          />
          
          <View style={styles.contentArea}>
            {showProfileSettings ? (
              <View style={styles.fullScreenProfile}>
                <ProfileSettings 
                  visible={true}
                  onClose={handleProfileSettingsClose}
                />
              </View>
            ) : (
              <View style={styles.childrenContainer}>
                {children}
              </View>
            )}
          </View>
        </View>

        {/* 3. Mobile Sidebar Drawer */}
        <Modal
          visible={isSidebarOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={closeAllPanels}
          statusBarTranslucent={true}
        >
          <TouchableWithoutFeedback onPress={closeAllPanels}>
            <View style={styles.drawerOverlay}>
              <TouchableWithoutFeedback>
                <View 
                  style={[
                    styles.drawer, 
                    styles.leftDrawer, 
                    { 
                      width: Math.min(DRAWER_WIDTH, MAX_DRAWER_WIDTH),
                      backgroundColor: currentTheme === 'dark' ? '#1F1F1F' : '#ffffff'
                    }
                  ]}
                >
                  <DrawerHeader 
                    title="Navigation"
                    onClose={closeAllPanels}
                  />
                  
                  <ScrollView 
                    style={styles.drawerContent}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    onScrollBeginDrag={handleSidebarNavigation}
                  >
                    <Sidebar 
                      theme={currentTheme}
                    />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 4. Mobile Tools Drawer */}
        <Modal
          visible={isToolsSidebarOpen && !showProfileSettings && (isAdmin || showSidebar)}
          transparent={true}
          animationType="slide"
          onRequestClose={closeAllPanels}
          statusBarTranslucent={true}
        >
          <TouchableWithoutFeedback onPress={closeAllPanels}>
            <View style={styles.drawerOverlay}>
              <TouchableWithoutFeedback>
                <View 
                  style={[
                    styles.drawer, 
                    styles.rightDrawer, 
                    { 
                      width: Math.min(DRAWER_WIDTH, MAX_DRAWER_WIDTH),
                      backgroundColor: currentTheme === 'dark' ? '#1F1F1F' : '#ffffff'
                    }
                  ]}
                >
                  <DrawerHeader 
                    title={getTranslatedText('tools.title', 'Tools')} 
                    onClose={closeAllPanels}
                  />
                  
                  <ScrollView 
                    style={styles.drawerContent}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                  >
                    <ToolsSidebar 
                      activeView={activeView}
                      onViewChange={(view) => {
                        handleViewChange(view);
                        closeAllPanels();
                      }}
                      theme={currentTheme}
                    />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* XÓA: Profile Settings Modal - vì đã hiển thị trực tiếp */}
      </View>
    </SafeAreaView>
  );
}

// --- StyleSheet cho React Native ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // --- Mobile Header Styles ---
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerInfo: {
    minWidth: 0,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // --- Main Content Area ---
  mainContentContainer: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  childrenContainer: {
    flex: 1,
  },
  // Thêm style mới cho ProfileSettings fullscreen
  fullScreenProfile: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // --- Mobile Drawer Styles (Sidebar/Tools) ---
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 20,
  },
  leftDrawer: {
    left: 0,
  },
  rightDrawer: {
    right: 0,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  drawerCloseButton: {
    padding: 5,
    borderRadius: 8,
  },
  drawerContent: {
    flex: 1,
    paddingBottom: 20,
  },
} as const);