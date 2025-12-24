import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  MediaStreamTrack, // Import cái này để định nghĩa kiểu cho track
  // @ts-ignore
} from 'react-native-webrtc';

// --- INTERFACES ---

export interface MeetingParticipant {
  userId: string;
  socketId: string;
  name?: string;
  avatar?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

export interface MeetingConfig {
  meetingId: string;
  type: 'group' | 'direct';
  groupId?: string;
  conversationId?: string;
}

export interface PeerConnection {
  peerConnection: RTCPeerConnection;
  userId: string;
  socketId: string;
  stream?: MediaStream;
}

export interface MediaDeviceState {
  hasAudio: boolean;
  hasVideo: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isFrontCamera?: boolean;
}

export interface StoredMeetingState {
  config: MeetingConfig;
  title?: string;
  timestamp: number;
}

const MEETING_STORAGE_KEY = 'activeMeeting';

class MeetingService {
  // ✅ SỬA QUAN TRỌNG: Dùng 'any' để tránh mọi lỗi TypeScript với Socket.io
  private socket: any = null;
  
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, PeerConnection> = new Map();
  private meetingConfig: MeetingConfig | null = null;
  private participants: Map<string, MeetingParticipant> = new Map();
  
  private onParticipantUpdateCallbacks: Set<(participants: MeetingParticipant[]) => void> = new Set();
  private onStreamUpdateCallbacks: Set<(userId: string, stream: MediaStream | null) => void> = new Set();
  private onMediaDeviceUpdateCallbacks: Set<(state: MediaDeviceState) => void> = new Set();

  private mediaDeviceState: MediaDeviceState = {
    hasAudio: false,
    hasVideo: false,
    audioEnabled: false,
    videoEnabled: false,
    isFrontCamera: true
  };
  
  private meetingTitle: string = '';
  private pendingIceCandidates: Map<string, RTCIceCandidate[]> = new Map();
  private currentUserId: string = '';

  // ✅ SỬA: Tham số đầu vào là 'any'
  setSocket(socket: any) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  private getCurrentUserId(): string {
    return this.currentUserId;
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.off('meeting:user-joined');
    this.socket.off('meeting:user-left');
    this.socket.off('meeting:offer');
    this.socket.off('meeting:answer');
    this.socket.off('meeting:ice-candidate');
    this.socket.off('meeting:media-state');

    this.socket.on('meeting:user-joined', (data: any) => {
      console.log('[MeetingMobile] User joined:', data);
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        this.participants.set(data.userId, {
          userId: data.userId,
          socketId: data.socketId,
          name: data.userName,
          avatar: data.userAvatar,
          audioEnabled: true,
          videoEnabled: true
        });
        this.notifyParticipantUpdate();
        this.createPeerConnection(data.userId, data.socketId);
      }
    });

    this.socket.on('meeting:user-left', (data: any) => {
      console.log('[MeetingMobile] User left:', data);
      this.removePeerConnection(data.userId, data.socketId);
      this.participants.delete(data.userId);
      this.notifyParticipantUpdate();
    });

    this.socket.on('meeting:offer', async (data: any) => {
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        await this.handleOffer(data.fromUserId, data.fromSocketId, data.offer);
      }
    });

