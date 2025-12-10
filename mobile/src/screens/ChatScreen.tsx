import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  SafeAreaView,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  FlatList
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import Feather from 'react-native-vector-icons/Feather';

// --- IMPORTS ---
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegional } from '../context/RegionalContext';
import { chatService, ChatMessage, DirectConversationSummary } from '../services/chat.service'; 
import { useSocket } from '../hooks/useSocket';
import { User } from '../types/auth.types'; 

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.85, 350);

// --- HELPER COMPONENTS ---

const BottomSheet = ({ visible, onClose, title, children }: any) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.bottomSheetOverlay}>
        <TouchableWithoutFeedback>
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHeader}>
              <View style={styles.bottomSheetHandle} />
              {title && <Text style={styles.bottomSheetTitle}>{title}</Text>}
            </View>
            {children}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const MessageActionSheet = ({ visible, onClose, onAction, isOwn, message }: any) => {
  if (!message) return null;
  
  const ActionItem = ({ icon, label, color = '#374151', action }: any) => (
    <TouchableOpacity 
      style={styles.actionItem} 
      onPress={() => { onAction(action, message); onClose(); }}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + '10' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.actionGrid}>
        <ActionItem icon="arrow-undo" label="Reply" action="reply" />
        <ActionItem icon="copy" label="Copy" action="copy" />
        {isOwn && <ActionItem icon="create" label="Edit" action="edit" />}
        {isOwn && <ActionItem icon="trash" label="Delete" color="#EF4444" action="delete" />}
      </View>
      <Text style={styles.sectionLabel}>Reactions</Text>
      <View style={styles.reactionQuickBar}>
        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
          <TouchableOpacity key={emoji} onPress={() => { onAction('react', message, emoji); onClose(); }} style={styles.quickEmoji}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

const AttachmentPicker = ({ visible, onClose, onPick }: any) => (
  <BottomSheet visible={visible} onClose={onClose} title="Share Content">
    <View style={styles.attachmentGrid}>
      <TouchableOpacity style={styles.attachItem} onPress={() => { onPick('image'); onClose(); }}>
        <View style={[styles.attachIcon, { backgroundColor: '#3B82F6' }]}>
          <Ionicons name="image" size={24} color="#FFF" />
        </View>
        <Text style={styles.attachLabel}>Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.attachItem} onPress={() => { onPick('file'); onClose(); }}>
        <View style={[styles.attachIcon, { backgroundColor: '#10B981' }]}>
          <Ionicons name="document-text" size={24} color="#FFF" />
        </View>
        <Text style={styles.attachLabel}>Document</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.attachItem} onPress={() => { onPick('camera'); onClose(); }}>
        <View style={[styles.attachIcon, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="camera" size={24} color="#FFF" />
        </View>
        <Text style={styles.attachLabel}>Camera</Text>
      </TouchableOpacity>
    </View>
  </BottomSheet>
);

const ChatInfoModal = ({ visible, onClose, context, group, dmUser }: any) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.infoTitle}>Details</Text>
          <View style={{ width: 40 }} /> 
        </View>
        
        <ScrollView contentContainerStyle={styles.infoContent}>
          <View style={styles.infoProfile}>
             <View style={[styles.infoAvatar, { backgroundColor: context === 'group' ? '#10B981' : '#3B82F6' }]}>
                <Text style={{fontSize: 32, color: '#FFF', fontWeight: 'bold'}}>
                    {context === 'group' ? group?.name?.charAt(0) : (dmUser?.name?.charAt(0) || '?')}
                </Text>
             </View>
             <Text style={styles.infoName}>{context === 'group' ? group?.name : (dmUser?.name || 'Unknown User')}</Text>
             <Text style={styles.infoSubtitle}>{context === 'group' ? 'Group Chat' : (dmUser?.email || '')}</Text>
          </View>

          <View style={styles.infoSection}>
             <Text style={styles.infoSectionTitle}>Actions</Text>
             <TouchableOpacity style={styles.infoRow}>
                <Ionicons name="search" size={20} color="#374151" />
                <Text style={styles.infoRowText}>Search in Conversation</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.infoRow}>
                <Ionicons name="images" size={20} color="#374151" />
                <Text style={styles.infoRowText}>Shared Media</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.infoRow}>
                <Ionicons name="notifications" size={20} color="#374151" />
                <Text style={styles.infoRowText}>Notifications</Text>
             </TouchableOpacity>
          </View>

          {context === 'group' && (
             <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Members ({group?.members?.length || 0})</Text>
                {group?.members?.slice(0, 5).map((m: any, i: number) => (
                    <View key={i} style={styles.memberRow}>
                        <View style={styles.memberAvatar}><Text>{m.userId.name?.charAt(0)}</Text></View>
                        <Text style={styles.memberName}>{m.userId.name}</Text>
                        <Text style={styles.memberRole}>{m.role}</Text>
                    </View>
                ))}
                <TouchableOpacity style={styles.viewAllButton}>
                    <Text style={{color: '#3B82F6'}}>View All Members</Text>
                </TouchableOpacity>
             </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const CreateNewConversationModal = ({ visible, onClose, onSubmit }: { visible: boolean, onClose: () => void, onSubmit: (email: string) => void }) => {
    const [email, setEmail] = useState('');
    
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>New Conversation</Text>
                            <Text style={styles.modalSubtitle}>Enter email to start a direct chat</Text>
                            
                            <TextInput
                                style={styles.modalInput}
                                placeholder="user@example.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={onClose} style={styles.modalButtonCancel}>
                                    <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => { onSubmit(email); onClose(); setEmail(''); }} 
                                    style={styles.modalButtonPrimary}
                                    disabled={!email.trim()}
                                >
                                    <Text style={styles.modalButtonTextPrimary}>Start Chat</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// --- MAIN COMPONENT ---
export default function ChatScreen({ navigation }: any) {
    const { user, currentGroup } = useAuth();
    const { t } = useLanguage();
    const { formatTime } = useRegional();
    const { socket, isConnected } = useSocket();

    // --- STATE ---
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [uploading, setUploading] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    
    const [activeContext, setActiveContext] = useState<'group' | 'direct'>('group');
    const [directConversations, setDirectConversations] = useState<DirectConversationSummary[]>([]);
    const [activeDirectConversation, setActiveDirectConversation] = useState<DirectConversationSummary | null>(null);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showAttachSheet, setShowAttachSheet] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState<any | null>(null); 

    const scrollViewRef = useRef<ScrollView>(null);

    // --- DATA LOADING ---
    const loadDirectConversations = useCallback(async () => {
        try {
            const conversations = await chatService.getDirectConversations();
            setDirectConversations(conversations);
        } catch (error) {
            console.error('Failed to load conversations', error);
        }
    }, []);

    useEffect(() => {
        loadDirectConversations();
    }, [loadDirectConversations]);

    const loadMessages = useCallback(async () => {
        setMessagesLoading(true);
        try {
            if (activeContext === 'group' && currentGroup?._id) {
                const res = await chatService.getMessages(currentGroup._id, { limit: 50 });
                setMessages(res.messages as ChatMessage[]);
            } else if (activeContext === 'direct' && activeDirectConversation?._id) {
                const res = await chatService.getDirectMessages(activeDirectConversation._id, { limit: 50 });
                setMessages(res.messages as ChatMessage[]);
            } else {
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            setMessagesLoading(false);
        }
    }, [activeContext, currentGroup?._id, activeDirectConversation?._id]);

    useEffect(() => {
        loadMessages();
        setReplyingTo(null);
        setTypingUsers(new Set());
    }, [activeContext, currentGroup?._id, activeDirectConversation?._id, loadMessages]);

    const scrollToBottom = () => {
        setTimeout(() => {
             scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    useEffect(() => {
        if (!messagesLoading) scrollToBottom();
    }, [messages, messagesLoading]);

    // --- SOCKET HANDLERS ---
    useEffect(() => {
        if (!socket) return;

        if (isConnected) {
            if (currentGroup?._id) socket.emit('chat:join', currentGroup._id, () => {});
            if (activeDirectConversation?._id) socket.emit('direct:join', activeDirectConversation._id, () => {});
        }

        const handleMessage = (data: { type: string; message: ChatMessage; conversationId?: string }) => {
            const isCurrentContext = 
                (activeContext === 'group' && !data.conversationId) || 
                (activeContext === 'direct' && data.conversationId === activeDirectConversation?._id);

            if (isCurrentContext) {
                if (data.type === 'new') {
                    setMessages(prev => [...prev, data.message]);
                    scrollToBottom();
                } else {
                     setMessages(prev => prev.map(msg => msg._id === data.message._id ? data.message : msg));
                }
            }
            if (data.conversationId) loadDirectConversations();
        };

        socket.on('chat:message', handleMessage);
        socket.on('direct:message', handleMessage);
        
        return () => {
            socket.off('chat:message', handleMessage);
            socket.off('direct:message', handleMessage);
        };
    }, [socket, isConnected, activeContext, currentGroup?._id, activeDirectConversation?._id, loadDirectConversations]);

    // --- ACTIONS ---

    const handleSendMessage = async () => {
        if (!message.trim()) return;
        const content = message.trim();
        setMessage('');

        try {
            const payload = { content, replyTo: replyingTo?._id };
            if (activeContext === 'group' && currentGroup?._id) {
                await socket.emit('chat:send', { groupId: currentGroup._id, ...payload });
            } else if (activeContext === 'direct' && activeDirectConversation?._id) {
                await socket.emit('direct:send', { conversationId: activeDirectConversation._id, ...payload });
            }
            setReplyingTo(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to send message');
        }
    };

    const handleStartNewChat = async (email: string) => {
        try {
            const conv = await chatService.startDirectConversation({ email });
            setDirectConversations(prev => [conv, ...prev.filter(c => c._id !== conv._id)]);
            setActiveContext('direct');
            setActiveDirectConversation(conv);
            setIsSidebarOpen(false);
        } catch (error) {
            Alert.alert('Error', (error as Error).message);
        }
    };

    // --- RENDER HELPERS ---

    const renderSidebar = () => {
        // 1. FIX: Kiểm tra null cho dm.targetUser trước khi truy cập .name
        const filteredDMs = directConversations.filter(dm => 
            (dm.targetUser?.name || '').toLowerCase().includes(sidebarSearch.toLowerCase())
        );

        return (
            <Modal visible={isSidebarOpen} transparent animationType="fade" onRequestClose={() => setIsSidebarOpen(false)}>
                <TouchableWithoutFeedback onPress={() => setIsSidebarOpen(false)}>
                    <View style={styles.drawerOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.drawerContainer}>
                                <View style={styles.drawerHeader}>
                                    <Text style={styles.drawerTitle}>Chats</Text>
                                    <TouchableOpacity onPress={() => setShowNewChatModal(true)}>
                                        <Ionicons name="create-outline" size={24} color="#3B82F6" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.searchContainer}>
                                    <Ionicons name="search" size={20} color="#9CA3AF" />
                                    <TextInput 
                                        style={styles.searchInput} 
                                        placeholder="Search conversations..." 
                                        value={sidebarSearch}
                                        onChangeText={setSidebarSearch}
                                    />
                                </View>

                                <ScrollView style={styles.drawerList}>
                                    {currentGroup && (
                                        <TouchableOpacity 
                                            style={[styles.drawerItem, activeContext === 'group' && styles.drawerItemActive]}
                                            onPress={() => { setActiveContext('group'); setIsSidebarOpen(false); }}
                                        >
                                            <View style={[styles.avatar, { backgroundColor: '#10B981' }]}>
                                                <Ionicons name="people" size={20} color="#FFF" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.drawerItemTitle}>{currentGroup.name}</Text>
                                                <Text style={styles.drawerItemSubtitle}>Group Chat</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}

                                    <Text style={styles.drawerSectionTitle}>DIRECT MESSAGES</Text>

                                    {filteredDMs.map(dm => (
                                        <TouchableOpacity 
                                            key={dm._id}
                                            style={[styles.drawerItem, activeContext === 'direct' && activeDirectConversation?._id === dm._id && styles.drawerItemActive]}
                                            onPress={() => { 
                                                setActiveContext('direct'); 
                                                setActiveDirectConversation(dm); 
                                                setIsSidebarOpen(false); 
                                            }}
                                        >
                                            {/* 2. FIX: Kiểm tra null cho dm.targetUser và cung cấp giá trị mặc định */}
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>
                                                    {dm.targetUser?.name?.charAt(0).toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={styles.drawerItemTitle}>
                                                        {dm.targetUser?.name || 'Unknown User'}
                                                    </Text>
                                                    {dm.unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{dm.unreadCount}</Text></View>}
                                                </View>
                                                <Text style={styles.drawerItemSubtitle} numberOfLines={1}>
                                                    {dm.lastMessagePreview || 'Start a conversation'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    };

    const renderMessageItem = ({ item }: { item: ChatMessage }) => {
        const msg = item;
        const isOwn = msg.senderId._id === user?._id;
        return (
            <TouchableOpacity 
                key={msg._id} 
                activeOpacity={0.8} 
                onLongPress={() => { setSelectedMessage(msg); setShowActionSheet(true); }}
                style={[styles.messageRow, isOwn ? styles.rowOwn : styles.rowOther]}
            >
                {!isOwn && <View style={styles.messageAvatar}><Text style={styles.avatarTextSmall}>{msg.senderId.name.charAt(0)}</Text></View>}
                <View style={[styles.messageBubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                    {msg.replyTo && (
                        <View style={styles.replyQuote}>
                            <Text style={styles.replyName}>{msg.replyTo.senderId.name}</Text>
                            <Text numberOfLines={1} style={styles.replyText}>{msg.replyTo.content}</Text>
                        </View>
                    )}
                    <Text style={[styles.messageText, isOwn ? styles.textOwn : styles.textOther]}>{msg.content}</Text>
                    <Text style={[styles.messageTime, isOwn ? styles.timeOwn : styles.timeOther]}>
                        {formatTime(new Date(msg.createdAt))}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // 3. FIX: Kiểm tra null cho activeDirectConversation.targetUser trong tiêu đề
    const headerTitle = activeContext === 'group' 
        ? currentGroup?.name 
        : (activeDirectConversation?.targetUser?.name || 'Chat');

    // 4. FIX: Kiểm tra null cho activeDirectConversation.targetUser trong subtitle
    const headerSubtitle = activeContext === 'group' 
        ? `${currentGroup?.members?.length || 0} members` 
        : (activeDirectConversation?.targetUser?.email || 'Direct Message');

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.headerButton}>
                    <Ionicons name="menu" size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                    <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsInfoOpen(true)} style={styles.headerButton}>
                    <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {/* Chat Area */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined} 
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                style={{ flex: 1 }}
            >
                {messagesLoading ? (
                    <View style={styles.centerContent}><ActivityIndicator size="large" color="#3B82F6" /></View>
                ) : (
                    <FlatList 
                        ref={scrollViewRef as any}
                        data={messages}
                        keyExtractor={(item) => item._id}
                        renderItem={renderMessageItem}
                        style={styles.messagesList}
                        contentContainerStyle={{ padding: 16 }}
                        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Say hello!</Text>}
                        onContentSizeChange={scrollToBottom}
                    />
                )}

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    {replyingTo && (
                        <View style={styles.replyPreviewBar}>
                            <Text numberOfLines={1} style={{flex: 1, color: '#6B7280'}}>Replying to {replyingTo.senderId.name}</Text>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close" size={20} /></TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputRow}>
                        <TouchableOpacity onPress={() => setShowAttachSheet(true)} style={styles.attachButton}>
                            <Feather name="plus" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Message..."
                            value={message}
                            onChangeText={setMessage}
                            multiline
                        />
                        <TouchableOpacity onPress={handleSendMessage} style={[styles.sendButton, !message.trim() && {backgroundColor: '#E5E7EB'}]} disabled={!message.trim()}>
                            <Ionicons name="send" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Modals */}
            {renderSidebar()}
            
            <MessageActionSheet 
                visible={showActionSheet} 
                onClose={() => setShowActionSheet(false)} 
                onAction={(action: any, msg: any, extra: any) => {
                    if (action === 'reply') setReplyingTo(msg);
                    else if (action === 'edit') setMessage(msg.content);
                    else if (action === 'copy') Alert.alert('Copied');
                    else if (action === 'delete') Alert.alert('Deleted');
                    else if (action === 'react') console.log('React', extra);
                }}
                isOwn={selectedMessage?.senderId._id === user?._id}
                message={selectedMessage}
            />

            <AttachmentPicker 
                visible={showAttachSheet} 
                onClose={() => setShowAttachSheet(false)}
                onPick={(type: any) => console.log('Pick', type)}
            />

            <ChatInfoModal 
                visible={isInfoOpen} 
                onClose={() => setIsInfoOpen(false)}
                context={activeContext}
                group={currentGroup}
                dmUser={activeDirectConversation?.targetUser}
            />
            
            <CreateNewConversationModal 
                visible={showNewChatModal} 
                onClose={() => setShowNewChatModal(false)} 
                onSubmit={handleStartNewChat} 
            />
            
        </SafeAreaView>
    );
}

// --- STYLES ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerButton: { padding: 4 },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
    headerSubtitle: { fontSize: 12, color: '#6B7280' },

    // Drawer / Sidebar
    drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerContainer: { width: SIDEBAR_WIDTH, height: '100%', backgroundColor: '#FFF', paddingTop: 50 }, 
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    drawerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', margin: 16, padding: 8, borderRadius: 8 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    drawerList: { flex: 1 },
    drawerSectionTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginLeft: 16, marginTop: 16, marginBottom: 8 },
    drawerItem: { flexDirection: 'row', padding: 12, alignItems: 'center', marginHorizontal: 8, borderRadius: 8 },
    drawerItemActive: { backgroundColor: '#EFF6FF' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#FFF', fontWeight: '600' },
    drawerItemTitle: { fontSize: 16, fontWeight: '500', color: '#111827' },
    drawerItemSubtitle: { fontSize: 13, color: '#6B7280' },
    unreadBadge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    unreadText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    // Messages
    messagesList: { flex: 1, backgroundColor: '#F9FAFB' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#9CA3AF' },
    messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    rowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    rowOther: { alignSelf: 'flex-start' },
    messageAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
    avatarTextSmall: { color: '#FFF', fontSize: 12 },
    messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
    bubbleOwn: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
    messageText: { fontSize: 15 },
    textOwn: { color: '#FFF' },
    textOther: { color: '#1F2937' },
    messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    timeOwn: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#9CA3AF' },
    replyQuote: { borderLeftWidth: 2, borderLeftColor: 'rgba(0,0,0,0.2)', paddingLeft: 8, marginBottom: 4 },
    replyName: { fontSize: 12, fontWeight: 'bold', opacity: 0.8 },
    replyText: { fontSize: 12, opacity: 0.8 },

    // Input
    inputContainer: { padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    replyPreviewBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    attachButton: { padding: 10 },
    textInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, marginHorizontal: 8 },
    sendButton: { padding: 10, backgroundColor: '#3B82F6', borderRadius: 20 },

    // Modal Commons
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
    modalInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, marginBottom: 20 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalButtonCancel: { padding: 10 },
    modalButtonTextCancel: { color: '#6B7280', fontWeight: '600' },
    modalButtonPrimary: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    modalButtonTextPrimary: { color: '#FFF', fontWeight: '600' },

    // Bottom Sheet
    bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    bottomSheetHeader: { alignItems: 'center', marginBottom: 20 },
    bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 10 },
    bottomSheetTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
    actionGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
    actionItem: { alignItems: 'center', gap: 8 },
    actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    actionLabel: { fontSize: 12 },
    sectionLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12 },
    reactionQuickBar: { flexDirection: 'row', justifyContent: 'space-between' },
    quickEmoji: { padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8 },
    
    // Attachment Grid
    attachmentGrid: { flexDirection: 'row', gap: 16 },
    attachItem: { alignItems: 'center', flex: 1, gap: 8 },
    attachIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    attachLabel: { fontSize: 13, fontWeight: '500' },

    // Info Modal
    infoContainer: { flex: 1, backgroundColor: '#F9FAFB' },
    infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
    infoTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', flex: 1 },
    closeButton: { padding: 8, borderRadius: 20 }, 
    infoContent: { padding: 20, alignItems: 'center' },
    infoProfile: { alignItems: 'center', marginBottom: 32 },
    infoAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    infoName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
    infoSubtitle: { fontSize: 14, color: '#6B7280' },
    infoSection: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
    infoSectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
    infoRowText: { fontSize: 16, marginLeft: 12, flex: 1 },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    memberName: { fontSize: 14, flex: 1 },
    memberRole: { fontSize: 12, color: '#6B7280' },
    viewAllButton: { marginTop: 12, alignItems: 'center' },
});