import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  Alert, StyleSheet, SafeAreaView, ActivityIndicator, Platform, 
  KeyboardAvoidingView, Linking, FlatList, Image
} from 'react-native';
import { 
  X, Calendar, Flag, Clock, User, 
  Trash2, Send, Paperclip, Check, PlayCircle, 
  Plus, RefreshCw, Timer, StopCircle, 
  Briefcase, File, ChevronDown, Download, Image as ImageIcon, AlignLeft,
  Users
} from 'lucide-react-native';
import * as ImagePicker from 'react-native-image-picker'; 
import DocumentPicker from 'react-native-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

import { taskService, Task } from '../../services/task.service';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRegional } from '../../context/RegionalContext';
import { GroupMember } from '../../types/group.types';
import { API_URL, BASE_URL } from '../../config/api.config';

// --- Helper fix URL ảnh ---
const getValidUrl = (url: string | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanPath = url.replace(/\\/g, '/');
    return `${BASE_URL}/${cleanPath.replace(/^\//, '')}`;
};

// --- CONSTANTS ---
const STATUS_OPTIONS = [
  { value: 'todo', label: 'status.todo', color: '#9CA3AF' },
  { value: 'in_progress', label: 'status.inProgress', color: '#3B82F6' },
  { value: 'completed', label: 'status.completed', color: '#10B981' },
  { value: 'incomplete', label: 'status.incomplete', color: '#EF4444' },
  { value: 'archived', label: 'status.archived', color: '#6B7280' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'priority.low', color: '#10B981' },
  { value: 'medium', label: 'priority.medium', color: '#EAB308' },
  { value: 'high', label: 'priority.high', color: '#F59E0B' },
  { value: 'urgent', label: 'priority.urgent', color: '#EF4444' }
];

const CATEGORY_OPTIONS = [
  { value: 'Operational', label: 'category.operational' },
  { value: 'Strategic', label: 'category.strategic' },
  { value: 'Financial', label: 'category.financial' },
  { value: 'Technical', label: 'category.technical' },
  { value: 'Other', label: 'category.other' }
];

const SCHEDULE_STATUS_OPTIONS = [
    { value: 'scheduled', label: 'taskDetail.scheduled', color: '#3B82F6' },
    { value: 'in-progress', label: 'taskDetail.inProgress', color: '#EAB308' },
    { value: 'completed', label: 'taskDetail.completed', color: '#10B981' },
    { value: 'cancelled', label: 'taskDetail.cancelled', color: '#EF4444' }
];

interface TaskDetailModalProps {
  visible: boolean;
  taskId: string;
  onClose: () => void;
  onTaskUpdate: (updatedTask: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  groupMembers?: GroupMember[];
}

export default function TaskDetailModal({ 
  visible, taskId, onClose, onTaskUpdate, onTaskDelete, groupMembers = []
}: TaskDetailModalProps) {
  const { user: currentUser, currentGroup } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { formatDate, convertFromUserTimezone } = useRegional();

  // --- STATE ---
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals Visibility
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showScheduleStatusPicker, setShowScheduleStatusPicker] = useState(false);
  
