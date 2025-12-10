import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Task } from '../../types/task.types';

interface TaskContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  task: Task;
  onAction: (action: string, task: Task) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TaskContextMenu({ 
  visible, 
  x, 
  y, 
  task, 
  onAction, 
  onClose 
}: TaskContextMenuProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const menuItems = [
    { label: 'Complete task', action: 'complete', icon: '✓' },
    { label: 'Start timer', action: 'start_timer', icon: '⏱️' },
    { label: 'Change type', action: 'change_type', icon: '🔄' },
    { label: 'Repeat task', action: 'repeat', icon: '🔁' },
    { label: 'Move to', action: 'move_to', icon: '📂' },
    { label: 'Delete task', action: 'delete', destructive: true, icon: '🗑️' },
  ];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleAction = (action: string, task: Task) => {
    onAction(action, task);
    onClose();
  };

  // Tính toán vị trí để menu không vượt ra ngoài màn hình
  const calculatePosition = () => {
    const menuWidth = 200;
    const menuHeight = menuItems.length * 50 + 16; // Approximate height based on item count
    
    let finalX = x;
    let finalY = y;

    // Đảm bảo menu không vượt qua cạnh phải màn hình
    if (x + menuWidth > SCREEN_WIDTH) {
      finalX = SCREEN_WIDTH - menuWidth - 16;
    }

    // Đảm bảo menu không vượt qua cạnh dưới màn hình
    if (y + menuHeight > SCREEN_HEIGHT) {
      finalY = SCREEN_HEIGHT - menuHeight - 16;
    }

    // Đảm bảo menu không vượt qua cạnh trên và trái màn hình
    finalX = Math.max(16, finalX);
    finalY = Math.max(16, finalY);

    return { left: finalX, top: finalY };
  };

  const position = calculatePosition();

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View 
            style={[
              styles.menuContainer,
              position,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.action}
                style={[
                  styles.menuItem,
                  item.destructive && styles.destructiveItem,
                  index !== menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handleAction(item.action, task)}
              >
                <Text style={styles.icon}>{item.icon}</Text>
                <Text 
                  style={[
                    styles.menuText,
                    item.destructive && styles.destructiveText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  destructiveItem: {
    backgroundColor: '#fef2f2',
  },
  icon: {
    marginRight: 12,
    fontSize: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  destructiveText: {
    color: '#dc2626',
    fontWeight: '500',
  },
});