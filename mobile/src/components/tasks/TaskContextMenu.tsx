import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
  Alert
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather'; // Thay thế Lucide
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Task } from '../../types/task.types';
// Giả định các context đã được port sang mobile
import { useTimer } from '../../context/TimerContext';
import { useFolder } from '../../context/FolderContext';
import { useAuth } from '../../context/AuthContext';
// import { requiresFolderAssignment } from '../../utils/groupRoleUtils'; // Import logic này nếu đã port

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TaskContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  task: Task;
  onAction: (action: string, task: Task, payload?: any) => void;
  onClose: () => void;
}

// Màu sắc cho Category (giống Web)
const CATEGORY_COLORS: Record<string, string> = {
  Operational: '#3B82F6',
  Technical: '#8B5CF6',
  Strategic: '#10B981',
  Hiring: '#22C55E',
  Financial: '#F59E0B',
  Other: '#6B7280',
};

const CATEGORIES = ['Operational', 'Technical', 'Strategic', 'Hiring', 'Financial', 'Other'];

const REPEAT_OPTIONS = [
  { key: 'after_completion', label: 'After completion', frequency: null },
  { key: 'daily', label: 'Every day', frequency: 'daily', interval: 1 },
  { key: 'weekly', label: 'Every week', frequency: 'weekly', interval: 1 },
  { key: 'monthly', label: 'Every month', frequency: 'monthly', interval: 1 },
  { key: 'remove', label: 'Remove repeat', isRemove: true, destructive: true },
];

