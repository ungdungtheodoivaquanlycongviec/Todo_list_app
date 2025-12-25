import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

type ClientSocket = ReturnType<typeof io>;

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
}

const MEETING_STORAGE_KEY = 'activeMeeting';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class MeetingService {
  private socket: ClientSocket | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, PeerConnection> = new Map();
  private meetingConfig: MeetingConfig | null = null;
  private participants: Map<string, MeetingParticipant> = new Map();
  
  private onParticipantUpdateCallbacks: Set<(participants: MeetingParticipant[]) => void> = new Set();
  private onStreamUpdateCallbacks: Set<(userId: string, stream: MediaStream | null) => void> = new Set();
  
  private mediaDeviceState: MediaDeviceState = {
    hasAudio: false, hasVideo: false, audioEnabled: false, videoEnabled: false
  };
  private meetingTitle: string = '';
  private pendingIceCandidates: Map<string, any[]> = new Map();
  private currentUserId: string = '';

  setSocket(socket: ClientSocket) {
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
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        this.participants.set(data.userId, {
          userId: data.userId, socketId: data.socketId,
          name: data.userName, avatar: data.userAvatar,
          audioEnabled: true, videoEnabled: true
        });
        this.notifyParticipantUpdate();
        this.createPeerConnection(data.userId, data.socketId);
      }
    });

    this.socket.on('meeting:user-left', (data: any) => {
      this.removePeerConnection(data.userId);
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
        const candidate = new RTCIceCandidate(data.candidate);
        await this.handleIceCandidate(data.fromUserId, candidate);
      }
    });

    this.socket.on('meeting:media-state', (data: any) => {
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        const p = this.participants.get(data.userId);
        if (p) {
          if (data.mediaType === 'audio') p.audioEnabled = data.enabled;
          else p.videoEnabled = data.enabled;
          this.participants.set(data.userId, p);
          this.notifyParticipantUpdate();
        }
      }
    });
  }

  async startMeeting(config: MeetingConfig, options: { audio?: boolean; video?: boolean; title?: string } = {}) {
    if (!this.socket) throw new Error('Socket not connected');
    this.meetingConfig = config;
    this.meetingTitle = options.title || '';

    this.peerConnections.forEach(pc => { try { pc.peerConnection.close(); } catch(e){} });
    this.peerConnections.clear();
    this.participants.clear();
    this.pendingIceCandidates.clear();

    const wantAudio = options.audio !== false;
    const wantVideo = options.video !== false;

    try {
      // @ts-ignore
      this.localStream = await mediaDevices.getUserMedia({
        audio: wantAudio,
        video: wantVideo ? { width: 640, height: 480, frameRate: 30, facingMode: 'user' } : false
      });
      this.mediaDeviceState = { hasAudio: wantAudio, hasVideo: wantVideo, audioEnabled: wantAudio, videoEnabled: wantVideo };
    } catch (error) {
      console.warn('Media Error, fallback audio');
      try {
        // @ts-ignore
        this.localStream = await mediaDevices.getUserMedia({ audio: true, video: false });
        this.mediaDeviceState = { hasAudio: true, hasVideo: false, audioEnabled: true, videoEnabled: false };
      } catch (e) { console.error('No media devices'); }
    }

    return new Promise<{ success: boolean; participants: MeetingParticipant[]; mediaState: MediaDeviceState }>((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket disconnected'));
      this.socket.emit('meeting:join', config, (response: any) => {
        if (response.success) {
          if (response.participants) {
            response.participants.forEach((p: any) => {
              if (p.userId !== this.getCurrentUserId()) {
                this.participants.set(p.userId, {
                  userId: p.userId, socketId: p.socketId, name: p.userName, avatar: p.userAvatar,
                  audioEnabled: true, videoEnabled: true
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
          reject(new Error(response.error || 'Failed to join'));
        }
      });
    });
  }

  // ✅ FIX CRASH & GHOST: Trình tự giải phóng an toàn
  async leaveMeeting() {
    console.log('[MeetingService] Soft leaving...');
    
    // 1. Gửi tin nhắn rời phòng NGAY LẬP TỨC để Server xóa User (Fix Ghost)
    if (this.socket && this.meetingConfig) {
      this.socket.emit('meeting:leave', this.meetingConfig);
    }

    // 2. Ngắt kết nối P2P
    this.peerConnections.forEach((pc) => {
      try { pc.peerConnection.close(); } catch (e) {}
    });
    this.peerConnections.clear();
    this.pendingIceCandidates.clear();

    // 3. Chỉ dừng Tracks, KHÔNG gọi release ngay (Fix Crash)
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try { track.enabled = false; track.stop(); } catch(e){}
      });
    }

    // 4. Thực sự giải phóng tài nguyên sau 2 giây (Khi UI đã đóng hẳn)
    const streamToKill = this.localStream;
    setTimeout(() => {
       if (streamToKill) {
          // @ts-ignore
          try { streamToKill.release(); } catch(e){}
       }
    }, 2000);

    this.localStream = null;
    this.meetingConfig = null;
    this.participants.clear();
    this.notifyParticipantUpdate();
  }

  private cleanupLocalStream() {
    // Để trống vì đã xử lý trì hoãn trong leaveMeeting
  }

  private async createPeerConnection(userId: string, socketId: string) {
    if (this.peerConnections.has(userId)) return;
    const pc = new RTCPeerConnection(RTC_CONFIG);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    }

    (pc as any).onaddstream = (event: any) => {
      if (event.stream) {
        const pcData = this.peerConnections.get(userId);
        if (pcData) {
          pcData.stream = event.stream;
          this.notifyStreamUpdate(userId, event.stream);
        }
      }
    };

    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate && this.socket && this.meetingConfig) {
        this.socket.emit('meeting:ice-candidate', {
          ...this.meetingConfig, candidate: event.candidate,
          targetSocketId: socketId, fromUserId: this.currentUserId, fromSocketId: this.socket.id
        });
      }
    };

    this.peerConnections.set(userId, { peerConnection: pc, userId, socketId });
    await this.createOffer(userId, socketId);
  }

  private async createPeerConnectionForAnswer(userId: string, socketId: string) {
    if (this.peerConnections.has(userId)) return;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    }
    (pc as any).onaddstream = (event: any) => {
      if (event.stream) {
        const pcData = this.peerConnections.get(userId);
        if (pcData) { pcData.stream = event.stream; this.notifyStreamUpdate(userId, event.stream); }
      }
    };
    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate && this.socket && this.meetingConfig) {
        this.socket.emit('meeting:ice-candidate', {
          ...this.meetingConfig, candidate: event.candidate,
          targetSocketId: socketId, fromUserId: this.currentUserId, fromSocketId: this.socket.id
        });
      }
    };
    this.peerConnections.set(userId, { peerConnection: pc, userId, socketId });
  }

  private async createOffer(userId: string, socketId: string) {
    const pcData = this.peerConnections.get(userId);
    if (!pcData) return;
    try {
      const offer = await pcData.peerConnection.createOffer({});
      await pcData.peerConnection.setLocalDescription(offer);
      this.socket?.emit('meeting:offer', {
        ...this.meetingConfig, offer, targetSocketId: socketId, fromUserId: this.currentUserId, fromSocketId: this.socket?.id
      });
    } catch (error) { console.error(error); }
  }

  private async handleOffer(fromUserId: string, fromSocketId: string, offer: RTCSessionDescription) {
    let pcData = this.peerConnections.get(fromUserId);
    const currentUserId = this.getCurrentUserId();
    if (pcData && pcData.peerConnection.signalingState !== 'stable') {
      const isPolite = currentUserId < fromUserId;
      if (!isPolite) return;
      // @ts-ignore
      await pcData.peerConnection.setLocalDescription({ type: 'rollback', sdp: '' });
    }
    if (!pcData) {
      await this.createPeerConnectionForAnswer(fromUserId, fromSocketId);
      pcData = this.peerConnections.get(fromUserId);
    }
    if (!pcData) return;
    try {
      await pcData.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await this.processPendingIceCandidates(fromUserId);
      const answer = await pcData.peerConnection.createAnswer();
      await pcData.peerConnection.setLocalDescription(answer);
      this.socket?.emit('meeting:answer', {
        ...this.meetingConfig, answer, targetSocketId: fromSocketId, fromUserId: this.currentUserId, fromSocketId: this.socket?.id
      });
    } catch (error) { console.error(error); }
  }

  private async handleAnswer(fromUserId: string, fromSocketId: string, answer: RTCSessionDescription) {
    const pcData = this.peerConnections.get(fromUserId);
    if (!pcData || pcData.peerConnection.signalingState !== 'have-local-offer') return;
    try {
      await pcData.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processPendingIceCandidates(fromUserId);
    } catch (error) { console.error(error); }
  }

  private async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidate) {
    const pcData = this.peerConnections.get(fromUserId);
    if (!pcData || !pcData.peerConnection.remoteDescription) {
      if (!this.pendingIceCandidates.has(fromUserId)) this.pendingIceCandidates.set(fromUserId, []);
      this.pendingIceCandidates.get(fromUserId)!.push(candidate);
      return;
    }
    try { await pcData.peerConnection.addIceCandidate(candidate); } catch (e) {}
  }

  private async processPendingIceCandidates(userId: string) {
    const pending = this.pendingIceCandidates.get(userId);
    const pcData = this.peerConnections.get(userId);
    if (pending && pcData && pcData.peerConnection.remoteDescription) {
      for (const candidate of pending) { try { await pcData.peerConnection.addIceCandidate(candidate); } catch (e) {} }
      this.pendingIceCandidates.delete(userId);
    }
  }

  private removePeerConnection(userId: string) {
    const pcData = this.peerConnections.get(userId);
    if (pcData) {
      try { pcData.peerConnection.close(); } catch(e){}
      this.peerConnections.delete(userId);
      this.notifyStreamUpdate(userId, null);
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) this.localStream.getAudioTracks().forEach(track => track.enabled = enabled);
    this.socket?.emit('meeting:toggle-media', { ...this.meetingConfig, mediaType: 'audio', enabled });
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) this.localStream.getVideoTracks().forEach(track => track.enabled = enabled);
    this.socket?.emit('meeting:toggle-media', { ...this.meetingConfig, mediaType: 'video', enabled });
  }

  getLocalStream() { return this.localStream; }
  getParticipants() { return Array.from(this.participants.values()); }
  onParticipantUpdate(cb: (p: MeetingParticipant[]) => void) { this.onParticipantUpdateCallbacks.add(cb); return () => { this.onParticipantUpdateCallbacks.delete(cb); }; }
  onStreamUpdate(cb: (u: string, s: MediaStream | null) => void) { this.onStreamUpdateCallbacks.add(cb); return () => { this.onStreamUpdateCallbacks.delete(cb); }; }
  
  private notifyParticipantUpdate() {
    const list = Array.from(this.participants.values());
    this.onParticipantUpdateCallbacks.forEach(cb => cb(list));
  }
  private notifyStreamUpdate(userId: string, stream: MediaStream | null) {
    this.onStreamUpdateCallbacks.forEach(cb => cb(userId, stream));
  }
  getStoredMeeting() { return null; }
}

export const meetingService = new MeetingService();