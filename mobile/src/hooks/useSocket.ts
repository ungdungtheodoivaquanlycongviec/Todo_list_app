import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client'; // Import Type riêng
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { SOCKET_URL, SOCKET_NAMESPACE } from '../config/api.config';

// Dùng ReturnType để tránh mọi lỗi type
type ClientSocket = ReturnType<typeof io>;

let sharedSocket: ClientSocket | null = null;
let subscriberCount = 0;
let disconnectTimeout: NodeJS.Timeout | null = null;

// 🔥 BIẾN MỚI: Cờ đánh dấu đang gọi video
let isCallActive = false; 

const connectionListeners = new Set<(isConnected: boolean) => void>();

// 🔥 HÀM MỚI: Cho phép bên ngoài (ChatScreen/MeetingView) điều khiển trạng thái gọi
export const setSocketCallState = (active: boolean) => {
  console.log(`[Socket] Setting Call Active State: ${active}`);
  isCallActive = active;
  
  // Nếu đang gọi mà có hẹn giờ ngắt -> HỦY NGAY
  if (active && disconnectTimeout) {
    console.log('[Socket] Call started, cancelling pending disconnect.');
    clearTimeout(disconnectTimeout);
    disconnectTimeout = null;
  }
};

const notifyConnectionListeners = (state: boolean) => {
  connectionListeners.forEach((listener) => {
    try { listener(state); } catch (error) { console.error(error); }
  });
};

const createSharedSocket = (token: string): ClientSocket => {
  const cleanUrl = SOCKET_URL.replace(/\/$/, '');
  const cleanNamespace = SOCKET_NAMESPACE.replace(/^\//, '');
  const connectionUrl = cleanNamespace ? `${cleanUrl}/${cleanNamespace}` : cleanUrl;

  const socket = io(connectionUrl, {
    auth: { token },
    transports: ['websocket'], // Bắt buộc
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    forceNew: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected ✅ ID:', socket.id);
    notifyConnectionListeners(true);
  });

  socket.on('disconnect', (reason: any) => {
    console.log('[Socket] Disconnected ❌ Reason:', reason);
    notifyConnectionListeners(false);
  });

  return socket as ClientSocket;
};

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<ClientSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const initSocket = async () => {
      if (!user) return;
      const token = await authService.getAuthToken();
      if (!isMounted || !token) return;

      if (disconnectTimeout) {
        console.log('[Socket] Cancel disconnect (Reusing)');
        clearTimeout(disconnectTimeout);
        disconnectTimeout = null;
      }

      subscriberCount++;

      if (!sharedSocket) {
        sharedSocket = createSharedSocket(token);
      } else if (!sharedSocket.connected) {
        sharedSocket.connect();
      }

      socketRef.current = sharedSocket;
      setIsConnected(sharedSocket.connected);

      connectionListeners.add((state) => { if (isMounted) setIsConnected(state); });
    };

    initSocket();

    return () => {
      isMounted = false;
      subscriberCount--;

      // 🔥 LOGIC QUAN TRỌNG NHẤT:
      // Chỉ ngắt kết nối khi:
      // 1. Không còn ai dùng (count <= 0)
      // 2. VÀ KHÔNG CÓ CUỘC GỌI NÀO ĐANG DIỄN RA (!isCallActive)
      if (subscriberCount <= 0) {
        subscriberCount = 0;
        if (disconnectTimeout) clearTimeout(disconnectTimeout);

        if (isCallActive) {
           console.log('[Socket] Subscribers = 0 but Call is Active. KEEPING CONNECTION ALIVE.');
           return; // ⛔️ DỪNG LẠI, KHÔNG ĐƯỢC NGẮT!
        }

        console.log('[Socket] Scheduling disconnect in 2s...');
        disconnectTimeout = setTimeout(() => {
          // Kiểm tra lại lần nữa cho chắc
          if (sharedSocket && subscriberCount === 0 && !isCallActive) {
            console.log('[Socket] Timeout reached. Disconnecting.');
            sharedSocket.disconnect();
            sharedSocket = null;
          }
        }, 2000);
      }
    };
  }, [user]);

  return { socket: socketRef.current, isConnected };
}