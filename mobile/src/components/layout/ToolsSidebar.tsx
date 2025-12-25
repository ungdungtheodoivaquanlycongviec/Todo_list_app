import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
// Sử dụng Lucide React Native
import { 
  CheckSquare, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Users, 
  Layout 
} from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';

interface ToolsSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  theme?: string; 
}

export default function ToolsSidebar({ activeView, onViewChange, theme = 'light' }: ToolsSidebarProps) {
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const tools = [
    { id: 'tasks', icon: CheckSquare, label: t('nav.tasks') },
    { id: 'calendar', icon: Calendar, label: t('nav.calendar') },
    { id: 'notes', icon: FileText, label: t('nav.notes') },
    { id: 'chat', icon: MessageSquare, label: t('nav.chat') },
    { id: 'members', icon: Users, label: t('nav.members') },
  ];

  const colors = {
    background: isDark ? '#1F1F1F' : '#ffffff',
    border: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#d1d5db' : '#374151',
    primary: '#3b82f6',
    inactiveIcon: isDark ? '#9ca3af' : '#6b7280',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderRightColor: colors.border }]}> 
      
      {/* 1. Header cố định ở trên cùng */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrapper}>
            <Layout size={20} color="#ffffff" strokeWidth={2.5} />
          </View>
          <Text style={[styles.headerText, { color: colors.text }]}>{t('tools.title')}</Text> 
        </View>
      </View>

      {/* 2. Vùng Navigation chiếm hết phần còn lại và CĂN GIỮA nội dung */}
      <View style={styles.navigation}>
        {tools.map((tool) => {
          const isActive = activeView === tool.id; 
          const IconComponent = tool.icon;
          
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
              <IconComponent 
                size={28} // Phóng to Icon
                color={isActive ? '#ffffff' : colors.inactiveIcon} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              
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

const styles = StyleSheet.create({
  container: {
    width: 80, // Tăng nhẹ chiều rộng để chứa icon to
    flex: 1, 
    height: '100%',
    flexDirection: 'column',
    borderRightWidth: 1, 
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconWrapper: {
    width: 42, 
    height: 42,
    backgroundColor: '#3b82f6', 
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 11, 
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  navigation: {
    flex: 1, // Chiếm toàn bộ khoảng trống còn lại
    alignItems: 'center',
    justifyContent: 'center', // 🔥 QUAN TRỌNG: Đẩy cụm icon ra chính giữa chiều dọc
    paddingBottom: 60, // Bù trừ cho phần Header để trung tâm hơn về mặt thị giác
    gap: 20, // Khoảng cách giữa các icon
  },
  toolButton: {
    width: 60, // Phóng to vùng bấm
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  inactiveToolButton: {
    backgroundColor: 'transparent',
  },
  activeToolButton: {
    backgroundColor: '#3b82f6', 
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10, 
  },
  activeDot: {
    position: 'absolute',
    top: 6, 
    right: 6,
    width: 10,
    height: 10,
    backgroundColor: '#10b981', 
    borderRadius: 5,
    borderWidth: 2,
  }
});