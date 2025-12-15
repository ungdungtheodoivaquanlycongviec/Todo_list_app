import React, { useState } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
// Đảm bảo đã cài đặt: npm install react-native-vector-icons

import Sidebar from './Sidebar'; 
import ToolsSidebar from './ToolsSidebar'; 
import TopBar from './Topbar';
import ProfileSettings from '../../screens/ProfileSettings'; // Giả định đường dẫn này đúng
import { User } from '../../types/auth.types'; // Giả định đường dẫn này đúng
import { useFolder } from '../../context/FolderContext'; // Giả định đường dẫn này đúng

const { width } = Dimensions.get('window');

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

// Chiều rộng cố định cho Sidebar và ToolsSidebar trên Mobile Drawer
const DRAWER_WIDTH = width * 0.8;
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
  const hasFolder = !!currentFolder; 

  const handleViewChange = (view: string) => {
    if (view === 'profile') {
      setShowProfileSettings(true);
    } else {
      onViewChange(view);
      setShowProfileSettings(false);
    }
  };

  const closeAllPanels = () => {
    setIsSidebarOpen(false);
    setIsToolsSidebarOpen(false);
  };

  // --- Mobile Header ---
  const MobileHeader = (
    <View style={[styles.mobileHeader, { backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' }]}>
      <View style={styles.row}>
        {/* Open Sidebar Button (Menu trái) */}
        <TouchableOpacity
          accessibilityLabel="Open navigation"
          style={styles.headerButton}
          onPress={() => setIsSidebarOpen(true)}
        >
          <Ionicons 
            name="menu" 
            size={20} 
            color={theme === 'dark' ? '#d1d5db' : '#374151'}
          />
        </TouchableOpacity>

        {/* Folder/Workspace Info */}
        <View style={styles.headerInfo}>
          <Text style={[styles.headerSubtitle, { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }]} numberOfLines={1}>
            Workspace
          </Text>
          <Text style={[styles.headerTitle, { color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }]} numberOfLines={1}>
            {currentFolder?.name || 'My dashboard'}
          </Text>
        </View>
      </View>

      {/* Open Tools Sidebar Button (Menu phải, chỉ khi có folder) */}
      {hasFolder && (
        <TouchableOpacity
          accessibilityLabel="Open tools"
          style={styles.headerButton}
          onPress={() => setIsToolsSidebarOpen(true)}
        >
          <Ionicons 
            name="menu-open-outline" 
            size={20} 
            color={theme === 'dark' ? '#d1d5db' : '#374151'}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // --- Main Render ---
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme === 'dark' ? '#1f2937' : '#f3f4f6' }]}>
      <View style={styles.container}>
        
        {/* 1. Mobile Header */}
        {MobileHeader}

        {/* 2. Main Content Area */}
        <View style={styles.mainContentContainer}>
          <TopBar
            user={user}
            onLogout={onLogout}
            theme={theme}
            onThemeChange={onThemeChange}
            onProfileClick={() => setShowProfileSettings(true)}
          />
          
          <View style={styles.contentArea}>
            {/* Khi Profile Settings được mở, nó chiếm toàn bộ khu vực chính */}
            {showProfileSettings ? (
              // Không cần ScrollView nếu ProfileSettings đã tự scrollable
              <ProfileSettings 
                  visible={true} 
                  onClose={() => setShowProfileSettings(false)} 
              />
            ) : (
              <View style={styles.childrenContainer}>
                {children}
              </View>
            )}
          </View>
        </View>

        {/* 3. Mobile Sidebar Drawer (Menu trái) - LUÔN LUÔN render ở cấp cao nhất */}
        <Modal
          visible={isSidebarOpen}
          transparent={true}
          animationType="fade" // Sử dụng fade hoặc slide
          onRequestClose={closeAllPanels}
        >
          {/* Vùng Touch để đóng modal */}
          <TouchableWithoutFeedback onPress={closeAllPanels}>
            <View style={styles.drawerOverlay}>
              {/* Nội dung Drawer, sử dụng TouchWithoutFeedback để ngăn chặn việc đóng khi chạm vào Drawer */}
              <TouchableWithoutFeedback> 
                <View style={[styles.drawer, styles.leftDrawer, { width: Math.min(DRAWER_WIDTH, MAX_DRAWER_WIDTH) }]}>
                  {/* Drawer Header */}
                  <View style={[styles.drawerHeader, { borderBottomColor: theme === 'dark' ? '#374151' : '#e5e7eb' }]}>
                    <Text style={[styles.drawerTitle, { color: theme === 'dark' ? '#d1d5db' : '#4b5563' }]}>Navigation</Text>
                    <TouchableOpacity onPress={closeAllPanels} style={styles.drawerCloseButton}>
                      <Ionicons name="close" size={24} color={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                    </TouchableOpacity>
                  </View>
                  {/* Drawer Content */}
                  <ScrollView 
                    style={[styles.drawerContent, { backgroundColor: theme === 'dark' ? '#111827' : '#ffffff' }]}
                    showsVerticalScrollIndicator={false}
                  >
                    <Sidebar theme={theme} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 4. Mobile Tools Drawer (Menu phải) - LUÔN LUÔN render ở cấp cao nhất */}
        <Modal
          visible={isToolsSidebarOpen && hasFolder} // Chỉ mở khi Tools Open VÀ có Folder
          transparent={true}
          animationType="fade"
          onRequestClose={closeAllPanels}
        >
          <TouchableWithoutFeedback onPress={closeAllPanels}>
            <View style={styles.drawerOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.drawer, styles.rightDrawer, { width: Math.min(DRAWER_WIDTH, MAX_DRAWER_WIDTH) }]}>
                  {/* Drawer Header */}
                  <View style={[styles.drawerHeader, { borderBottomColor: theme === 'dark' ? '#374151' : '#e5e7eb' }]}>
                    <Text style={[styles.drawerTitle, { color: theme === 'dark' ? '#d1d5db' : '#4b5563' }]}>Tools</Text>
                    <TouchableOpacity onPress={closeAllPanels} style={styles.drawerCloseButton}>
                      <Ionicons name="close" size={24} color={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                    </TouchableOpacity>
                  </View>
                  {/* Drawer Content */}
                  <ScrollView 
                    style={[styles.drawerContent, { backgroundColor: theme === 'dark' ? '#111827' : '#ffffff' }]}
                    showsVerticalScrollIndicator={false}
                  >
                    <ToolsSidebar 
                      activeView={activeView} 
                      onViewChange={handleViewChange} 
                      theme={theme}
                    />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
    borderBottomColor: '#e5e7eb',
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
    borderColor: '#e5e7eb',
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
  },
});