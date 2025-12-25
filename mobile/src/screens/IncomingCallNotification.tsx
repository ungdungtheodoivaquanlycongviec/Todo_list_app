import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView
} from 'react-native';
import { Phone, PhoneOff, Video, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface IncomingCallNotificationProps {
  meetingId: string;
  type: 'group' | 'direct';
  callerName: string;
  groupName?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallNotification({
  meetingId,
  type,
  callerName,
  groupName,
  onAccept,
  onDecline
}: IncomingCallNotificationProps) {
  // Animation Value (Bắt đầu ở vị trí -150 tức là ẩn phía trên màn hình)
  const slideAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    // Hiệu ứng trượt xuống khi mount
    Animated.spring(slideAnim, {
      toValue: Platform.OS === 'ios' ? 50 : 20, // Padding top tùy OS
      useNativeDriver: true,
      tension: 20,
      friction: 7
    }).start();
  }, []);

  const handleDecline = () => {
    // Hiệu ứng trượt lên trước khi đóng
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true
    }).start(() => onDecline());
  };

  const handleAccept = () => {
    onAccept();
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.contentContainer}>
        {/* Header Row: Avatar + Info + Close */}
        <View style={styles.headerRow}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {callerName.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Video size={16} color="#3B82F6" style={{ marginRight: 4 }} />
              <Text style={styles.callerName} numberOfLines={1}>
                {callerName}
              </Text>
            </View>
            <Text style={styles.callContext} numberOfLines={1}>
              {type === 'group' 
                ? `Incoming call in ${groupName || 'group'}`
                : 'Incoming video call'
              }
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity onPress={handleDecline} style={styles.closeButton}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.declineBtn]} 
            onPress={handleDecline}
          >
            <PhoneOff size={20} color="#FFF" />
            <Text style={styles.btnText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.acceptBtn]} 
            onPress={handleAccept}
          >
            <Phone size={20} color="#FFF" />
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, // Vị trí gốc, sẽ được Animated.View đẩy xuống
    left: 16,
    right: 16, // Căn lề trái phải để nằm giữa
    zIndex: 1000, // Đảm bảo luôn nằm trên cùng
    elevation: 10, // Shadow cho Android
    shadowColor: '#000', // Shadow cho iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  contentContainer: {
    backgroundColor: '#FFF', // Hoặc '#1F2937' cho dark mode
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  callerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827', // Dark gray
    flex: 1,
  },
  callContext: {
    fontSize: 13,
    color: '#6B7280', // Light gray
  },
  closeButton: {
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  declineBtn: {
    backgroundColor: '#EF4444', // Red
  },
  acceptBtn: {
    backgroundColor: '#10B981', // Green
  },
  btnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
});