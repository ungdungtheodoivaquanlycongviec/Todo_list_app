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
  Alert,
  Platform
} from 'react-native';
import {
  CheckCircle,
  PlayCircle,
  StopCircle,
  Repeat, // Thay cho RefreshCw
  FolderInput,
  Copy,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Settings,
  XCircle,
  AlertTriangle,
  Folder as FolderIcon,
  Tag,
  Check
} from 'lucide-react-native';

import { Task } from '../../types/task.types';
import { Folder } from '../../types/folder.types';
import { useTimer } from '../../context/TimerContext';
import { useFolder } from '../../context/FolderContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
// Hàm này cần được port từ utils/groupRoleUtils.ts (đã sửa ở bước trước)
import { requiresFolderAssignment } from '../../utils/groupRoleUtils'; 

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TaskContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  task: Task;
  onAction: (action: string, task: Task, payload?: any) => void;
  onClose: () => void;
}

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
  { key: 'divider', label: 'Time-based', isDivider: true },
  { key: 'daily', label: 'Every day', frequency: 'daily', interval: 1 },
  { key: 'workday', label: 'Every workday', frequency: 'daily', interval: 1, workdaysOnly: true },
  { key: 'weekly', label: 'Every week', frequency: 'weekly', interval: 1 },
  { key: 'monthly', label: 'Every month', frequency: 'monthly', interval: 1 },
  { key: 'yearly', label: 'Every year', frequency: 'yearly', interval: 1 },
  { key: 'custom', label: 'Customize repeat', isCustom: true },
  { key: 'remove', label: 'Remove repeat', isRemove: true },
];

