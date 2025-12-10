import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 💡 ĐÃ SỬA: Import API_URL thay vì API_BASE_URL/BASE_URL
import { API_URL } from '../config/api.config'; 

const apiClient = axios.create({
  // 💡 ĐÃ SỬA: Dùng API_URL (có /api) làm Base URL cho các requests HTTP
  baseURL: API_URL, 
  timeout: 15000,
});

// 🧠 Interceptor thêm token vào header (Giữ nguyên)
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      } as any;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🚦 Interceptor xử lý lỗi response (Giữ nguyên)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API error:', error?.response?.status, error?.response?.data);
    if (error?.response?.status === 401) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    }
    return Promise.reject(error);
  }
);

export default apiClient;