    this.socket.on('meeting:answer', async (data: any) => {
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        await this.handleAnswer(data.fromUserId, data.fromSocketId, data.answer);
      }
    });

    this.socket.on('meeting:ice-candidate', async (data: any) => {
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        await this.handleIceCandidate(data.fromUserId, data.fromSocketId, data.candidate);
      }
    });

    this.socket.on('meeting:media-state', (data: any) => {
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        const participant = this.participants.get(data.userId);
        if (participant) {
          if (data.mediaType === 'audio') participant.audioEnabled = data.enabled;
          else participant.videoEnabled = data.enabled;
          
          this.participants.set(data.userId, participant);
          this.notifyParticipantUpdate();
        }
      }
    });
  }

  async startMeeting(config: MeetingConfig, options: { audio?: boolean; video?: boolean; title?: string } = {}) {
    if (!this.socket) throw new Error('Socket not connected');

    this.meetingConfig = config;
    this.meetingTitle = options.title || '';

    this.cleanupMeetingState();

    const wantAudio = options.audio !== false;
    const wantVideo = options.video !== false;

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: wantAudio,
        video: wantVideo ? {
          facingMode: 'user',
        } : false
      });

      this.localStream = stream as MediaStream;
      
      this.mediaDeviceState = {
        hasAudio: wantAudio,
        hasVideo: wantVideo,
        audioEnabled: wantAudio,
        videoEnabled: wantVideo,
        isFrontCamera: true
      };
      
      this.notifyMediaDeviceUpdate();
      console.log('[MeetingMobile] Local stream acquired');

    } catch (error) {
      console.error('[MeetingMobile] Error getting user media:', error);
      if (wantVideo && wantAudio) {
         try {
           const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
           this.localStream = stream as MediaStream;
           this.mediaDeviceState = { hasAudio: true, hasVideo: false, audioEnabled: true, videoEnabled: false, isFrontCamera: true };
           this.notifyMediaDeviceUpdate();
         } catch (e) {
           this.meetingConfig = null;
           throw new Error('Could not access Camera or Microphone');
         }
      } else {
        this.meetingConfig = null;
        throw error;
      }
    }

    await this.saveMeetingToStorage();

    return new Promise<{ success: boolean; participants: MeetingParticipant[]; mediaState: MediaDeviceState }>((resolve, reject) => {
      this.socket?.emit('meeting:join', config, (response: any) => {
        if (response.success) {
          if (response.participants) {
            response.participants.forEach((p: any) => {
              if (p.userId !== this.getCurrentUserId()) {
                this.participants.set(p.userId, {
                  userId: p.userId,
                  socketId: p.socketId,
                  name: p.userName,
                  avatar: p.userAvatar,
                  audioEnabled: true,
                  videoEnabled: true
                });
                this.createPeerConnection(p.userId, p.socketId);
              }
            });
            this.notifyParticipantUpdate();
          }

          resolve({
            success: true,
            participants: Array.from(this.participants.values()),
            mediaState: { ...this.mediaDeviceState }
          });
        } else {
          this.clearMeetingFromStorage();
          reject(new Error(response.error || 'Failed to join meeting'));
        }
      });
    });
  }

  async leaveMeeting() {
    if (!this.socket || !this.meetingConfig) return;

    const config = this.meetingConfig;

    await this.clearMeetingFromStorage();
    this.cleanupMeetingState();

    return new Promise<void>((resolve) => {
      this.socket?.emit('meeting:leave', config, () => {
        resolve();
      });
    });
  }

  private async createPeerConnection(userId: string, socketId: string) {
    if (this.peerConnections.has(userId)) return;

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    if (this.localStream) {
      // ✅ SỬA: Định nghĩa rõ kiểu track là MediaStreamTrack
      this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
        // @ts-ignore
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // ✅ SỬA: Ép kiểu (as any) để tránh lỗi thiếu definition
    (peerConnection as any).ontrack = (event: any) => {
       const stream = event.streams && event.streams[0];
       if (stream) {
         console.log('[MeetingMobile] Received remote stream from:', userId);
         const pc = this.peerConnections.get(userId);
         if (pc) {
           pc.stream = stream;
           this.notifyStreamUpdate(userId, stream);
         }
       }
    };

    (peerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate && this.socket && this.meetingConfig) {
        this.socket.emit('meeting:ice-candidate', {
          ...this.meetingConfig,
          candidate: event.candidate,
          targetSocketId: socketId
        });
      }
    };

    this.peerConnections.set(userId, { peerConnection, userId, socketId });

    await this.createOffer(userId, socketId);
  }

  private async createPeerConnectionForAnswer(userId: string, socketId: string) {
    if (this.peerConnections.has(userId)) return;

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    if (this.localStream) {
      // ✅ SỬA
      this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
        // @ts-ignore
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // ✅ SỬA
    (peerConnection as any).ontrack = (event: any) => {
       const stream = event.streams && event.streams[0];
       if (stream) {
         const pc = this.peerConnections.get(userId);
         if (pc) {
           pc.stream = stream;
           this.notifyStreamUpdate(userId, stream);
         }
       }
    };

    (peerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate && this.socket && this.meetingConfig) {
        this.socket.emit('meeting:ice-candidate', {
          ...this.meetingConfig,
          candidate: event.candidate,
          targetSocketId: socketId
        });
      }
    };

    this.peerConnections.set(userId, { peerConnection, userId, socketId });
  }

  private async createOffer(userId: string, socketId: string) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return;

    try {
      const offer = await pc.peerConnection.createOffer({});
      await pc.peerConnection.setLocalDescription(offer);

      this.socket?.emit('meeting:offer', {
        ...this.meetingConfig,
        offer,
        targetSocketId: socketId
      });
    } catch (error) {
      console.error('[MeetingMobile] Error creating offer:', error);
    }
  }

  private async handleOffer(fromUserId: string, fromSocketId: string, offer: any) {
    let pc = this.peerConnections.get(fromUserId);
    
    if (!pc) {
      await this.createPeerConnectionForAnswer(fromUserId, fromSocketId);
      pc = this.peerConnections.get(fromUserId);
    }

    if (!pc) return;

    try {
      await pc.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await this.processPendingIceCandidates(fromUserId);

      const answer = await pc.peerConnection.createAnswer();
      await pc.peerConnection.setLocalDescription(answer);

      this.socket?.emit('meeting:answer', {
        ...this.meetingConfig,
        answer,
        targetSocketId: fromSocketId
      });
    } catch (error) {
      console.error('[MeetingMobile] Error handling offer:', error);
    }
  }

  private async handleAnswer(fromUserId: string, fromSocketId: string, answer: any) {
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) return;

    try {
      await pc.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processPendingIceCandidates(fromUserId);
    } catch (error) {
      console.error('[MeetingMobile] Error handling answer:', error);
    }
  }

  private async handleIceCandidate(fromUserId: string, fromSocketId: string, candidate: any) {
    const pc = this.peerConnections.get(fromUserId);
    if (!pc || !pc.peerConnection.remoteDescription) {
      if (!this.pendingIceCandidates.has(fromUserId)) {
        this.pendingIceCandidates.set(fromUserId, []);
      }
      this.pendingIceCandidates.get(fromUserId)!.push(candidate);
      return;
    }

    try {
      await pc.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[MeetingMobile] Error adding ICE candidate:', error);
    }
  }

  private async processPendingIceCandidates(userId: string) {
    const pending = this.pendingIceCandidates.get(userId);
    if (!pending || pending.length === 0) return;

    const pc = this.peerConnections.get(userId);
    if (!pc || !pc.peerConnection.remoteDescription) return;

    for (const candidate of pending) {
      try {
        await pc.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {}
    }
    this.pendingIceCandidates.delete(userId);
  }

  private cleanupMeetingState() {
    if (this.localStream) {
      // ✅ SỬA
      this.localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      this.localStream.release(); 
      this.localStream = null;
    }

    this.peerConnections.forEach((pc) => {
      pc.peerConnection.close();
    });
    this.peerConnections.clear();
    this.participants.clear();
    this.pendingIceCandidates.clear();
    
    this.mediaDeviceState = {
      hasAudio: false,
      hasVideo: false,
      audioEnabled: false,
      videoEnabled: false,
      isFrontCamera: true
    };
    this.notifyMediaDeviceUpdate();
  }

  private removePeerConnection(userId: string, socketId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.peerConnection.close();
      this.peerConnections.delete(userId);
      this.notifyStreamUpdate(userId, null);
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      // ✅ SỬA
      this.localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
        track.enabled = enabled;
      });
      this.mediaDeviceState.audioEnabled = enabled;
      this.notifyMediaDeviceUpdate();
    }

    if (this.socket && this.meetingConfig) {
      this.socket.emit('meeting:toggle-media', {
        ...this.meetingConfig,
        mediaType: 'audio',
        enabled
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      // ✅ SỬA
      this.localStream.getVideoTracks().forEach((track: MediaStreamTrack) => {
        track.enabled = enabled;
      });
      this.mediaDeviceState.videoEnabled = enabled;
      this.notifyMediaDeviceUpdate();
    }

    if (this.socket && this.meetingConfig) {
      this.socket.emit('meeting:toggle-media', {
        ...this.meetingConfig,
        mediaType: 'video',
        enabled
      });
    }
  }

  switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // @ts-ignore
        videoTrack._switchCamera(); 
        
        this.mediaDeviceState.isFrontCamera = !this.mediaDeviceState.isFrontCamera;
        this.notifyMediaDeviceUpdate();
      }
    }
  }

  private async saveMeetingToStorage() {
    if (!this.meetingConfig) return;
    try {
      const state: StoredMeetingState = {
        config: this.meetingConfig,
        title: this.meetingTitle,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(MEETING_STORAGE_KEY, JSON.stringify(state));
    } catch (e) { console.error(e); }
  }

  private async clearMeetingFromStorage() {
    try {
      await AsyncStorage.removeItem(MEETING_STORAGE_KEY);
    } catch (e) { console.error(e); }
  }

  async getStoredMeeting(): Promise<StoredMeetingState | null> {
    try {
      const stored = await AsyncStorage.getItem(MEETING_STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as StoredMeetingState;
      const MAX_AGE_MS = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > MAX_AGE_MS) {
        await this.clearMeetingFromStorage();
        return null;
      }
      return state;
    } catch (e) { return null; }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(userId: string): MediaStream | null {
    return this.peerConnections.get(userId)?.stream || null;
  }

  getParticipants(): MeetingParticipant[] {
    return Array.from(this.participants.values());
  }

  getMediaDeviceState(): MediaDeviceState {
    return { ...this.mediaDeviceState };
  }
  
  onParticipantUpdate(callback: (participants: MeetingParticipant[]) => void) {
    this.onParticipantUpdateCallbacks.add(callback);
    return () => { this.onParticipantUpdateCallbacks.delete(callback); };
  }

  onStreamUpdate(callback: (userId: string, stream: MediaStream | null) => void) {
    this.onStreamUpdateCallbacks.add(callback);
    return () => { this.onStreamUpdateCallbacks.delete(callback); };
  }

  onMediaDeviceUpdate(callback: (state: MediaDeviceState) => void) {
    this.onMediaDeviceUpdateCallbacks.add(callback);
    return () => { this.onMediaDeviceUpdateCallbacks.delete(callback); };
  }

  private notifyParticipantUpdate() {
    const participants = Array.from(this.participants.values());
    this.onParticipantUpdateCallbacks.forEach(cb => cb(participants));
  }

  private notifyStreamUpdate(userId: string, stream: MediaStream | null) {
    this.onStreamUpdateCallbacks.forEach(cb => cb(userId, stream));
  }

  private notifyMediaDeviceUpdate() {
    this.onMediaDeviceUpdateCallbacks.forEach(cb => cb({ ...this.mediaDeviceState }));
  }
}

export const meetingService = new MeetingService();