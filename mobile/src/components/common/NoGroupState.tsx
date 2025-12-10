import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';


interface NoGroupStateProps {
  title?: string;
  description?: string;
  showGroupSelector?: boolean;
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
}

export default function NoGroupState({ 
  title = "Join or Create a Group",
  description = "You need to join or create a group to manage tasks and collaborate with your team.",
  showGroupSelector = true,
  onCreateGroup,
  onJoinGroup
}: NoGroupStateProps) {
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, isDark && styles.darkIconContainer]}>
          <Ionicons name="people" size={32} color={isDark ? '#60a5fa' : '#2563eb'} />
        </View>
        
        <Text style={[styles.title, isDark && styles.darkText]}>
          {title}
        </Text>
        <Text style={[styles.description, isDark && styles.darkSubtitle]}>
          {description}
        </Text>
        
        {showGroupSelector && (
          <View style={styles.actionsContainer}>
            <View style={[styles.quickActions, isDark && styles.darkQuickActions]}>
              <Text style={[styles.actionsTitle, isDark && styles.darkText]}>
                Quick Actions
              </Text>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={onCreateGroup}
              >
                <Ionicons name="add-circle" size={20} color="#10b981" />
                <Text style={[styles.actionText, isDark && styles.darkSubtitle]}>
                  Create a new group to get started
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={onJoinGroup}
              >
                <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
                <Text style={[styles.actionText, isDark && styles.darkSubtitle]}>
                  Join an existing group with an invite code
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.features}>
              <Text style={[styles.featuresTitle, isDark && styles.darkSubtitle]}>
                Once you're in a group, you'll be able to:
              </Text>
              <View style={styles.featuresList}>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • Create and manage tasks
                </Text>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • Collaborate with team members
                </Text>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • Track project progress
                </Text>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • Share notes and files
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  darkContainer: {
    backgroundColor: '#1a202c',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  darkIconContainer: {
    backgroundColor: '#1e3a8a',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  darkText: {
    color: '#f7fafc',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  darkSubtitle: {
    color: '#a0aec0',
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 400,
  },
  quickActions: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  darkQuickActions: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  features: {
    paddingHorizontal: 8,
  },
  featuresTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  featuresList: {
    gap: 4,
  },
  featureItem: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});