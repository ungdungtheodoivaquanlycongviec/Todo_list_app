import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  Dimensions,
  Platform
} from 'react-native';
import { AlertTriangle, Trash2, X, Info } from 'lucide-react-native';

// --- Types (Giữ nguyên) ---
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: 'delete' | 'warning' | 'none';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

// --- Hook (Giữ nguyên logic fallback nhưng dùng Alert native của Mobile nếu thiếu provider) ---
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    return {
      confirm: async (options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
          // Fallback to Native Alert on Mobile
          const { Alert } = require('react-native');
          Alert.alert(
            options.title || 'Xác nhận',
            options.message,
            [
              { text: options.cancelText || 'Hủy', onPress: () => resolve(false), style: 'cancel' },
              { text: options.confirmText || 'Xác nhận', onPress: () => resolve(true), style: options.variant === 'danger' ? 'destructive' : 'default' }
            ]
          );
        });
      }
    };
  }
  return context;
}

// --- Component: ConfirmDialog ---
interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ isOpen, options, onConfirm, onCancel }: ConfirmDialogProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Default values
  const {
    title = 'Xác nhận',
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'danger',
    icon = 'warning'
  } = options;

  // Style logic based on variant and theme 
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: isDark ? 'rgba(127, 29, 29, 0.5)' : '#fee2e2', // red-900/50 : red-100
          iconColor: isDark ? '#f87171' : '#dc2626', // red-400 : red-600
          buttonBg: '#dc2626',
        };
      case 'warning':
        return {
          iconBg: isDark ? 'rgba(120, 53, 15, 0.5)' : '#fef3c7', // yellow-900/50 : yellow-100
          iconColor: isDark ? '#facc15' : '#d97706', // yellow-400 : yellow-600
          buttonBg: '#ca8a04', // darker yellow for button text/bg
        };
      case 'info':
        return {
          iconBg: isDark ? 'rgba(30, 58, 138, 0.5)' : '#dbeafe', // blue-900/50 : blue-100
          iconColor: isDark ? '#60a5fa' : '#2563eb', // blue-400 : blue-600
          buttonBg: '#2563eb',
        };
      default:
        return {
          iconBg: isDark ? 'rgba(127, 29, 29, 0.5)' : '#fee2e2',
          iconColor: isDark ? '#f87171' : '#dc2626',
          buttonBg: '#dc2626',
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Render Icon
  const renderIcon = () => {
    if (icon === 'none') return null;
    
    // Mapping icon
    const IconComponent = icon === 'delete' ? Trash2 : AlertTriangle;

    return (
      <View style={[styles.iconContainer, { backgroundColor: variantStyles.iconBg }]}>
        <IconComponent color={variantStyles.iconColor} size={28} />
      </View>
    );
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={onCancel} // Handle Android Back Button
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => { /* Prevent closing when clicking inside */ }}>
            <View style={[styles.dialog, isDark && styles.dialogDark]}>
              
              {/* Close Button (Absolute) */}
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={onCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={isDark ? '#9ca3af' : '#9ca3af'} size={20} />
              </TouchableOpacity>

              <View style={styles.contentContainer}>
                {renderIcon()}

                <Text style={[styles.title, isDark && styles.textDark]}>{title}</Text>
                <Text style={[styles.message, isDark && styles.textSubDark]}>{message}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, isDark && styles.cancelButtonDark]}
                  onPress={onCancel}
                >
                  <Text style={[styles.cancelButtonText, isDark && styles.textDark]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: variantStyles.buttonBg }]}
                  onPress={onConfirm}
                >
                  <Text style={styles.confirmButtonText}>
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// --- Provider (Logic giữ nguyên) ---
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const resolveRef = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(false);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        options={options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Backdrop
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    // Elevation for Android
    elevation: 10,
    position: 'relative',
  },
  dialogDark: {
    backgroundColor: '#1f2937', // gray-800
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827', // gray-900
    textAlign: 'center',
    marginBottom: 8,
  },
  textDark: {
    color: '#f9fafb', // gray-50
  },
  message: {
    fontSize: 14,
    color: '#4b5563', // gray-600
    textAlign: 'center',
    lineHeight: 20,
  },
  textSubDark: {
    color: '#9ca3af', // gray-400
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
  },
  cancelButtonDark: {
    backgroundColor: '#374151', // gray-700
    borderColor: '#4b5563', // gray-600
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', // gray-700
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
});