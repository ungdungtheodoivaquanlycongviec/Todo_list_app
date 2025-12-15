"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRegional } from '../../contexts/RegionalContext';
import { chatService, ChatMessage, DirectConversationSummary } from '../../services/chat.service';
import { useSocket } from '../../hooks/useSocket';
import { MeetingConfig } from '../../services/meeting.service';
import MeetingView from './MeetingView';
import IncomingCallNotification from './IncomingCallNotification';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  X,
  Edit2,
  Trash2,
  Reply,
  MoreVertical,
  MessageSquare,
  UserPlus,
  Search,
  FileText,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Video,
  Phone
} from 'lucide-react';
import MentionInput, { MentionableUser, parseMentions } from '../common/MentionInput';
import MentionHighlight from '../common/MentionHighlight';

export default function ChatView() {
  const { user, currentGroup } = useAuth();
  const { t } = useLanguage();
  const { formatTime } = useRegional();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [activeContext, setActiveContext] = useState<'group' | 'direct'>('group');
  const [directConversations, setDirectConversations] = useState<DirectConversationSummary[]>([]);
  const [directConversationsLoading, setDirectConversationsLoading] = useState(false);
  const [directSearch, setDirectSearch] = useState('');
  const [startingDirectChat, setStartingDirectChat] = useState(false);
  const [activeDirectConversation, setActiveDirectConversation] = useState<DirectConversationSummary | null>(null);
  const [hasGroupUnread, setHasGroupUnread] = useState(false);
  const [pendingDirectIndicators, setPendingDirectIndicators] = useState<Record<string, boolean>>({});
  const [hasDirectUnread, setHasDirectUnread] = useState<Set<string>>(new Set());
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingAttachmentPreview, setPendingAttachmentPreview] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<MeetingConfig | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    meetingId: string;
    type: 'group' | 'direct';
    callerId: string;
    callerName: string;
    groupName?: string;
    groupId?: string;
    conversationId?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadGroupMessages = useCallback(async () => {
    if (!currentGroup?._id) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    try {
      setMessagesLoading(true);
      const result = await chatService.getMessages(currentGroup._id, { limit: 50 });
      setMessages(result.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      alert('Failed to load messages: ' + (error as Error).message);
    } finally {
      setMessagesLoading(false);
    }
  }, [currentGroup?._id]);

  const loadDirectMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    try {
      setMessagesLoading(true);
      const result = await chatService.getDirectMessages(conversationId, { limit: 50 });
      setMessages(result.messages);
      if (result.conversation) {
        setDirectConversations(prev => {
          const next = [...prev];
          const idx = next.findIndex(conv => conv._id === result.conversation!._id);
          if (idx >= 0) {
            next[idx] = result.conversation!;
            return next;
          }
          return [result.conversation!, ...next];
        });
        setActiveDirectConversation(prev =>
          prev && prev._id === result.conversation!._id ? result.conversation! : prev
        );
        setPendingDirectIndicators(prev => {
          if (!prev[result.conversation!._id]) return prev;
          const next = { ...prev };
          delete next[result.conversation!._id];
          return next;
        });
      }
    } catch (error) {
      console.error('Error loading direct messages:', error);
      alert('Failed to load messages: ' + (error as Error).message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadDirectConversations = useCallback(async () => {
    try {
      setDirectConversationsLoading(true);
      const conversations = await chatService.getDirectConversations();
      setDirectConversations(conversations);
    } catch (error) {
      console.error('Error loading direct conversations:', error);
    } finally {
      setDirectConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectConversations();
  }, [loadDirectConversations]);

  // Reset chat state when user changes (e.g., logout/login)
  useEffect(() => {
    if (!user) {
      // Clear all chat-related state when user logs out
      setMessages([]);
      setDirectConversations([]);
      setActiveDirectConversation(null);
      setActiveContext('group');
      setTypingUsers(new Set());
      setReplyingTo(null);
      setHasGroupUnread(false);
      setHasDirectUnread(new Set());
      setPendingDirectIndicators({});
    }
  }, [user?._id]);

  const upsertDirectConversation = useCallback(
    (summary: DirectConversationSummary | null | undefined) => {
      if (!summary) return;
      setDirectConversations(prev => {
        const index = prev.findIndex(conv => conv._id === summary._id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = summary;
          return updated;
        }
        return [summary, ...prev];
      });

      if (activeDirectConversation?._id === summary._id) {
        setActiveDirectConversation(summary);
      }

      if (summary.unreadCount === 0) {
        setPendingDirectIndicators(prev => {
          if (!prev[summary._id]) return prev;
          const next = { ...prev };
          delete next[summary._id];
          return next;
        });
      }
    },
    [activeDirectConversation?._id]
  );

  const handleDirectConversationEvent = useCallback(
    (data: { conversationId: string; conversation?: DirectConversationSummary | null }) => {
      if (data.conversation) {
        const updatedConversation = {
          ...data.conversation,
          _id: data.conversation._id || data.conversationId
        };
        upsertDirectConversation(updatedConversation);

        // Nếu conversation có unread count > 0 và không đang xem, hiển thị green dot
        if (updatedConversation.unreadCount > 0) {
          const isActiveConversation =
            activeContext === 'direct' &&
            activeDirectConversation?._id === updatedConversation._id;

          if (!isActiveConversation) {
            setPendingDirectIndicators(prev => ({ ...prev, [updatedConversation._id]: true }));
            setHasDirectUnread(prev => new Set(prev).add(updatedConversation._id));
          }
        }
      } else {
        loadDirectConversations();
      }
    },
    [upsertDirectConversation, loadDirectConversations, activeContext, activeDirectConversation?._id]
  );

  useEffect(() => {
    if (activeContext === 'group') {
      if (!currentGroup?._id && directConversations.length > 0) {
        setActiveContext('direct');
        setActiveDirectConversation(prev => prev || directConversations[0]);
      }
    } else if (activeContext === 'direct') {
      if (!activeDirectConversation && directConversations.length > 0) {
        setActiveDirectConversation(directConversations[0]);
      }
    }
  }, [activeContext, currentGroup?._id, directConversations, activeDirectConversation]);

  useEffect(() => {
    setTypingUsers(new Set());
    setReplyingTo(null);

    if (activeContext === 'group') {
      if (currentGroup?._id) {
        loadGroupMessages();
      } else {
        setMessages([]);
        setMessagesLoading(false);
      }
    } else if (activeContext === 'direct') {
      if (activeDirectConversation?._id) {
        loadDirectMessages(activeDirectConversation._id);
      } else {
        setMessages([]);
        setMessagesLoading(false);
      }
    }
  }, [
    activeContext,
    currentGroup?._id,
    activeDirectConversation?._id,
    loadGroupMessages,
    loadDirectMessages
  ]);

  useEffect(() => {
    if (activeContext === 'group') {
      setHasGroupUnread(false);
    } else if (activeContext === 'direct' && activeDirectConversation?._id) {
      setPendingDirectIndicators(prev => {
        if (!prev[activeDirectConversation._id]) return prev;
        const next = { ...prev };
        delete next[activeDirectConversation._id];
        return next;
      });
    }
  }, [activeContext, activeDirectConversation?._id]);

  // Join group room and rejoin on reconnect
  useEffect(() => {
    if (activeContext !== 'group') {
      return;
    }

    if (!socket || !currentGroup?._id) {
      console.log('[ChatView] Cannot join room:', { socket: !!socket, groupId: currentGroup?._id });
      return;
    }

    const joinRoom = () => {
      if (!isConnected) {
        console.log('[ChatView] Socket not connected, waiting...');
        return;
      }

      if (!socket || !socket.connected) {
        console.log('[ChatView] Socket not connected or not available');
        return;
      }

      console.log('[ChatView] Joining group chat:', currentGroup._id, 'socket ID:', socket.id);
      socket.emit('chat:join', currentGroup._id, (response: any) => {
        console.log('[ChatView] Join room response:', response);
        if (response.success) {
          console.log('[ChatView] Successfully joined group chat:', currentGroup._id);
          loadGroupMessages();
        } else {
          console.error('[ChatView] Failed to join chat:', response.error);
        }
      });
    };

    if (isConnected && socket.connected) {
      console.log('[ChatView] Socket is connected, joining room immediately');
      joinRoom();
    } else {
      console.log('[ChatView] Socket not connected yet, waiting for connect event');
    }

    const handleConnect = () => {
      console.log('[ChatView] Socket connected/reconnected, socket ID:', socket.id);
      setTimeout(() => {
        joinRoom();
      }, 100);
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      if (isConnected && currentGroup?._id) {
        console.log('[ChatView] Leaving group chat:', currentGroup._id);
        socket.emit('chat:leave', currentGroup._id);
      }
    };
  }, [socket, currentGroup?._id, isConnected, loadGroupMessages, activeContext]);

  useEffect(() => {
    if (activeContext !== 'direct') {
      return;
    }

    if (!socket || !activeDirectConversation?._id) {
      console.log('[ChatView] Cannot join direct conversation:', {
        socket: !!socket,
        conversationId: activeDirectConversation?._id
      });
      return;
    }

    const conversationId = activeDirectConversation._id;

    const joinDirectRoom = () => {
      if (!isConnected || !socket?.connected) {
        console.log('[ChatView] Socket not ready for direct conversation');
        return;
      }

      socket.emit('direct:join', conversationId, (response: any) => {
        if (response?.success) {
          console.log('[ChatView] Joined direct conversation', conversationId);
          loadDirectMessages(conversationId);
        } else {
          console.error('[ChatView] Failed to join direct conversation:', response?.error);
        }
      });
    };

    if (isConnected && socket.connected) {
      joinDirectRoom();
    }

    const handleConnect = () => {
      setTimeout(() => joinDirectRoom(), 100);
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      if (socket && conversationId) {
        socket.emit('direct:leave', conversationId, () => {
          console.log('[ChatView] Left direct conversation', conversationId);
        });
      }
    };
  }, [
    socket,
    activeDirectConversation?._id,
    isConnected,
    loadDirectMessages,
    activeContext
  ]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) {
      console.log('[ChatView] Socket not available, skipping event listeners setup');
      return;
    }

    console.log('[ChatView] Setting up socket event listeners');

    const handleNewMessage = (data: { type: string; message: ChatMessage }) => {
      if (activeContext !== 'group' || !currentGroup?._id) {
        return;
      }

      if (data.type === 'new') {
        setMessages(prev => {
          const exists = prev.some(msg => msg._id === data.message._id);
          if (exists) {
            return prev;
          }
          return [...prev, data.message];
        });
        scrollToBottom();
      } else {
        setMessages(prev =>
          prev.map(msg => (msg._id === data.message._id ? data.message : msg))
        );
      }
    };

    const handleReaction = (data: {
      type: string;
      messageId: string;
      emoji: string;
      userId: string;
      message: ChatMessage;
    }) => {
      if (activeContext !== 'group') {
        return;
      }

      setMessages(prev =>
        prev.map(msg => (msg._id === data.messageId ? data.message : msg))
      );
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      if (activeContext !== 'group') {
        return;
      }
      if (data.userId === user?._id) return;

      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    const handleDirectMessage = (data: {
      type: string;
      conversationId: string;
      message: ChatMessage;
    }) => {
      console.log('[ChatView] handleDirectMessage called:', {
        conversationId: data.conversationId,
        activeContext,
        activeDirectConversationId: activeDirectConversation?._id,
        messageId: data.message._id,
        senderId: data.message.senderId?._id,
        userId: user?._id
      });

      const isActiveConversation =
        activeContext === 'direct' &&
        activeDirectConversation?._id === data.conversationId;

      // Nếu đang xem conversation này, cập nhật messages
      if (isActiveConversation) {
        console.log('[ChatView] Message for active conversation, updating messages');
        if (data.type === 'new') {
          setMessages(prev => {
            const exists = prev.some(msg => msg._id === data.message._id);
            if (exists) {
              return prev;
            }
            return [...prev, data.message];
          });
          scrollToBottom();
        } else {
          setMessages(prev =>
            prev.map(msg => (msg._id === data.message._id ? data.message : msg))
          );
        }
      } else {
        // Nếu không đang xem conversation này, cập nhật unread indicators và conversation list
        if (data.type === 'new') {
          const isFromOtherUser = data.message.senderId?._id && data.message.senderId._id !== user?._id;
          console.log('[ChatView] Message for inactive conversation, isFromOtherUser:', isFromOtherUser);

          if (isFromOtherUser) {
            console.log('[ChatView] Updating unread indicators for conversation:', data.conversationId);
            // Cập nhật unread indicators
            setPendingDirectIndicators(prev => {
              const next = { ...prev, [data.conversationId]: true };
              console.log('[ChatView] Updated pendingDirectIndicators:', next);
              return next;
            });
            setHasDirectUnread(prev => {
              const next = new Set(prev).add(data.conversationId);
              console.log('[ChatView] Updated hasDirectUnread:', Array.from(next));
              return next;
            });

            // Cập nhật conversation trong list với unread count và last message
            setDirectConversations(prev => {
              const index = prev.findIndex(conv => conv._id === data.conversationId);
              if (index >= 0) {
                const updated = [...prev];
                const conversation = updated[index];
                updated[index] = {
                  ...conversation,
                  unreadCount: (conversation.unreadCount || 0) + 1,
                  lastMessagePreview: data.message.content?.slice(0, 140) || conversation.lastMessagePreview || 'New message',
                  lastMessageAt: data.message.createdAt || conversation.lastMessageAt || new Date().toISOString()
                };
                // Di chuyển conversation lên đầu danh sách
                const [moved] = updated.splice(index, 1);
                console.log('[ChatView] Moved conversation to top:', moved._id);
                return [moved, ...updated];
              }
              // Nếu không tìm thấy, reload danh sách
              console.log('[ChatView] Conversation not found in list, reloading...');
              loadDirectConversations();
              return prev;
            });
          }
        }
      }
    };

    const handleDirectReaction = (data: {
      conversationId: string;
      messageId: string;
      emoji: string;
      userId: string;
      message: ChatMessage;
    }) => {
      if (
        activeContext !== 'direct' ||
        !activeDirectConversation?._id ||
        data.conversationId !== activeDirectConversation._id
      ) {
        return;
      }

      setMessages(prev =>
        prev.map(msg => (msg._id === data.messageId ? data.message : msg))
      );
    };

    const handleDirectTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (
        activeContext !== 'direct' ||
        !activeDirectConversation?._id ||
        data.conversationId !== activeDirectConversation._id
      ) {
        return;
      }
      if (data.userId === user?._id) return;

      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    // Setup listeners - remove old ones first to avoid duplicates
    socket.off('chat:message', handleNewMessage);
    socket.off('chat:reaction', handleReaction);
    socket.off('chat:typing', handleTyping);
    socket.off('direct:message', handleDirectMessage);
    socket.off('direct:reaction', handleDirectReaction);
    socket.off('direct:typing', handleDirectTyping);
    socket.off('direct:conversation', handleDirectConversationEvent);

    // Add new listeners
    socket.on('chat:message', handleNewMessage);
    socket.on('chat:reaction', handleReaction);
    socket.on('chat:typing', handleTyping);
    socket.on('direct:message', handleDirectMessage);
    socket.on('direct:reaction', handleDirectReaction);
    socket.on('direct:typing', handleDirectTyping);
    socket.on('direct:conversation', handleDirectConversationEvent);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:reaction', handleReaction);
      socket.off('chat:typing', handleTyping);
      socket.off('direct:message', handleDirectMessage);
      socket.off('direct:reaction', handleDirectReaction);
      socket.off('direct:typing', handleDirectTyping);
      socket.off('direct:conversation', handleDirectConversationEvent);
    };
  }, [
    socket,
    user?._id,
    scrollToBottom,
    activeContext,
    currentGroup?._id,
    activeDirectConversation?._id,
    handleDirectConversationEvent
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (payload: any) => {
      const notification = payload?.notification || payload;
      const eventKey = notification?.eventKey || payload?.eventKey;
      console.log('[ChatView] Received notification:', eventKey, notification);
      if (eventKey !== 'CHAT_MESSAGE_OFFLINE') {
        return;
      }
      const data = notification?.data || {};
      console.log('[ChatView] Processing notification data:', data);

      if (data.contextType === 'group') {
        if (currentGroup?._id && data.groupId === currentGroup._id && activeContext === 'group') {
          return;
        }
        if (currentGroup?._id && data.groupId === currentGroup._id) {
          setHasGroupUnread(true);
        }
      } else if (data.contextType === 'direct') {
        if (!data.conversationId) {
          console.log('[ChatView] No conversationId in notification data');
          return;
        }

        console.log('[ChatView] Processing direct chat notification for conversation:', data.conversationId);

        // THÊM LOGIC MỚI: Hiển thị chấm xanh cho direct chat
        if (
          activeContext === 'direct' &&
          activeDirectConversation?._id === data.conversationId
        ) {
          console.log('[ChatView] User is viewing this conversation, skipping notification');
          return;
        }

        // Cập nhật cả pending indicators và direct unread
        setPendingDirectIndicators(prev => {
          const next = { ...prev, [data.conversationId]: true };
          console.log('[ChatView] Updated pendingDirectIndicators from notification:', next);
          return next;
        });
        setHasDirectUnread(prev => {
          const next = new Set(prev).add(data.conversationId);
          console.log('[ChatView] Updated hasDirectUnread from notification:', Array.from(next));
          return next;
        });
      }
    };

    socket.on('notifications:new', handleNotification);

    return () => {
      socket.off('notifications:new', handleNotification);
    };
  }, [socket, activeContext, activeDirectConversation?._id, currentGroup?._id]);

  // Thêm hàm reset trạng thái đã đọc cho direct chat
  const resetDirectUnread = useCallback((conversationId: string) => {
    setHasDirectUnread(prev => {
      const newSet = new Set(prev);
      newSet.delete(conversationId);
      return newSet;
    });
  }, []);

  // Cập nhật khi chuyển tab hoặc chọn conversation
  useEffect(() => {
    if (activeContext === 'group') {
      setHasGroupUnread(false);
    } else if (activeContext === 'direct' && activeDirectConversation?._id) {
      // RESET TRẠNG THÁI ĐÃ ĐỌC KHI CHỌN DIRECT CHAT
      resetDirectUnread(activeDirectConversation._id);
      setPendingDirectIndicators(prev => {
        if (!prev[activeDirectConversation._id]) return prev;
        const next = { ...prev };
        delete next[activeDirectConversation._id];
        return next;
      });
    }
  }, [activeContext, activeDirectConversation?._id, resetDirectUnread]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle attachment selection (preview before sending)
  const handleAttachmentSelect = (file: File) => {
    setPendingAttachment(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPendingAttachmentPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPendingAttachmentPreview(null);
    }
  };

  // Remove pending attachment
  const removePendingAttachment = () => {
    setPendingAttachment(null);
    setPendingAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Send message
  const handleSend = async () => {
    const content = message.trim();
    if (!content && !replyingTo && !pendingAttachment) return;

    try {
      if (!socket) {
        throw new Error('Socket connection not available');
      }

      let attachments: any[] = [];

      // Upload attachment if pending
      if (pendingAttachment) {
        setUploading(true);
        try {
          if (activeContext === 'group' && currentGroup?._id) {
            const attachment = await chatService.uploadAttachment(currentGroup._id, pendingAttachment);
            attachments = [attachment];
          } else if (activeContext === 'direct' && activeDirectConversation?._id) {
            const attachment = await chatService.uploadDirectAttachment(activeDirectConversation._id, pendingAttachment);
            attachments = [attachment];
          }
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          alert('Failed to upload attachment: ' + (uploadError as Error).message);
          setUploading(false);
          return;
        }
      }

      if (activeContext === 'group') {
        if (!currentGroup?._id) return;
        socket.emit(
          'chat:send',
          {
            groupId: currentGroup._id,
            content,
            replyTo: replyingTo?._id || null,
            attachments
          },
          (response: any) => {
            if (!response.success) {
              alert('Failed to send message: ' + response.error);
            } else {
              setMessage('');
              setReplyingTo(null);
              removePendingAttachment();
              stopTyping();
            }
            setUploading(false);
          }
        );
      } else if (activeContext === 'direct') {
        if (!activeDirectConversation?._id) return;
        socket.emit(
          'direct:send',
          {
            conversationId: activeDirectConversation._id,
            content,
            replyTo: replyingTo?._id || null,
            attachments
          },
          (response: any) => {
            if (!response.success) {
              alert('Failed to send message: ' + response.error);
            } else {
              setMessage('');
              setReplyingTo(null);
              removePendingAttachment();
              stopTyping();
            }
            setUploading(false);
          }
        );
      }
    } catch (error) {
      console.error('[ChatView] Error sending message:', error);
      alert('Failed to send message: ' + (error as Error).message);
      setUploading(false);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!socket) return;

    if (activeContext === 'group') {
      if (!currentGroup?._id) return;
      socket.emit('chat:typing', {
        groupId: currentGroup._id,
        isTyping: true
      });
    } else if (activeContext === 'direct') {
      if (!activeDirectConversation?._id) return;
      socket.emit('direct:typing', {
        conversationId: activeDirectConversation._id,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!socket) return;

    if (activeContext === 'group') {
      if (!currentGroup?._id) return;
      socket.emit('chat:typing', {
        groupId: currentGroup._id,
        isTyping: false
      });
    } else if (activeContext === 'direct') {
      if (!activeDirectConversation?._id) return;
      socket.emit('direct:typing', {
        conversationId: activeDirectConversation._id,
        isTyping: false
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Toggle reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!socket) return;

    if (activeContext === 'group') {
      socket.emit(
        'chat:reaction',
        { messageId, emoji },
        (response: any) => {
          if (!response.success) {
            alert('Failed to add reaction: ' + response.error);
          }
        }
      );
    } else if (activeContext === 'direct') {
      socket.emit(
        'direct:reaction',
        { messageId, emoji },
        (response: any) => {
          if (!response.success) {
            alert('Failed to add reaction: ' + response.error);
          }
        }
      );
    }
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    if (!confirm(t('chat.deleteConfirm'))) return;
    if (!socket) return;

    if (activeContext === 'group') {
      socket.emit('chat:delete', { messageId }, (response: any) => {
        if (!response.success) {
          alert('Failed to delete message: ' + response.error);
        }
      });
    } else if (activeContext === 'direct') {
      socket.emit('direct:delete', { messageId }, (response: any) => {
        if (!response.success) {
          alert('Failed to delete message: ' + response.error);
        }
      });
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!socket || !newContent.trim()) return;

    if (activeContext === 'group') {
      socket.emit('chat:edit', { messageId, content: newContent.trim() }, (response: any) => {
        if (!response.success) {
          alert('Failed to edit message: ' + response.error);
        }
      });
    } else if (activeContext === 'direct') {
      socket.emit('direct:edit', { messageId, content: newContent.trim() }, (response: any) => {
        if (!response.success) {
          alert('Failed to edit message: ' + response.error);
        }
      });
    }
  };

  // Common emojis
  const commonEmojis = ['👍', '❤️', '😄', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯'];

  const formatPreviewTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return formatTime(date);
  };

  // Helper to get mentionable users based on chat context
  const getMentionableUsers = useCallback((): MentionableUser[] => {
    if (activeContext === 'group' && currentGroup) {
      // For group chat: get all group members except current user
      return currentGroup.members
        .filter((member: any) => {
          const memberId = typeof member.userId === 'object' ? member.userId._id : member.userId;
          return memberId !== user?._id;
        })
        .map((member: any) => {
          const userObj = typeof member.userId === 'object' ? member.userId : null;
          return {
            _id: userObj?._id || member.userId,
            name: userObj?.name || member.name || 'Unknown User',
            email: userObj?.email || member.email || '',
            avatar: userObj?.avatar || member.avatar,
            role: member.role
          };
        });
    } else if (activeContext === 'direct' && activeDirectConversation) {
      // For direct chat: only the conversation partner
      const partnerId = activeDirectConversation.participants.find(p => p._id !== user?._id);
      if (partnerId) {
        return [{
          _id: partnerId._id,
          name: partnerId.name,
          email: partnerId.email || '',
          avatar: partnerId.avatar
        }];
      }
    }
    return [];
  }, [activeContext, currentGroup, activeDirectConversation, user?._id]);

  // Get mentionable roles for group chat
  const getMentionableRoles = useCallback((): string[] => {
    if (activeContext === 'group' && currentGroup) {
      const roles = new Set<string>();
      currentGroup.members.forEach((member: any) => {
        if (member.role) roles.add(member.role);
      });
      return Array.from(roles);
    }
    return [];
  }, [activeContext, currentGroup]);

  const handleStartDirectConversation = async () => {
    if (!directSearch.trim()) return;
    try {
      setStartingDirectChat(true);
      const conversation = await chatService.startDirectConversation({ email: directSearch.trim() });
      upsertDirectConversation(conversation);
      setActiveContext('direct');
      setActiveDirectConversation(conversation);
      setDirectSearch('');
    } catch (error) {
      console.error('Error starting direct conversation:', error);
      alert('Failed to start conversation: ' + (error as Error).message);
    } finally {
      setStartingDirectChat(false);
    }
  };

  const conversationReady =
    activeContext === 'group' ? Boolean(currentGroup) : Boolean(activeDirectConversation);

  const conversationTitle =
    activeContext === 'group'
      ? currentGroup?.name || t('chat.noGroupSelected')
      : activeDirectConversation?.targetUser?.name || t('chat.noGroupSelected');

  const conversationSubtitle =
    activeContext === 'group'
      ? currentGroup
        ? `${currentGroup.members?.length || 0} ${t('chat.members')}`
        : ''
      : activeDirectConversation?.targetUser?.email || '';

  const typingLabel =
    typingUsers.size > 0
      ? `${Array.from(typingUsers).length} ${Array.from(typingUsers).length === 1 ? t('chat.personTyping') : t('chat.peopleTyping')
      }`
      : '';

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white dark:bg-gray-900">
      <aside className="w-80 border-r border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
            {t('chat.groupChat')}
          </p>
          <button
            onClick={() => {
              setActiveContext('group');
              setHasGroupUnread(false);
            }}
            className={`w-full flex items-center gap-3 rounded-xl border p-3 transition ${activeContext === 'group'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200'
              : 'border-transparent bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
              }`}
          >
            <div className="relative">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
                <MessageSquare className="w-5 h-5" />
              </div>
              {hasGroupUnread && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-gray-900" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">
                {currentGroup ? currentGroup.name : t('chat.noGroup')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentGroup
                  ? `${currentGroup.members?.length || 0} ${t('chat.members')}`
                  : t('chat.addToGroupToChat')}
              </p>
            </div>
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('chat.oneOnOneChat')}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {directConversations.length}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={directSearch}
                onChange={(e) => setDirectSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleStartDirectConversation();
                  }
                }}
                placeholder={t('chat.enterEmail')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleStartDirectConversation}
              disabled={!directSearch.trim() || startingDirectChat}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {directConversationsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : directConversations.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('chat.noPrivateChat')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {directConversations.map(conversation => {
                const isActive =
                  activeContext === 'direct' &&
                  activeDirectConversation?._id === conversation._id;
                const hasUnread =
                  (conversation.unreadCount || 0) > 0 ||
                  Boolean(pendingDirectIndicators[conversation._id]) ||
                  hasDirectUnread.has(conversation._id); // THÊM ĐIỀU KIỆN NÀY

                return (
                  <button
                    key={conversation._id}
                    onClick={() => {
                      setActiveContext('direct');
                      setActiveDirectConversation(conversation);
                      // RESET KHI CLICK
                      resetDirectUnread(conversation._id);
                      setPendingDirectIndicators(prev => {
                        if (!prev[conversation._id]) return prev;
                        const next = { ...prev };
                        delete next[conversation._id];
                        return next;
                      });
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'
                      }`}
                  >
                    <div className="relative w-10 h-10">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 flex items-center justify-center font-semibold">
                        {conversation.targetUser?.avatar ? (
                          <img
                            src={conversation.targetUser.avatar}
                            alt={conversation.targetUser.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (conversation.targetUser?.name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      {/* HIỂN THỊ CHẤM XANH KHI CÓ TIN NHẮN MỚI */}
                      {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-gray-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {conversation.targetUser?.name || t('chat.member')}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatPreviewTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {conversation.lastMessagePreview || t('chat.noMessagePreview')}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="text-xs font-semibold text-white bg-blue-500 rounded-full px-2 py-0.5">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {conversationTitle}
              </h2>
              {conversationSubtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{conversationSubtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {typingLabel && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{typingLabel}</p>
              )}
              {conversationReady && (
                <>
                  <button
                    onClick={() => {
                      if (activeContext === 'group' && currentGroup?._id) {
                        setActiveMeeting({
                          meetingId: `group-${currentGroup._id}-${Date.now()}`,
                          type: 'group',
                          groupId: currentGroup._id
                        });
                      } else if (activeContext === 'direct' && activeDirectConversation?._id) {
                        setActiveMeeting({
                          meetingId: `direct-${activeDirectConversation._id}-${Date.now()}`,
                          type: 'direct',
                          conversationId: activeDirectConversation._id
                        });
                      }
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Start video call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (activeContext === 'group' && currentGroup?._id) {
                        setActiveMeeting({
                          meetingId: `group-${currentGroup._id}-${Date.now()}`,
                          type: 'group',
                          groupId: currentGroup._id
                        });
                      } else if (activeContext === 'direct' && activeDirectConversation?._id) {
                        setActiveMeeting({
                          meetingId: `direct-${activeDirectConversation._id}-${Date.now()}`,
                          type: 'direct',
                          conversationId: activeDirectConversation._id
                        });
                      }
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Start audio call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {conversationReady ? (
          <>
            <div className="chat-scroll flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-gray-500 mt-10">
                  {t('chat.noMessagesYet')}
                </div>
              ) : (
                messages.map(msg => (
                  <MessageItem
                    key={msg._id}
                    message={msg}
                    currentUserId={user?._id || ''}
                    onReply={() => setReplyingTo(msg)}
                    onDelete={() => handleDelete(msg._id)}
                    onReaction={handleReaction}
                    onEditMessage={handleEditMessage}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyingTo && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('chat.replyingTo')} {replyingTo.senderId.name}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {replyingTo.content}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Pending Attachment Preview */}
            {pendingAttachment && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  {pendingAttachmentPreview ? (
                    <img
                      src={pendingAttachmentPreview}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {pendingAttachment.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(pendingAttachment.size)}
                    </p>
                  </div>
                  <button
                    onClick={removePendingAttachment}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative min-w-0">
                  <MentionInput
                    value={message}
                    onChange={(value) => {
                      setMessage(value);
                      handleTyping();
                    }}
                    onSubmit={handleSend}
                    placeholder={
                      activeContext === 'group'
                        ? t('chat.messageToGroup')
                        : t('chat.messageToDirect')
                    }
                    mentionableUsers={getMentionableUsers()}
                    mentionableRoles={activeContext === 'group' ? getMentionableRoles() : undefined}
                    disabled={uploading}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  {showEmojiPicker && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg">
                      <div className="flex gap-2 flex-wrap w-64">
                        {commonEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAttachmentSelect(file);
                    }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAttachmentSelect(file);
                    }}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={(!message.trim() && !pendingAttachment) || uploading}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 px-6">
            <div>
              <p className="text-lg font-semibold mb-2">{t('chat.noGroupSelected')}</p>
              <p className="text-sm">
                {t('chat.startConversation')}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Meeting View */}
      {activeMeeting && (
        <MeetingView
          config={activeMeeting}
          onClose={() => setActiveMeeting(null)}
          title={
            activeMeeting.type === 'group'
              ? currentGroup?.name || 'Group Meeting'
              : activeDirectConversation?.targetUser?.name || 'Direct Meeting'
          }
        />
      )}

      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCallNotification
          meetingId={incomingCall.meetingId}
          type={incomingCall.type}
          callerName={incomingCall.callerName}
          groupName={incomingCall.groupName}
          onAccept={() => {
            const config: MeetingConfig = {
              meetingId: incomingCall.meetingId,
              type: incomingCall.type,
              ...(incomingCall.type === 'group' && incomingCall.groupId
                ? { groupId: incomingCall.groupId }
                : {}),
              ...(incomingCall.type === 'direct' && incomingCall.conversationId
                ? { conversationId: incomingCall.conversationId }
                : {})
            };
            setIncomingCall(null);
            setActiveMeeting(config);
          }}
          onDecline={() => {
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}

// Message Item Component
function MessageItem({
  message,
  currentUserId,
  onReply,
  onDelete,
  onReaction,
  onEditMessage
}: {
  message: ChatMessage;
  currentUserId: string;
  onReply: () => void;
  onDelete: () => void;
  onReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
}) {
  const { t } = useLanguage();
  const { formatTime } = useRegional();
  const isOwn = message.senderId._id === currentUserId;
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showExpandedEmojis, setShowExpandedEmojis] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");

  // Extended emoji list for expanded view
  const extendedEmojis = [
    '👍', '❤️', '😄', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯',
    '😍', '🤔', '😅', '😊', '🎉', '💪', '✨', '🙌', '😎', '💕',
    '😘', '🤣', '😁', '👀', '🤝', '💡', '⭐', '🌟', '💖', '🥰'
  ];

  // Copy message to clipboard
  const handleCopy = async () => {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setShowMenu(false);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Group reactions by emoji
  const reactionGroups = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof message.reactions>) || {};

  const commonEmojis = ['👍', '❤️', '😄', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯'];

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} group`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">
        {message.senderId.avatar ? (
          <img
            src={message.senderId.avatar}
            alt={message.senderId.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          message.senderId.name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Message content */}
      <div className={`${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1 max-w-[70%]`}>
        {/* Sender name */}
        {!isOwn && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{message.senderId.name}</p>
        )}

        {/* Reply to */}
        {message.replyTo && !message.replyTo.deletedAt && (
          <div className="text-xs text-gray-400 dark:text-gray-500 border-l-2 border-blue-500 pl-2 mb-1">
            Replying to {message.replyTo.senderId.name}: {message.replyTo.content.substring(0, 50)}
            {message.replyTo.content.length > 50 ? '...' : ''}
          </div>
        )}

        {/* Message bubble with menu and reactions */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
            {/* Message bubble */}
            <div
              className={`relative rounded-2xl px-4 py-2 ${isOwn
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-sm'
                }`}
            >
              {message.deletedAt ? (
                <p className="text-sm italic opacity-70">Message deleted</p>
              ) : (
                <>
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {message.attachments.map((attachment, idx) => (
                        <div key={idx}>
                          {attachment.type === 'image' ? (
                            <button
                              onClick={() => setLightboxImage(attachment.url)}
                              className="block cursor-pointer"
                            >
                              <img
                                src={attachment.url}
                                alt={attachment.filename}
                                className="max-w-full rounded-lg max-h-64 object-cover hover:opacity-90 transition-opacity"
                              />
                            </button>
                          ) : (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isOwn
                                ? 'bg-blue-400/30 border-blue-300/30 hover:bg-blue-400/40'
                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                }`}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwn ? 'bg-blue-300/30' : 'bg-gray-100 dark:bg-gray-600'
                                }`}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{attachment.filename}</p>
                                <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {t('chat.clickToView')}
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${isOwn
                          ? 'bg-blue-400 border-blue-300 text-white placeholder-blue-200'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                          }`}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onEditMessage(message._id, editContent);
                            setIsEditing(false);
                          }}
                          disabled={!editContent.trim()}
                          className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" />
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => {
                            setEditContent(message.content || "");
                            setIsEditing(false);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                        >
                          <X className="w-3 h-3" />
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    message.content && (
                      <MentionHighlight
                        content={message.content}
                        mentions={
                          Array.isArray(message.mentions)
                            ? message.mentions
                            : (message.mentions?.users || [])
                        }
                        currentUserId={currentUserId}
                        isOwnMessage={isOwn}
                        className="text-sm"
                      />
                    )
                  )}

                  {/* Edited indicator */}
                  {message.editedAt && (
                    <p className="text-xs opacity-70 mt-1">(edited)</p>
                  )}
                </>
              )}
            </div>

            {/* Quick actions - appears on hover */}
            {!message.deletedAt && (
              <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Quick reaction button */}
                <div className="relative">
                  <button
                    onClick={() => setShowReactions(!showReactions)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={t('chat.addReaction')}
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  {/* Reaction picker popup */}
                  {showReactions && (
                    <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-full mb-2 z-20`}>
                      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg ${showExpandedEmojis ? 'p-3 w-72' : 'px-2 py-1.5'}`}>
                        {!showExpandedEmojis ? (
                          /* Quick emoji row */
                          <div className="flex items-center gap-0.5">
                            {commonEmojis.slice(0, 6).map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  onReaction(message._id, emoji);
                                  setShowReactions(false);
                                  setShowExpandedEmojis(false);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all hover:scale-125"
                              >
                                {emoji}
                              </button>
                            ))}
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
                            <button
                              onClick={() => setShowExpandedEmojis(true)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                              title="More emojis"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          /* Expanded emoji grid */
                          <div>
                            <div className="grid grid-cols-8 gap-1">
                              {extendedEmojis.map((emoji, idx) => (
                                <button
                                  key={`${emoji}-${idx}`}
                                  onClick={() => {
                                    onReaction(message._id, emoji);
                                    setShowReactions(false);
                                    setShowExpandedEmojis(false);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all hover:scale-110"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setShowExpandedEmojis(false)}
                              className="mt-2 w-full text-xs text-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              ← Back
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reply button */}
                <button
                  onClick={onReply}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title={t('chat.reply')}
                >
                  <Reply className="w-4 h-4" />
                </button>

                {/* More options menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMenu && (
                    <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-36`}>
                      {/* Copy button - available for all messages with content */}
                      {message.content && (
                        <button
                          onClick={handleCopy}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          {copied ? t('chat.copied') : t('chat.copy')}
                        </button>
                      )}
                      {isOwn && (
                        <>
                          <button
                            onClick={() => {
                              setEditContent(message.content || "");
                              setIsEditing(true);
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            {t('chat.edit')}
                          </button>
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                          <button
                            onClick={() => {
                              onDelete();
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('chat.delete')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reactions display - below the bubble */}
          {Object.keys(reactionGroups).length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactionGroups).map(([emoji, reactions]) => {
                const hasReacted = reactions.some((r: any) => r.userId === currentUserId);
                return (
                  <button
                    key={emoji}
                    onClick={() => onReaction(message._id, emoji)}
                    className={`inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full border transition-colors ${hasReacted
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    title={reactions.map((r: any) => r.userId).join(', ')}
                  >
                    <span>{emoji}</span>
                    <span className="text-xs font-medium">{reactions.length}</span>
                  </button>
                );
              })}

              {/* Add more reactions button */}
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={t('chat.addReaction')}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {formatTime(new Date(message.createdAt))}
        </p>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={lightboxImage}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            <span>{t('chat.openInNewTab')}</span>
          </a>
        </div>
      )}
    </div>
  );
}