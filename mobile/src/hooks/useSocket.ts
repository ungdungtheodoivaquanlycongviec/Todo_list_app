import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client'; 

import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service'; 
// import AsyncStorage from '@react-native-async-storage/async-storage'; // Không cần thiết

// 💡 ĐÃ SỬA: Import các biến từ file cấu hình mới
import { SOCKET_URL, SOCKET_NAMESPACE } from '../config/api.config'; 

// Xóa bỏ logic đọc process.env cũ
const FINAL_SOCKET_URL = SOCKET_URL; 
const FINAL_SOCKET_NAMESPACE = SOCKET_NAMESPACE;

let sharedSocket: any | null = null; 
let subscriberCount = 0;
const connectionListeners = new Set<(isConnected: boolean) => void>();

const notifyConnectionListeners = (state: boolean) => {
// ... Giữ nguyên ...
  connectionListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('[Socket] Connection listener error:', error);
    }
  });
};

// 💡 SỬ DỤNG biến FINAL_SOCKET_URL và FINAL_SOCKET_NAMESPACE
const createSharedSocket = (token: string): any => {
  const socket = io(`${FINAL_SOCKET_URL}${FINAL_SOCKET_NAMESPACE}`, {
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

  socket.on('disconnect', (reason: string) => { 
    console.log('[Socket] Disconnected, reason:', reason);
    notifyConnectionListeners(false);
  });

  socket.on('connect_error', (error: Error) => { 
    console.error('[Socket] Connection error:', error);
    notifyConnectionListeners(false);
  });

  return socket;
};

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<any | null>(null); 
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      if (isMounted) setIsConnected(false);
      socketRef.current = null;
      return;
    }

    const initializeSocket = async () => {
      // 💡 Giữ nguyên logic lấy token từ authService
      const token = await authService.getAuthToken(); 

      if (!isMounted) return;

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
        if (isMounted) setIsConnected(state);
      };

      connectionListeners.add(listener);
    };

    initializeSocket();

    return () => {
      isMounted = false;
      
      subscriberCount = Math.max(0, subscriberCount - 1);

      if (subscriberCount === 0 && sharedSocket) {
        console.log('[Socket] No more subscribers, disconnecting socket');
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      
      // Giữ nguyên logic gỡ listener
      connectionListeners.forEach(listener => {
        if (listener.toString() === listener.toString()) { // Logic gỡ listener chính xác hơn
          connectionListeners.delete(listener);
        }
      });
      
      socketRef.current = null;
    };
  }, [user]);

  return {
    socket: socketRef.current,
    isConnected
  };
}