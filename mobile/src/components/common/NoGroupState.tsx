import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
// ✅ 1. Switch to Lucide Icons
import { Users, Plus, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
// ✅ 2. Import Language Context
import { useLanguage } from '../../context/LanguageContext';

interface NoGroupStateProps {
  title?: string;
  description?: string;
  showGroupSelector?: boolean;
  // Mobile specific navigation callbacks
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
}

export default function NoGroupState({ 
  title,
  description,
  showGroupSelector = true,
  onCreateGroup,
  onJoinGroup
}: NoGroupStateProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage(); // ✅ Use translation hook

  // ✅ Use translated defaults if props are missing
  const displayTitle = title || t('groups.joinOrCreate');
  const displayDescription = description || t('groups.joinOrCreateDesc');

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.content}>
        {/* Icon Circle */}
        <View style={[styles.iconContainer, isDark && styles.darkIconContainer]}>
          <Users size={32} color={isDark ? '#60a5fa' : '#2563eb'} />
        </View>
        
        {/* Title & Description */}
        <Text style={[styles.title, isDark && styles.darkText]}>
          {displayTitle}
        </Text>
        <Text style={[styles.description, isDark && styles.darkSubtitle]}>
          {displayDescription}
        </Text>
        
        {showGroupSelector && (
          <View style={styles.actionsContainer}>
            {/* Quick Actions Box */}
            <View style={[styles.quickActions, isDark && styles.darkQuickActions]}>
              <Text style={[styles.actionsTitle, isDark && styles.darkText]}>
                {t('groups.quickActions')}
              </Text>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={onCreateGroup}
              >
                <Plus size={20} color="#10b981" />
                <Text style={[styles.actionText, isDark && styles.darkSubtitle]}>
                  {t('groups.createToStart')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={onJoinGroup}
              >
                <ArrowRight size={20} color="#3b82f6" />
                <Text style={[styles.actionText, isDark && styles.darkSubtitle]}>
                  {t('groups.joinWithCode')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Benefits List */}
            <View style={styles.features}>
              <Text style={[styles.featuresTitle, isDark && styles.darkSubtitle]}>
                {t('groups.onceInGroup')}
              </Text>
              <View style={styles.featuresList}>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • {t('groups.manageTasksBenefit')}
                </Text>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • {t('groups.collaborateBenefit')}
                </Text>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • {t('groups.trackProgressBenefit')}
                </Text>
                <Text style={[styles.featureItem, isDark && styles.darkSubtitle]}>
                  • {t('groups.shareFilesBenefit')}
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
    paddingHorizontal: 20,
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
    paddingVertical: 10,
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
    textAlign: 'left',
    paddingLeft: 10,
  },
});