"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRegional } from '../../contexts/RegionalContext';
import { chatService, ChatMessage, DirectConversationSummary } from '../../services/chat.service';
import { useSocket } from '../../hooks/useSocket';
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
  ExternalLink
} from 'lucide-react';

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
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
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
        upsertDirectConversation({
          ...data.conversation,
          _id: data.conversation._id || data.conversationId
        });
      } else {
        loadDirectConversations();
      }
    },
    [upsertDirectConversation, loadDirectConversations]
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
    setEditingMessage(null);

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
      if (activeContext !== 'direct') {
        return;
      }
      if (!activeDirectConversation?._id || data.conversationId !== activeDirectConversation._id) {
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
      if (eventKey !== 'CHAT_MESSAGE_OFFLINE') {
        return;
      }
      const data = notification?.data || {};
      
      if (data.contextType === 'group') {
        if (currentGroup?._id && data.groupId === currentGroup._id && activeContext === 'group') {
          return;
        }
        if (currentGroup?._id && data.groupId === currentGroup._id) {
          setHasGroupUnread(true);
        }
      } else if (data.contextType === 'direct') {
        if (!data.conversationId) return;
        
        // THÊM LOGIC MỚI: Hiển thị chấm xanh cho direct chat
        if (
          activeContext === 'direct' &&
          activeDirectConversation?._id === data.conversationId
        ) {
          return;
        }
        
        // Cập nhật cả pending indicators và direct unread
        setPendingDirectIndicators(prev => ({ ...prev, [data.conversationId]: true }));
        setHasDirectUnread(prev => new Set(prev).add(data.conversationId));
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

  // Common emojis
  const commonEmojis = ['👍', '❤️', '😄', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯'];

  const formatPreviewTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return formatTime(date);
  };

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
      ? `${Array.from(typingUsers).length} ${
          Array.from(typingUsers).length === 1 ? t('chat.personTyping') : t('chat.peopleTyping')
        }`
      : '';

  return (
    <div className="flex h-full min-h-0 bg-white dark:bg-gray-900">
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
            className={`w-full flex items-center gap-3 rounded-xl border p-3 transition ${
              activeContext === 'group'
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
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${
        isActive
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

      <section className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {conversationTitle}
              </h2>
              {conversationSubtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{conversationSubtitle}</p>
              )}
            </div>
            {typingLabel && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{typingLabel}</p>
            )}
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
                    onEdit={() => setEditingMessage(msg)}
                    onDelete={() => handleDelete(msg._id)}
                    onReaction={handleReaction}
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
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      activeContext === 'group'
                        ? t('chat.messageToGroup')
                        : t('chat.messageToDirect')
                    }
                    rows={1}
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
    </div>
  );
}

// Message Item Component
function MessageItem({
  message,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReaction
}: {
  message: ChatMessage;
  currentUserId: string;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReaction: (messageId: string, emoji: string) => void;
}) {
  const { t } = useLanguage();
  const { formatTime } = useRegional();
  const isOwn = message.senderId._id === currentUserId;
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

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

        {/* Message bubble with menu */}
        <div className={`flex items-start gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <div
            className={`relative rounded-lg p-3 ${
              isOwn
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
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
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            isOwn 
                              ? 'bg-blue-400/30 border-blue-300/30 hover:bg-blue-400/40' 
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isOwn ? 'bg-blue-300/30' : 'bg-gray-100 dark:bg-gray-600'
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
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {/* Edited indicator */}
              {message.editedAt && (
                <p className="text-xs opacity-70 mt-1">(edited)</p>
              )}
            </>
          )}
          </div>

          {/* Menu button - outside the bubble */}
          {!message.deletedAt && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-32`}>
                    <button
                      onClick={() => {
                        onReply();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      {t('chat.reply')}
                    </button>
                    {isOwn && (
                      <>
                        <button
                          onClick={() => {
                            onEdit();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          {t('chat.edit')}
                        </button>
                        <button
                          onClick={() => {
                            onDelete();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
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

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionGroups).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => onReaction(message._id, emoji)}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                title={reactions.map((r: any) => r.userId).join(', ')}
              >
                {emoji} {reactions.length}
              </button>
            ))}
          </div>
        )}

        {/* Add reaction button */}
        {!message.deletedAt && (
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {t('chat.addReaction')}
            </button>
            {showReactions && (
              <div className="absolute left-0 bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg z-10">
                <div className="flex gap-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReaction(message._id, emoji);
                        setShowReactions(false);
                      }}
                      className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatTime(new Date(message.createdAt))}
        </p>
      </div>
    </div>
  );
}