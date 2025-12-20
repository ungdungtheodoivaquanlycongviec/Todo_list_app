import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  RefreshControl,
  ScrollView
} from 'react-native';
import {
  X, Flag, CheckCircle, PlayCircle, StopCircle,
  MessageSquare, Edit2, Trash2, Send, Plus,
  User as UserIcon, Paperclip, CheckSquare, Square, ChevronDown,
  Timer, RefreshCw, FileText, Upload
} from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTimer } from '../../context/TimerContext';
import { useAuth } from '../../context/AuthContext';
import { useFolder } from '../../context/FolderContext';
import { taskService } from '../../services/task.service';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';
import { 
  getMemberRole
  // XÓA IMPORT GROUP_ROLE_KEYS GÂY LỖI
} from '../../utils/groupRoleUtils';

import { Task } from '../../types/task.types';

// --- 1. ĐỊNH NGHĨA LOCAL (Fix lỗi thiếu Type) ---
interface LocalSubtask {
  _id: string;
  title: string;
  completed: boolean;
}

interface LocalAttachment {
  _id: string;
  name: string;
  url: string;
  type?: string;
  size: number;
  filename?: string;
  mimetype?: string;
}

// --- 2. ĐỊNH NGHĨA CONST LOCAL (Fix lỗi module not exported) ---
const GROUP_ROLE_KEYS = {
  PRODUCT_OWNER: 'PRODUCT_OWNER',
  PM: 'PM'
};

// Setup dayjs
dayjs.extend(relativeTime);

interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskUpdate: (updatedTask: Task) => void;
  onTaskDelete: (taskId: string) => void;
  taskId: string;
}

