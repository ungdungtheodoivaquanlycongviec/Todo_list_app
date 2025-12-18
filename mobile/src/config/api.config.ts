// API Configuration for Mobile App
import { Platform } from 'react-native';

// 🚨 Cần thay thế bằng IP nội bộ THỰC TẾ của máy tính đang chạy Backend
const YOUR_LAN_IP: string = '192.168.1.8'; 
const API_PORT: string = '8080';

// Hàm tính toán URL gốc (ví dụ: http://192.168.1.15:8080), không có /api
const getBaseUrl = (): string => {
  if (__DEV__) {
    // 1. iOS Simulator
    if (Platform.OS === 'ios') {
      return `http://localhost:${API_PORT}`;
    }
    
    // 2. Android Emulator (sử dụng 10.0.2.2 nếu backend chạy trên máy tính)
    // Nếu bạn dùng 10.0.2.2, hãy đảm bảo YOUR_LAN_IP = '10.0.2.2'
    if (Platform.OS === 'android' && YOUR_LAN_IP === '10.0.2.2') { 
         return `http://10.0.2.2:${API_PORT}`;
    }

    // 3. Thiết bị Vật lý hoặc IP LAN
    console.warn(`[DEV] Using LAN IP for Base URL: http://${YOUR_LAN_IP}:${API_PORT}`);
    return `http://${YOUR_LAN_IP}:${API_PORT}`;
  }
  
  // Production - Thay thế bằng Production Domain
  return 'https://api.yourdomain.com'; 
};

// 💡 EXPORT 1: URL gốc (http://IP:PORT)
export const BASE_URL = getBaseUrl(); 

// 💡 EXPORT 2: URL API (http://IP:PORT/api) - Dùng cho Axios/HTTP
export const API_URL = `${BASE_URL}/api`; 

// 💡 EXPORT 3: URL Socket (Sử dụng URL gốc)
export const SOCKET_URL = BASE_URL; 
// 💡 EXPORT 4: Namespace Socket
export const SOCKET_NAMESPACE = '/ws/app'; 

console.log('API_URL configured:', API_URL, 'Platform:', Platform.OS);