export default function TaskContextMenu({ 
  visible, 
  x, 
  y, 
  task, 
  onAction, 
  onClose 
}: TaskContextMenuProps) {
  // --- Context Hooks (Mock nếu chưa có) ---
  const { isTimerRunning } = useTimer ? useTimer() : { isTimerRunning: () => false };
  const { folders } = useFolder ? useFolder() : { folders: [] };
  const { currentGroup } = useAuth ? useAuth() : { currentGroup: {} };

  // --- Local State ---
  // Quản lý menu hiện tại: 'main' | 'change_type' | 'repeat' | 'move_to'
  const [currentView, setCurrentView] = useState<'main' | 'change_type' | 'repeat' | 'move_to'>('main');
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const heightAnim = useRef(new Animated.Value(0)).current; // Tự động điều chỉnh chiều cao

  // Logic Timer & Status
  const taskHasRunningTimer = isTimerRunning(task._id);
  const canUseTimer = task.status !== 'completed' && task.status !== 'incomplete';

  useEffect(() => {
    if (visible) {
      setCurrentView('main'); // Reset về main khi mở
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  // --- Logic Handlers ---

  const handleMainAction = (action: string) => {
    if (['change_type', 'repeat', 'move_to'].includes(action)) {
      // Chuyển view sang submenu
      setCurrentView(action as any);
    } else {
      // Thực hiện action ngay (complete, delete, timer...)
      if (action === 'timer') {
        onAction(taskHasRunningTimer ? 'stop_timer' : 'start_timer', task);
      } else {
        onAction(action, task);
      }
      onClose();
    }
  };

  const handleCategorySelect = (category: string) => {
    onAction('change_category', task, { category });
    onClose();
  };

  const handleRepeatSelect = (option: typeof REPEAT_OPTIONS[0]) => {
    if (option.isRemove) {
      onAction('remove_repeat', task);
    } else if (option.key === 'after_completion') {
      onAction('repeat_after_completion', task);
    } else {
      onAction('set_repeat', task, {
        isRepeating: true,
        frequency: option.frequency,
        interval: option.interval,
      });
    }
    onClose();
  };

  const handleFolderSelect = (folder: any) => {
    // Logic check quyền (đơn giản hóa cho mobile, có thể thêm Alert confirm)
    if (task.folderId === folder._id) return;
    
    // Nếu cần check quyền nghiêm ngặt như Web, thực hiện ở đây:
    // const missing = getAssigneesWithoutAccess(...)
    // if (missing.length > 0) Alert.alert(...) else ...
    
    onAction('move_to_folder', task, { folderId: folder._id });
    onClose();
  };

  // --- Render Helpers ---

  // Main Menu Items
  const mainMenuItems = useMemo(() => [
    { label: 'Complete task', action: 'complete', icon: 'check-circle', color: '#10B981' },
    ...(canUseTimer ? [{ 
      label: taskHasRunningTimer ? 'Stop timer' : 'Start timer', 
      action: 'timer', 
      icon: taskHasRunningTimer ? 'stop-circle' : 'play-circle',
      color: taskHasRunningTimer ? '#EF4444' : '#374151'
    }] : []),
    { label: 'Change type', action: 'change_type', icon: 'tag', hasSubmenu: true },
    { label: 'Repeat task', action: 'repeat', icon: 'refresh-cw', hasSubmenu: true },
    { label: 'Move to', action: 'move_to', icon: 'folder', hasSubmenu: true },
    { label: 'Duplicate task', action: 'duplicate', icon: 'copy' },
    { label: 'Delete task', action: 'delete', icon: 'trash-2', destructive: true },
  ], [canUseTimer, taskHasRunningTimer]);

  // Tính toán vị trí menu
  const position = useMemo(() => {
    const width = 220;
    const height = 300; // Chiều cao ước lượng tối đa
    let left = x;
    let top = y;

    if (x + width > SCREEN_WIDTH) left = SCREEN_WIDTH - width - 10;
    if (y + height > SCREEN_HEIGHT) top = SCREEN_HEIGHT - height - 10;
    
    return { top, left };
  }, [x, y]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View 
            style={[
              styles.menuContainer, 
              { top: position.top, left: position.left },
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}
          >
            {/* Header khi ở Submenu (Nút Back) */}
            {currentView !== 'main' && (
              <View style={styles.submenuHeader}>
                <TouchableOpacity onPress={() => setCurrentView('main')} style={styles.backBtn}>
                  <Feather name="chevron-left" size={20} color="#374151" />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.submenuTitle}>
                  {currentView === 'change_type' ? 'Change Type' : 
                   currentView === 'repeat' ? 'Repeat' : 'Move To'}
                </Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              
              {/* --- VIEW: MAIN MENU --- */}
              {currentView === 'main' && mainMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.action}
                  style={[styles.menuItem, item.destructive && styles.destructiveItem]}
                  onPress={() => handleMainAction(item.action)}
                >
                  <Feather 
                    name={item.icon} 
                    size={18} 
                    color={item.destructive ? '#DC2626' : (item.color || '#4B5563')} 
                    style={styles.icon}
                  />
                  <Text style={[styles.menuText, item.destructive && styles.destructiveText]}>
                    {item.label}
                  </Text>
                  {item.hasSubmenu && (
                    <Feather name="chevron-right" size={16} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              ))}

              {/* --- VIEW: CHANGE TYPE --- */}
              {currentView === 'change_type' && CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.menuItem}
                  onPress={() => handleCategorySelect(cat)}
                >
                  <View style={[styles.colorDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                  <Text style={[styles.menuText, task.category === cat && styles.selectedText]}>
                    {cat}
                  </Text>
                  {task.category === cat && <Feather name="check" size={16} color="#3B82F6" />}
                </TouchableOpacity>
              ))}

              {/* --- VIEW: REPEAT --- */}
              {currentView === 'repeat' && REPEAT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.menuItem, opt.destructive && styles.destructiveItem]}
                  onPress={() => handleRepeatSelect(opt)}
                >
                  <Text style={[styles.menuText, opt.destructive && styles.destructiveText]}>
                    {opt.label}
                  </Text>
                  {/* Logic check active repeat hiển thị icon check ở đây */}
                </TouchableOpacity>
              ))}

              {/* --- VIEW: MOVE TO --- */}
              {currentView === 'move_to' && (
                folders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No folders available</Text>
                  </View>
                ) : (
                  folders.map((folder: any) => (
                    <TouchableOpacity
                      key={folder._id}
                      style={[styles.menuItem, task.folderId === folder._id && styles.disabledItem]}
                      onPress={() => handleFolderSelect(folder)}
                      disabled={task.folderId === folder._id}
                    >
                      <Feather name="folder" size={16} color={task.folderId === folder._id ? '#3B82F6' : '#6B7280'} style={styles.icon} />
                      <Text style={[styles.menuText, task.folderId === folder._id && styles.selectedText]}>
                        {folder.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )
              )}

            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // Backdrop mờ nhẹ
  },
  menuContainer: {
    position: 'absolute',
    width: 220,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  submenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  submenuTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 24, // Cân bằng với nút back
  },
  icon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  selectedText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  destructiveItem: {
    backgroundColor: '#FEF2F2',
  },
  destructiveText: {
    color: '#DC2626',
  },
  disabledItem: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  }
});