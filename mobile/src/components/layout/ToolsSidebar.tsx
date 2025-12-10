import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../../context/LanguageContext'; // Đảm bảo đúng đường dẫn

interface ToolsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  theme?: string; 
}

// Map các icon lucide-react sang Ionicons
const ICON_MAP = {
  tasks: 'list-outline', 
  calendar: 'calendar-outline', 
  notes: 'document-text-outline', 
  chat: 'chatbubble-outline', 
  members: 'people-outline', 
  layout: 'grid-outline', 
} as const;

export default function ToolsSidebar({ activeView, onViewChange, theme = 'light' }: ToolsSidebarProps) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const tools = [
    { id: 'tasks', iconName: ICON_MAP.tasks, label: t('nav.tasks') },
    { id: 'calendar', iconName: ICON_MAP.calendar, label: t('nav.calendar') },
    { id: 'notes', iconName: ICON_MAP.notes, label: t('nav.notes') },
    { id: 'chat', iconName: ICON_MAP.chat, label: t('nav.chat') },
    { id: 'members', iconName: ICON_MAP.members, label: t('nav.members') },
  ];

  // Định nghĩa màu dựa trên theme
  const colors = {
    background: isDark ? '#1F1F1F' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#d1d5db' : '#374151',
    primary: '#3b82f6',
    inactiveIcon: isDark ? '#9ca3af' : '#6b7280',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderRightColor: colors.border }]}> 
      
      {/* Minimal Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrapper}>
            <Ionicons name={ICON_MAP.layout} size={16} color="#ffffff" />
          </View>
          <Text style={[styles.headerText, { color: colors.text }]}>{t('tools.title')}</Text> 
        </View>
      </View>

      {/* Icon-only Navigation */}
      <View style={styles.navigation}>
        {tools.map((tool) => {
          // 🔑 ĐÃ FIX: Định nghĩa lại biến isActive
          const isActive = activeView === tool.id; 
          
          return (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.toolButton,
                isActive ? styles.activeToolButton : styles.inactiveToolButton
              ]}
              onPress={() => onViewChange(tool.id)}
              accessibilityLabel={tool.label}
            >
              <Ionicons 
                name={tool.iconName} 
                size={24} 
                color={isActive ? '#ffffff' : colors.inactiveIcon} 
              />
              
              {/* Active indicator dot */}
              {isActive && (
                <View style={[styles.activeDot, { borderColor: colors.background }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ... (Stylesheets giữ nguyên)
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
    backgroundColor: '#3b82f6', 
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
    backgroundColor: '#3b82f6', 
    shadowColor: '#3b82f6',
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
    backgroundColor: '#3b82f6', 
    borderRadius: 4,
    borderWidth: 2,
  }
});