  // Forms Visibility
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showRepeatForm, setShowRepeatForm] = useState(false);

  // Form Data
  const [newSchedule, setNewSchedule] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    hours: '0', minutes: '0', status: 'scheduled', desc: '' 
  });
  const [newTime, setNewTime] = useState({ 
    date: new Date().toISOString().split('T')[0],
    hours: '', minutes: '', description: '' 
  });
  const [repeatSettings, setRepeatSettings] = useState({ 
    frequency: 'weekly', interval: '1', endDate: '' 
  });

  // Edit State
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  // Comments & Timer
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<any>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Computed Members List
  const membersList = useMemo(() => {
    if (groupMembers && groupMembers.length > 0) return groupMembers;
    if (currentGroup && currentGroup.members) return currentGroup.members;
    return [];
  }, [groupMembers, currentGroup]);

  // --- HELPER: Safe Date ---
  const safeDate = (dateString: string | undefined) => {
    if (!dateString) return '---';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return '---'; }
  };

  const getStatusColor = (val: string) => STATUS_OPTIONS.find(o => o.value === val)?.color || '#9CA3AF';
  const getStatusLabel = (val: string) => {
      const opt = STATUS_OPTIONS.find(o => o.value === val);
      return opt ? (t(opt.label as any) || opt.label) : val;
  };
  const getPriorityColor = (val: string) => PRIORITY_OPTIONS.find(o => o.value === val)?.color || '#10B981';
  const getScheduleStatusLabel = (val: string) => {
      const opt = SCHEDULE_STATUS_OPTIONS.find(o => o.value === val);
      return opt ? (t(opt.label as any) || opt.label) : val;
  };

  const getTotalLoggedTime = () => {
    if (!task || !(task as any).timeEntries) return '0h 0m';
    const entries = (task as any).timeEntries;
    let totalMinutes = 0;
    entries.forEach((e: any) => {
      totalMinutes += (e.hours || 0) * 60 + (e.minutes || 0);
    });
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  // --- LOAD DATA ---
  useEffect(() => {
    if (visible && taskId) loadTaskDetails();
  }, [visible, taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const [taskData, commentsData] = await Promise.all([
        taskService.getTaskById(taskId),
        taskService.getComments(taskId, { page: 1, limit: 50 })
      ]);
      syncTask(taskData);
      setComments(commentsData.comments.reverse());
    } catch (error) {
      Alert.alert(t('error.generic' as any), 'Failed to load task');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const syncTask = (updatedTask: Task) => {
    setTask(updatedTask);
    onTaskUpdate(updatedTask);
  };

  // --- ACTIONS ---
  const handleUpdateField = async (field: string, value: any) => {
    if (!task) return;
    try {
      let updateValue = value;
      if (field === 'dueDate' && value) {
         let d;
         if (value.includes('/')) {
             const [day, month, year] = value.split('/');
             d = new Date(`${year}-${month}-${day}`);
         } else {
             d = new Date(value);
         }
         if (isNaN(d.getTime())) {
             Alert.alert("Lỗi", "Định dạng ngày sai (DD/MM/YYYY)");
             return;
         }
         d.setHours(23,59,59,999);
         updateValue = d.toISOString();
      }
      const updatedTask = await taskService.updateTask(taskId, { [field]: updateValue });
      syncTask(updatedTask);
      setEditingField(null);
      setShowStatusPicker(false);
      setShowPriorityPicker(false);
      setShowCategoryPicker(false);
    } catch (e:any) { Alert.alert('Error', e.message); }
  };

  const handleToggleAssignee = async (userId: string) => {
    if (!task) return;
    try {
      const isAssigned = task.assignedTo?.some((a:any) => {
         const aId = (a.userId && typeof a.userId === 'object') ? a.userId._id : a.userId;
         return aId === userId;
      });
      if (isAssigned) await taskService.unassignUserFromTask(taskId, userId);
      else await taskService.assignUsersToTask(taskId, [userId]);
      
      const updatedTask = await taskService.getTaskById(taskId);
      syncTask(updatedTask);
    } catch (e:any) { Alert.alert('Error', e.message); }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
      if (!task) return;
      Alert.alert(t('common.delete' as any), "Bạn có chắc muốn xóa tệp này?", [
          {text: t('common.cancel' as any), style: 'cancel'},
          {text: t('common.delete' as any), style: 'destructive', onPress: async () => {
              try {
                  // Gọi API xóa attachment (Cần implement API này ở service nếu chưa có)
                  // Đây là giả lập cập nhật local để UI phản hồi
                  const newAttachments = task.attachments?.filter((a: any) => a._id !== attachmentId);
                  // Nếu backend hỗ trợ update attachments qua put task:
                  // const updatedTask = await taskService.updateTask(taskId, { attachments: newAttachments });
                  // Nếu chưa có, tạm thời ẩn khỏi UI hoặc gọi API delete specific
                  // await taskService.deleteAttachment(taskId, attachmentId); 
                  
                  // Tạm thời reload task để lấy dữ liệu mới nhất từ server
                  const updatedTask = await taskService.getTaskById(taskId);
                  syncTask(updatedTask);
              } catch (e: any) {
                  Alert.alert('Error', e.message);
              }
          }}
      ]);
  };

  // --- COMMENTS & FILES ---
  const handlePickImageForComment = () => {
      const options: ImagePicker.ImageLibraryOptions = { 
          mediaType: 'photo', 
          includeBase64: false,
          quality: 0.8
      };
      ImagePicker.launchImageLibrary(options, (response) => {
          if (!response.didCancel && !response.errorCode && response.assets) {
              setCommentAttachment(response.assets[0]);
          }
      });
  };

  const handleSendComment = async () => {
    if (!newComment.trim() && !commentAttachment) return;
    try {
      setSendingComment(true);
      if (commentAttachment) {
          const fileToUpload = {
              uri: Platform.OS === 'android' ? commentAttachment.uri : commentAttachment.uri?.replace('file://', ''),
              type: commentAttachment.type || 'image/jpeg',
              name: commentAttachment.fileName || `comment_img_${Date.now()}.jpg`
          };
          await taskService.addCommentWithFile(taskId, newComment.trim(), fileToUpload);
      } else {
          await taskService.addComment(taskId, newComment.trim());
      }
      const commentsData = await taskService.getComments(taskId, { page: 1, limit: 20 });
      setComments(commentsData.comments.reverse());
      setNewComment('');
      setCommentAttachment(null);
    } catch (error) { 
        Alert.alert('Error', 'Failed to send comment'); 
    } finally { 
        setSendingComment(false); 
    }
  };

  const handleUploadFile = async () => {
      try {
          const res = await DocumentPicker.pickSingle({
            type: [DocumentPicker.types.allFiles],
          });

          const formData = new FormData();
          const filePayload = {
            uri: res.uri,
            type: res.type,
            name: res.name,
          };

          formData.append('files', filePayload as any); 

          const token = await AsyncStorage.getItem('accessToken');
          if (!token) {
              Alert.alert("Lỗi", "Bạn chưa đăng nhập");
              return;
          }

          const response = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const responseText = await response.text();
          try {
             const result = JSON.parse(responseText);
             if (!response.ok) throw new Error(result.message || 'Upload failed');
             syncTask(result.data);
             Alert.alert("Thành công", "Đã tải tệp lên");
          } catch (jsonError) {
             throw new Error("Server Error: " + responseText);
          }

      } catch (err: any) {
          if (!DocumentPicker.isCancel(err)) {
            console.error("Upload Error:", err);
            Alert.alert('Upload Failed', err.message || 'Network request failed');
          }
      }
  };

  const handleDownloadFile = (url: string) => {
      if (!url) return;
      const validUrl = getValidUrl(url);
      if (validUrl) Linking.openURL(validUrl).catch(err => Alert.alert('Error', 'Cannot open file'));
  };

  const toggleTimer = async () => {
      try {
          let updatedTask;
          if (isTimerRunning) {
              updatedTask = await taskService.stopTimer(taskId);
              setIsTimerRunning(false); 
          } else {
              updatedTask = await taskService.startTimer(taskId);
              setIsTimerRunning(true);
          }
          syncTask(updatedTask);
      } catch (e:any) { Alert.alert('Timer Error', e.message); }
  };

  const submitTimeLog = async () => {
    if (!task || !currentUser) return;
    try {
        const payload = {
            date: new Date(newTime.date).toISOString(),
            hours: parseInt(newTime.hours) || 0,
            minutes: parseInt(newTime.minutes) || 0,
            description: newTime.description,
            billable: true,
            user: currentUser._id
        };
        const currentLog = (task as any).timeEntries || [];
        const updatedTask = await taskService.updateTask(taskId, { timeEntries: [...currentLog, payload] });
        syncTask(updatedTask);
        setShowTimeForm(false);
        setNewTime({date: new Date().toISOString().split('T')[0], hours:'', minutes:'', description:''});
    } catch (e:any) { Alert.alert('Error', e.message); }
  };

  const handleDeleteTimeEntry = async (index: number) => {
    if (!task) return;
    Alert.alert(t('common.delete' as any), t('tasks.deleteConfirm' as any), [{text:t('common.cancel' as any), style:'cancel'}, {text:t('common.delete' as any), onPress: async () => {
        const currentLog = (task as any).timeEntries || [];
        const newLog = currentLog.filter((_:any, i:number) => i !== index);
        const updatedTask = await taskService.updateTask(taskId, { timeEntries: newLog });
        syncTask(updatedTask);
    }}]);
  };

  const submitRepeat = async () => {
      try {
          const payload = {
              isRepeating: true,
              frequency: repeatSettings.frequency,
              interval: parseInt(repeatSettings.interval) || 1,
              endDate: repeatSettings.endDate ? new Date(repeatSettings.endDate).toISOString() : null
          };
          const updatedTask = await taskService.setTaskRepetition(taskId, payload);
          syncTask(updatedTask);
          Alert.alert('Success', 'Task repetition set');
          setShowRepeatForm(false);
      } catch(e:any) { Alert.alert('Error', e.message); }
  };

  const submitSchedule = async () => {
    if (!task || !currentUser) return;
    try {
        const payload = {
            user: currentUser._id,
            scheduledDate: new Date(newSchedule.date).toISOString(),
            estimatedHours: parseInt(newSchedule.hours) || 0,
            estimatedMinutes: parseInt(newSchedule.minutes) || 0,
            description: newSchedule.desc,
            status: newSchedule.status
        };
        const currentWork = (task as any).scheduledWork || [];
        const updatedTask = await taskService.updateTask(taskId, { scheduledWork: [...currentWork, payload] });
        syncTask(updatedTask);
        setShowScheduleForm(false);
        setNewSchedule({ date: new Date().toISOString().split('T')[0], hours: '0', minutes: '0', status: 'scheduled', desc: '' });
    } catch (e:any) { Alert.alert('Error', e.message); }
  };

  const handleDeleteSchedule = async (index: number) => {
      if(!task) return;
      Alert.alert(t('common.delete' as any), t('tasks.deleteConfirm' as any), [
          {text:t('common.cancel' as any), style:'cancel'}, 
          {text:t('common.delete' as any), onPress: async () => {
              const currentWork = (task as any).scheduledWork || [];
              const newWork = currentWork.filter((_:any, i:number) => i !== index);
              const updatedTask = await taskService.updateTask(taskId, { scheduledWork: newWork });
              syncTask(updatedTask);
          }}
      ]);
  };

  const handleDelete = () => {
    Alert.alert(t('common.delete' as any), t('tasks.deleteConfirm' as any), [
        { text: t('common.cancel' as any), style: 'cancel' },
        { text: t('common.delete' as any), style: 'destructive', onPress: async () => {
            await taskService.deleteTask(taskId);
            if (onTaskDelete) onTaskDelete(taskId);
            onClose();
        }}
    ]);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        
        {/* HEADER */}
        <View style={[styles.header, isDark && styles.darkBorder]}>
            <TouchableOpacity onPress={onClose}><X size={24} color={isDark?'#fff':'#333'}/></TouchableOpacity>
            {editingField === 'title' ? (
                <TextInput 
                    style={[styles.titleInput, isDark && styles.darkText]} 
                    value={tempValue} onChangeText={setTempValue} 
                    onBlur={() => handleUpdateField('title', tempValue)} autoFocus 
                />
            ) : (
                <TouchableOpacity style={{flex:1, marginHorizontal:10}} onPress={() => {setEditingField('title'); setTempValue(task?.title || '')}}>
                    <Text style={[styles.headerTitle, isDark && styles.darkText]} numberOfLines={1}>{task?.title}</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDelete}><Trash2 size={24} color="#EF4444" /></TouchableOpacity>
        </View>

        {loading && !task ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{marginTop:50}} />
        ) : task ? (
            <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>
            <ScrollView style={styles.content}>

                {/* --- PROPERTIES --- */}
                <View style={styles.section}>
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <View style={[styles.dot, {backgroundColor: getStatusColor(task.status)}]} />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.status' as any) || 'Status'}</Text>
                        </View>
                        <TouchableOpacity style={styles.propValueContainer} onPress={() => setShowStatusPicker(true)}>
                            <Text style={[styles.propValue, isDark && styles.darkSubText]}>{getStatusLabel(task.status)}</Text>
                            <ChevronDown size={16} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* Assignees */}
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <User size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.assignee' as any) || 'Assignee'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowAssignModal(true)} style={styles.propValueContainer}>
                            <Text style={{color:'#3B82F6', fontSize:12, fontWeight: '600'}}>+ {t('common.add' as any) || 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, paddingLeft: 24}}>
                        {task.assignedTo?.map((a:any, idx) => {
                            const u = typeof a.userId === 'object' ? a.userId : null;
                            const uName = u ? u.name : 'Unknown';
                            const uAvatar = u ? getValidUrl(u.avatar) : null;
                            return (
                                <View key={idx} style={[styles.assigneeChip, isDark && styles.darkChip]}>
                                    {uAvatar ? (
                                        <Image source={{uri: uAvatar}} style={styles.avatarImgSmall} />
                                    ) : (
                                        <View style={[styles.avatarSmall, {backgroundColor:'#3B82F6'}]}>
                                            <Text style={{fontSize:10, color:'#FFF', fontWeight:'bold'}}>{uName.charAt(0).toUpperCase()}</Text>
                                        </View>
                                    )}
                                    <Text style={[styles.assigneeName, isDark && styles.darkText]}>{uName}</Text>
                                    <TouchableOpacity onPress={() => handleToggleAssignee(u?._id || a.userId)}>
                                        <X size={14} color="#EF4444" style={{marginLeft: 4}} />
                                    </TouchableOpacity>
                                </View>
                            )
                        })}
                    </View>

                    {/* Due Date */}
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <Calendar size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.dueDate' as any) || 'Due Date'}</Text>
                        </View>
                        {editingField === 'dueDate' ? (
                            <TextInput style={[styles.miniInput, isDark && styles.darkInput]} value={tempValue} onChangeText={setTempValue} placeholder="DD/MM/YYYY" onBlur={() => handleUpdateField('dueDate', tempValue)} />
                        ) : (
                            <TouchableOpacity onPress={() => {setEditingField('dueDate'); setTempValue(safeDate(task.dueDate))}} style={styles.propValueContainer}>
                                <Text style={[styles.propValue, isDark && styles.darkSubText]}>{safeDate(task.dueDate)}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <Clock size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.estimatedTime' as any) || 'Est. Time'}</Text>
                        </View>
                        {editingField === 'estTime' ? (
                            <TextInput style={[styles.miniInput, isDark && styles.darkInput]} value={tempValue} onChangeText={setTempValue} onBlur={() => handleUpdateField('estimatedTime', tempValue)} />
                        ) : (
                            <TouchableOpacity onPress={() => {setEditingField('estTime'); setTempValue(task.estimatedTime || '')}} style={styles.propValueContainer}>
                                <Text style={[styles.propValue, isDark && styles.darkSubText]}>{task.estimatedTime || '---'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Type & Priority */}
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <Flag size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.priority' as any) || 'Priority'}</Text>
                        </View>
                        <TouchableOpacity style={[styles.priorityBadge, {backgroundColor: getPriorityColor(task.priority)+'20'}]} onPress={() => setShowPriorityPicker(true)}>
                            <Text style={{color: getPriorityColor(task.priority), fontSize:12, fontWeight:'bold'}}>{task.priority.toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <Briefcase size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.category' as any) || 'Type'}</Text>
                        </View>
                        <TouchableOpacity style={styles.propValueContainer} onPress={() => setShowCategoryPicker(true)}>
                            <Text style={[styles.propValue, isDark && styles.darkSubText]}>{task.category || 'Other'}</Text>
                            <ChevronDown size={16} color="#999" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:5, marginBottom:5}}>
                        <AlignLeft size={16} color="#666" />
                        <Text style={[styles.sectionTitle, isDark && styles.darkText, {marginBottom:0}]}>{t('tasks.description' as any) || 'Description'}</Text>
                    </View>
                    {editingField === 'description' ? (
                        <TextInput 
                            style={[styles.descInput, isDark && styles.darkInput]} 
                            multiline value={tempValue} onChangeText={setTempValue} 
                            onBlur={() => handleUpdateField('description', tempValue)} autoFocus 
                        />
                    ) : (
                        <TouchableOpacity onPress={() => {setEditingField('description'); setTempValue(task.description||'')}} style={[styles.descBox, isDark && styles.darkInput]}>
                            <Text style={[styles.descText, isDark && styles.darkSubText]}>{task.description || t('tasks.descriptionPlaceholder' as any) || 'No description provided.'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                {/* --- QUICK ACTIONS --- */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionScroll}>
                    <TouchableOpacity style={[styles.actionBtn, isTimerRunning && {borderColor:'#EF4444'}]} onPress={toggleTimer}>
                        {isTimerRunning ? <StopCircle size={16} color="#EF4444"/> : <PlayCircle size={16} color="#333"/>}
                        <Text style={[styles.actionText, isTimerRunning && {color:'#EF4444'}]}>{isTimerRunning ? 'Stop Timer' : 'Start Timer'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setShowTimeForm(!showTimeForm)}>
                        <Timer size={16} color="#333" />
                        <Text style={styles.actionText}>{t('taskDetail.logTime' as any) || 'Log Time'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setShowRepeatForm(!showRepeatForm)}>
                        <RefreshCw size={16} color="#333" />
                        <Text style={styles.actionText}>{t('taskDetail.repeatTask' as any) || 'Repeat'}</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* --- REPEAT FORM --- */}
                {showRepeatForm && (
                    <View style={[styles.subForm, isDark && styles.darkSubForm]}>
                        <Text style={[styles.subFormTitle, isDark && styles.darkText]}>Cài đặt lặp lại</Text>
                        <Text style={styles.label}>Tần suất (daily/weekly/monthly)</Text>
                        <TextInput style={[styles.subInput, isDark && styles.darkInput]} value={repeatSettings.frequency} onChangeText={v=>setRepeatSettings({...repeatSettings, frequency:v})} />
                        <Text style={styles.label}>Khoảng cách (Interval)</Text>
                        <TextInput style={[styles.subInput, isDark && styles.darkInput]} value={repeatSettings.interval} onChangeText={v=>setRepeatSettings({...repeatSettings, interval:v})} keyboardType="numeric" />
                        <Text style={styles.label}>Ngày kết thúc (Optional)</Text>
                        <TextInput style={[styles.subInput, isDark && styles.darkInput]} value={repeatSettings.endDate} onChangeText={v=>setRepeatSettings({...repeatSettings, endDate:v})} placeholder="YYYY-MM-DD" />
                        <TouchableOpacity style={styles.primaryBtn} onPress={submitRepeat}><Text style={{color:'#fff'}}>{t('common.save' as any) || 'Save'}</Text></TouchableOpacity>
                    </View>
                )}

                {/* --- TIME LOGS --- */}
                <View style={styles.section}>
                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Thời gian đã ghi</Text>
                        <Text style={{fontWeight:'bold', color:'#3B82F6'}}>Tổng: {getTotalLoggedTime()}</Text>
                    </View>
                    {showTimeForm && (
                        <View style={[styles.subForm, isDark && styles.darkSubForm]}>
                            <Text style={styles.label}>Ngày</Text>
                            <TextInput style={[styles.subInput, isDark && styles.darkInput]} value={newTime.date} onChangeText={v=>setNewTime({...newTime, date:v})} placeholder="YYYY-MM-DD"/>
                            <View style={{flexDirection:'row', gap:10}}>
                                <TextInput style={[styles.subInput, {flex:1}, isDark && styles.darkInput]} placeholder="Giờ" keyboardType="numeric" onChangeText={v=>setNewTime({...newTime, hours:v})} />
                                <TextInput style={[styles.subInput, {flex:1}, isDark && styles.darkInput]} placeholder="Phút" keyboardType="numeric" onChangeText={v=>setNewTime({...newTime, minutes:v})} />
                            </View>
                            <TextInput style={[styles.subInput, isDark && styles.darkInput]} placeholder="Mô tả" onChangeText={v=>setNewTime({...newTime, description:v})} />
                            <TouchableOpacity style={styles.primaryBtn} onPress={submitTimeLog}><Text style={{color:'#fff'}}>Lưu</Text></TouchableOpacity>
                        </View>
                    )}
                    {((task as any).timeEntries || []).map((entry:any, idx:number) => (
                        <View key={idx} style={styles.listItem}>
                            <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                                <View style={[styles.avatarSmall, {backgroundColor:'#3B82F6'}]}><Text style={{color:'#fff', fontSize:10}}>{(entry.user?.name || 'U').charAt(0).toUpperCase()}</Text></View>
                                <View>
                                    <Text style={[styles.listMainText, isDark && styles.darkText]}>{entry.user?.name || 'User'} - {formatDate(entry.date)}</Text>
                                    <Text style={{color:'#999', fontSize:11}}>{entry.description}</Text>
                                </View>
                            </View>
                            <View style={{flexDirection:'row', gap:10}}>
                                <Text style={{fontWeight:'bold', color:'#3B82F6'}}>{entry.hours}h {entry.minutes}m</Text>
                                <TouchableOpacity onPress={() => handleDeleteTimeEntry(idx)}><Trash2 size={16} color="#EF4444"/></TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* --- SCHEDULED WORK --- */}
                <View style={styles.section}>
                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Lên lịch</Text>
                        <TouchableOpacity onPress={() => setShowScheduleForm(!showScheduleForm)}><Text style={{color:'#3B82F6'}}>+ Thêm</Text></TouchableOpacity>
                    </View>
                    {showScheduleForm && (
                        <View style={[styles.subForm, isDark && styles.darkSubForm]}>
                            <Text style={styles.label}>Ngày</Text>
                            <TextInput style={[styles.subInput, isDark && styles.darkInput]} value={newSchedule.date} onChangeText={v=>setNewSchedule({...newSchedule, date:v})} />
                            <View style={{flexDirection:'row', gap:10}}>
                                <TextInput style={[styles.subInput, {flex:1}, isDark && styles.darkInput]} placeholder="Giờ" keyboardType="numeric" value={newSchedule.hours} onChangeText={v=>setNewSchedule({...newSchedule, hours:v})} />
                                <TextInput style={[styles.subInput, {flex:1}, isDark && styles.darkInput]} placeholder="Phút" keyboardType="numeric" value={newSchedule.minutes} onChangeText={v=>setNewSchedule({...newSchedule, minutes:v})} />
                            </View>
                            <Text style={styles.label}>Trạng thái</Text>
                            <TouchableOpacity style={[styles.subInput, {justifyContent:'center'}, isDark && styles.darkInput]} onPress={() => setShowScheduleStatusPicker(true)}>
                                <Text style={isDark && styles.darkText}>{getScheduleStatusLabel(newSchedule.status)}</Text>
                                <ChevronDown size={16} color="#999" style={{position:'absolute', right:10}}/>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} onPress={submitSchedule}><Text style={{color:'#fff'}}>Lưu</Text></TouchableOpacity>
                        </View>
                    )}
                    {((task as any).scheduledWork || []).map((work:any, idx:number) => (
                        <View key={idx} style={styles.listItem}>
                            <View>
                                <Text style={[styles.listMainText, isDark && styles.darkText]}>{formatDate(work.scheduledDate)} - {getScheduleStatusLabel(work.status)}</Text>
                                <Text style={{color:'#999', fontSize:12}}>{work.estimatedHours}h {work.estimatedMinutes}m</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteSchedule(idx)}><Trash2 size={16} color="#EF4444"/></TouchableOpacity>
                        </View>
                    ))}
                </View>

                {/* --- ATTACHMENTS (FIXED LAYOUT) --- */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Tệp đính kèm ({task.attachments?.length||0})</Text>
                    {task.attachments?.map((file:any, idx:number) => (
                        <View key={idx} style={styles.fileCard}>
                            {/* Left Side: Icon + Name */}
                            <View style={{flexDirection:'row', gap:10, alignItems:'center', flex: 1, marginRight: 10}}>
                                <View style={styles.fileIcon}><File size={20} color="#3B82F6"/></View>
                                <View style={{flex: 1}}>
                                    <Text 
                                        style={[styles.fileName, isDark && styles.darkText]} 
                                        numberOfLines={1} 
                                        ellipsizeMode="middle"
                                    >
                                        {file.filename}
                                    </Text>
                                    <Text style={{fontSize:10, color:'#999'}}>{Math.round(file.size/1024)} KB</Text>
                                </View>
                            </View>
                            {/* Right Side: Actions */}
                            <View style={{flexDirection:'row', gap:15, alignItems:'center'}}>
                                <TouchableOpacity onPress={() => handleDownloadFile(getValidUrl(file.url) || '')}>
                                    <Download size={18} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteAttachment(file._id)}>
                                    <Trash2 size={18} color="#EF4444"/>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addFileBtn} onPress={handleUploadFile}>
                        <Plus size={16} color="#3B82F6" />
                        <Text style={{color:'#3B82F6'}}>Đính kèm tệp</Text>
                    </TouchableOpacity>
                </View>

                {/* --- COMMENTS --- */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Bình luận ({comments.length})</Text>
                    {comments.map((comment, index) => {
                        const avatarUrl = comment.user?.avatar ? getValidUrl(comment.user.avatar) : null;
                        return (
                        <View key={index} style={{marginBottom:15, flexDirection:'row', gap:10}}>
                            {avatarUrl ? (
                                <Image source={{uri: avatarUrl}} style={styles.avatarImgSmall} />
                            ) : (
                                <View style={[styles.avatarSmall, {backgroundColor:'#ddd'}]}><Text>{(comment.user?.name||'U').charAt(0)}</Text></View>
                            )}
                            <View style={{flex:1}}>
                                <View style={{backgroundColor: isDark ? '#374151' : '#F3F4F6', padding:10, borderRadius:10}}>
                                    <Text style={[{fontWeight:'bold', fontSize:12}, isDark && styles.darkText]}>{comment.user?.name}</Text>
                                    <Text style={{color: isDark ? '#D1D5DB' : '#333'}}>{comment.content}</Text>
                                </View>
                                {comment.files && comment.files.length > 0 && (
                                    <Image 
                                        source={{uri: getValidUrl(comment.files[0].url) || ''}} 
                                        style={{width: 200, height: 200, borderRadius:10, marginTop:8, resizeMode:'cover'}} 
                                    />
                                )}
                            </View>
                        </View>
                    )})}
                </View>
                
                <View style={{height: 100}} />
            </ScrollView>
            
            {/* COMMENT INPUT */}
            <View style={[styles.footer, isDark && styles.darkFooter]}>
               {commentAttachment && (
                    <View style={styles.attachmentPreview}>
                        <Image source={{uri: commentAttachment.uri}} style={{width:50, height:50, borderRadius:5}} />
                        <TouchableOpacity onPress={() => setCommentAttachment(null)} style={styles.removeAttach}><X size={12} color="#fff"/></TouchableOpacity>
                    </View>
                )}
               <TouchableOpacity onPress={handlePickImageForComment}><ImageIcon size={24} color="#666"/></TouchableOpacity>
               <TextInput 
                  style={[styles.commentInput, isDark && styles.darkInput]} 
                  placeholder="Viết bình luận..." 
                  placeholderTextColor="#999"
                  value={newComment} onChangeText={setNewComment}
               />
               <TouchableOpacity onPress={handleSendComment} disabled={sendingComment}>
                  <Send size={20} color="#3B82F6"/>
               </TouchableOpacity>
            </View>

            </KeyboardAvoidingView>
        ) : null}

        {/* --- ASSIGNEE MODAL --- */}
        <Modal visible={showAssignModal} transparent onRequestClose={() => setShowAssignModal(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.assignModalContent, isDark && styles.darkContainer]}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                        <Text style={[styles.modalTitle, isDark && styles.darkText]}>{t('tasks.assignee' as any) || 'Assignees'}</Text>
                        <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                            <X size={24} color={isDark ? '#FFF' : '#333'} />
                        </TouchableOpacity>
                    </View>
                    <View style={{flex:1}}>
                        {membersList.length > 0 ? (
                            <FlatList
                                data={membersList}
                                keyExtractor={(item) => (typeof item.userId === 'object' ? item.userId._id : item.userId)}
                                renderItem={({item}) => {
                                    let uid, uname, uavatar;
                                    if (item.userId && typeof item.userId === 'object') {
                                        uid = item.userId._id;
                                        uname = item.userId.name;
                                        uavatar = item.userId.avatar;
                                    } else {
                                        uid = item.userId as string; 
                                        uname = item.name;
                                        uavatar = item.avatar;
                                    }
                                    const isSelected = task?.assignedTo?.some((a:any) => {
                                        const aId = (a.userId && typeof a.userId === 'object') ? a.userId._id : a.userId;
                                        return aId === uid;
                                    });
                                    const avatarUrl = getValidUrl(uavatar);
                                    return (
                                        <TouchableOpacity 
                                            style={[styles.assignItem, isDark && styles.darkBorder]} 
                                            onPress={() => handleToggleAssignee(uid)}
                                        >
                                            <View style={{flexDirection:'row', gap:12, alignItems:'center'}}>
                                                {avatarUrl ? (
                                                    <Image source={{uri: avatarUrl}} style={styles.avatarImg} />
                                                ) : (
                                                    <View style={[styles.avatarPlaceholder, {backgroundColor: isSelected?'#3B82F6':'#E5E7EB'}]}>
                                                        <Text style={{color:isSelected?'#fff':'#374151', fontWeight:'bold'}}>
                                                            {(uname || '?').charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View>
                                                    <Text style={[styles.assignText, isDark && styles.darkText]}>{uname || 'Unknown'}</Text>
                                                    <Text style={{fontSize:12, color:'#6B7280'}}>{item.role || 'Member'}</Text>
                                                </View>
                                            </View>
                                            {isSelected && <Check size={20} color="#3B82F6" />}
                                        </TouchableOpacity>
                                    )
                                }}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Users size={48} color="#9CA3AF" />
                                <Text style={{textAlign:'center', marginTop:10, color:'#6B7280'}}>
                                    {t('common.noResults' as any) || 'No members found in this group.'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setShowAssignModal(false)} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>{t('common.done' as any) || 'Done'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* Selection Modals */}
        <SelectionModal visible={showStatusPicker} title="Chọn Trạng Thái" options={STATUS_OPTIONS} onClose={() => setShowStatusPicker(false)} onSelect={(val:string) => handleUpdateField('status', val)} t={t} isDark={isDark} />
        <SelectionModal visible={showPriorityPicker} title="Chọn Độ Ưu Tiên" options={PRIORITY_OPTIONS} onClose={() => setShowPriorityPicker(false)} onSelect={(val:string) => handleUpdateField('priority', val)} t={t} isDark={isDark} />
        <SelectionModal visible={showCategoryPicker} title="Chọn Loại" options={CATEGORY_OPTIONS} onClose={() => setShowCategoryPicker(false)} onSelect={(val:string) => handleUpdateField('category', val)} t={t} isDark={isDark} />
        <SelectionModal visible={showScheduleStatusPicker} title="Trạng Thái Lịch" options={SCHEDULE_STATUS_OPTIONS} onClose={() => setShowScheduleStatusPicker(false)} onSelect={(val:string) => {setNewSchedule({...newSchedule, status: val}); setShowScheduleStatusPicker(false)}} t={t} isDark={isDark} />

      </SafeAreaView>
    </Modal>
  );
}

// Reusable Selection Modal
const SelectionModal = ({ visible, onClose, title, options, onSelect, t, isDark }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
            <View style={[styles.selectionContent, isDark && styles.darkContainer]}>
                <Text style={[styles.modalTitle, isDark && styles.darkText]}>{title}</Text>
                <FlatList data={options} keyExtractor={(item:any) => item.value} renderItem={({item}) => (
                    <TouchableOpacity style={[styles.optionItem, isDark && styles.darkBorder]} onPress={() => onSelect(item.value)}>
                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                            {item.color && <View style={[styles.dot, {backgroundColor: item.color}]} />}
                            <Text style={[styles.optionText, isDark && styles.darkText]}>{t ? (t(item.label as any) || item.label.split('.').pop()) : item.label}</Text>
                        </View>
                    </TouchableOpacity>
                )}/>
            </View>
        </TouchableOpacity>
    </Modal>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  darkContainer: { backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  darkBorder: { borderBottomColor: '#374151' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex:1 },
  titleInput: { fontSize: 18, fontWeight:'bold', flex:1, borderBottomWidth:1, borderColor:'#3B82F6' },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  
  propRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  propLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  propLabel: { fontSize: 14, color: '#374151', width: 130 },
  propValueContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 5 },
  propValue: { fontSize: 14, color: '#111' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  miniInput: { borderBottomWidth:1, borderColor:'#ddd', width: 100, textAlign:'right', padding:0 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },

  assigneeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  darkChip: { backgroundColor: '#374151', borderColor: '#4B5563' },
  assigneeName: { fontSize: 12, marginLeft: 6, color: '#374151', fontWeight: '500' },
  avatarSmall: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight:5 },
  avatarImgSmall: { width: 24, height: 24, borderRadius: 12 },
  
  actionScroll: { marginBottom: 20, maxHeight: 50 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 10 },
  actionText: { fontSize: 13, color: '#333' },

  subForm: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 15, marginBottom: 15, elevation:2 },
  darkSubForm: { backgroundColor: '#1F2937', borderColor: '#374151' },
  subFormTitle: { fontSize: 16, fontWeight:'bold', marginBottom: 10 },
  label: { fontSize: 12, color: '#666', marginBottom: 5, marginTop: 5 },
  subInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 5, fontSize: 14 },
  primaryBtn: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 6, alignItems:'center', marginTop:10 },

  listItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: 10, borderBottomWidth:1, borderBottomColor:'#f0f0f0' },
  listMainText: { fontSize: 14, fontWeight:'500' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 },

  descBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, minHeight: 60 },
  descText: { color: '#374151', fontSize: 14 },
  descInput: { fontSize: 14, textAlignVertical:'top', minHeight: 60 },
  
  fileCard: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderWidth:1, borderColor:'#eee', borderRadius:8, padding:10, marginBottom:10 },
  fileIcon: { width:32, height:32, backgroundColor:'#EFF6FF', borderRadius:16, alignItems:'center', justifyContent:'center', flexShrink: 0 },
  fileName: { fontSize: 14, fontWeight:'500', flexShrink: 1 },
  addFileBtn: { flexDirection:'row', alignItems:'center', gap:5, marginTop:5 },

  footer: { padding: 10, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor:'#fff' },
  darkFooter: { borderTopColor: '#374151', backgroundColor:'#111827' },
  commentInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 },
  attachmentPreview: { position: 'absolute', top: -60, left: 10, backgroundColor: '#fff', padding: 5, borderRadius: 5, elevation: 5 },
  removeAttach: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, padding: 2 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:20 },
  assignModalContent: { backgroundColor:'#fff', padding:20, borderRadius:16, height:'70%', width: '100%' },
  assignItem: { flexDirection:'row', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderColor:'#F3F4F6', alignItems:'center' },
  assignText: { fontSize: 16, fontWeight: '500', color: '#111827' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  doneBtn: { marginTop: 16, backgroundColor: '#3B82F6', padding: 14, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { marginTop: 15, alignItems: 'center', padding: 10 },

  selectionContent: { backgroundColor:'#fff', padding:20, borderRadius:10, width:'80%', alignSelf:'center' },
  optionItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

  darkText: { color: '#F9FAFB' },
  darkSubText: { color: '#D1D5DB' },
  darkInput: { backgroundColor: '#374151', color: '#fff', borderColor: '#4B5563' }
});