export default function TaskContextMenu({ 
  visible, 
  x, 
  y, 
  task, 
  onAction, 
  onClose 
}: TaskContextMenuProps) {
  // --- Context Hooks ---
  const { t } = useLanguage();
  const { isTimerRunning } = useTimer();
  const { folders } = useFolder();
  const { currentGroup } = useAuth();

  // --- Local State ---
  const [currentView, setCurrentView] = useState<'main' | 'change_type' | 'repeat' | 'move_to'>('main');
  
  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Logic Variables
  const taskHasRunningTimer = isTimerRunning(task._id);
  const canUseTimer = task.status !== 'completed' && task.status !== 'incomplete';

  // --- Effects ---
  useEffect(() => {
    if (visible) {
      setCurrentView('main');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  // --- Logic Check Quyền (Port từ Web) ---
  const getAssigneesWithoutAccess = (targetFolder: Folder): string[] => {
    const missingAssignees: string[] = [];
    const folderMemberIds = new Set(targetFolder.memberAccess?.map(m => m.userId) || []);

    task.assignedTo.forEach(assignment => {
      const userId = typeof assignment.userId === 'string' ? assignment.userId : assignment.userId._id;
      let userName = 'Unknown User';

      if (typeof assignment.userId === 'object' && assignment.userId) {
        userName = assignment.userId.name || 'Unknown User';
      } else if (typeof assignment.userId === 'string') {
        const member = currentGroup?.members?.find((m: any) => {
          const mId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
          return mId === userId;
        });
        if (member) {
          const userObj = typeof member.userId === 'object' ? member.userId : null;
          userName = userObj?.name || member.name || 'Unknown User';
        }
      }

      const groupMember = currentGroup?.members?.find((m: any) => {
        const memberId = typeof m.userId === 'string' ? m.userId : m.userId?._id;
        return memberId === userId;
      });

      // Nếu user có role full access (không cần gán folder) thì bỏ qua check
      if (!groupMember || !requiresFolderAssignment(groupMember.role)) {
        return; 
      }

      // Nếu user cần gán folder mà không có trong list -> Thêm vào warning
      if (!folderMemberIds.has(userId)) {
        missingAssignees.push(userName);
      }
    });

    return missingAssignees;
  };

  // --- Handlers ---

  const handleMainAction = (action: string) => {
    if (['change_type', 'repeat', 'move_to'].includes(action)) {
      setCurrentView(action as any);
    } else {
      if (action === 'timer') {
        onAction(taskHasRunningTimer ? 'stop_timer' : 'start_timer', task);
      } else if (action === 'delete') {
        // Confirm delete trên mobile cho an toàn
        Alert.alert(
          t('common.confirm'),
          t('taskContextMenu.confirmDelete'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: () => {
              onAction('delete', task);
              onClose();
            }}
          ]
        );
        return; // Đợi user confirm
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
    if (option.isDivider) return;

    if (option.isCustom) {
      onAction('repeat_custom', task);
    } else if (option.isRemove) {
      onAction('remove_repeat', task);
    } else if (option.key === 'after_completion') {
      onAction('repeat_after_completion', task);
    } else {
      onAction('set_repeat', task, {
        isRepeating: true,
        frequency: option.frequency,
        interval: option.interval,
        workdaysOnly: option.workdaysOnly
      });
    }
    onClose();
  };

  const handleFolderSelect = (folder: Folder) => {
    const currentFolderId = typeof task.folderId === 'object' ? task.folderId?._id : task.folderId;
    
    if (currentFolderId === folder._id) return;

    // Check quyền trước khi move
    const missingAssignees = getAssigneesWithoutAccess(folder);

    if (missingAssignees.length > 0) {
      // Dùng Alert của Native thay vì Modal lồng nhau
      Alert.alert(
        'Cannot Move Task',
        `The following assignees don't have access to this folder:\n\n${missingAssignees.join(', ')}`,
        [{ text: 'OK', onPress: () => {} }]
      );
    } else {
      onAction('move_to_folder', task, { folderId: folder._id });
      onClose();
    }
  };

  // --- Positioning ---
  const position = useMemo(() => {
    const width = 240;
    const estimatedHeight = 350; // Max height của menu
    let left = x;
    let top = y;

    // Giữ menu trong màn hình
    if (x + width > SCREEN_WIDTH) left = SCREEN_WIDTH - width - 16;
    if (y + estimatedHeight > SCREEN_HEIGHT) top = SCREEN_HEIGHT - estimatedHeight - 30;
    
    // Đảm bảo không bị che bởi status bar
    if (top < 40) top = 40;

    return { top, left };
  }, [x, y]);

  // --- Render ---
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
            {/* Header cho Submenu */}
            {currentView !== 'main' && (
              <View style={styles.submenuHeader}>
                <TouchableOpacity onPress={() => setCurrentView('main')} style={styles.backBtn} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                  <ChevronLeft size={20} color="#374151" />
                  <Text style={styles.backText}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.submenuTitle}>
                  {currentView === 'change_type' ? t('taskContextMenu.changeType') : 
                   currentView === 'repeat' ? t('taskContextMenu.repeat') : t('taskContextMenu.moveTo')}
                </Text>
                <View style={{width: 20}} /> 
              </View>
            )}

            <ScrollView 
              style={styles.scrollContainer} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              
              {/* --- VIEW: MAIN MENU --- */}
              {currentView === 'main' && (
                <>
                  <MenuItem 
                    icon={CheckCircle} 
                    label={t('taskContextMenu.complete')} 
                    onPress={() => handleMainAction('complete')} 
                    iconColor="#10B981"
                  />
                  
                  {canUseTimer && (
                    <MenuItem 
                      icon={taskHasRunningTimer ? StopCircle : PlayCircle}
                      label={taskHasRunningTimer ? t('taskContextMenu.stopTimer') : t('taskContextMenu.startTimer')}
                      onPress={() => handleMainAction('timer')}
                      iconColor={taskHasRunningTimer ? '#EF4444' : '#6B7280'}
                    />
                  )}

                  <Divider />

                  <MenuItem icon={Tag} label={t('taskContextMenu.changeType')} onPress={() => handleMainAction('change_type')} hasSubmenu />
                  <MenuItem icon={Repeat} label={t('taskContextMenu.repeat')} onPress={() => handleMainAction('repeat')} hasSubmenu />
                  <MenuItem icon={FolderInput} label={t('taskContextMenu.moveTo')} onPress={() => handleMainAction('move_to')} hasSubmenu />
                  
                  <Divider />

                  <MenuItem icon={Copy} label={t('taskContextMenu.duplicate')} onPress={() => handleMainAction('duplicate')} />
                  <MenuItem icon={Trash2} label={t('taskContextMenu.delete')} onPress={() => handleMainAction('delete')} destructive />
                </>
              )}

              {/* --- VIEW: CHANGE TYPE --- */}
              {currentView === 'change_type' && (
                <>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.menuItem}
                      onPress={() => handleCategorySelect(cat)}
                    >
                      <View style={[styles.colorDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                      <Text style={[styles.menuText, task.category === cat && styles.selectedText]}>
                        {cat}
                      </Text>
                      {task.category === cat && <Check size={16} color="#3B82F6" />}
                    </TouchableOpacity>
                  ))}
                  <Divider />
                  <MenuItem icon={Settings} label="Edit types" onPress={() => {}} />
                </>
              )}

              {/* --- VIEW: REPEAT --- */}
              {currentView === 'repeat' && REPEAT_OPTIONS.map((opt) => {
                if (opt.isDivider) {
                  return <Text key={opt.key} style={styles.dividerLabel}>{opt.label}</Text>;
                }
                
                // Ẩn nút Remove nếu chưa có repeat
                if (opt.isRemove && !task.repetition?.isRepeating) return null;

                const isActive = task.repetition?.isRepeating && task.repetition?.frequency === opt.frequency;

                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.menuItem, opt.isRemove && styles.destructiveItem]}
                    onPress={() => handleRepeatSelect(opt)}
                  >
                    {opt.isRemove ? (
                      <XCircle size={18} color="#DC2626" style={styles.icon} />
                    ) : opt.isCustom ? (
                      <Settings size={18} color="#4B5563" style={styles.icon} />
                    ) : (
                      <Repeat size={18} color={isActive ? '#3B82F6' : '#9CA3AF'} style={styles.icon} />
                    )}
                    
                    <Text style={[
                      styles.menuText, 
                      isActive && styles.selectedText,
                      opt.isRemove && styles.destructiveText
                    ]}>
                      {opt.label}
                    </Text>
                    {isActive && <Check size={16} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              })}

              {/* --- VIEW: MOVE TO --- */}
              {currentView === 'move_to' && (
                folders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No folders available</Text>
                  </View>
                ) : (
                  folders.map((folder: any) => {
                    const currentFolderId = typeof task.folderId === 'object' ? task.folderId?._id : task.folderId;
                    const isCurrent = currentFolderId === folder._id;
                    // Logic check quyền để hiện icon warning (không chặn click ở UI, chặn ở logic handle)
                    const missing = getAssigneesWithoutAccess(folder);
                    const hasWarning = missing.length > 0;

                    return (
                      <TouchableOpacity
                        key={folder._id}
                        style={[styles.menuItem, isCurrent && styles.disabledItem]}
                        onPress={() => handleFolderSelect(folder)}
                        disabled={isCurrent}
                      >
                        <FolderIcon size={18} color={isCurrent ? '#3B82F6' : '#6B7280'} style={styles.icon} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.menuText, isCurrent && styles.selectedText]} numberOfLines={1}>
                            {folder.name}
                          </Text>
                          {folder.isDefault && <Text style={styles.subText}>(default)</Text>}
                        </View>
                        {hasWarning && !isCurrent && (
                          <AlertTriangle size={16} color="#F59E0B" />
                        )}
                        {isCurrent && <Check size={16} color="#3B82F6" />}
                      </TouchableOpacity>
                    );
                  })
                )
              )}

            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// --- Components Con ---
const MenuItem = ({ icon: Icon, label, onPress, destructive, hasSubmenu, iconColor }: any) => (
  <TouchableOpacity
    style={[styles.menuItem, destructive && styles.destructiveItem]}
    onPress={onPress}
  >
    <Icon size={18} color={destructive ? '#DC2626' : (iconColor || '#4B5563')} style={styles.icon} />
    <Text style={[styles.menuText, destructive && styles.destructiveText]}>{label}</Text>
    {hasSubmenu && <ChevronRight size={16} color="#9CA3AF" />}
  </TouchableOpacity>
);

const Divider = () => <View style={styles.divider} />;

// --- Styles ---
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menuContainer: {
    position: 'absolute',
    width: 240,
    maxHeight: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  scrollContainer: {
    maxHeight: 350,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  submenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    justifyContent: 'space-between'
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 4,
  },
  submenuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  subText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  destructiveItem: {
    backgroundColor: '#FEF2F2',
  },
  destructiveText: {
    color: '#DC2626',
  },
  disabledItem: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  selectedText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16, // Căn chỉnh với icon
    marginLeft: 3,   // Căn chỉnh nhẹ
  },
  dividerLabel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  }
});