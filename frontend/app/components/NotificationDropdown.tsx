"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Users, Clock, Trash2 } from 'lucide-react';
import { notificationService, Notification } from '../services/notification.service';
import { useAuth } from '../contexts/AuthContext';
import { triggerGroupChange } from '../hooks/useGroupChange';
import { useSocket } from '../hooks/useSocket';
import { useLanguage } from '../contexts/LanguageContext';
import { useRegional } from '../contexts/RegionalContext';
import { groupService } from '../services/group.service';
import { useUIState } from '../contexts/UIStateContext';

interface NotificationDropdownProps {
  className?: string;
  onNavigate?: (view: string) => void;
}

export default function NotificationDropdown({ className = '', onNavigate }: NotificationDropdownProps) {
  const { setCurrentGroup, setUser } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();
  const { convertToUserTimezone } = useRegional();
  const { setPendingTaskIdFromNotification, setPendingConversationIdFromNotification } = useUIState();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications and unread count
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  // Listen for real-time notification updates
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: {
      eventKey: string;
      notification: Notification;
    }) => {
      console.log('[NotificationDropdown] Received new notification:', data.eventKey);

      const newNotification = data.notification;

      // Update notification list - either update existing or add new
      setNotifications(prev => {
        // Check if notification already exists (consolidated notification was updated)
        const existingIndex = prev.findIndex(n => n._id === newNotification._id);
        if (existingIndex >= 0) {
          // Update existing notification in place (consolidation case)
          const updated = [...prev];
          updated[existingIndex] = newNotification;
          // Move to top since it has new activity
          updated.unshift(updated.splice(existingIndex, 1)[0]);
          return updated;
        }
        // New notification - add to top
        return [newNotification, ...prev].slice(0, 10); // Keep only latest 10
      });

      // Update unread count - only increment for truly new notifications
      // (consolidated updates don't change unread count)
      if (!newNotification.isRead && !notifications.some(n => n._id === newNotification._id)) {
        setUnreadCount(prev => prev + 1);
      }

      // Also refresh from server to ensure consistency
      loadNotifications();
      loadUnreadCount();
    };

    socket.on('notifications:new', handleNewNotification);

    return () => {
      socket.off('notifications:new', handleNewNotification);
    };
  }, [socket]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({ limit: 10 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
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

      // Update user's current group if provided
      if (result.user) {
        setUser(result.user);
      }

      // Reload notifications and unread count
      await loadNotifications();
      await loadUnreadCount();

      // Trigger group list refresh in Sidebar
      triggerGroupChange();

      // Show success message
      console.log('Group invitation accepted successfully');
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDeclineInvitation = async (notification: Notification) => {
    try {
      await notificationService.declineGroupInvitation(notification._id);

      // Reload notifications and unread count
      await loadNotifications();
      await loadUnreadCount();

      console.log('Group invitation declined');
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      await notificationService.markAsRead(notification._id);
      await loadUnreadCount();

      // Update local state
      setNotifications(prev =>
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    try {
      await notificationService.deleteNotification(notification._id);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    // Convert both dates to user's timezone for accurate comparison
    const date = convertToUserTimezone(dateString);
    const now = convertToUserTimezone(new Date());
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('notifications.timeAgo.justNow');
    if (diffInSeconds < 3600) return t('notifications.timeAgo.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('notifications.timeAgo.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    return t('notifications.timeAgo.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'task_assignment':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'group_update':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if needed
    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification._id);
        setNotifications(prev =>
          prev.map(n => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
      }
    } catch (error) {
      console.error('Failed to mark notification as read on click:', error);
    }

    const { type, data } = notification;

    // If this is a task-related notification and we have taskId, store it for TasksView
    if ((type === 'task_assignment' || type === 'new_task' || type === 'comment_added') && data?.taskId) {
      setPendingTaskIdFromNotification(String(data.taskId));
    }

    // Switch group if notification is tied to a specific group
    if (data?.groupId) {
      try {
        const result = await groupService.switchToGroup(data.groupId);
        if (result?.group) {
          setCurrentGroup(result.group);
        }
      } catch (error) {
        console.error('Failed to switch group from notification:', error);
      }
    }

    // Navigate to appropriate view in app
    if (onNavigate) {
      if (type === 'chat_message') {
        // If it's a direct message notification, set conversationId for navigation
        if (data?.contextType === 'direct' && data?.conversationId) {
          setPendingConversationIdFromNotification(data.conversationId);
        }
        onNavigate('chat');
      } else if (type === 'task_assignment' || type === 'new_task') {
        onNavigate('tasks');
      }
    }

    // Close dropdown after navigation
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('notifications.title')}</h3>
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    try {
                      await notificationService.markAllAsRead();
                      await loadNotifications();
                      await loadUnreadCount();
                    } catch (error) {
                      console.error('Failed to mark all as read:', error);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">{t('notifications.noNotifications')}</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                          {/* Show message count for consolidated notifications */}
                          {notification.messageCount && notification.messageCount > 1 && (
                            <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                              {notification.messageCount} messages
                            </span>
                          )}
                        </p>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.updatedAt || notification.createdAt)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>

                      {/* Group Invitation Actions */}
                      {notification.type === 'group_invitation' && notification.status === 'pending' && (
                        <div className="flex items-center space-x-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptInvitation(notification);
                            }}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>{t('notifications.accept')}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineInvitation(notification);
                            }}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            <span>{t('notifications.decline')}</span>
                          </button>
                        </div>
                      )}

                      {/* Mark as read for other notifications */}
                      {notification.type !== 'group_invitation' && !notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification);
                          }}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {t('notifications.markAsRead')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  // Navigate to full notifications page
                  console.log('View all notifications');
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
