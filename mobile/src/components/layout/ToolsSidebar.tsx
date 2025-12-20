import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { 
  CheckSquare, 
  Calendar, 
  FileText, 
  Users, 
  Layout, 
  MessageSquare 
} from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext'; // THÊM IMPORT NÀY

interface ToolsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  theme?: string; 
}

export default function ToolsSidebar({ activeView, onViewChange, theme = 'light' }: ToolsSidebarProps) {
  const { t } = useLanguage();
  const { user } = useAuth(); // THÊM DÒNG NÀY - lấy thông tin user từ context
  
  const isDark = theme === 'dark';
  
  // THÊM: Kiểm tra quyền admin giống bản web
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
  
  // Định nghĩa tất cả tools giống bản web
  const allTools = [
    { id: 'tasks', icon: CheckSquare, label: t('nav.tasks') },
    { id: 'calendar', icon: Calendar, label: t('nav.calendar') },
    { id: 'notes', icon: FileText, label: t('nav.notes') },
    { id: 'chat', icon: MessageSquare, label: t('nav.chat') },
    { id: 'members', icon: Users, label: t('nav.members') },
  ];

  // THÊM: Filter tools dựa trên role giống bản web
  const tools = isAdmin ? allTools.filter(tool => tool.id === 'chat') : allTools;

  // Định nghĩa màu dựa trên theme
  const colors = {
    background: isDark ? '#1F1F1F' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#d1d5db' : '#374151',
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    inactiveIcon: isDark ? '#9ca3af' : '#6b7280',
    white: '#ffffff',
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.background, 
      borderRightColor: colors.border 
    }]}> 
      
      {/* Minimal Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={[styles.headerIconWrapper, { backgroundColor: colors.primary }]}>
            <Layout size={16} color={colors.white} />
          </View>
          <Text style={[styles.headerText, { color: colors.text }]}>
            {t('tools.title')}
          </Text> 
        </View>
      </View>

      {/* Icon-only Navigation */}
      <View style={styles.navigation}>
        {tools.map((tool) => {
          const isActive = activeView === tool.id; 
          const IconComponent = tool.icon;
          
          return (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.toolButton,
                isActive ? [
                  styles.activeToolButton,
                  { 
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  }
                ] : styles.inactiveToolButton
              ]}
              onPress={() => onViewChange(tool.id)}
              accessibilityLabel={tool.label}
              activeOpacity={0.7}
            >
              <IconComponent 
                size={24} 
                color={isActive ? colors.white : colors.inactiveIcon} 
              />
              
              {/* Active indicator dot */}
              {isActive && (
                <View style={[
                  styles.activeDot, 
                  { 
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.background 
                  }
                ]} />
              )}
              
              {/* THÊM: Tooltip/notification badge cho admin view */}
              {isAdmin && tool.id === 'chat' && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* THÊM: Hiển thị thông tin user nếu cần */}
      {user && (
        <View style={[styles.userInfo, { borderTopColor: colors.border }]}>
          <Text style={[styles.userRole, { color: colors.inactiveIcon }]}>
            {isAdmin ? 'Admin Mode' : 'User Mode'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    height: '100%',
    flexDirection: 'column',
    borderRightWidth: 1, 
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconWrapper: {
    width: 36, 
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 12, 
    fontWeight: '600',
  },
  navigation: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16, 
  },
  toolButton: {
    width: 56, 
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  inactiveToolButton: {
    // Không cần background
  },
  activeToolButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8, 
  },
  activeDot: {
    position: 'absolute',
    top: 4, 
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  // THÊM: Style cho admin badge
  adminBadge: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#ef4444',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  // THÊM: Style cho user info
  userInfo: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  userRole: {
    fontSize: 10,
    fontWeight: '500',
  },
});