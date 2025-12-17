import { Socket } from 'socket.io-client';

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

export interface StoredMeetingState {
  config: MeetingConfig;
  title?: string;
  timestamp: number;
}

const MEETING_STORAGE_KEY = 'activeMeeting';

class MeetingService {
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, PeerConnection> = new Map();
  private meetingConfig: MeetingConfig | null = null;
  private participants: Map<string, MeetingParticipant> = new Map();
  private onParticipantUpdateCallbacks: Set<(participants: MeetingParticipant[]) => void> = new Set();
  private onStreamUpdateCallbacks: Set<(userId: string, stream: MediaStream | null) => void> = new Set();
  private mediaDeviceState: MediaDeviceState = {
    hasAudio: false,
    hasVideo: false,
    audioEnabled: false,
    videoEnabled: false
  };
  private meetingTitle: string = '';

  setSocket(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // User joined meeting
    this.socket.on('meeting:user-joined', (data: { userId: string; socketId: string; meetingId: string }) => {
      console.log('[Meeting] User joined:', data);
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        this.createPeerConnection(data.userId, data.socketId);
      }
    });

    // User left meeting
    this.socket.on('meeting:user-left', (data: { userId: string; socketId: string; meetingId?: string }) => {
      console.log('[Meeting] User left:', data);
      this.removePeerConnection(data.userId, data.socketId);
      this.participants.delete(data.userId);
      this.notifyParticipantUpdate();
    });

