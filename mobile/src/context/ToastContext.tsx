import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  useColorScheme,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- Types (Giữ nguyên như Web) ---
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// --- Hooks ---
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function useSafeToast() {
  const context = useContext(ToastContext);
  // Fallback dùng Alert của native nếu không có provider
  const fallback: ToastContextType = {
    showToast: (message) => { console.log(message); }, // Simple log or Native Alert
    showSuccess: (message) => { console.log(message); },
    showError: (message) => { console.log(message); },
    showWarning: (message) => { console.log(message); },
    showInfo: (message) => { console.log(message); },
    removeToast: () => { },
  };
  return context || fallback;
}

// --- Component: ToastItem ---
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation values
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    // Animate In
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
      }),
    ]).start();
  }, []);

  const handleRemove = () => {
    // Animate Out trước khi remove thực tế
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(toast.id);
    });
  };

  // Cấu hình màu sắc (Tương tự bản Web nhưng dùng mã Hex)
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: isDark ? '#064e3b' : '#ecfdf5', // green-900/30 : green-50
          border: isDark ? '#065f46' : '#a7f3d0',
          title: isDark ? '#a7f3d0' : '#166534',
          iconColor: '#22c55e',
        };
      case 'error':
        return {
          bg: isDark ? '#7f1d1d' : '#fef2f2',
          border: isDark ? '#991b1b' : '#fecaca',
          title: isDark ? '#fecaca' : '#991b1b',
          iconColor: '#ef4444',
        };
      case 'warning':
        return {
          bg: isDark ? '#78350f' : '#fffbeb',
          border: isDark ? '#92400e' : '#fde68a',
          title: isDark ? '#fde68a' : '#92400e',
          iconColor: '#eab308',
        };
      case 'info':
      default:
        return {
          bg: isDark ? '#1e3a8a' : '#eff6ff',
          border: isDark ? '#1e40af' : '#bfdbfe',
          title: isDark ? '#bfdbfe' : '#1e40af',
          iconColor: '#3b82f6',
        };
    }
  };

  const styleConfig = getStyles();

  // Mapping Icons
  const IconComponent = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[toast.type];

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: styleConfig.bg,
          borderColor: styleConfig.border,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <IconComponent size={24} color={styleConfig.iconColor} />
      </View>

      <View style={styles.contentContainer}>
        {toast.title && (
          <Text style={[styles.title, { color: styleConfig.title }]}>
            {toast.title}
          </Text>
        )}
        <Text style={[styles.message, { color: isDark ? '#e5e7eb' : '#374151' }]}>
          {toast.message}
        </Text>
      </View>

      <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <X size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// --- Provider ---
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    title?: string,
    duration: number = 4000 // Mobile thường đọc chậm hơn web chút, để 4s hoặc 5s
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, title, message, duration };

    // Mobile: Thêm vào đầu mảng để hiển thị cái mới nhất trên cùng (Top stack)
    setToasts((prev) => [newToast, ...prev]);

    if (duration > 0) {
      setTimeout(() => {
        // Cần check xem toast còn tồn tại không trước khi remove (xử lý ở ToastItem animation tốt hơn nhưng ở đây giữ logic đơn giản)
        // Lưu ý: Ở ToastItem đã có handleRemove gọi onRemove, nhưng setTimeout này là backup
        // Để tránh conflict animation, ta có thể để ToastItem tự handle timeout, 
        // nhưng để giữ logic giống Web, ta để Provider quản lý.
        // Tuy nhiên, để animation mượt trên mobile, removeToast ở đây sẽ làm mất view ngay lập tức.
        // Trong thực tế Mobile, nên để component tự remove. 
        // Nhưng để tuân thủ logic Web "Auto remove", ta giữ nguyên.
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title || 'Thành công');
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast(message, 'error', title || 'Lỗi', 6000);
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', title || 'Cảnh báo');
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, removeToast }}>
      <View style={{ flex: 1 }}>
        {children}
        
        {/* Toast Container Overlay */}
        <View style={styles.overlayContainer} pointerEvents="box-none">
          <SafeAreaView>
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </SafeAreaView>
        </View>
      </View>
    </ToastContext.Provider>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'android' ? 40 : 10, // Tránh status bar
    paddingHorizontal: 16,
    zIndex: 9999, // Đảm bảo đè lên mọi thứ
    elevation: 10, // Android z-index
    alignItems: 'center', // Căn giữa màn hình
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 400,
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
});