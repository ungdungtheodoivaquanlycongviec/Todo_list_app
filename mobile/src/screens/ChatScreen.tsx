import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Image, Dimensions, SafeAreaView, Modal, KeyboardAvoidingView,
  Platform, FlatList, TouchableWithoutFeedback, StatusBar, PermissionsAndroid, Keyboard
} from 'react-native';

// --- ICONS ---
import { 
  Menu, Search, Edit2, Phone, Video, Image as ImageIcon, Paperclip, Send, 
  X, Reply, Copy, Trash2, FileText, MessageSquare, Forward, Mic, Pin, Square, ExternalLink, Play, Pause,
  Smile 
} from 'lucide-react-native';

// --- NATIVE LIBS ---
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import AudioRecord from 'react-native-audio-record';
import Sound from 'react-native-sound'; 

// --- CONTEXTS & SERVICES ---
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegional } from '../context/RegionalContext';
import { useTheme } from '../context/ThemeContext';
import { chatService, ChatMessage, DirectConversationSummary } from '../services/chat.service'; 
import { useSocket } from '../hooks/useSocket';
import { MeetingConfig, meetingService } from '../services/meeting.service';

// --- COMPONENTS ---
import MeetingView from './MeetingView';
import IncomingCallNotification from './IncomingCallNotification';
import MentionInput, { MentionableUser } from '../components/common/MentionInput';
import MentionHighlight from '../components/common/MentionHighlight';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.85, 320);

// --- EMOJIS ---
const COMMON_EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
  '🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑',
  '🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬',
  '🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵',
  '🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️',
  '😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
  '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿',
  '💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹',
  '😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊','💋','💌','💘','💝',
  '💖','💗','💓','💞','💕','💟','❣️','💔','❤️','🧡','💛','💚','💙',
  '💜','🖤','🤍','🤎','💯','💢','💥','💫','💦','💨','🕳️','💣','💬',
  '👁️‍🗨️','🗨️','🗯️','💭','💤','👋','🤚','🖐️','✋','🖖','👌','🤏','✌️',
  '🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊',
  '👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪'
];

// --- HELPER ---
const isImageFile = (att: any) => {
  if (!att) return false;
  if (att.type && att.type.startsWith('image/')) return true;
  const filename = (att.filename || att.name || '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp|heic)$/.test(filename);
};

// ==============================================================================
// 1. VOICE PLAYER (LAZY LOAD)
// ==============================================================================
const VoiceMessagePlayer = ({ src, isOwn = false }: { src: string, isOwn?: boolean }) => {
  if (!src) return null;
  const [sound, setSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  
  const soundRef = useRef<Sound | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    Sound.setCategory('Playback');
    return () => {
      isMounted.current = false;
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (soundRef.current) {
        try { soundRef.current.stop(); soundRef.current.release(); } catch(e) {}
      }
    };
  }, []);

  useEffect(() => { soundRef.current = sound; }, [sound]);

  const loadAndPlay = () => {
      if (isLoading) return;
      setIsLoading(true);
      const newSound = new Sound(src, '', (error) => {
          if (!isMounted.current) { newSound.release(); return; }
          if (error) { setIsLoading(false); return; }
          setDuration(newSound.getDuration());
          setSound(newSound);
          setIsLoading(false);
          playSound(newSound); 
      });
  };

  const playSound = (s: Sound) => {
      setIsPlaying(true);
      progressInterval.current = setInterval(() => {
          if (isMounted.current && s.isLoaded()) {
              s.getCurrentTime((seconds) => { if (isMounted.current) setCurrentTime(seconds); });
          } else { if (progressInterval.current) clearInterval(progressInterval.current); }
      }, 500);
      s.play((success) => {
          if (isMounted.current) {
              setIsPlaying(false); setCurrentTime(0);
              if (progressInterval.current) clearInterval(progressInterval.current);
              s.setCurrentTime(0);
          }
      });
  };

  const togglePlayPause = () => {
    if (!sound) { loadAndPlay(); return; }
    if (isPlaying) {
      sound.pause(); setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else { playSound(sound); }
  };

  const handleProgressPress = (e: any) => {
    if (!sound || duration === 0 || progressBarWidth === 0) return;
    const touchX = e.nativeEvent.locationX;
    const newTime = (touchX / progressBarWidth) * duration;
    sound.setCurrentTime(newTime); setCurrentTime(newTime);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const btnColor = isOwn ? '#FFFFFF' : '#3B82F6';
  const trackColor = isOwn ? 'rgba(255,255,255,0.3)' : '#D1D5DB';
  const thumbColor = isOwn ? '#FFFFFF' : '#3B82F6';
  const txtColor = isOwn ? 'rgba(255,255,255,0.9)' : '#4B5563';

  return (
    <View style={[styles.voiceContainer, { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : '#F3F4F6' }]}>
      <TouchableOpacity onPress={togglePlayPause} disabled={isLoading} style={[styles.voiceBtn, { backgroundColor: isOwn ? 'rgba(255,255,255,0.3)' : '#E5E7EB' }]}>
        {isLoading ? <ActivityIndicator size="small" color={btnColor} /> : 
         isPlaying ? <Pause size={18} color={btnColor} fill="currentColor" /> : <Play size={18} color={btnColor} fill="currentColor" style={{ marginLeft: 2 }} />}
      </TouchableOpacity>
      <View style={styles.voiceProgress}>
        <TouchableOpacity activeOpacity={1} onPress={handleProgressPress} onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)} style={[styles.voiceTrack, { backgroundColor: trackColor }]}>
          <View style={[styles.voiceThumb, { width: `${progressPercent}%`, backgroundColor: thumbColor }]} />
        </TouchableOpacity>
        <Text style={[styles.voiceTime, { color: txtColor }]}>{formatTime(currentTime)} / {formatTime(duration)}</Text>
      </View>
    </View>
  );
};