    // WebRTC Offer
    this.socket.on('meeting:offer', async (data: {
      fromUserId: string;
      fromSocketId: string;
      offer: RTCSessionDescriptionInit;
      meetingId: string;
    }) => {
      console.log('[Meeting] Received offer from:', data.fromUserId);
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        await this.handleOffer(data.fromUserId, data.fromSocketId, data.offer);
      }
    });

    // WebRTC Answer
    this.socket.on('meeting:answer', async (data: {
      fromUserId: string;
      fromSocketId: string;
      answer: RTCSessionDescriptionInit;
      meetingId: string;
    }) => {
      console.log('[Meeting] Received answer from:', data.fromUserId);
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        await this.handleAnswer(data.fromUserId, data.fromSocketId, data.answer);
      }
    });

    // ICE Candidate
    this.socket.on('meeting:ice-candidate', async (data: {
      fromUserId: string;
      fromSocketId: string;
      candidate: RTCIceCandidateInit;
      meetingId: string;
    }) => {
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        await this.handleIceCandidate(data.fromUserId, data.fromSocketId, data.candidate);
      }
    });

    // Media state change
    this.socket.on('meeting:media-state', (data: {
      userId: string;
      socketId: string;
      mediaType: 'audio' | 'video';
      enabled: boolean;
      meetingId: string;
    }) => {
      if (this.meetingConfig && this.meetingConfig.meetingId === data.meetingId) {
        const participant = this.participants.get(data.userId);
        if (participant) {
          if (data.mediaType === 'audio') {
            participant.audioEnabled = data.enabled;
          } else {
            participant.videoEnabled = data.enabled;
          }
          this.participants.set(data.userId, participant);
          this.notifyParticipantUpdate();
        }
      }
    });
  }

  async startMeeting(config: MeetingConfig, options: { audio?: boolean; video?: boolean; title?: string } = {}) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.meetingConfig = config;
    this.meetingTitle = options.title || '';

    const wantAudio = options.audio !== false;
    const wantVideo = options.video !== false;

    // Try to get user media with graceful fallback
    try {
      // First, try to get both audio and video if requested
      if (wantAudio && wantVideo) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
          this.mediaDeviceState = {
            hasAudio: true,
            hasVideo: true,
            audioEnabled: true,
            videoEnabled: true
          };
          console.log('[Meeting] Got both audio and video');
        } catch (videoError) {
          // If video fails, try audio only
          console.warn('[Meeting] Video not available, falling back to audio only:', videoError);
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            });
            this.mediaDeviceState = {
              hasAudio: true,
              hasVideo: false,
              audioEnabled: true,
              videoEnabled: false
            };
            console.log('[Meeting] Got audio only (no video device)');
          } catch (audioError) {
            console.error('[Meeting] No audio device available:', audioError);
            throw new Error('No microphone available. Please connect a microphone and try again.');
          }
        }
      } else if (wantAudio && !wantVideo) {
        // Audio only requested
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          this.mediaDeviceState = {
            hasAudio: true,
            hasVideo: false,
            audioEnabled: true,
            videoEnabled: false
          };
          console.log('[Meeting] Got audio only (as requested)');
        } catch (audioError) {
          console.error('[Meeting] No audio device available:', audioError);
          throw new Error('No microphone available. Please connect a microphone and try again.');
        }
      } else if (!wantAudio && wantVideo) {
        // Video only (rare case)
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
          });
          this.mediaDeviceState = {
            hasAudio: false,
            hasVideo: true,
            audioEnabled: false,
            videoEnabled: true
          };
          console.log('[Meeting] Got video only (as requested)');
        } catch (videoError) {
          console.error('[Meeting] No video device available:', videoError);
          throw new Error('No camera available. Please connect a camera and try again.');
        }
      } else {
        // Neither audio nor video requested - shouldn't happen but handle it
        throw new Error('At least audio or video must be enabled for a call.');
      }
    } catch (error) {
      console.error('[Meeting] Error getting user media:', error);
      this.meetingConfig = null;
      throw error;
    }

    // Save meeting to sessionStorage for persistence
    this.saveMeetingToStorage();

    // Join meeting room
    return new Promise<{ success: boolean; participants: MeetingParticipant[]; mediaState: MediaDeviceState }>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('meeting:join', config, (response: any) => {
        if (response.success) {
          // Store initial participants
          if (response.participants) {
            response.participants.forEach((p: any) => {
              if (p.userId !== this.getCurrentUserId()) {
                this.participants.set(p.userId, {
                  userId: p.userId,
                  socketId: p.socketId,
                  audioEnabled: true,
                  videoEnabled: true
                });
              }
            });
            this.notifyParticipantUpdate();
          }

          // Create peer connections for existing participants
          if (response.participants) {
            response.participants.forEach((p: any) => {
              if (p.userId !== this.getCurrentUserId()) {
                this.createPeerConnection(p.userId, p.socketId);
              }
            });
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
    if (!this.socket || !this.meetingConfig) {
      return;
    }

    // Clear storage first
    this.clearMeetingFromStorage();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      pc.peerConnection.close();
      if (pc.stream) {
        pc.stream.getTracks().forEach(track => track.stop());
      }
    });
    this.peerConnections.clear();

    // Reset media device state
    this.mediaDeviceState = {
      hasAudio: false,
      hasVideo: false,
      audioEnabled: false,
      videoEnabled: false
    };

    // Leave meeting room
    return new Promise<void>((resolve) => {
      if (!this.socket || !this.meetingConfig) {
        resolve();
        return;
      }

      this.socket.emit('meeting:leave', this.meetingConfig, () => {
        this.meetingConfig = null;
        this.meetingTitle = '';
        this.participants.clear();
        this.notifyParticipantUpdate();
        resolve();
      });
    });
  }

  private async createPeerConnection(userId: string, socketId: string) {
    if (this.peerConnections.has(userId)) {
      return;
    }

    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('[Meeting] Received remote track from:', userId);
      const stream = event.streams[0];
      const pc = this.peerConnections.get(userId);
      if (pc) {
        pc.stream = stream;
        this.notifyStreamUpdate(userId, stream);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.meetingConfig) {
        this.socket.emit('meeting:ice-candidate', {
          ...this.meetingConfig,
          candidate: event.candidate,
          targetSocketId: socketId
        });
      }
    };

    // Handle connection state
    peerConnection.onconnectionstatechange = () => {
      console.log(`[Meeting] Connection state with ${userId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        // Try to reconnect
        setTimeout(() => {
          if (this.peerConnections.has(userId)) {
            this.createOffer(userId, socketId);
          }
        }, 1000);
      }
    };

    this.peerConnections.set(userId, {
      peerConnection,
      userId,
      socketId
    });

    // Create and send offer
    await this.createOffer(userId, socketId);
  }

  private async createOffer(userId: string, socketId: string) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return;

    try {
      const offer = await pc.peerConnection.createOffer();
      await pc.peerConnection.setLocalDescription(offer);

      if (this.socket && this.meetingConfig) {
        this.socket.emit('meeting:offer', {
          ...this.meetingConfig,
          offer,
          targetSocketId: socketId
        });
      }
    } catch (error) {
      console.error('[Meeting] Error creating offer:', error);
    }
  }

  private async handleOffer(fromUserId: string, fromSocketId: string, offer: RTCSessionDescriptionInit) {
    let pc = this.peerConnections.get(fromUserId);

    if (!pc) {
      await this.createPeerConnection(fromUserId, fromSocketId);
      pc = this.peerConnections.get(fromUserId);
    }

    if (!pc) return;

    try {
      await pc.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.peerConnection.createAnswer();
      await pc.peerConnection.setLocalDescription(answer);

      if (this.socket && this.meetingConfig) {
        this.socket.emit('meeting:answer', {
          ...this.meetingConfig,
          answer,
          targetSocketId: fromSocketId
        });
      }
    } catch (error) {
      console.error('[Meeting] Error handling offer:', error);
    }
  }

  private async handleAnswer(fromUserId: string, fromSocketId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) return;

    try {
      await pc.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('[Meeting] Error handling answer:', error);
    }
  }

  private async handleIceCandidate(fromUserId: string, fromSocketId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) return;

    try {
      await pc.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[Meeting] Error handling ICE candidate:', error);
    }
  }

  private removePeerConnection(userId: string, socketId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.peerConnection.close();
      if (pc.stream) {
        pc.stream.getTracks().forEach(track => track.stop());
      }
      this.peerConnections.delete(userId);
      this.notifyStreamUpdate(userId, null);
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
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
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }

    if (this.socket && this.meetingConfig) {
      this.socket.emit('meeting:toggle-media', {
        ...this.meetingConfig,
        mediaType: 'video',
        enabled
      });
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(userId: string): MediaStream | null {
    const pc = this.peerConnections.get(userId);
    return pc?.stream || null;
  }

  getParticipants(): MeetingParticipant[] {
    return Array.from(this.participants.values());
  }

  onParticipantUpdate(callback: (participants: MeetingParticipant[]) => void) {
    this.onParticipantUpdateCallbacks.add(callback);
    return () => {
      this.onParticipantUpdateCallbacks.delete(callback);
    };
  }

  onStreamUpdate(callback: (userId: string, stream: MediaStream | null) => void) {
    this.onStreamUpdateCallbacks.add(callback);
    return () => {
      this.onStreamUpdateCallbacks.delete(callback);
    };
  }

  private notifyParticipantUpdate() {
    const participants = Array.from(this.participants.values());
    this.onParticipantUpdateCallbacks.forEach(callback => {
      try {
        callback(participants);
      } catch (error) {
        console.error('[Meeting] Error in participant update callback:', error);
      }
    });
  }

  private notifyStreamUpdate(userId: string, stream: MediaStream | null) {
    this.onStreamUpdateCallbacks.forEach(callback => {
      try {
        callback(userId, stream);
      } catch (error) {
        console.error('[Meeting] Error in stream update callback:', error);
      }
    });
  }

  private currentUserId: string = '';

  setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  private getCurrentUserId(): string {
    return this.currentUserId;
  }

  // Storage methods for meeting persistence
  private saveMeetingToStorage() {
    if (!this.meetingConfig) return;

    try {
      const state: StoredMeetingState = {
        config: this.meetingConfig,
        title: this.meetingTitle,
        timestamp: Date.now()
      };
      sessionStorage.setItem(MEETING_STORAGE_KEY, JSON.stringify(state));
      console.log('[Meeting] Saved meeting to storage');
    } catch (error) {
      console.error('[Meeting] Error saving meeting to storage:', error);
    }
  }

  private clearMeetingFromStorage() {
    try {
      sessionStorage.removeItem(MEETING_STORAGE_KEY);
      console.log('[Meeting] Cleared meeting from storage');
    } catch (error) {
      console.error('[Meeting] Error clearing meeting from storage:', error);
    }
  }

  getStoredMeeting(): StoredMeetingState | null {
    try {
      const stored = sessionStorage.getItem(MEETING_STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as StoredMeetingState;

      // Check if meeting is too old (more than 1 hour)
      const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
      if (Date.now() - state.timestamp > MAX_AGE_MS) {
        this.clearMeetingFromStorage();
        return null;
      }

      return state;
    } catch (error) {
      console.error('[Meeting] Error getting stored meeting:', error);
      return null;
    }
  }

  getMediaDeviceState(): MediaDeviceState {
    return { ...this.mediaDeviceState };
  }

  isInMeeting(): boolean {
    return this.meetingConfig !== null;
  }

  getCurrentMeetingConfig(): MeetingConfig | null {
    return this.meetingConfig;
  }
}

export const meetingService = new MeetingService();

