import { Platform } from 'react-native';

<<<<<<< HEAD
// 🚨 Cần thay thế bằng IP nội bộ THỰC TẾ của máy tính đang chạy Backend
const YOUR_LAN_IP: string = '192.168.1.11'; 
const API_PORT: string = '8080';
=======
// --------------------------------------------------------
// 1. CẤU HÌNH CỔNG & IP
// --------------------------------------------------------
const API_PORT: string = '8080'; // Cổng API Backend (bạn xác nhận là 8080)

// ⚠️ QUAN TRỌNG: Thay số này bằng IP LAN máy tính của bạn (VD: 192.168.1.6)
// Cách lấy: Mở CMD trên máy tính -> gõ "ipconfig" -> xem dòng IPv4 Address
const YOUR_LAN_IP: string = '192.168.1.6'; 
>>>>>>> main

const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      return `http://localhost:${API_PORT}`;
    }
    
    // Android: Vì 10.0.2.2 đang gây lỗi Network Error cho bạn, 
    // chúng ta sẽ dùng IP LAN (cách này ổn định nhất nếu máy tính và điện thoại chung Wifi)
    return `http://${YOUR_LAN_IP}:${API_PORT}`;
  }
  
  return 'https://api.yourdomain.com'; 
};

// --------------------------------------------------------
// XUẤT BIẾN
// --------------------------------------------------------
export const BASE_URL = getBaseUrl(); 

// API URL (http://192.168.1.x:8080/api)
export const API_URL = `${BASE_URL}/api`; 

// SOCKET URL (http://192.168.1.x:8080)
export const SOCKET_URL = BASE_URL; 

// ✅ ĐÃ SỬA: Namespace khớp với Backend của bạn
export const SOCKET_NAMESPACE = '/ws/app';