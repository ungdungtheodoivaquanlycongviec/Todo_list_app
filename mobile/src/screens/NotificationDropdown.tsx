import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';

import { notificationService, Notification } from '../services/notification.service';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NotificationDropdownProps {
  className?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NotificationDropdown({ className = '' }: NotificationDropdownProps) {
  const { setCurrentGroup, setUser } = useAuth();
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load notifications and unread count
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  // Animation when modal opens/closes
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({ limit: 10 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    try {
      const result = await notificationService.acceptGroupInvitation(notification._id);
      
      if (result.user) {
        setUser(result.user);
      }
      
      await loadNotifications();
      await loadUnreadCount();
      
      Alert.alert('Success', 'Group invitation accepted successfully');
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (notification: Notification) => {
    try {
      await notificationService.declineGroupInvitation(notification._id);
      await loadNotifications();
      await loadUnreadCount();
      Alert.alert('Success', 'Group invitation declined');
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;
    
    try {
      await notificationService.markAsRead(notification._id);
      await loadUnreadCount();
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(notification._id);
              await loadNotifications();
              await loadUnreadCount();
            } catch (error) {
              console.error('Failed to delete notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return <Ionicons name="people" size={16} color="#3b82f6" />;
      case 'task_assignment':
        return <Ionicons name="checkmark-circle" size={16} color="#10b981" />;
      case 'group_update':
        return <Ionicons name="time" size={16} color="#f59e0b" />;
      default:
        return <Ionicons name="notifications" size={16} color="#6b7280" />;
    }
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* Notification Bell */}
      <TouchableOpacity
        onPress={openModal}
        style={styles.bellButton}
      >
        <Ionicons name="notifications-outline" size={24} color={isDark ? '#d1d5db' : '#374151'} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeModal}>
            <Animated.View 
              style={[
                styles.backdrop,
                { opacity: fadeAnim }
              ]}
            />
          </TouchableWithoutFeedback>

          {/* Notification Panel */}
          <Animated.View 
            style={[
              styles.panel,
              isDark && styles.darkPanel,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            {/* Header */}
            <View style={[styles.header, isDark && styles.darkHeader]}>
              <View style={styles.headerContent}>
                <Text style={[styles.headerTitle, isDark && styles.darkText]}>
                  Notifications
                </Text>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllAsRead}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? '#d1d5db' : '#374151'} />
              </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, isDark && styles.darkText]}>
                    Loading...
                  </Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off" size={48} color="#9ca3af" />
                  <Text style={[styles.emptyText, isDark && styles.darkText]}>
                    No notifications
                  </Text>
                </View>
              ) : (
                notifications.map((notification) => (
                  <View
                    key={notification._id}
                    style={[
                      styles.notificationItem,
                      !notification.isRead && styles.unreadNotification,
                      isDark && styles.darkNotificationItem,
                    ]}
                  >
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        {getNotificationIcon(notification.type)}
                        <Text style={[styles.notificationTitle, isDark && styles.darkText]}>
                          {notification.title}
                        </Text>
                        <View style={styles.notificationActions}>
                          <Text style={styles.timeText}>
                            {formatTimeAgo(notification.createdAt)}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteNotification(notification)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash-outline" size={14} color="#9ca3af" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <Text style={[styles.notificationMessage, isDark && styles.darkSubtext]}>
                        {notification.message}
                      </Text>
                      
                      {/* Group Invitation Actions */}
                      {notification.type === 'group_invitation' && notification.status === 'pending' && (
                        <View style={styles.invitationActions}>
                          <TouchableOpacity
                            onPress={() => handleAcceptInvitation(notification)}
                            style={styles.acceptButton}
                          >
                            <Ionicons name="checkmark" size={14} color="#ffffff" />
                            <Text style={styles.acceptButtonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeclineInvitation(notification)}
                            style={styles.declineButton}
                          >
                            <Ionicons name="close" size={14} color="#ffffff" />
                            <Text style={styles.declineButtonText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {/* Mark as read for other notifications */}
                      {notification.type !== 'group_invitation' && !notification.isRead && (
                        <TouchableOpacity
                          onPress={() => handleMarkAsRead(notification)}
                          style={styles.markReadButton}
                        >
                          <Text style={styles.markReadText}>Mark as read</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Footer */}
            {notifications.length > 0 && (
              <View style={[styles.footer, isDark && styles.darkFooter]}>
                <TouchableOpacity onPress={() => console.log('View all notifications')}>
                  <Text style={styles.viewAllText}>View all notifications</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bellButton: {
    padding: 8,
    borderRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
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
  darkPanel: {
    backgroundColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkHeader: {
    borderBottomColor: '#374151',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  markAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  notificationsList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unreadNotification: {
    backgroundColor: '#dbeafe',
  },
  darkNotificationItem: {
    borderBottomColor: '#374151',
  },
  darkUnreadNotification: {
    backgroundColor: '#1e3a8a',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  invitationActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  declineButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  markReadButton: {
    marginTop: 8,
  },
  markReadText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  darkFooter: {
    borderTopColor: '#374151',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  darkText: {
    color: '#f9fafb',
  },
  darkSubtext: {
    color: '#d1d5db',
  },
});