// ==============================================================================
// 2. EMOJI PICKER
// ==============================================================================
const SimpleEmojiPicker = ({ visible, onClose, onSelect, isDark }: any) => {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.bottomSheetOverlay} onPress={onClose}>
                <View style={[styles.bottomSheetContent, isDark && styles.darkBottomSheet, { height: '45%' }]}>
                    <View style={styles.modalHeaderRow}>
                         <Text style={[styles.modalTitle, isDark && styles.darkText, {fontSize: 16, marginBottom: 0}]}>Choose Emoji</Text>
                         <TouchableOpacity onPress={onClose}><X size={24} color={isDark ? '#FFF' : '#000'} /></TouchableOpacity>
                    </View>
                    <FlatList
                        data={COMMON_EMOJIS}
                        keyExtractor={(item, index) => index.toString()}
                        numColumns={7} 
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={{ flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }} onPress={() => onSelect(item)}>
                                <Text style={{ fontSize: 28, color: '#000' }}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

// ==============================================================================
// 3. PINNED MODAL
// ==============================================================================
const PinnedMessagesModal = ({ visible, onClose, messages, onUnpin, onJumpToMessage, isDark, t }: any) => {
  const textColor = isDark ? '#F9FAFB' : '#1F2937';
  const subTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const itemBorder = isDark ? '#374151' : '#F3F4F6';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isDark && styles.darkModal, { height: height * 0.6 }]}>
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{t('chat.pinnedMessages') || 'Pinned Messages'}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={textColor} /></TouchableOpacity>
          </View>
          {messages.length === 0 ? (
            <View style={styles.center}><Text style={{color: subTextColor}}>No pinned messages</Text></View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={[styles.pinnedItem, { borderBottomColor: itemBorder }]}>
                  <View style={{flex: 1}}>
                    <Text style={[styles.senderName, {marginLeft:0}]}>{item.senderId.name}</Text>
                    <Text style={{ color: textColor }} numberOfLines={2}>{item.content || (item.attachments?.length ? '[File]' : '')}</Text>
                  </View>
                  <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
                    <TouchableOpacity onPress={() => { onJumpToMessage(item._id); onClose(); }}><ExternalLink size={20} color="#3B82F6" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => onUnpin(item._id)}><Trash2 size={20} color="#EF4444" /></TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ==============================================================================
// 4. MAIN CHAT SCREEN
// ==============================================================================

interface ExtendedChatMessage extends Omit<ChatMessage, 'messageType'> {
  messageType?: 'text' | 'call' | 'system';
  callData?: { status: 'active' | 'ended'; meetingId: string; startedAt?: string; endedAt?: string; callType: 'group' | 'direct'; };
  mentions?: { users: string[] };
  isPinned?: boolean;
  replyTo?: any; // Thêm trường replyTo
}

const TypingIndicator = ({ typingUsers, t, isDark }: { typingUsers: Set<string>, t: any, isDark: boolean }) => {
  if (typingUsers.size === 0) return null;
  const count = Array.from(typingUsers).length;
  return (
    <View style={styles.typingContainer}>
      <Text style={[styles.typingText, isDark && styles.darkSubText]}>
        {count === 1 ? t('chat.personTyping') : t('chat.peopleTyping')}
      </Text>
    </View>
  );
};

const CallMessageItem = ({ message, onJoin, t, isDark }: any) => {
    const isActive = message.callData?.status === 'active';
    const duration = message.callData?.endedAt && message.callData?.startedAt
      ? Math.round((new Date(message.callData.endedAt).getTime() - new Date(message.callData.startedAt).getTime()) / 1000) : null;
    const formatDuration = (s: number) => { const m = Math.floor(s/60); const sec = s%60; return m>0 ? `${m}m ${sec}s` : `${sec}s`; };
  
    return (
      <View style={[styles.callMessageContainer, isDark && styles.darkCallContainer, isActive && (isDark ? styles.darkCallActive : styles.callIconActiveBorder)]}>
        <View style={[styles.callIconContainer, isActive && styles.callIconActive]}>
          <Phone size={20} color="#FFF" />
        </View>
        <View style={{flex: 1}}>
          <Text style={[styles.callTitle, isDark && styles.darkText]}>{message.senderId.name} {isActive ? (t('chat.startedCall') || 'started a call') : (t('chat.callEnded') || 'call ended')}</Text>
          <Text style={[styles.callSubtitle, isDark && styles.darkSubText]}>{isActive ? (t('chat.ongoingCall') || 'Ongoing call') : (duration ? `${t('chat.duration') || 'Duration'}: ${formatDuration(duration)}` : (t('chat.callEnded') || 'Ended'))}</Text>
        </View>
        {isActive && (
          <TouchableOpacity onPress={onJoin} style={styles.joinButton}>
            <Video size={16} color="#FFF" />
            <Text style={styles.joinButtonText}>{t('chat.join') || 'Join'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
};

export default function ChatScreen({ navigation }: any) {
    const { user, currentGroup } = useAuth();
    const { t } = useLanguage();
    const { formatTime } = useRegional();
    const { isDark } = useTheme();
    const { socket, isConnected } = useSocket();

    const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [directConversations, setDirectConversations] = useState<DirectConversationSummary[]>([]);
    const [directConversationsLoading, setDirectConversationsLoading] = useState(false);
    
    const [message, setMessage] = useState('');
    const [activeContext, setActiveContext] = useState<'group' | 'direct'>('group');
    const [activeDirectConversation, setActiveDirectConversation] = useState<DirectConversationSummary | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [replyingTo, setReplyingTo] = useState<ExtendedChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ExtendedChatMessage | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<ExtendedChatMessage | null>(null); 
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [pinnedMessages, setPinnedMessages] = useState<ExtendedChatMessage[]>([]);
    
    const [pendingAttachment, setPendingAttachment] = useState<any>(null); 
    const [uploading, setUploading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null); 
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [activeMeetingConfig, setActiveMeetingConfig] = useState<MeetingConfig | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<ExtendedChatMessage | null>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showForwardModal, setShowForwardModal] = useState(false); 
    const [showPinnedModal, setShowPinnedModal] = useState(false);
    
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [newChatEmail, setNewChatEmail] = useState('');
    const [sidebarSearch, setSidebarSearch] = useState(''); 

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const init = async () => {
            if (Platform.OS === 'android') {
                await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                ]);
            }
            try { AudioRecord.init({ sampleRate: 44100, channels: 1, bitsPerSample: 16, audioSource: 1, wavFile: 'voice_message.wav' }); } catch (err) { console.log('Audio Init Failed:', err); }
        };
        init();
        loadDirectConversations();
    }, []);

    const handleJumpToMessage = (messageId: string) => {
        const index = messages.findIndex(m => m._id === messageId);
        if (index !== -1) { flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }); } 
        else { Alert.alert("Notice", "Message not loaded yet (try scrolling up)."); }
    };
    const getMentionableRoles = (): string[] => {
        if (activeContext === 'group' && currentGroup) { const roles = new Set<string>(); currentGroup.members.forEach((m: any) => { if (m.role) roles.add(m.role); }); return Array.from(roles); } return [];
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

    const loadDirectConversations = async () => { try { setDirectConversationsLoading(true); const res = await chatService.getDirectConversations(); setDirectConversations(res); } catch (e) { console.error(e); } finally { setDirectConversationsLoading(false); } };
    const loadMessages = useCallback(async (reset = true) => {
        if (reset) setLoading(true); else setLoadingMore(true);
        try {
            const limit = 20;
            const before = !reset && messages.length > 0 ? messages[0].createdAt : undefined;
            let res;
            if (activeContext === 'group' && currentGroup?._id) res = await chatService.getMessages(currentGroup._id, { limit, before });
            else if (activeContext === 'direct' && activeDirectConversation?._id) res = await chatService.getDirectMessages(activeDirectConversation._id, { limit, before });

            if (res) {
                const newMsgs = res.messages as ExtendedChatMessage[];
                if (reset) { setMessages(newMsgs); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100); } 
                else { setMessages(prev => [...newMsgs, ...prev]); }
                setHasMore(newMsgs.length >= limit);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); setLoadingMore(false); }
    }, [activeContext, currentGroup?._id, activeDirectConversation?._id, messages]);

    const fetchPinnedMessages = async () => { if (!socket || !isConnected) return; const event = activeContext === 'group' ? 'chat:getPinned' : 'direct:getPinned'; const payload = activeContext === 'group' ? { groupId: currentGroup?._id } : { conversationId: activeDirectConversation?._id }; socket.emit(event, payload, (res: any) => { if (res.success && res.messages) setPinnedMessages(res.messages); }); };

    useEffect(() => { setMessages([]); loadMessages(true); setReplyingTo(null); setEditingMessage(null); setPendingAttachment(null); setPinnedMessages([]); }, [activeContext, currentGroup?._id, activeDirectConversation?._id]);

    useEffect(() => {
        if (!socket || !isConnected) return;
        if (activeContext === 'group' && currentGroup?._id) socket.emit('chat:join', currentGroup._id);
        if (activeContext === 'direct' && activeDirectConversation?._id) socket.emit('direct:join', activeDirectConversation._id);

        const handleMessage = (data: { type: string, message: ExtendedChatMessage, conversationId?: string }) => {
            const isRelevant = (activeContext === 'group' && !data.conversationId) || (activeContext === 'direct' && data.conversationId === activeDirectConversation?._id);
            if (isRelevant) {
                if (data.type === 'new') { setMessages(prev => { if (prev.some(m => m._id === data.message._id)) return prev; return [...prev, data.message]; }); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100); } 
                else { setMessages(prev => prev.map(m => m._id === data.message._id ? data.message : m)); }
            }
            if (data.conversationId) loadDirectConversations();
        };
        const handleIncomingCall = (data: any) => { if (data.callerId !== user?._id) setIncomingCall(data); };
        const handleReaction = (data: any) => { setMessages(prev => prev.map(m => m._id === data.messageId ? data.message : m)); };
        const handleTyping = (data: any) => { if (data.userId === user?._id) return; setTypingUsers(prev => { const next = new Set(prev); data.isTyping ? next.add(data.userId) : next.delete(data.userId); return next; }); };

        socket.on('chat:message', handleMessage); socket.on('direct:message', handleMessage); socket.on('chat:reaction', handleReaction); socket.on('direct:reaction', handleReaction); socket.on('chat:typing', handleTyping); socket.on('direct:typing', handleTyping); socket.on('call:incoming', handleIncomingCall);
        return () => { socket.off('chat:message'); socket.off('direct:message'); socket.off('chat:reaction'); socket.off('direct:reaction'); socket.off('chat:typing'); socket.off('direct:typing'); socket.off('call:incoming'); };
    }, [socket, isConnected, activeContext, currentGroup?._id, activeDirectConversation?._id]);

    const onStartRecord = async () => { try { setRecordingSeconds(0); setIsRecording(true); AudioRecord.start(); recordingIntervalRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000); } catch (e) { Alert.alert('Error', 'Cannot start recording'); } };
    const onStopRecord = async () => { try { if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current); setIsRecording(false); const audioPath = await AudioRecord.stop(); setPendingAttachment({ uri: 'file://' + audioPath, type: 'audio/wav', name: `voice_${Date.now()}.wav`, size: 0 }); } catch (e) { console.error(e); } };
    const onCancelRecord = async () => { try { if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current); setIsRecording(false); await AudioRecord.stop(); setRecordingSeconds(0); } catch (e) { console.error(e); } };
    const formatRecordingDuration = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
    const handlePickImage = async () => { const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 }); if (result.assets?.[0]) setPendingAttachment({ uri: result.assets[0].uri, name: result.assets[0].fileName, type: result.assets[0].type, size: result.assets[0].fileSize }); };
    const handlePickDocument = async () => { try { const res = await DocumentPicker.pick({ type: [DocumentPicker.types.allFiles] }); setPendingAttachment({ uri: res[0].uri, name: res[0].name, type: res[0].type, size: res[0].size }); } catch(e) {} };
    const handleSend = async () => {
        if (!message.trim() && !pendingAttachment) return;
        const content = message.trim(); setMessage(''); setReplyingTo(null); setEditingMessage(null);
        try {
            let attachments: any[] = [];
            if (pendingAttachment) {
                setUploading(true);
                try {
                    if (activeContext === 'group' && currentGroup?._id) attachments = [await chatService.uploadAttachment(currentGroup._id, pendingAttachment)];
                    else if (activeContext === 'direct' && activeDirectConversation?._id) attachments = [await chatService.uploadDirectAttachment(activeDirectConversation._id, pendingAttachment)];
                } catch (err: any) { Alert.alert('Upload Error', err.message); setUploading(false); return; }
                setPendingAttachment(null); setUploading(false);
            }
            const payload = { content, replyTo: replyingTo?._id, attachments };
            if (editingMessage) { const event = activeContext === 'group' ? 'chat:edit' : 'direct:edit'; socket?.emit(event, { messageId: editingMessage._id, content }); } 
            else { const event = activeContext === 'group' ? 'chat:send' : 'direct:send'; const id = activeContext === 'group' ? currentGroup?._id : activeDirectConversation?._id; if(id) await socket?.emit(event, activeContext === 'group' ? { groupId: id, ...payload } : { conversationId: id, ...payload }); }
        } catch (e) { Alert.alert(t('common.error' as any), t('chat.sendError' as any)); }
    };
    const handlePinMessage = (id: string, pinned: boolean) => { if (!socket) return; const event = activeContext === 'group' ? 'chat:pin' : 'direct:pin'; socket.emit(event, { messageId: id, isPinned: pinned }, (res: any) => { if (res.success) { setMessages(prev => prev.map(m => m._id === id ? { ...m, isPinned: pinned } : m)); if (pinned && res.message) setPinnedMessages(prev => [res.message, ...prev]); else setPinnedMessages(prev => prev.filter(m => m._id !== id)); Alert.alert('Success', pinned ? 'Pinned' : 'Unpinned'); } }); setShowActionSheet(false); };
    const handleCopy = (content: string) => { Clipboard.setString(content); setShowActionSheet(false); };
    const handleForwardMessage = async (targetId: string, type: 'group'|'direct') => { if (!forwardingMessage || !socket) return; const payload = { content: `[Fwd] ${forwardingMessage.content}`, attachments: forwardingMessage.attachments }; const event = type === 'group' ? 'chat:send' : 'direct:send'; const p = type === 'group' ? { groupId: targetId, ...payload } : { conversationId: targetId, ...payload }; await socket.emit(event, p); setShowForwardModal(false); };
    const handleReaction = (mid: string, emoji: string) => { const event = activeContext === 'group' ? 'chat:reaction' : 'direct:reaction'; socket?.emit(event, { messageId: mid, emoji }); };

    // --- RENDER MESSAGE (ĐÃ FIX: HIỂN THỊ REPLY) ---
    const renderMessage = useCallback(({ item }: { item: ExtendedChatMessage }) => {
        const isOwn = item.senderId._id === user?._id;
        
        if (item.messageType === 'call') {
            return <CallMessageItem message={item} onJoin={() => { if (item.callData) { setActiveMeetingConfig({ meetingId: item.callData.meetingId, type: item.callData.callType, groupId: item.callData.callType === 'group' ? currentGroup?._id : undefined, conversationId: item.callData.callType === 'direct' ? activeDirectConversation?._id : undefined }); } }} t={t} isDark={isDark} />;
        }
        const reactions = item.reactions?.reduce((acc: any, r: any) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {});

        return (
            <TouchableOpacity activeOpacity={0.9} onLongPress={() => { setSelectedMessage(item); setShowActionSheet(true); }} style={[styles.msgRow, isOwn ? styles.rowOwn : styles.rowOther]}>
                {!isOwn && ( <View style={styles.msgAvatar}><Text style={styles.avatarTxtSmall}>{item.senderId.name.charAt(0)}</Text></View> )}
                <View style={{maxWidth: '75%'}}>
                    {!isOwn && activeContext === 'group' && <Text style={styles.senderName}>{item.senderId.name}</Text>}
                    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : (isDark ? styles.bubbleOtherDark : styles.bubbleOther), isDark && !isOwn && { borderColor: '#374151' }]}>
                        {/* --- PHẦN HIỂN THỊ TIN NHẮN ĐƯỢC REPLY --- */}
                        {item.replyTo && typeof item.replyTo === 'object' && (
                            <View style={[styles.replyContainer, isDark ? styles.darkReplyContainer : {}]}>
                                <View style={[styles.replyBar, { backgroundColor: isOwn ? '#FFF' : '#3B82F6' }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.replySender, { color: isOwn ? '#E0E7FF' : '#3B82F6' }]}>{item.replyTo.senderId?.name || 'Unknown'}</Text>
                                    <Text style={[styles.replyText, { color: isOwn ? '#E0E7FF' : '#6B7280' }]} numberOfLines={1}>{item.replyTo.content || (item.replyTo.attachments?.length ? '[File]' : '...')}</Text>
                                </View>
                            </View>
                        )}
                        {/* ------------------------------------------- */}

                        {item.isPinned && ( <View style={{flexDirection:'row', alignItems:'center', marginBottom:4}}><Pin size={12} color={isOwn ? "#FFF" : "#F59E0B"} /><Text style={{fontSize:10, marginLeft:4, color: isOwn ? "#FFF" : "#F59E0B"}}>Pinned</Text></View> )}
                        {item.attachments && item.attachments.map((att, idx) => {
                            const isAudio = att.filename?.endsWith('.wav') || att.type?.startsWith('audio/');
                            const isImg = isImageFile(att);
                            return (
                                <View key={idx} style={{ marginTop: 5 }}>
                                    {isImg ? ( <TouchableOpacity onPress={() => setLightboxImage(att.url)}><Image source={{ uri: att.url }} style={styles.imageThumb} /></TouchableOpacity> ) 
                                    : isAudio ? ( <VoiceMessagePlayer src={att.url} isOwn={isOwn} /> ) 
                                    : ( <TouchableOpacity style={[styles.fileThumb, isDark && styles.darkFileThumb]}><FileText size={24} color={isDark ? "#9CA3AF" : "#6B7280"} /><Text numberOfLines={1} style={[styles.fileName, isDark && styles.darkText]}>{att.filename}</Text></TouchableOpacity> )}
                                </View>
                            );
                        })}
                        {item.content ? ( <MentionHighlight content={item.content} mentions={item.mentions?.users || []} currentUserId={user?._id || ''} isOwnMessage={isOwn} style={[styles.msgText, isOwn ? styles.textOwn : (isDark ? styles.darkText : styles.textOther)]} /> ) : null}
                        <Text style={[styles.timeText, isOwn ? { color: 'rgba(255,255,255,0.7)' } : { color: '#9CA3AF' }]}>{formatTime(new Date(item.createdAt))}</Text>
                    </View>
                    {reactions && Object.keys(reactions).length > 0 && ( <View style={[styles.reactionsRow, isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>{Object.entries(reactions).map(([emoji, count]: any) => ( <View key={emoji} style={[styles.reactionBadge, isDark && styles.darkReactionBadge]}><Text style={[styles.reactionText, isDark && styles.darkText]}>{emoji} {count}</Text></View> ))}</View> )}
                </View>
            </TouchableOpacity>
        );
    }, [isDark, user?._id, activeContext, t]);

    // --- MAIN RENDER ---
    const title = activeContext === 'group' ? currentGroup?.name : activeDirectConversation?.targetUser?.name;
    const subTitle = activeContext === 'group' ? `${currentGroup?.members?.length || 0} ${t('nav.members' as any)}` : activeDirectConversation?.targetUser?.email;
    const iconColor = isDark ? "#E5E7EB" : "#1F2937";
    const subTextColor = isDark ? "#9CA3AF" : "#6B7280";
    const bgColor = isDark ? "#111827" : "#FFF";

    return (
        <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bgColor} />
            <View style={[styles.header, isDark && styles.darkHeader]}>
                <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.iconBtn}><Menu size={24} color={iconColor} /></TouchableOpacity>
                <View style={styles.headerCenter}><Text style={[styles.headerTitle, isDark && styles.darkText]}>{title || (t('chat.chat' as any) || 'Chat')}</Text><Text style={[styles.headerSub, isDark && styles.darkSubText]}>{subTitle}</Text></View>
                <View style={{flexDirection:'row', gap:10}}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => { fetchPinnedMessages(); setShowPinnedModal(true); }}><Pin size={22} color={iconColor} /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => { setActiveMeetingConfig({ meetingId: `call-${Date.now()}`, type: activeContext === 'group' ? 'group' : 'direct', groupId: activeContext === 'group' ? currentGroup?._id : undefined, conversationId: activeContext === 'direct' ? activeDirectConversation?._id : undefined }); }}><Video size={24} color="#3B82F6" /></TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{flex: 1}}>
                        {loading ? (<View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>) : (
                            <FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={item => item._id} style={[styles.list, isDark && styles.darkList]} contentContainerStyle={{ padding: 16, paddingBottom: 20 }} onRefresh={() => loadMessages(false)} refreshing={loadingMore} keyboardShouldPersistTaps="handled" />
                        )}

                        <View style={[styles.footer, isDark && styles.darkFooter]}>
                            <TypingIndicator typingUsers={typingUsers} t={t} isDark={isDark} />
                            {(replyingTo || editingMessage || pendingAttachment) && (
                                <View style={[styles.previewBar, isDark && styles.darkPreviewBar]}>
                                    <View style={styles.previewContent}>
                                        {pendingAttachment ? ( <View style={{flexDirection:'row', alignItems:'center'}}><Paperclip size={16} color="#3B82F6" /><Text style={[styles.previewTitle, isDark && styles.darkText]} numberOfLines={1}>{pendingAttachment.name}</Text></View> ) : ( <><Text style={styles.previewTitle}>{editingMessage ? t('common.edit' as any) : `${t('chat.replyingTo' as any)} ${replyingTo?.senderId.name}`}</Text><Text numberOfLines={1} style={[styles.previewText, isDark && styles.darkSubText]}>{editingMessage?.content || replyingTo?.content}</Text></> )}
                                    </View>
                                    <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMessage(null); setPendingAttachment(null); }}><X size={20} color={subTextColor} /></TouchableOpacity>
                                </View>
                            )}

                            {isRecording ? (
                                <View style={[styles.inputRow, {backgroundColor: isDark ? '#374151' : '#FEF2F2', padding: 10, borderRadius: 20, justifyContent: 'space-between'}]}>
                                    <View style={{flexDirection:'row', alignItems:'center', gap:10}}><View style={{width: 10, height: 10, borderRadius:5, backgroundColor: '#EF4444', opacity: 0.8}} /><Text style={{color: '#EF4444', fontWeight: 'bold'}}>{formatRecordingDuration(recordingSeconds)}</Text><Text style={{color: isDark?'#D1D5DB':'#6B7280', fontSize:12}}>Recording...</Text></View>
                                    <View style={{flexDirection:'row', gap: 15}}><TouchableOpacity onPress={onCancelRecord}><Text style={{color: subTextColor, fontWeight:'500'}}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={onStopRecord} style={{backgroundColor:'#EF4444', padding:6, borderRadius:15}}><Square size={18} color="#FFF" fill="#FFF"/></TouchableOpacity></View>
                                </View>
                            ) : (
                                <View style={styles.inputRow}>
                                    <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}><ImageIcon size={22} color={subTextColor} /></TouchableOpacity>
                                    <TouchableOpacity style={styles.attachBtn} onPress={() => { Keyboard.dismiss(); setShowEmojiPicker(true); }}><Smile size={22} color={subTextColor} /></TouchableOpacity>
                                    <TouchableOpacity style={styles.attachBtn} onPress={onStartRecord}><Mic size={22} color={subTextColor} /></TouchableOpacity>
                                    <MentionInput 
                                        value={message} onChange={(val) => { setMessage(val); }} onSubmit={handleSend} placeholder={t('chat.placeholder' as any)} mentionableUsers={getMentionableUsers()} mentionableRoles={getMentionableRoles()} style={[styles.input, isDark && styles.darkInput]} 
                                        suggestionsStyle={{ maxHeight: 200, backgroundColor: isDark ? '#374151' : '#FFF' }}
                                    />
                                    <TouchableOpacity onPress={handleSend} disabled={(!message.trim() && !pendingAttachment) || uploading} style={[styles.sendBtn, (!message.trim() && !pendingAttachment) && { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>{uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={20} color={(!message.trim() && !pendingAttachment) ? (isDark ? "#9CA3AF" : "#6B7280") : "#FFF"} />}</TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* MODALS */}
            <PinnedMessagesModal visible={showPinnedModal} onClose={() => setShowPinnedModal(false)} messages={pinnedMessages} onUnpin={(id: string) => handlePinMessage(id, false)} onJumpToMessage={handleJumpToMessage} isDark={isDark} t={t} />
            <SimpleEmojiPicker visible={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} onSelect={(emoji: string) => { setMessage(prev => prev + emoji); }} isDark={isDark} />
            <Modal visible={activeMeetingConfig !== null} animationType="slide" presentationStyle="fullScreen">{activeMeetingConfig && <MeetingView config={activeMeetingConfig} onClose={() => setActiveMeetingConfig(null)} title={activeContext === 'group' ? currentGroup?.name : activeDirectConversation?.targetUser?.name} />}</Modal>
            <Modal visible={showActionSheet} transparent animationType="slide" onRequestClose={() => setShowActionSheet(false)}><TouchableOpacity style={styles.bottomSheetOverlay} onPress={() => setShowActionSheet(false)}><View style={[styles.bottomSheetContent, isDark && styles.darkBottomSheet]}><View style={styles.emojiRow}>{['👍','❤️','😂','😮','😢','🔥'].map(emoji => (<TouchableOpacity key={emoji} onPress={() => { if (selectedMessage) handleReaction(selectedMessage._id, emoji); setShowActionSheet(false); }}><Text style={{fontSize: 24}}>{emoji}</Text></TouchableOpacity>))}</View><View style={styles.actionGrid}><TouchableOpacity style={styles.actionBtn} onPress={() => { if(selectedMessage) setReplyingTo(selectedMessage); setShowActionSheet(false); }}><Reply size={20} color={iconColor} /><Text style={[styles.actionText, isDark && styles.darkText]}>Reply</Text></TouchableOpacity><TouchableOpacity style={styles.actionBtn} onPress={() => { if(selectedMessage) handleCopy(selectedMessage.content || ''); }}><Copy size={20} color={iconColor} /><Text style={[styles.actionText, isDark && styles.darkText]}>Copy</Text></TouchableOpacity><TouchableOpacity style={styles.actionBtn} onPress={() => { if(selectedMessage) handlePinMessage(selectedMessage._id, !selectedMessage.isPinned); }}><Pin size={20} color={iconColor} fill={selectedMessage?.isPinned ? iconColor : 'none'} /><Text style={[styles.actionText, isDark && styles.darkText]}>{selectedMessage?.isPinned ? 'Unpin' : 'Pin'}</Text></TouchableOpacity><TouchableOpacity style={styles.actionBtn} onPress={() => { if(selectedMessage) { setForwardingMessage(selectedMessage); setShowForwardModal(true); setShowActionSheet(false); }}}><Forward size={20} color={iconColor} /><Text style={[styles.actionText, isDark && styles.darkText]}>Forward</Text></TouchableOpacity>{selectedMessage?.senderId._id === user?._id && (<TouchableOpacity style={styles.actionBtn} onPress={() => { if (selectedMessage) { Alert.alert('Delete', 'Delete?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { const event = activeContext === 'group' ? 'chat:delete' : 'direct:delete'; socket?.emit(event, { messageId: selectedMessage._id }); setShowActionSheet(false); }}]); }}}><Trash2 size={20} color="#EF4444" /><Text style={[styles.actionText, {color: '#EF4444'}]}>Delete</Text></TouchableOpacity>)}</View></View></TouchableOpacity></Modal>
            <Modal visible={isSidebarOpen} transparent animationType="fade" onRequestClose={() => setIsSidebarOpen(false)}><TouchableOpacity style={styles.sidebarOverlay} onPress={() => setIsSidebarOpen(false)}><TouchableWithoutFeedback><View style={[styles.sidebar, isDark && styles.darkSidebar]}><View style={styles.sidebarHeader}><Text style={[styles.sidebarTitle, isDark && styles.darkText]}>{t('nav.chat' as any)}</Text><TouchableOpacity onPress={() => setShowNewChatModal(true)}><Edit2 size={20} color="#3B82F6" /></TouchableOpacity></View><View style={[styles.sidebarSearch, isDark && styles.darkInputBg]}><Search size={16} color="#9CA3AF" /><TextInput placeholder="Search..." placeholderTextColor="#9CA3AF" style={[styles.sidebarSearchInput, isDark && styles.darkText]} value={sidebarSearch} onChangeText={setSidebarSearch} /></View><TouchableOpacity style={[styles.sidebarItem, activeContext === 'group' && (isDark ? styles.darkSidebarActive : styles.sidebarItemActive)]} onPress={() => { setActiveContext('group'); setIsSidebarOpen(false); }}><View style={[styles.sidebarAvatar, {backgroundColor:'#10B981'}]}><MessageSquare size={18} color="#FFF"/></View><Text style={[styles.sidebarName, isDark && styles.darkText]}>{currentGroup?.name || 'Group Chat'}</Text></TouchableOpacity><Text style={styles.sidebarSection}>Direct Messages</Text><FlatList data={directConversations.filter(c => c.targetUser?.name.toLowerCase().includes(sidebarSearch.toLowerCase()))} keyExtractor={item => item._id} renderItem={({ item }) => ( <TouchableOpacity style={[styles.sidebarItem, activeContext === 'direct' && activeDirectConversation?._id === item._id && (isDark ? styles.darkSidebarActive : styles.sidebarItemActive)]} onPress={() => { setActiveContext('direct'); setActiveDirectConversation(item); setIsSidebarOpen(false); }}><Image source={{uri: item.targetUser?.avatar}} style={styles.sidebarAvatarImg} /><View><Text style={[styles.sidebarName, isDark && styles.darkText]}>{item.targetUser?.name}</Text><Text style={styles.sidebarSub} numberOfLines={1}>{item.lastMessagePreview || 'Start a chat'}</Text></View></TouchableOpacity> )} /></View></TouchableWithoutFeedback></TouchableOpacity></Modal>
            <Modal visible={showNewChatModal} transparent animationType="fade" onRequestClose={() => setShowNewChatModal(false)}><View style={styles.modalOverlay}><View style={[styles.modalContent, isDark && styles.darkModal]}><Text style={[styles.modalTitle, isDark && styles.darkText]}>New Direct Chat</Text><TextInput placeholder="Enter email address" placeholderTextColor="#9CA3AF" style={[styles.modalInput, isDark && styles.darkInput]} value={newChatEmail} onChangeText={setNewChatEmail} autoCapitalize="none" /><View style={{flexDirection:'row', justifyContent:'flex-end', gap: 10, marginTop: 15}}><TouchableOpacity onPress={() => setShowNewChatModal(false)}><Text style={{color:'#6B7280', padding: 10}}>Cancel</Text></TouchableOpacity><TouchableOpacity style={{backgroundColor:'#3B82F6', padding: 10, borderRadius: 8}} onPress={async () => { try { const res = await chatService.startDirectConversation({ email: newChatEmail }); setDirectConversations(prev => [res, ...prev]); setActiveContext('direct'); setActiveDirectConversation(res); setShowNewChatModal(false); setIsSidebarOpen(false); } catch (e: any) { Alert.alert('Error', e.message); } }}><Text style={{color:'#FFF'}}>Start Chat</Text></TouchableOpacity></View></View></View></Modal>
            <Modal visible={showForwardModal} transparent animationType="fade" onRequestClose={() => setShowForwardModal(false)}><View style={styles.modalOverlay}><View style={[styles.modalContent, isDark && styles.darkModal]}><Text style={[styles.modalTitle, isDark && styles.darkText]}>Forward to...</Text><FlatList data={directConversations} keyExtractor={item => item._id} renderItem={({item}) => ( <TouchableOpacity style={styles.sidebarItem} onPress={() => handleForwardMessage(item._id, 'direct')}><Image source={{uri: item.targetUser?.avatar}} style={styles.sidebarAvatarImg} /><Text style={[styles.sidebarName, isDark && styles.darkText]}>{item.targetUser?.name}</Text></TouchableOpacity> )} /><TouchableOpacity onPress={() => setShowForwardModal(false)} style={styles.modalCloseBtn}><Text style={{color:'#6B7280'}}>Cancel</Text></TouchableOpacity></View></View></Modal>
            {lightboxImage && (<Modal visible={!!lightboxImage} transparent={true} animationType="fade"><View style={styles.lightboxContainer}><TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxImage(null)}><X size={24} color="#FFF" /></TouchableOpacity><Image source={{uri: lightboxImage}} style={styles.lightboxImg} resizeMode="contain" /></View></Modal>)}
            {incomingCall && <IncomingCallNotification meetingId={incomingCall.meetingId} type={incomingCall.type} callerName={incomingCall.callerName} groupName={incomingCall.groupName} onAccept={() => { const config: MeetingConfig = { meetingId: incomingCall.meetingId, type: incomingCall.type, groupId: incomingCall.groupId, conversationId: incomingCall.conversationId }; setIncomingCall(null); setActiveMeetingConfig(config); }} onDecline={() => setIncomingCall(null)} />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    darkContainer: { backgroundColor: '#111827' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FFF' },
    darkHeader: { backgroundColor: '#1F2937', borderColor: '#374151' },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    headerSub: { fontSize: 12, color: '#6B7280' },
    iconBtn: { padding: 8 },
    list: { flex: 1, backgroundColor: '#F9FAFB' },
    darkList: { backgroundColor: '#000' },
    msgRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end', maxWidth: '85%' },
    rowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    rowOther: { alignSelf: 'flex-start' },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarTxtSmall: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    bubble: { padding: 12, borderRadius: 16, minWidth: 100 },
    bubbleOwn: { backgroundColor: '#3B82F6', borderBottomRightRadius: 2 },
    bubbleOther: { backgroundColor: '#FFF', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#E5E7EB' },
    bubbleOtherDark: { backgroundColor: '#1F2937', borderColor: '#374151' },
    senderName: { fontSize: 11, color: '#6B7280', marginBottom: 2, marginLeft: 4 },
    msgText: { fontSize: 15, lineHeight: 22 },
    textOwn: { color: '#FFF' },
    textOther: { color: '#1F2937' },
    darkText: { color: '#F9FAFB' },
    darkSubText: { color: '#9CA3AF' },
    timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
    footer: { borderTopWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', padding: 10 },
    darkFooter: { backgroundColor: '#1F2937', borderColor: '#374151' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: { flex: 1, maxHeight: 100, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 15, color: '#000' },
    darkInput: { backgroundColor: '#374151', color: '#FFF' },
    sendBtn: { padding: 10, backgroundColor: '#3B82F6', borderRadius: 20 },
    attachBtn: { padding: 8 },
    previewBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, marginBottom: 8 },
    darkPreviewBar: { backgroundColor: '#374151' },
    previewContent: { flex: 1, marginLeft: 8 },
    previewTitle: { fontSize: 12, fontWeight: 'bold', color: '#3B82F6', marginBottom: 2 },
    previewText: { fontSize: 12, color: '#4B5563' },
    typingContainer: { paddingHorizontal: 12, marginBottom: 4 },
    typingText: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
    callMessageContainer: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginVertical: 8, alignItems: 'center', alignSelf: 'center', width: '80%', borderWidth: 1, borderColor: '#DBEAFE' },
    darkCallContainer: { backgroundColor: '#1E3A8A', borderColor: '#1E40AF' },
    callIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    callIconActive: { backgroundColor: '#10B981' },
    callIconActiveBorder: { borderColor: '#10B981' },
    darkCallActive: { borderColor: '#059669' },
    callTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
    callSubtitle: { fontSize: 12, color: '#6B7280' },
    joinButton: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginLeft: 8 },
    joinButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
    sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
    sidebar: { width: SIDEBAR_WIDTH, backgroundColor: '#FFF', height: '100%', padding: 20, paddingTop: 50 },
    darkSidebar: { backgroundColor: '#111827' },
    sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sidebarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    sidebarSearch: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
    darkInputBg: { backgroundColor: '#374151' },
    sidebarSearchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#000' },
    sidebarSection: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 2 },
    sidebarItemActive: { backgroundColor: '#EFF6FF' },
    darkSidebarActive: { backgroundColor: '#1E3A8A' },
    sidebarAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    sidebarAvatarImg: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#E5E7EB' },
    sidebarName: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
    sidebarSub: { fontSize: 12, color: '#6B7280' },
    attachmentThumb: { marginTop: 5 },
    imageThumb: { width: 200, height: 150, borderRadius: 8, backgroundColor: '#E5E7EB' },
    fileThumb: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8, width: 200 },
    darkFileThumb: { backgroundColor: '#374151' },
    fileName: { marginLeft: 8, flex: 1, fontSize: 13, color: '#374151' },
    reactionsRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
    reactionBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#FFF' },
    darkReactionBadge: { backgroundColor: '#374151', borderColor: '#4B5563' },
    reactionText: { fontSize: 10, color: '#000' },
    bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    darkBottomSheet: { backgroundColor: '#1F2937' },
    emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10 },
    actionGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    actionBtn: { alignItems: 'center', gap: 5 },
    actionText: { fontSize: 12, color: '#374151' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
    darkModal: { backgroundColor: '#1F2937' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, color: '#000' },
    modalCloseBtn: { alignSelf: 'center', marginTop: 15 },
    lightboxContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    lightboxImg: { width: width, height: height * 0.8 },
    lightboxClose: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    pinnedItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    // VOICE PLAYER STYLES
    voiceContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, minWidth: 160, gap: 12 },
    voiceBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    voiceProgress: { flex: 1, gap: 4 },
    voiceTrack: { height: 4, borderRadius: 2, justifyContent: 'center' },
    voiceThumb: { height: 4, borderRadius: 2 },
    voiceTime: { fontSize: 10, fontWeight: '500' },
    // REPLY STYLES
    replyContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
    darkReplyContainer: { backgroundColor: 'rgba(255,255,255,0.1)' },
    replyBar: { width: 3, borderRadius: 2, marginRight: 8 },
    replySender: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
    replyText: { fontSize: 12 }
});