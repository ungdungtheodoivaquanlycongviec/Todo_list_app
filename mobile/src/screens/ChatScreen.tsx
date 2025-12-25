import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TouchableWithoutFeedback,
  StatusBar,
  PermissionsAndroid
} from 'react-native';

// --- ICONS (Lucide) ---
import { 
  Menu, Search, Edit2, Phone, Video, 
  Image as ImageIcon, Paperclip, Send, 
  X, Reply, Copy, Trash2, 
  FileText, MessageSquare, Forward, Mic, MicOff 
} from 'lucide-react-native';

// --- NATIVE LIBRARIES ---
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Clipboard from '@react-native-clipboard/clipboard';

// --- CONTEXTS & SERVICES ---
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegional } from '../context/RegionalContext';
import { chatService, ChatMessage, DirectConversationSummary } from '../services/chat.service'; 
import { useSocket } from '../hooks/useSocket';
import { MeetingConfig, meetingService } from '../services/meeting.service';

// --- CUSTOM COMPONENTS ---
import MeetingView from './MeetingView';
import IncomingCallNotification from './IncomingCallNotification';
import MentionInput, { MentionableUser } from '../components/common/MentionInput';
import MentionHighlight from '../components/common/MentionHighlight';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.85, 320);

// --- TYPES ---
interface ExtendedChatMessage extends ChatMessage {
  callData?: {
    status: 'active' | 'ended';
    meetingId: string;
    startedAt?: string;
    endedAt?: string;
    callType: 'group' | 'direct';
  };
  messageType?: 'text' | 'call' | 'system';
  mentions?: { users: string[] };
}

// --- SUB COMPONENTS ---

const TypingIndicator = ({ typingUsers, t }: { typingUsers: Set<string>, t: any }) => {
  if (typingUsers.size === 0) return null;
  const count = Array.from(typingUsers).length;
  const text = count === 1 
    ? (t('chat.personTyping' as any) || 'Someone is typing...') 
    : (t('chat.peopleTyping' as any) || 'People are typing...');
  
  return (
    <View style={styles.typingContainer}>
      <Text style={styles.typingText}>{text}</Text>
    </View>
  );
};

