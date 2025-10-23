"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Users, Clock, Trash2 } from 'lucide-react';
import { notificationService, Notification } from '../services/notification.service';
import { useAuth } from '../contexts/AuthContext';

interface NotificationDropdownProps {
  className?: string;
}

export default function NotificationDropdown({ className = '' }: NotificationDropdownProps) {
  const { setCurrentGroup, setUser } = useAuth();
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
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'task_assignment':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'group_update':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
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
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
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
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          <button
                            onClick={() => handleDeleteNotification(notification)}
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
                            onClick={() => handleAcceptInvitation(notification)}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(notification)}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            <span>Decline</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Mark as read for other notifications */}
                      {notification.type !== 'group_invitation' && !notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
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
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
