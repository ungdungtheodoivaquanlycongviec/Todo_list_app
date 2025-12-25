import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, Image, ViewStyle, DimensionValue, Alert } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users, Maximize2, Minimize2, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { meetingService, MeetingParticipant, MeetingConfig } from '../services/meeting.service';
import { chatService } from '../services/chat.service'; 
import { useSocket, setSocketCallState } from '../hooks/useSocket';

interface MeetingViewProps { config: MeetingConfig; onClose: () => void; title?: string; }

const getVideoStyle = (index: number, total: number): ViewStyle => {
  let widthPercent: DimensionValue = '100%'; let heightPercent: DimensionValue = '100%';
  if (total === 2) { heightPercent = '50%'; }
  else if (total > 2 && total <= 4) { widthPercent = '50%'; heightPercent = '50%'; }
  else if (total > 4) { widthPercent = '33.33%'; heightPercent = '33.33%'; }
  return { width: widthPercent, height: heightPercent };
};

export default function MeetingView({ config, onClose, title }: MeetingViewProps) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const isMountedRef = useRef(true);

  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  useEffect(() => {
    isMountedRef.current = true;
    if (!socket || !isConnected) return;
    setSocketCallState(true);

    const initMeeting = async () => {
      try {
        if(isMountedRef.current) setIsConnecting(true);
        meetingService.setSocket(socket);
        if (user?._id) meetingService.setCurrentUserId(user._id);

        const unsubParticipants = meetingService.onParticipantUpdate((updated) => {
          if (isMountedRef.current) setParticipants(updated);
        });
        const unsubStreams = meetingService.onStreamUpdate((userId, stream) => {
          if (!isMountedRef.current) return;
          setRemoteStreams(prev => {
            const next = new Map(prev);
            if (stream) next.set(userId, stream); else next.delete(userId);
            return next;
          });
        });

        const result = await meetingService.startMeeting(config, { audio: true, video: true, title });

        if (isMountedRef.current && result) {
          if (result.mediaState) {
            setAudioEnabled(result.mediaState.audioEnabled);
            setVideoEnabled(result.mediaState.videoEnabled);
          }
          setParticipants(result.participants || []);
          const myStream = meetingService.getLocalStream();
          if(myStream) setLocalStream(myStream);
          setIsConnecting(false);

          if (!result.participants || result.participants.length === 0) {
             const inviteText = `📹 Đã bắt đầu cuộc gọi video.\nNhấn để tham gia.`;
             try {
                if (config.groupId) {
                   if ('sendGroupMessage' in chatService) {
                       // @ts-ignore
                       await chatService.sendGroupMessage(config.groupId, { content: inviteText });
                   } else if ('sendMessage' in chatService) {
                       // @ts-ignore
                       await chatService.sendMessage(config.groupId, { content: inviteText });
                   }
                } else if (config.conversationId) {
                   // @ts-ignore
                   await chatService.sendDirectMessage(config.conversationId!, { content: inviteText });
                }
             } catch (err) {}
          }
        }
        return () => { unsubParticipants(); unsubStreams(); };
      } catch (error: any) {
        Alert.alert('Lỗi', error.message);
        if(isMountedRef.current) { setSocketCallState(false); onClose(); }
      }
    };
    initMeeting();
    return () => { isMountedRef.current = false; };
  }, [socket, isConnected, config]); 

  // ✅ FIX CRASH: Chia nhỏ các pha dọn dẹp
  const handleLeave = () => {
    if (isLeaving) return;
    setIsLeaving(true);

    console.log('[MeetingView] Phase 1: Mute UI');
    // Bước 1: Vô hiệu hóa stream trên UI (khiến RTCView ngừng vẽ)
    setVideoEnabled(false);
    setAudioEnabled(false);

    // Bước 2: Đợi 1 nhịp React (50ms) rồi đóng giao diện
    setTimeout(() => {
      console.log('[MeetingView] Phase 2: Close UI');
      onClose();

      // Bước 3: Đợi giao diện đóng hẳn (500ms) rồi mới ngắt logic nền
      setTimeout(async () => {
        console.log('[MeetingView] Phase 3: Kill Service');
        await meetingService.leaveMeeting();
        setSocketCallState(false); // Trả quyền ngắt socket sau cùng
      }, 500);
    }, 50);
  };

  const toggleAudio = () => {
    const newState = !audioEnabled; setAudioEnabled(newState); meetingService.toggleAudio(newState);
  };
  const toggleVideo = () => {
    const newState = !videoEnabled; setVideoEnabled(newState); meetingService.toggleVideo(newState);
  };

  const renderVideoItem = (userId: string, stream: MediaStream | null, isLocal: boolean, p?: MeetingParticipant) => {
    const hasVideo = isLocal ? videoEnabled : (p?.videoEnabled && stream && stream.getVideoTracks().length > 0);
    const zOrder = isLocal ? 1 : 0; 
    return (
      <View style={styles.videoWrapper}>
        {hasVideo && stream ? (
          <RTCView streamURL={stream.toURL()} objectFit="cover" style={styles.fullVideo} mirror={isLocal} zOrder={zOrder} />
        ) : (
          <View style={styles.avatarBox}>
             {p?.avatar ? <Image source={{uri: p.avatar}} style={styles.avatarImg} /> : 
             <View style={styles.avatarPlaceholder}><Text style={styles.avatarTxt}>{p?.name?.charAt(0) || 'U'}</Text></View>}
             <Text style={styles.nameTxt}>{isLocal ? 'Bạn' : (p?.name || 'User')}</Text>
          </View>
        )}
        <View style={styles.statusRow}>
           <Text style={styles.statusText} numberOfLines={1}>{isLocal ? 'Bạn' : p?.name}</Text>
           {((isLocal && !audioEnabled) || (!isLocal && !p?.audioEnabled)) && (<MicOff size={14} color="#EF4444" style={{marginLeft: 5}} />)}
        </View>
      </View>
    );
  };

  if (isConnecting || !socket) return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /><Text style={styles.loadingText}>Đang kết nối...</Text></View>);

  if (isMinimized) return (
        <View style={styles.miniContainer}>
           <TouchableOpacity onPress={() => setIsMinimized(false)} style={{flex:1}}>
              <Text style={styles.miniTitle}>Đang gọi...</Text>
              <Text style={styles.miniSub}>{participants.length + 1} người tham gia</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={handleLeave} style={styles.miniHangup}><X size={20} color="#FFF" /></TouchableOpacity>
        </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={styles.header}>
         <View><Text style={styles.headerTitle}>{title || 'Cuộc gọi Video'}</Text><View style={{flexDirection:'row', alignItems:'center'}}><Users size={12} color="#9CA3AF" /><Text style={styles.headerSub}> {participants.length + 1} thành viên</Text></View></View>
         <TouchableOpacity onPress={() => setIsMinimized(true)} style={styles.iconBtn}><Minimize2 size={24} color="#FFF" /></TouchableOpacity>
      </View>
      <View style={styles.grid}>
         {participants.map((p, index) => (<View key={p.userId} style={[styles.gridItem, getVideoStyle(index + 1, participants.length + 1)]}>{renderVideoItem(p.userId, remoteStreams.get(p.userId) || null, false, p)}</View>))}
         <View style={[styles.gridItem, getVideoStyle(0, participants.length + 1)]}>{renderVideoItem('local', localStream, true, { userId: 'local', socketId: '', name: 'Bạn', videoEnabled, audioEnabled, avatar: user?.avatar || undefined })}</View>
      </View>
      <View style={styles.controls}>
         <TouchableOpacity onPress={toggleAudio} style={[styles.btn, !audioEnabled && styles.btnOff]}>{audioEnabled ? <Mic size={24} color="#FFF"/> : <MicOff size={24} color="#FFF"/>}</TouchableOpacity>
         <TouchableOpacity onPress={toggleVideo} style={[styles.btn, !videoEnabled && styles.btnOff]}>{videoEnabled ? <VideoIcon size={24} color="#FFF"/> : <VideoOff size={24} color="#FFF"/>}</TouchableOpacity>
         <TouchableOpacity onPress={handleLeave} disabled={isLeaving} style={[styles.btn, styles.btnHangup]}>{isLeaving ? <ActivityIndicator color="#FFF" /> : <PhoneOff size={28} color="#FFF" />}</TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loadingContainer: { flex: 1, backgroundColor: '#111827', justifyContent:'center', alignItems:'center' },
  loadingText: { color: 'white', marginTop: 10, fontSize: 16 },
  header: { position:'absolute', top:0, left:0, right:0, padding:15, zIndex:100, flexDirection:'row', justifyContent:'space-between', backgroundColor:'rgba(0,0,0,0.3)' },
  headerTitle: { color:'white', fontWeight:'bold', fontSize:16 },
  headerSub: { color:'#9CA3AF', fontSize:12, marginLeft: 5 },
  iconBtn: { padding: 5 },
  grid: { flex:1, flexDirection:'row', flexWrap:'wrap', justifyContent:'center', alignItems:'center', marginTop: 60, marginBottom: 100 },
  gridItem: { padding: 2 },
  videoWrapper: { flex:1, backgroundColor:'#1F2937', borderRadius:8, overflow:'hidden', position:'relative', borderWidth: 1, borderColor: '#374151' },
  fullVideo: { flex:1, backgroundColor:'black' },
  avatarBox: { flex:1, justifyContent:'center', alignItems:'center' },
  avatarImg: { width:80, height:80, borderRadius:40 },
  avatarPlaceholder: { width:80, height:80, borderRadius:40, backgroundColor:'#4B5563', justifyContent:'center', alignItems:'center' },
  avatarTxt: { fontSize:30, color:'white', fontWeight:'bold' },
  nameTxt: { color:'white', marginTop:10 },
  statusRow: { position:'absolute', bottom:5, left:5, flexDirection:'row', alignItems:'center', backgroundColor:'rgba(0,0,0,0.6)', paddingHorizontal:6, paddingVertical:2, borderRadius:4 },
  statusText: { color:'#FFF', fontSize:12, maxWidth: 100 },
  controls: { position:'absolute', bottom:30, left:0, right:0, flexDirection:'row', justifyContent:'center', gap:24, zIndex: 100 },
  btn: { width:60, height:60, borderRadius:30, backgroundColor:'rgba(255,255,255,0.2)', justifyContent:'center', alignItems:'center' },
  btnOff: { backgroundColor:'#374151' },
  btnHangup: { backgroundColor:'#EF4444' },
  miniContainer: { position:'absolute', bottom:100, right:20, width:200, backgroundColor:'#1F2937', borderRadius:12, flexDirection:'row', alignItems:'center', padding:12, elevation:5, shadowColor:'#000', shadowOpacity:0.3, zIndex: 200, borderWidth: 1, borderColor: '#374151' },
  miniTitle: { color:'white', fontWeight:'bold', fontSize:14 },
  miniSub: { color:'#9CA3AF', fontSize:11 },
  miniHangup: { backgroundColor:'#EF4444', padding:8, borderRadius:20, marginLeft: 10 }
});