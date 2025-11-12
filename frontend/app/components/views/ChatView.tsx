"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { chatService, ChatMessage } from '../../services/chat.service';
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
  MoreVertical
} from 'lucide-react';

export default function ChatView() {
  const { user, currentGroup } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!currentGroup?._id) return;

    try {
      setLoading(true);
      const result = await chatService.getMessages(currentGroup._id, { limit: 50 });
      setMessages(result.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      alert('Failed to load messages: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentGroup]);

  // Join group room and rejoin on reconnect
  useEffect(() => {
    if (!socket || !currentGroup?._id) {
      console.log('[ChatView] Cannot join room:', { socket: !!socket, groupId: currentGroup?._id });
      return;
    }

    const joinRoom = () => {
      if (!isConnected) {
        console.log('[ChatView] Socket not connected, waiting...');
        return;
      }

      console.log('[ChatView] Joining group chat:', currentGroup._id);
      socket.emit('chat:join', currentGroup._id, (response: any) => {
        if (response.success) {
          console.log('[ChatView] Successfully joined group chat:', currentGroup._id);
          loadMessages();
        } else {
          console.error('[ChatView] Failed to join chat:', response.error);
        }
      });
    };

    // Join immediately if connected
    if (isConnected) {
      joinRoom();
    }

    // Rejoin on reconnect
    const handleConnect = () => {
      console.log('[ChatView] Socket reconnected, rejoining room');
      joinRoom();
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      if (isConnected && currentGroup?._id) {
        console.log('[ChatView] Leaving group chat:', currentGroup._id);
        socket.emit('chat:leave', currentGroup._id);
      }
    };
  }, [socket, currentGroup, isConnected, loadMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) {
      console.log('[ChatView] Socket not available, skipping event listeners setup');
      return;
    }

    console.log('[ChatView] Setting up socket event listeners');

    const handleNewMessage = (data: { type: string; message: ChatMessage }) => {
      console.log('[ChatView] Received chat:message event:', data);
      if (data.type === 'new') {
        console.log('[ChatView] Adding new message:', data.message);
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg._id === data.message._id);
          if (exists) {
            console.log('[ChatView] Message already exists, skipping');
            return prev;
          }
          console.log('[ChatView] Adding message to state, current count:', prev.length);
          return [...prev, data.message];
        });
        scrollToBottom();
      } else if (data.type === 'edited') {
        console.log('[ChatView] Updating edited message:', data.message._id);
        setMessages(prev =>
          prev.map(msg => (msg._id === data.message._id ? data.message : msg))
        );
      } else if (data.type === 'deleted') {
        console.log('[ChatView] Removing deleted message:', data.message._id);
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
      console.log('[ChatView] Received chat:reaction event:', data);
      setMessages(prev =>
        prev.map(msg => (msg._id === data.messageId ? data.message : msg))
      );
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
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
    
    // Add new listeners
    socket.on('chat:message', handleNewMessage);
    socket.on('chat:reaction', handleReaction);
    socket.on('chat:typing', handleTyping);

    console.log('[ChatView] Socket event listeners registered for socket:', socket.id);
    
    // Test listener by logging all events
    const testListener = (eventName: string, ...args: any[]) => {
      console.log(`[ChatView] Socket event received: ${eventName}`, args);
    };
    
    // Add a one-time test to verify socket is receiving events
    socket.once('chat:message', (data) => {
      console.log('[ChatView] TEST: First chat:message event received:', data);
    });

    return () => {
      console.log('[ChatView] Cleaning up socket event listeners');
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:reaction', handleReaction);
      socket.off('chat:typing', handleTyping);
    };
  }, [socket, user, scrollToBottom]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!currentGroup?._id || (!message.trim() && !replyingTo && !uploading)) return;

    const content = message.trim();
    if (!content && !replyingTo && !uploading) return;

    try {
      if (socket) {
        console.log('[ChatView] Sending message via socket:', { groupId: currentGroup._id, content });
        socket.emit(
          'chat:send',
          {
            groupId: currentGroup._id,
            content,
            replyTo: replyingTo?._id || null,
            attachments: []
          },
          (response: any) => {
            console.log('[ChatView] Send message response:', response);
            if (!response.success) {
              alert('Failed to send message: ' + response.error);
            } else {
              setMessage('');
              setReplyingTo(null);
              stopTyping();
            }
          }
        );
      } else {
        console.error('[ChatView] Socket not available');
        alert('Socket connection not available');
      }
    } catch (error) {
      console.error('[ChatView] Error sending message:', error);
      alert('Failed to send message: ' + (error as Error).message);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!socket || !currentGroup?._id) return;

    socket.emit('chat:typing', {
      groupId: currentGroup._id,
      isTyping: true
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (!socket || !currentGroup?._id) return;

    socket.emit('chat:typing', {
      groupId: currentGroup._id,
      isTyping: false
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Upload file
  const handleFileUpload = async (file: File) => {
    if (!currentGroup?._id) return;

    try {
      setUploading(true);
      const attachment = await chatService.uploadAttachment(currentGroup._id, file);

      if (socket) {
        socket.emit(
          'chat:send',
          {
            groupId: currentGroup._id,
            content: '',
            attachments: [attachment]
          },
          (response: any) => {
            if (!response.success) {
              alert('Failed to send file: ' + response.error);
            }
            setUploading(false);
          }
        );
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file: ' + (error as Error).message);
      setUploading(false);
    }
  };

  // Toggle reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!socket) return;

    socket.emit(
      'chat:reaction',
      { messageId, emoji },
      (response: any) => {
        if (!response.success) {
          alert('Failed to add reaction: ' + response.error);
        }
      }
    );
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    if (!socket) return;

    socket.emit('chat:delete', { messageId }, (response: any) => {
      if (!response.success) {
        alert('Failed to delete message: ' + response.error);
      }
    });
  };

  // Common emojis
  const commonEmojis = ['👍', '❤️', '😄', '😂', '😮', '😢', '🙏', '🔥', '👏', '💯'];

  if (!currentGroup) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please select a group to start chatting</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {currentGroup.name}
        </h2>
        {typingUsers.size > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {Array.from(typingUsers).length} {Array.from(typingUsers).length === 1 ? 'person is' : 'people are'} typing...
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageItem
            key={msg._id}
            message={msg}
            currentUserId={user?._id || ''}
            onReply={() => setReplyingTo(msg)}
            onEdit={() => setEditingMessage(msg)}
            onDelete={() => handleDelete(msg._id)}
            onReaction={handleReaction}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Replying to {replyingTo.senderId.name}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{replyingTo.content}</p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
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
              placeholder="Type a message..."
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
                if (file) handleFileUpload(file);
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
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
              disabled={!message.trim() && !replyingTo && !uploading}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
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
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
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
      <div className={`flex-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1 max-w-[70%]`}>
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

        {/* Message bubble */}
        <div
          className={`relative group rounded-lg p-3 ${
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
                        <img
                          src={attachment.url}
                          alt={attachment.filename}
                          className="max-w-full rounded-lg max-h-64 object-cover"
                        />
                      ) : (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-gray-200 dark:bg-gray-700 rounded"
                        >
                          <Paperclip className="w-4 h-4" />
                          <span className="text-sm">{attachment.filename}</span>
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

          {/* Menu button */}
          {!message.deletedAt && (
            <div className={`absolute ${isOwn ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <div className={`absolute ${isOwn ? 'left-0' : 'right-0'} top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-32`}>
                    <button
                      onClick={() => {
                        onReply();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      Reply
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
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            onDelete();
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
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
              Add reaction
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
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

