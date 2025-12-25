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
  ActivityIndicator,
} from 'react-native';

// ✅ Sử dụng Lucide chuẩn cho Mobile
import { 
  Bell, 
  CheckCircle, 
  Users, 
  Clock, 
  BellOff, 
  X, 
  Trash2,
  Check,
  ChevronRight
} from 'lucide-react-native';

import { notificationService, Notification } from '../services/notification.service';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';
import { useLanguage } from '../context/LanguageContext';
import { useRegional } from '../context/RegionalContext';
import { groupService } from '../services/group.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NotificationDropdown() {
  const { setCurrentGroup, setUser } = useAuth();
  const { isDark } = useTheme();
  const { socket } = useSocket();
  const { t } = useLanguage();
  const { convertToUserTimezone } = useRegional();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  // ✅ ĐỒNG BỘ REAL-TIME (Giống bản Web)
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { notification: Notification }) => {
      setNotifications(prev => {
        const exists = prev.some(n => n._id === data.notification._id);
        if (exists) return prev;
        return [data.notification, ...prev].slice(0, 10);
      });
      if (!data.notification.isRead) setUnreadCount(prev => prev + 1);
    };

    socket.on('notifications:new', handleNewNotification);
    return () => { socket.off('notifications:new', handleNewNotification); };
  }, [socket]);

  // Animation điều khiển Panel
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({ limit: 10 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error(error);
    }
  };

  // ✅ HÀNH ĐỘNG CHẤP NHẬN LỜI MỜI (Inline Action)
  const handleAcceptInvitation = async (notification: Notification) => {
    try {
      const result = await notificationService.acceptGroupInvitation(notification._id);
      if (result.user) setUser(result.user); // Cập nhật user để Sidebar thấy nhóm mới
      await loadNotifications();
      await loadUnreadCount();
      Alert.alert(t('common.success' as any), t('notifications.accepted' as any));
    } catch (error) {
      Alert.alert(t('common.error' as any), 'Failed to accept');
    }
  };

  const handleDeclineInvitation = async (notification: Notification) => {
    try {
      await notificationService.declineGroupInvitation(notification._id);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error(error);
    }
  };

  // ✅ CLICK ĐIỀU HƯỚNG & CHUYỂN GROUP (Deep Linking)
  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification._id);
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Tự động chuyển Group nếu thông báo thuộc về 1 Group cụ thể
      if (notification.data?.groupId) {
        const result = await groupService.switchToGroup(notification.data.groupId);
        if (result?.group) setCurrentGroup(result.group);
      }

      setIsOpen(false);
      // Bạn có thể thêm logic điều hướng màn hình ở đây (ví dụ: navigation.navigate('Chat'))
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      Alert.alert(t('common.error' as any), 'Error marking read');
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    try {
      await notificationService.deleteNotification(notification._id);
      setNotifications(prev => prev.filter(n => n._id !== notification._id));
      if (!notification.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error(error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = convertToUserTimezone(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return t('notifications.timeAgo.justNow' as any);
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getNotificationIcon = (type: string) => {
    const color = isDark ? '#60a5fa' : '#3b82f6';
    switch (type) {
      case 'group_invitation': return <Users size={18} color={color} />;
      case 'task_assignment': return <CheckCircle size={18} color="#10b981" />;
      case 'group_update': return <Clock size={18} color="#f59e0b" />;
      default: return <Bell size={18} color="#6b7280" />;
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setIsOpen(true)} style={styles.bellButton}>
        <Bell size={24} color={isDark ? '#d1d5db' : '#374151'} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.panel, isDark && styles.darkPanel, { transform: [{ translateX: slideAnim }] }]}>
            <View style={[styles.header, isDark && styles.darkHeader]}>
              <View style={styles.headerContent}>
                <Text style={[styles.headerTitle, isDark && styles.darkText]}>{t('notifications.title' as any)}</Text>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllAsRead}>
                    <Text style={styles.markAllText}>{t('notifications.markAllRead' as any)}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <X size={24} color={isDark ? '#d1d5db' : '#374151'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationsList}>
              {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} color="#3b82f6" />
              ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <BellOff size={48} color="#9ca3af" />
                  <Text style={[styles.emptyText, isDark && styles.darkText]}>{t('notifications.noNotifications' as any)}</Text>
                </View>
              ) : (
                <>
                  {notifications.map((n) => (
                    <View key={n._id} style={[styles.notificationItem, !n.isRead && styles.unreadNotification, isDark && styles.darkNotificationItem, !n.isRead && isDark && styles.darkUnreadNotification]}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => handleNotificationClick(n)}>
                        <View style={styles.notificationHeader}>
                          {getNotificationIcon(n.type)}
                          <Text style={[styles.notificationTitle, isDark && styles.darkText]} numberOfLines={1}>{n.title}</Text>
                          <Text style={styles.timeText}>{formatTimeAgo(n.createdAt)}</Text>
                        </View>
                        <Text style={[styles.notificationMessage, isDark && styles.darkSubtext]}>{n.message}</Text>
                        
                        {/* Hành động mời vào nhóm */}
                        {n.type === 'group_invitation' && n.status === 'pending' && (
                          <View style={styles.invitationActions}>
                            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptInvitation(n)}>
                              <Check size={14} color="#fff" />
                              <Text style={styles.btnText}>{t('notifications.accept' as any)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineInvitation(n)}>
                              <X size={14} color="#fff" />
                              <Text style={styles.btnText}>{t('notifications.decline' as any)}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity onPress={() => handleDeleteNotification(n)} style={styles.deleteBtn}>
                        <Trash2 size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* ✅ NÚT XEM TẤT CẢ (Giống bản Web) */}
                  <TouchableOpacity 
                    style={styles.viewAllFooter}
                    onPress={() => {
                      setIsOpen(false);
                      console.log('Navigate to All Notifications Screen');
                    }}
                  >
                    <Text style={styles.viewAllText}>{t('notifications.viewAll' as any)}</Text>
                    <ChevronRight size={16} color="#3b82f6" />
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bellButton: { padding: 8 },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  modalContainer: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  panel: { width: SCREEN_WIDTH * 0.85, backgroundColor: '#ffffff', elevation: 5 },
  darkPanel: { backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  darkHeader: { borderBottomColor: '#374151' },
  headerContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  markAllText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  closeButton: { marginLeft: 12 },
  notificationsList: { flex: 1 },
  emptyContainer: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#6b7280', marginTop: 12 },
  notificationItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center' },
  darkNotificationItem: { borderBottomColor: '#1f2937' },
  unreadNotification: { backgroundColor: '#eff6ff' },
  darkUnreadNotification: { backgroundColor: '#1e293b' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  notificationTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 8 },
  timeText: { fontSize: 11, color: '#9ca3af' },
  notificationMessage: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  invitationActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  acceptButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  declineButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 8, marginLeft: 4 },
  viewAllFooter: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  viewAllText: { color: '#3b82f6', fontSize: 14, fontWeight: '700' },
  darkText: { color: '#f9fafb' },
  darkSubtext: { color: '#9ca3af' }
});