export default function TaskDetailModal({
  visible,
  onClose,
  onTaskUpdate,
  onTaskDelete,
  taskId,
}: TaskDetailModalProps) {
  // --- Hooks ---
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { user: currentUser, currentGroup } = useAuth();
  const { currentFolder } = useFolder();
  const { isTimerRunning } = useTimer(); // Chỉ lấy trạng thái, không dùng hàm start/stop của context để tránh lỗi tham số
  
  // Fake Regional
  const formatDate = (d: string) => dayjs(d).format('DD/MM/YYYY');

  // --- State ---
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Edit States
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  
  // Modals
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Forms
  const [newTimeEntry, setNewTimeEntry] = useState({
    date: dayjs().format('YYYY-MM-DD'),
    hours: '0',
    minutes: '0',
    description: '',
    billable: true
  });

  // Timer UI
  const [localElapsedTime, setLocalElapsedTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Logic Quyền ---
  const userRole = getMemberRole(currentGroup, currentUser?._id);
  const isCreator = task?.createdBy?._id === currentUser?._id;
  
  // Sử dụng biến GROUP_ROLE_KEYS định nghĩa nội bộ
  const canManage = isCreator || userRole === GROUP_ROLE_KEYS.PRODUCT_OWNER || userRole === GROUP_ROLE_KEYS.PM;
  const canEdit = true; 

  const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
  const STATUS_OPTIONS = ['todo', 'in_progress', 'completed', 'cancelled'];

  // --- Realtime ---
  useTaskRealtime({
    onTaskUpdated: ({ task: updatedTask, taskId: updatedId }) => {
      if (updatedId === taskId && updatedTask) {
        setTask((prev: any) => ({ ...prev, ...updatedTask }));
        onTaskUpdate(updatedTask);
      }
    },
    onTaskDeleted: ({ taskId: deletedId }) => {
      if (deletedId === taskId) {
        onClose();
        onTaskDelete(taskId);
      }
    }
  });

  // --- API ---
  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;
    try {
      const response = await taskService.getTaskById(taskId) as any;
      if (response.success) {
        setTask(response.data);
      }
    } catch (error) {
      Alert.alert(t('error.generic'), t('error.notFound'));
      onClose();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId, t, onClose]);

  const fetchComments = useCallback(async (page = 1, reset = false) => {
    if (!taskId) return;
    try {
      if (page > 1) setLoadingMoreComments(true);
      const res = await taskService.getComments(taskId, { page, limit: 10 }) as any;
      
      if (reset) {
        setComments(res.comments);
        setCommentsPage(1);
      } else {
        setComments(prev => [...prev, ...res.comments]);
        setCommentsPage(page);
      }
      setHasMoreComments(res.pagination.hasNextPage);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMoreComments(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchTaskDetails();
      fetchComments(1, true);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [visible, fetchTaskDetails, fetchComments]);

  // --- Timer ---
  const taskHasRunningTimer = isTimerRunning(taskId);
  useEffect(() => {
    if (taskHasRunningTimer) {
      timerIntervalRef.current = setInterval(() => {
        setLocalElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setLocalElapsedTime(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [taskHasRunningTimer]);

  const handleToggleTimer = async () => {
    try {
      if (taskHasRunningTimer) {
        // --- FIX LỖI: Dùng taskService thay vì Context function thiếu tham số ---
        await (taskService as any).stopTimer(taskId);
      } else {
        // --- FIX LỖI: Dùng taskService thay vì Context function thiếu tham số ---
        await (taskService as any).startTimer(taskId);
      }
      fetchTaskDetails(); // Reload để cập nhật trạng thái
    } catch (error) {
      Alert.alert(t('error.generic'));
    }
  };

  // --- Updates ---
  const handleUpdateTask = async (field: string, value: any) => {
    if (!task) return;
    const oldTask = { ...task };
    setTask({ ...task, [field]: value });

    try {
      const res = await taskService.updateTask(task._id, { [field]: value }) as any;
      if (res.success) {
        onTaskUpdate(res.data);
        setTask(res.data);
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      setTask(oldTask);
      Alert.alert(t('error.tryAgain'));
    }
  };

  // --- Subtasks ---
  const handleToggleSubtask = (subtaskId: string) => {
    if (!task) return;
    const updatedSubtasks = task.subtasks?.map((s: LocalSubtask) => 
      s._id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    handleUpdateTask('subtasks', updatedSubtasks);
  };

  const handleAddSubtask = () => {
    Alert.prompt(
      t('tasks.subtasks' as any),
      t('tasks.enterSubtaskName' as any),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.add'),
          onPress: (text) => {
            if (text && task) {
              const newSubtask = { title: text, completed: false };
              const updated = [...(task.subtasks || []), newSubtask];
              handleUpdateTask('subtasks', updated);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !task) return;
    setIsSendingComment(true);
    try {
      const res = await taskService.addComment(task._id, commentText) as any;
      if (res.success) {
        setCommentText('');
        fetchComments(1, true);
      }
    } catch (error) {
      Alert.alert(t('error.generic'));
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleLogTime = async () => {
    if (!task) return;
    try {
      const hours = parseInt(newTimeEntry.hours) || 0;
      const minutes = parseInt(newTimeEntry.minutes) || 0;
      if (hours === 0 && minutes === 0) return;

      const entry = {
        date: new Date(newTimeEntry.date).toISOString(),
        hours,
        minutes,
        description: newTimeEntry.description,
        billable: newTimeEntry.billable,
        user: currentUser?._id
      };

      const updatedEntries = [...(task.timeEntries || []), entry];
      
      let statusUpdate = {};
      if (task.status === 'todo') statusUpdate = { status: 'in_progress' };

      await taskService.updateTask(taskId, {
        timeEntries: updatedEntries,
        ...statusUpdate
      });
      
      setShowTimeLogModal(false);
      fetchTaskDetails();
    } catch (error) {
      Alert.alert(t('error.generic'));
    }
  };

  // --- Render Helpers ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderHeader = () => (
    <View style={[styles.headerContent, isDark && styles.darkContainer]}>
      {editingField === 'title' ? (
        <TextInput
          style={[styles.titleInput, isDark && styles.darkText]}
          value={tempValue}
          onChangeText={setTempValue}
          onBlur={() => { handleUpdateTask('title', tempValue); setEditingField(null); }}
          autoFocus
          multiline
        />
      ) : (
        <TouchableOpacity onPress={() => { setEditingField('title'); setTempValue(task?.title || ''); }}>
          <Text style={[styles.titleText, isDark && styles.darkText]}>
            {task?.title || t('misc.untitledTask')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.badge, { borderColor: getStatusColor(task?.status || '') }]}
          onPress={() => setShowStatusPicker(true)}
        >
          <View style={[styles.dot, { backgroundColor: getStatusColor(task?.status || '') }]} />
          <Text style={[styles.badgeText, isDark && styles.darkText]}>
            {t(`status.${task?.status}` as any)}
          </Text>
          <ChevronDown size={14} color={isDark ? '#9CA3AF' : '#4B5563'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.badge, { borderColor: getPriorityColor(task?.priority || '') }]}
          onPress={() => setShowPriorityPicker(true)}
        >
          <Flag size={14} color={getPriorityColor(task?.priority || '')} />
          <Text style={[styles.badgeText, isDark && styles.darkText]}>
            {t(`priority.${task?.priority}` as any)}
          </Text>
        </TouchableOpacity>
      </View>

      {task?.status !== 'completed' && (
        <View style={[styles.card, isDark && styles.darkCard]}>
          <View>
            <Text style={[styles.label, isDark && styles.darkSubText]}>{t('taskDetail.time')}</Text>
            <Text style={[styles.timerText, isDark && styles.darkText]}>
              {formatTime(localElapsedTime)}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.playBtn, taskHasRunningTimer ? styles.stopBtn : {}]}
            onPress={handleToggleTimer}
          >
            {taskHasRunningTimer ? <StopCircle size={24} color="#FFF" /> : <PlayCircle size={24} color="#FFF" />}
            <Text style={styles.playBtnText}>
              {taskHasRunningTimer ? t('taskDetail.stopTimer') : t('taskDetail.startTime')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll}>
        <TouchableOpacity style={[styles.actionBtn, isDark && styles.darkCard]} onPress={() => setShowTimeLogModal(true)}>
          <Timer size={16} color="#3B82F6" />
          <Text style={[styles.actionBtnText, isDark && styles.darkText]}>{t('taskDetail.logTime')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, isDark && styles.darkCard]} onPress={() => setShowRepeatModal(true)}>
          <RefreshCw size={16} color="#10B981" />
          <Text style={[styles.actionBtnText, isDark && styles.darkText]}>{t('taskDetail.repeatTask')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, isDark && styles.darkCard]} onPress={() => setShowAssignModal(true)}>
          <UserIcon size={16} color="#8B5CF6" />
          <Text style={[styles.actionBtnText, isDark && styles.darkText]}>{t('assignee.addAssignee')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.divider, isDark && styles.darkBorder]} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Edit2 size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{t('tasks.description')}</Text>
        </View>
        {editingField === 'description' ? (
          <TextInput
            style={[styles.descInput, isDark && styles.darkText]}
            value={tempValue}
            onChangeText={setTempValue}
            onBlur={() => { handleUpdateTask('description', tempValue); setEditingField(null); }}
            multiline
            autoFocus
          />
        ) : (
          <TouchableOpacity onPress={() => { setEditingField('description'); setTempValue(task?.description || ''); }}>
            <Text style={[styles.descText, isDark && styles.darkText]}>
              {task?.description || t('tasks.descriptionPlaceholder')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CheckSquare size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{t('tasks.subtasks' as any)}</Text>
          <TouchableOpacity onPress={handleAddSubtask} style={{ marginLeft: 'auto' }}>
            <Plus size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        {task?.subtasks?.map((sub: LocalSubtask) => (
          <TouchableOpacity 
            key={sub._id} 
            style={styles.subtaskRow}
            onPress={() => handleToggleSubtask(sub._id)}
          >
            {sub.completed ? (
              <CheckSquare size={20} color="#10B981" />
            ) : (
              <Square size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            )}
            <Text style={[styles.subtaskText, isDark && styles.darkText, sub.completed && styles.completedText]}>
              {sub.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Paperclip size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{t('tasks.attachments')}</Text>
          <TouchableOpacity style={{ marginLeft: 'auto' }}>
            <Upload size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {task?.attachments?.map((file: LocalAttachment, idx: number) => (
            <TouchableOpacity key={idx} style={[styles.fileCard, isDark && styles.darkCard]}>
              <View style={styles.fileIconBox}>
                <FileText size={24} color="#3B82F6" />
              </View>
              <Text numberOfLines={1} style={[styles.fileName, isDark && styles.darkText]}>
                {file.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.sectionHeader, { marginTop: 10 }]}>
        <MessageSquare size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          {t('tasks.comments')} ({comments.length})
        </Text>
      </View>
    </View>
  );

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.user?.name?.charAt(0) || 'U'}</Text>
      </View>
      <View style={[styles.commentBubble, isDark && styles.darkCard]}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentUser, isDark && styles.darkText]}>{item.user?.name || 'User'}</Text>
          <Text style={styles.commentDate}>{dayjs(item.createdAt).fromNow()}</Text>
        </View>
        <Text style={[styles.commentContent, isDark && styles.darkText]}>{item.content}</Text>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <View style={[styles.navBar, isDark && styles.darkBorder]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <X size={24} color={isDark ? '#F3F4F6' : '#111827'} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {canManage && (
              <TouchableOpacity onPress={() => Alert.alert(t('common.delete'), t('taskContextMenu.confirmDelete' as any), [{text: t('common.cancel')}, {text: t('common.delete'), onPress: () => onTaskDelete(taskId), style: 'destructive'}])}>
                <Trash2 size={24} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading && !task ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item._id}
              ListHeaderComponent={renderHeader()}
              contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTaskDetails(); }} />}
              onEndReached={() => hasMoreComments && fetchComments(commentsPage + 1)}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMoreComments ? <ActivityIndicator color="#3B82F6" /> : null}
            />

            <View style={[styles.footer, isDark && styles.darkFooter]}>
              <TextInput
                style={[styles.input, isDark && styles.darkInput]}
                placeholder={t('chat.typeMessage')}
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, (!commentText.trim() || isSendingComment) && styles.disabled]} 
                onPress={handleSendComment}
                disabled={!commentText.trim() || isSendingComment}
              >
                {isSendingComment ? <ActivityIndicator color="#FFF" size="small"/> : <Send size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* MODALS */}
        <Modal visible={showStatusPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowStatusPicker(false)}>
            <View style={[styles.modalContent, isDark && styles.darkContainer]}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>{t('tasks.status')}</Text>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.optionRow} onPress={() => { handleUpdateTask('status', opt); setShowStatusPicker(false); }}>
                  <View style={[styles.dot, { backgroundColor: getStatusColor(opt) }]} />
                  <Text style={[styles.optionText, isDark && styles.darkText]}>{t(`status.${opt}` as any)}</Text>
                  {task?.status === opt && <CheckCircle size={18} color="#3B82F6" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showPriorityPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowPriorityPicker(false)}>
            <View style={[styles.modalContent, isDark && styles.darkContainer]}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>{t('tasks.priority')}</Text>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={styles.optionRow} onPress={() => { handleUpdateTask('priority', opt); setShowPriorityPicker(false); }}>
                  <Flag size={18} color={getPriorityColor(opt)} />
                  <Text style={[styles.optionText, isDark && styles.darkText]}>{t(`priority.${opt}` as any)}</Text>
                  {task?.priority === opt && <CheckCircle size={18} color="#3B82F6" />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showTimeLogModal} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, isDark && styles.darkContainer]}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>{t('taskDetail.logTime')}</Text>
              <View style={styles.formRow}>
                <Text style={[styles.label, isDark && styles.darkText]}>{t('taskDetail.hours')}</Text>
                <TextInput style={[styles.input, isDark && styles.darkInput]} keyboardType="numeric" value={newTimeEntry.hours} onChangeText={(t) => setNewTimeEntry({...newTimeEntry, hours: t})} />
              </View>
              <View style={styles.formRow}>
                <Text style={[styles.label, isDark && styles.darkText]}>{t('taskDetail.minutes')}</Text>
                <TextInput style={[styles.input, isDark && styles.darkInput]} keyboardType="numeric" value={newTimeEntry.minutes} onChangeText={(t) => setNewTimeEntry({...newTimeEntry, minutes: t})} />
              </View>
              <TextInput style={[styles.input, isDark && styles.darkInput, { marginTop: 10 }]} placeholder={t('taskDetail.description')} placeholderTextColor="#9CA3AF" value={newTimeEntry.description} onChangeText={(t) => setNewTimeEntry({...newTimeEntry, description: t})} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTimeLogModal(false)}><Text style={styles.cancelBtnText}>{t('common.cancel')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleLogTime}><Text style={styles.confirmBtnText}>{t('common.save')}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  darkContainer: { backgroundColor: '#1F2937' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  darkBorder: { borderBottomColor: '#374151' },
  iconBtn: { padding: 4 },
  headerContent: { marginBottom: 20 },
  titleInput: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  titleText: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  darkText: { color: '#F9FAFB' },
  darkSubText: { color: '#9CA3AF' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '500', color: '#374151', textTransform: 'capitalize' },
  card: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  darkCard: { backgroundColor: '#374151' },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  timerText: { fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  playBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  stopBtn: { backgroundColor: '#EF4444' },
  playBtnText: { color: '#FFF', fontWeight: '600' },
  actionsScroll: { flexDirection: 'row', marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginRight: 10, gap: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  actionBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  descInput: { fontSize: 15, color: '#374151', minHeight: 60, textAlignVertical: 'top' },
  descText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  subtaskText: { fontSize: 15, color: '#374151', flex: 1 },
  completedText: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  fileCard: { width: 100, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8, marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  fileIconBox: { width: 36, height: 36, backgroundColor: '#EBF5FF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  fileName: { fontSize: 11, color: '#374151', textAlign: 'center' },
  commentItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: '#6B7280' },
  commentBubble: { flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, borderTopLeftRadius: 2 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { fontSize: 13, fontWeight: '700', color: '#111827' },
  commentDate: { fontSize: 10, color: '#9CA3AF' },
  commentContent: { fontSize: 14, color: '#374151', lineHeight: 20 },
  footer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFF', alignItems: 'flex-end', gap: 10 },
  darkFooter: { backgroundColor: '#1F2937', borderTopColor: '#374151' },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: '#111827', maxHeight: 100 },
  darkInput: { backgroundColor: '#374151', color: '#F9FAFB' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  disabled: { backgroundColor: '#E5E7EB' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#111827' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  optionText: { fontSize: 16, flex: 1, color: '#111827' },
  formRow: { marginBottom: 12 },
  confirmBtn: { flex: 1, backgroundColor: '#3B82F6', padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: '600' },
  cancelBtnText: { color: '#374151' },
});