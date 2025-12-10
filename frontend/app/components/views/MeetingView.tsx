"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { meetingService, MeetingParticipant, MeetingConfig } from '../../services/meeting.service';
import { useSocket } from '../../hooks/useSocket';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface MeetingViewProps {
  config: MeetingConfig;
  onClose: () => void;
  title?: string;
}

export default function MeetingView({ config, onClose, title }: MeetingViewProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { socket } = useSocket();
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());

  useEffect(() => {
    let isMounted = true;

    // Wait for socket to be available
    if (!socket) {
      console.log('[MeetingView] Waiting for socket...');
      setIsConnecting(true);
      setConnectionError(null);
      
      // Set a timeout to show error if socket doesn't connect
      const timeout = setTimeout(() => {
        if (isMounted && !socket) {
          setConnectionError('Socket connection timeout. Please check your connection and try again.');
          setIsConnecting(false);
        }
      }, 10000); // 10 seconds timeout

      return () => {
        clearTimeout(timeout);
        isMounted = false;
      };
    }

    setIsConnecting(true);
    setConnectionError(null);

    // Initialize meeting service
    meetingService.setSocket(socket);
    if (user?._id) {
      (meetingService as any).setCurrentUserId(user._id);
    }

    // Start meeting
    const startMeeting = async () => {
      try {
        await meetingService.startMeeting(config, {
          audio: audioEnabled,
          video: videoEnabled
        });

        if (!isMounted) return;

        // Set local stream
        const localStream = meetingService.getLocalStream();
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Subscribe to participant updates
        const unsubscribeParticipants = meetingService.onParticipantUpdate((updatedParticipants) => {
          if (isMounted) {
            setParticipants(updatedParticipants);
          }
        });

        // Subscribe to stream updates
        const unsubscribeStreams = meetingService.onStreamUpdate((userId, stream) => {
          if (!isMounted) return;
          
          if (stream) {
            streamsRef.current.set(userId, stream);
            const videoElement = remoteVideosRef.current.get(userId);
            if (videoElement) {
              videoElement.srcObject = stream;
            }
          } else {
            streamsRef.current.delete(userId);
            const videoElement = remoteVideosRef.current.get(userId);
            if (videoElement) {
              videoElement.srcObject = null;
            }
          }
        });

        if (isMounted) {
          setIsConnecting(false);
        }

        return () => {
          unsubscribeParticipants();
          unsubscribeStreams();
        };
      } catch (error) {
        console.error('[MeetingView] Error starting meeting:', error);
        if (isMounted) {
          setConnectionError('Failed to start meeting: ' + (error as Error).message);
          setIsConnecting(false);
        }
      }
    };

    const cleanupPromise = startMeeting();

    return () => {
      isMounted = false;
      cleanupPromise.then(unsub => {
        if (unsub) unsub();
      }).catch(() => {});
      // Don't call handleLeave here as it might cause issues during cleanup
    };
  }, [socket, config, user?._id, audioEnabled, videoEnabled]);

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    
    try {
      await meetingService.leaveMeeting();
    } catch (error) {
      console.error('[MeetingView] Error leaving meeting:', error);
    } finally {
      onClose();
    }
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    meetingService.toggleAudio(newState);
  };

  const toggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    meetingService.toggleVideo(newState);
  };

  const setRemoteVideoRef = (userId: string, element: HTMLVideoElement | null) => {
    if (element) {
      remoteVideosRef.current.set(userId, element);
      const stream = streamsRef.current.get(userId);
      if (stream) {
        element.srcObject = stream;
      }
    } else {
      remoteVideosRef.current.delete(userId);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[300px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title || 'Meeting'}
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-lg transition-colors ${
              audioEnabled
                ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-lg transition-colors ${
              videoEnabled
                ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLeave}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <h2 className="text-lg font-semibold text-white">
            {title || 'Meeting'}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1} participants</span>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <p className="text-white text-sm">{user?.name || 'You'}</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
              {user?.name || 'You'} {audioEnabled ? '' : '(Muted)'}
            </div>
          </div>

          {/* Remote Videos */}
          {participants.map((participant) => (
            <div key={participant.userId} className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={(el) => setRemoteVideoRef(participant.userId, el)}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {(!participant.videoEnabled || !streamsRef.current.has(participant.userId)) && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl text-white">
                        {participant.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <p className="text-white text-sm">{participant.name || 'Participant'}</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {participant.name || 'Participant'} {participant.audioEnabled ? '' : '(Muted)'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${
              audioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              videoEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button
            onClick={handleLeave}
            disabled={isLeaving}
            className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all disabled:opacity-50"
            title="Leave meeting"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