const CallMessageItem = ({ message, onJoin, t }: { message: ExtendedChatMessage, onJoin: () => void, t: any }) => {
  const isActive = message.callData?.status === 'active';
  const duration = message.callData?.endedAt && message.callData?.startedAt
    ? Math.round((new Date(message.callData.endedAt).getTime() - new Date(message.callData.startedAt).getTime()) / 1000)
    : null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <View style={styles.callMessageContainer}>
      <View style={[styles.callIconContainer, isActive && styles.callIconActive]}>
        <Phone size={20} color="#FFF" />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.callTitle}>
          {message.senderId.name} {isActive ? (t('chat.startedCall' as any) || 'started a call') : (t('chat.callEnded' as any) || 'call ended')}
        </Text>
        <Text style={styles.callSubtitle}>
          {isActive ? (t('chat.ongoingCall' as any) || 'Ongoing call') : (duration ? `${t('chat.duration' as any) || 'Duration'}: ${formatDuration(duration)}` : (t('chat.callEnded' as any) || 'Ended'))}
        </Text>
      </View>
      {isActive && (
        <TouchableOpacity onPress={onJoin} style={styles.joinButton}>
          <Video size={16} color="#FFF" />
          <Text style={styles.joinButtonText}>{t('chat.join' as any) || 'Join'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// --- MAIN COMPONENT ---

export default function ChatScreen({ navigation }: any) {
    const { user, currentGroup } = useAuth();
    const { t } = useLanguage();
    const { formatTime } = useRegional();
    const { socket, isConnected } = useSocket();

    // Data State
    const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [directConversations, setDirectConversations] = useState<DirectConversationSummary[]>([]);
    const [directConversationsLoading, setDirectConversationsLoading] = useState(false);
    
    // UI State
    const [message, setMessage] = useState('');
    const [activeContext, setActiveContext] = useState<'group' | 'direct'>('group');
    const [activeDirectConversation, setActiveDirectConversation] = useState<DirectConversationSummary | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Message Actions State
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null); 
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    
    // Attachments State
    const [pendingAttachment, setPendingAttachment] = useState<any>(null); 
    const [uploading, setUploading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null); 

    // Call State
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [activeMeetingConfig, setActiveMeetingConfig] = useState<MeetingConfig | null>(null);
    const [pendingStoredMeeting, setPendingStoredMeeting] = useState<any>(null);
    
    // Modal State
    const [selectedMessage, setSelectedMessage] = useState<ExtendedChatMessage | null>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showForwardModal, setShowForwardModal] = useState(false); 
    const [newChatEmail, setNewChatEmail] = useState('');
    const [sidebarSearch, setSidebarSearch] = useState(''); 

    const flatListRef = useRef<FlatList>(null);

    // --- 1. XIN QUYỀN (PERMISSION) ---
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                ]);
            } catch (err) {
                console.warn(err);
            }
        }
    };

    useEffect(() => {
        requestPermissions();
        const checkStoredMeeting = async () => {
            const stored = await meetingService.getStoredMeeting();
            if (stored) setPendingStoredMeeting(stored);
        };
        checkStoredMeeting();
        loadDirectConversations();
    }, []);

    // --- FIX SOCKET ---
    useEffect(() => {
        if (socket && isConnected) {
            meetingService.setSocket(socket);
        }
    }, [socket, isConnected]);

    // --- LOAD DATA ---
    const loadDirectConversations = async () => {
        try {
            setDirectConversationsLoading(true);
            const res = await chatService.getDirectConversations();
            setDirectConversations(res);
        } catch (e) { console.error(e); }
        finally { setDirectConversationsLoading(false); }
    };

    const loadMessages = useCallback(async (reset = true) => {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        try {
            const limit = 20;
            const before = !reset && messages.length > 0 ? messages[0].createdAt : undefined;
            
            let res;
            if (activeContext === 'group' && currentGroup?._id) {
                res = await chatService.getMessages(currentGroup._id, { limit, before });
            } else if (activeContext === 'direct' && activeDirectConversation?._id) {
                res = await chatService.getDirectMessages(activeDirectConversation._id, { limit, before });
            }

            if (res) {
                const newMsgs = res.messages as ExtendedChatMessage[];
                if (reset) {
                    setMessages(newMsgs);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
                } else {
                    setMessages(prev => [...newMsgs, ...prev]);
                }
                setHasMore(newMsgs.length >= limit);
            }
        } catch (e) { console.error(e); } 
        finally { 
            setLoading(false); 
            setLoadingMore(false);
        }
    }, [activeContext, currentGroup?._id, activeDirectConversation?._id, messages]);

    useEffect(() => {
        setMessages([]);
        loadMessages(true);
        setReplyingTo(null);
        setEditingMessage(null);
        setPendingAttachment(null);
    }, [activeContext, currentGroup?._id, activeDirectConversation?._id]);

    // --- SOCKET HANDLERS ---
    useEffect(() => {
        if (!socket || !isConnected) return;

        if (activeContext === 'group' && currentGroup?._id) socket.emit('chat:join', currentGroup._id, () => {});
        if (activeContext === 'direct' && activeDirectConversation?._id) socket.emit('direct:join', activeDirectConversation._id, () => {});

        const handleMessage = (data: { type: string, message: ExtendedChatMessage, conversationId?: string }) => {
            const isRelevant = (activeContext === 'group' && !data.conversationId) || 
                               (activeContext === 'direct' && data.conversationId === activeDirectConversation?._id);
            
            if (isRelevant) {
                if (data.type === 'new') {
                    setMessages(prev => [...prev, data.message]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                } else {
                    setMessages(prev => prev.map(m => m._id === data.message._id ? data.message : m));
                }
            }
            if (data.conversationId) loadDirectConversations();
        };

        const handleIncomingCall = (data: any) => {
            if (data.callerId !== user?._id) setIncomingCall(data);
        };

        const handleReaction = (data: { messageId: string, message: ExtendedChatMessage }) => {
             setMessages(prev => prev.map(m => m._id === data.messageId ? data.message : m));
        };

        const handleTyping = (data: { userId: string, isTyping: boolean }) => {
            if (data.userId === user?._id) return;
            setTypingUsers(prev => {
                const next = new Set(prev);
                data.isTyping ? next.add(data.userId) : next.delete(data.userId);
                return next;
            });
        };

        socket.on('chat:message', handleMessage);
        socket.on('direct:message', handleMessage);
        socket.on('chat:reaction', handleReaction);
        socket.on('direct:reaction', handleReaction);
        socket.on('chat:typing', handleTyping);
        socket.on('direct:typing', handleTyping);
        socket.on('call:incoming', handleIncomingCall);

        return () => {
            socket.off('chat:message');
            socket.off('direct:message');
            socket.off('chat:reaction');
            socket.off('direct:reaction');
            socket.off('chat:typing');
            socket.off('direct:typing');
            socket.off('call:incoming');
        };
    }, [socket, isConnected, activeContext, currentGroup?._id, activeDirectConversation?._id]);

    // --- ACTIONS ---

    const handlePickImage = async () => {
        const options: ImageLibraryOptions = { mediaType: 'photo', quality: 0.8, selectionLimit: 1 };
        try {
            const result = await launchImageLibrary(options);
            if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setPendingAttachment({
                    uri: asset.uri,
                    name: asset.fileName || 'image.jpg',
                    type: asset.type || 'image/jpeg',
                    size: asset.fileSize || 0
                });
            }
        } catch (error) { Alert.alert('Error', 'Failed to pick image'); }
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.pick({ type: [DocumentPicker.types.allFiles], allowMultiSelection: false });
            const file = result[0];
            setPendingAttachment({ uri: file.uri, name: file.name, type: file.type || 'application/octet-stream', size: file.size });
        } catch (err) { if (!DocumentPicker.isCancel(err)) Alert.alert('Error', 'Failed to pick document'); }
    };

    const handleCopy = (content: string) => {
        Clipboard.setString(content);
        Alert.alert('Copied', 'Message copied to clipboard');
        setShowActionSheet(false);
    };

    // ✅ FIX TYPESCRIPT: Sửa lỗi sendMessage và sendDirectMessage
    const handleSend = async () => {
        if (!message.trim() && !pendingAttachment) return;
        
        const content = message.trim();
        setMessage('');
        setReplyingTo(null);
        setEditingMessage(null);
        
        try {
            let attachments: any[] = [];
            
            if (pendingAttachment) {
                setUploading(true);
                try {
                    if (activeContext === 'group' && currentGroup?._id) {
                        const uploaded = await chatService.uploadAttachment(currentGroup._id, pendingAttachment);
                        attachments = [uploaded];
                    } else if (activeContext === 'direct' && activeDirectConversation?._id) {
                        const uploaded = await chatService.uploadDirectAttachment(activeDirectConversation._id, pendingAttachment);
                        attachments = [uploaded];
                    }
                } catch (err: any) {
                    Alert.alert('Upload Error', err.message);
                    setUploading(false);
                    return;
                }
                setPendingAttachment(null);
                setUploading(false);
            }

            if (editingMessage) {
                const event = activeContext === 'group' ? 'chat:edit' : 'direct:edit';
                socket?.emit(event, { messageId: editingMessage._id, content });
            } else {
                const payload = { content, replyTo: replyingTo?._id, attachments };
                
                if (activeContext === 'group' && currentGroup?._id) {
                    // ✅ FIX: Gửi object { content } nếu service yêu cầu, hoặc giữ nguyên payload nếu service tự xử lý
                    // Giả sử server lắng nghe sự kiện socket trực tiếp
                    await socket?.emit('chat:send', { groupId: currentGroup._id, ...payload });
                } 
                else if (activeContext === 'direct' && activeDirectConversation?._id) {
                    await socket?.emit('direct:send', { conversationId: activeDirectConversation._id, ...payload });
                }
            }
        } catch (e) { Alert.alert(t('common.error' as any), t('chat.sendError' as any)); }
    };

    const handleForwardMessage = async (targetId: string, type: 'group' | 'direct') => {
        if (!forwardingMessage || !socket) return;
        const payload = { 
            content: `[Forwarded] ${forwardingMessage.content}`, 
            attachments: forwardingMessage.attachments 
        };
        try {
            if (type === 'group') await socket.emit('chat:send', { groupId: targetId, ...payload });
            else await socket.emit('direct:send', { conversationId: targetId, ...payload });
            Alert.alert('Success', 'Message forwarded');
            setForwardingMessage(null);
            setShowForwardModal(false);
        } catch (e) { Alert.alert('Error', 'Failed to forward message'); }
    };

    const handleReaction = (messageId: string, emoji: string) => {
        const event = activeContext === 'group' ? 'chat:reaction' : 'direct:reaction';
        socket?.emit(event, { messageId, emoji });
    };

    const getMentionableUsers = (): MentionableUser[] => {
        if (activeContext === 'group' && currentGroup) {
            return currentGroup.members.map((m: any) => ({
                _id: typeof m.userId === 'string' ? m.userId : m.userId._id,
                name: typeof m.userId === 'string' ? m.name : m.userId.name,
                avatar: typeof m.userId === 'string' ? m.avatar : m.userId.avatar,
                email: typeof m.userId === 'string' ? m.email || '' : m.userId.email || ''
            })).filter((u: any) => u._id !== user?._id);
        }
        return [];
    };

    // --- RENDER ---
    const renderMessage = ({ item }: { item: ExtendedChatMessage }) => {
        if (item.messageType === 'call') {
            return <CallMessageItem 
                message={item} 
                onJoin={() => {
                    if (item.callData) {
                        setActiveMeetingConfig({
                            meetingId: item.callData.meetingId,
                            type: item.callData.callType,
                            groupId: item.callData.callType === 'group' ? currentGroup?._id : undefined,
                            conversationId: item.callData.callType === 'direct' ? activeDirectConversation?._id : undefined
                        });
                    }
                }} 
                t={t} 
            />;
        }

        const isOwn = item.senderId._id === user?._id;
        const reactions = item.reactions?.reduce((acc: any, r: any) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
        }, {});

        return (
            <TouchableOpacity 
                activeOpacity={0.9}
                onLongPress={() => { setSelectedMessage(item); setShowActionSheet(true); }}
                style={[styles.msgRow, isOwn ? styles.rowOwn : styles.rowOther]}
            >
                {!isOwn && (
                    <View style={styles.msgAvatar}>
                        <Text style={styles.avatarTxtSmall}>{item.senderId.name.charAt(0)}</Text>
                    </View>
                )}
                <View style={{maxWidth: '75%'}}>
                    {!isOwn && activeContext === 'group' && <Text style={styles.senderName}>{item.senderId.name}</Text>}
                    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                        {item.attachments && item.attachments.map((att, idx) => (
                            <TouchableOpacity key={idx} onPress={() => att.type === 'image' ? setLightboxImage(att.url) : Alert.alert('File', 'Download logic here')} style={styles.attachmentThumb}>
                                {att.type === 'image' ? <Image source={{ uri: att.url }} style={styles.imageThumb} /> : 
                                <View style={styles.fileThumb}><FileText size={24} color="#6B7280" /><Text numberOfLines={1} style={styles.fileName}>{att.filename}</Text></View>}
                            </TouchableOpacity>
                        ))}
                        {item.content ? (
                            <MentionHighlight 
                                content={item.content} 
                                mentions={item.mentions?.users || []} 
                                currentUserId={user?._id || ''}
                                isOwnMessage={isOwn}
                                style={[styles.msgText, isOwn ? styles.textOwn : styles.textOther]} 
                            />
                        ) : null}
                        <Text style={[styles.timeText, isOwn ? { color: 'rgba(255,255,255,0.7)' } : { color: '#9CA3AF' }]}>{formatTime(new Date(item.createdAt))}</Text>
                    </View>
                    {reactions && Object.keys(reactions).length > 0 && (
                        <View style={[styles.reactionsRow, isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                            {Object.entries(reactions).map(([emoji, count]: any) => (
                                <View key={emoji} style={styles.reactionBadge}><Text style={{fontSize: 10}}>{emoji} {count}</Text></View>
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const title = activeContext === 'group' ? currentGroup?.name : activeDirectConversation?.targetUser?.name;
    const subTitle = activeContext === 'group' ? `${currentGroup?.members?.length || 0} ${t('nav.members' as any)}` : activeDirectConversation?.targetUser?.email;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.iconBtn}><Menu size={24} color="#1F2937" /></TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{title || (t('chat.chat' as any) || 'Chat')}</Text>
                    <Text style={styles.headerSub}>{subTitle}</Text>
                </View>
                <View style={{flexDirection:'row', gap:10}}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => {
                        const config: MeetingConfig = {
                            meetingId: `call-${Date.now()}`,
                            type: activeContext === 'group' ? 'group' : 'direct',
                            groupId: activeContext === 'group' ? currentGroup?._id : undefined,
                            conversationId: activeContext === 'direct' ? activeDirectConversation?._id : undefined
                        };
                        setActiveMeetingConfig(config);
                    }}>
                        <Video size={24} color="#3B82F6" />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                {loading ? (<View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>) : (
                    <FlatList 
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item._id}
                        style={styles.list}
                        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                        onRefresh={() => loadMessages(false)}
                        refreshing={loadingMore}
                    />
                )}

                <View style={styles.footer}>
                    <TypingIndicator typingUsers={typingUsers} t={t} />
                    {(replyingTo || editingMessage || pendingAttachment) && (
                        <View style={styles.previewBar}>
                            <View style={styles.previewContent}>
                                {pendingAttachment ? (
                                    <View style={{flexDirection:'row', alignItems:'center'}}><Paperclip size={16} color="#3B82F6" /><Text style={styles.previewTitle} numberOfLines={1}>{pendingAttachment.name}</Text></View>
                                ) : (
                                    <><Text style={styles.previewTitle}>{editingMessage ? t('common.edit' as any) : `${t('chat.replyingTo' as any)} ${replyingTo?.senderId.name}`}</Text><Text numberOfLines={1} style={styles.previewText}>{editingMessage?.content || replyingTo?.content}</Text></>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMessage(null); setPendingAttachment(null); }}><X size={20} color="#6B7280" /></TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputRow}>
                        <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}><ImageIcon size={22} color="#6B7280" /></TouchableOpacity>
                        <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument}><Paperclip size={22} color="#6B7280" /></TouchableOpacity>
                        <MentionInput 
                            value={message}
                            onChange={(val) => { setMessage(val); }}
                            onSubmit={handleSend}
                            placeholder={t('chat.placeholder' as any)}
                            mentionableUsers={getMentionableUsers()}
                            style={styles.input}
                        />
                        <TouchableOpacity onPress={handleSend} disabled={(!message.trim() && !pendingAttachment) || uploading} style={[styles.sendBtn, (!message.trim() && !pendingAttachment) && { backgroundColor: '#E5E7EB' }]}>
                            {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color="#FFF" />}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* ✅ FIX CRASH: Modal MeetingView */}
            <Modal 
                visible={!!activeMeetingConfig} 
                animationType="slide" 
                // Quan trọng: Không set null ở đây để tránh unmount MeetingView đột ngột khi bấm Back
                onRequestClose={() => { return; }}
                presentationStyle="fullScreen"
            >
                {activeMeetingConfig && (
                    <MeetingView 
                        config={activeMeetingConfig} 
                        onClose={() => setActiveMeetingConfig(null)}
                        title={activeContext === 'group' ? currentGroup?.name : activeDirectConversation?.targetUser?.name}
                    />
                )}
            </Modal>

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
                            groupId: incomingCall.groupId,
                            conversationId: incomingCall.conversationId
                        };
                        setIncomingCall(null);
                        setActiveMeetingConfig(config);
                    }}
                    onDecline={() => setIncomingCall(null)}
                />
            )}

            {/* Sidebar & Other Modals (Giữ nguyên) */}
            <Modal visible={isSidebarOpen} transparent animationType="fade" onRequestClose={() => setIsSidebarOpen(false)}>
                <TouchableOpacity style={styles.sidebarOverlay} onPress={() => setIsSidebarOpen(false)}>
                    <TouchableWithoutFeedback>
                        <View style={styles.sidebar}>
                            <View style={styles.sidebarHeader}>
                                <Text style={styles.sidebarTitle}>{t('nav.chat' as any)}</Text>
                                <TouchableOpacity onPress={() => setShowNewChatModal(true)}><Edit2 size={20} color="#3B82F6" /></TouchableOpacity>
                            </View>
                            <View style={styles.sidebarSearch}><Search size={16} color="#9CA3AF" /><TextInput placeholder="Search..." style={styles.sidebarSearchInput} value={sidebarSearch} onChangeText={setSidebarSearch} /></View>
                            <TouchableOpacity style={[styles.sidebarItem, activeContext === 'group' && styles.sidebarItemActive]} onPress={() => { setActiveContext('group'); setIsSidebarOpen(false); }}>
                                <View style={[styles.sidebarAvatar, {backgroundColor:'#10B981'}]}><MessageSquare size={18} color="#FFF"/></View><Text style={styles.sidebarName}>{currentGroup?.name || 'Group Chat'}</Text>
                            </TouchableOpacity>
                            <Text style={styles.sidebarSection}>Direct Messages</Text>
                            <FlatList 
                                data={directConversations.filter(c => c.targetUser?.name.toLowerCase().includes(sidebarSearch.toLowerCase()))}
                                keyExtractor={item => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={[styles.sidebarItem, activeContext === 'direct' && activeDirectConversation?._id === item._id && styles.sidebarItemActive]} onPress={() => { setActiveContext('direct'); setActiveDirectConversation(item); setIsSidebarOpen(false); }}>
                                        <Image source={{uri: item.targetUser?.avatar}} style={styles.sidebarAvatarImg} />
                                        <View><Text style={styles.sidebarName}>{item.targetUser?.name}</Text><Text style={styles.sidebarSub} numberOfLines={1}>{item.lastMessagePreview || 'Start a chat'}</Text></View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>

            <Modal visible={showActionSheet} transparent animationType="slide" onRequestClose={() => setShowActionSheet(false)}>
                 <TouchableOpacity style={styles.bottomSheetOverlay} onPress={() => setShowActionSheet(false)}>
                    <View style={styles.bottomSheetContent}>
                        <View style={styles.emojiRow}>{['👍','❤️','😂','😮','😢','🔥'].map(emoji => (<TouchableOpacity key={emoji} onPress={() => { if (selectedMessage) handleReaction(selectedMessage._id, emoji); setShowActionSheet(false); }}><Text style={{fontSize: 24}}>{emoji}</Text></TouchableOpacity>))}</View>
                        <View style={styles.actionGrid}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => { if(selectedMessage) setReplyingTo(selectedMessage); setShowActionSheet(false); }}><Reply size={20} color="#374151" /><Text style={styles.actionText}>Reply</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => { if(selectedMessage) handleCopy(selectedMessage.content); }}><Copy size={20} color="#374151" /><Text style={styles.actionText}>Copy</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => { if(selectedMessage) { setForwardingMessage(selectedMessage); setShowForwardModal(true); setShowActionSheet(false); }}}><Forward size={20} color="#374151" /><Text style={styles.actionText}>Forward</Text></TouchableOpacity>
                            {selectedMessage?.senderId._id === user?._id && (<TouchableOpacity style={styles.actionBtn} onPress={() => { if (selectedMessage) { Alert.alert('Delete', 'Delete this message?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { const event = activeContext === 'group' ? 'chat:delete' : 'direct:delete'; socket?.emit(event, { messageId: selectedMessage._id }); setShowActionSheet(false); }}]); }}}><Trash2 size={20} color="#EF4444" /><Text style={[styles.actionText, {color: '#EF4444'}]}>Delete</Text></TouchableOpacity>)}
                        </View>
                    </View>
                 </TouchableOpacity>
            </Modal>

            <Modal visible={showForwardModal} transparent animationType="fade" onRequestClose={() => setShowForwardModal(false)}>
                <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Forward to...</Text><FlatList data={directConversations} keyExtractor={item => item._id} renderItem={({item}) => (<TouchableOpacity style={styles.sidebarItem} onPress={() => handleForwardMessage(item._id, 'direct')}><Image source={{uri: item.targetUser?.avatar}} style={styles.sidebarAvatarImg} /><Text style={styles.sidebarName}>{item.targetUser?.name}</Text></TouchableOpacity>)} /><TouchableOpacity onPress={() => setShowForwardModal(false)} style={styles.modalCloseBtn}><Text style={{color:'#6B7280'}}>Cancel</Text></TouchableOpacity></View></View>
            </Modal>

            <Modal visible={showNewChatModal} transparent animationType="fade" onRequestClose={() => setShowNewChatModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Direct Chat</Text>
                        <TextInput placeholder="Enter email address" style={styles.modalInput} value={newChatEmail} onChangeText={setNewChatEmail} autoCapitalize="none" />
                        <View style={{flexDirection:'row', justifyContent:'flex-end', gap: 10, marginTop: 15}}>
                            <TouchableOpacity onPress={() => setShowNewChatModal(false)}><Text style={{color:'#6B7280', padding: 10}}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={{backgroundColor:'#3B82F6', padding: 10, borderRadius: 8}} onPress={async () => { try { const res = await chatService.startDirectConversation({ email: newChatEmail }); setDirectConversations(prev => [res, ...prev]); setActiveContext('direct'); setActiveDirectConversation(res); setShowNewChatModal(false); setIsSidebarOpen(false); } catch (e: any) { Alert.alert('Error', e.message); } }}><Text style={{color:'#FFF'}}>Start Chat</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {lightboxImage && (<Modal visible={!!lightboxImage} transparent={true} animationType="fade"><View style={styles.lightboxContainer}><TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxImage(null)}><X size={24} color="#FFF" /></TouchableOpacity><Image source={{uri: lightboxImage}} style={styles.lightboxImg} resizeMode="contain" /></View></Modal>)}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FFF' },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    headerSub: { fontSize: 12, color: '#6B7280' },
    iconBtn: { padding: 8 },
    list: { flex: 1, backgroundColor: '#F9FAFB' },
    msgRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end', maxWidth: '85%' },
    rowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    rowOther: { alignSelf: 'flex-start' },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarTxtSmall: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    bubble: { padding: 12, borderRadius: 16, minWidth: 100 },
    bubbleOwn: { backgroundColor: '#3B82F6', borderBottomRightRadius: 2 },
    bubbleOther: { backgroundColor: '#FFF', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#E5E7EB' },
    senderName: { fontSize: 11, color: '#6B7280', marginBottom: 2, marginLeft: 4 },
    msgText: { fontSize: 15, lineHeight: 22 },
    textOwn: { color: '#FFF' },
    textOther: { color: '#1F2937' },
    timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
    footer: { borderTopWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', padding: 10 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: { flex: 1, maxHeight: 100, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 15 },
    sendBtn: { padding: 10, backgroundColor: '#3B82F6', borderRadius: 20 },
    attachBtn: { padding: 8 },
    previewBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, marginBottom: 8 },
    previewContent: { flex: 1, marginLeft: 8 },
    previewTitle: { fontSize: 12, fontWeight: 'bold', color: '#3B82F6', marginBottom: 2 },
    previewText: { fontSize: 12, color: '#4B5563' },
    typingContainer: { paddingHorizontal: 12, marginBottom: 4 },
    typingText: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
    callMessageContainer: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginVertical: 8, alignItems: 'center', alignSelf: 'center', width: '80%', borderWidth: 1, borderColor: '#DBEAFE' },
    callIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    callIconActive: { backgroundColor: '#10B981' },
    callTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
    callSubtitle: { fontSize: 12, color: '#6B7280' },
    joinButton: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginLeft: 8 },
    joinButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
    sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
    sidebar: { width: SIDEBAR_WIDTH, backgroundColor: '#FFF', height: '100%', padding: 20, paddingTop: 50 },
    sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sidebarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    sidebarSearch: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
    sidebarSearchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    sidebarSection: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 2 },
    sidebarItemActive: { backgroundColor: '#EFF6FF' },
    sidebarAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    sidebarAvatarImg: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#E5E7EB' },
    sidebarName: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
    sidebarSub: { fontSize: 12, color: '#6B7280' },
    attachmentThumb: { marginTop: 5 },
    imageThumb: { width: 200, height: 150, borderRadius: 8, backgroundColor: '#E5E7EB' },
    fileThumb: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8, width: 200 },
    fileName: { marginLeft: 8, flex: 1, fontSize: 13, color: '#374151' },
    reactionsRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
    reactionBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#FFF' },
    bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10 },
    actionGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    actionBtn: { alignItems: 'center', gap: 5 },
    actionText: { fontSize: 12, color: '#374151' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16 },
    modalCloseBtn: { alignSelf: 'center', marginTop: 15 },
    lightboxContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    lightboxImg: { width: width, height: height * 0.8 },
    lightboxClose: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 }
});