import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

// Get API URL and extract base URL for Socket.IO
const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  // Remove /api suffix if present to get base URL
  return apiUrl.replace(/\/api\/?$/, '');
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || getApiBaseUrl();
const SOCKET_NAMESPACE = process.env.NEXT_PUBLIC_SOCKET_NAMESPACE || '/ws/app';

let sharedSocket: Socket | null = null;
let subscriberCount = 0;
const connectionListeners = new Set<(isConnected: boolean) => void>();

const notifyConnectionListeners = (state: boolean) => {
  connectionListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('[Socket] Connection listener error:', error);
    }
  });
};

const createSharedSocket = (token: string) => {
  const socket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
    auth: {
      token
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
    notifyConnectionListeners(true);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected, reason:', reason);
    notifyConnectionListeners(false);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
    notifyConnectionListeners(false);
  });

  return socket;
};

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      socketRef.current = null;
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      console.warn('[Socket] Missing access token. Realtime features disabled.');
      setIsConnected(false);
      socketRef.current = null;
      return;
    }

    subscriberCount += 1;

    if (!sharedSocket) {
      sharedSocket = createSharedSocket(token);
    }

    socketRef.current = sharedSocket;
    setIsConnected(sharedSocket.connected);

    const listener = (state: boolean) => {
      setIsConnected(state);
    };

    connectionListeners.add(listener);

    return () => {
      connectionListeners.delete(listener);
      subscriberCount = Math.max(0, subscriberCount - 1);

      // Only disconnect if no more subscribers
      // Don't disconnect on hot reload or component unmount if others are using it
      if (subscriberCount === 0 && sharedSocket) {
        console.log('[Socket] No more subscribers, disconnecting socket');
        sharedSocket.disconnect();
        sharedSocket = null;
      }

      socketRef.current = sharedSocket;
    };
  }, [user]);

  return {
    socket: socketRef.current,
    isConnected
  };
}

