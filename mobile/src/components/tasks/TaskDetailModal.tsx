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
  Briefcase, File, ChevronDown, Download, Image as ImageIcon, AlignLeft
} from 'lucide-react-native';
import * as ImagePicker from 'react-native-image-picker'; 

import { taskService, Task } from '../../services/task.service';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRegional } from '../../context/RegionalContext';
import { GroupMember } from '../../types/group.types';

// --- CONSTANTS ---
const STATUS_OPTIONS = [
  { value: 'todo', label: 'status.todo', color: '#9CA3AF' },
  { value: 'in_progress', label: 'status.inProgress', color: '#3B82F6' },
  { value: 'completed', label: 'status.completed', color: '#10B981' },
  { value: 'incomplete', label: 'status.incomplete', color: '#EF4444' },
  { value: 'archived', label: 'status.archived', color: '#6B7280' } // Fallback key
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

// ✅ FIX: Dùng key taskDetail.* có trong file dịch
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
  const { user: currentUser } = useAuth();
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

  // --- HELPERS UI ---
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

  // --- ACTIONS: UPDATE PROPERTIES ---
  const handleUpdateField = async (field: string, value: any) => {
    if (!task) return;
    try {
      let updateValue = value;
      if (field === 'dueDate' && value) {
         const d = new Date(value); 
         d.setHours(23,59,59,999);
         updateValue = convertFromUserTimezone(d).toISOString();
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
         const aId = typeof a.userId === 'object' ? a.userId._id : a.userId;
         return aId === userId;
      });
      if (isAssigned) await taskService.unassignUserFromTask(taskId, userId);
      else await taskService.assignUsersToTask(taskId, [userId]);
      
      const updatedTask = await taskService.getTaskById(taskId);
      syncTask(updatedTask);
    } catch (e:any) { Alert.alert('Error', e.message); }
  };

  // --- FORM SUBMITS ---
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
        const updatedTask = await taskService.updateTask(taskId, { 
            timeEntries: [...currentLog, payload]
        });
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
        setNewSchedule({ 
            date: new Date().toISOString().split('T')[0], 
            hours: '0', minutes: '0', status: 'scheduled', desc: '' 
        });
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

  // --- COMMENTS & FILES ---
  const handlePickImageForComment = () => {
      const options: ImagePicker.ImageLibraryOptions = { mediaType: 'photo', includeBase64: false };
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
          await taskService.addCommentWithFile(taskId, newComment.trim(), commentAttachment);
      } else {
          await taskService.addComment(taskId, newComment.trim());
      }
      const commentsData = await taskService.getComments(taskId, { page: 1, limit: 20 });
      setComments(commentsData.comments.reverse());
      setNewComment('');
      setCommentAttachment(null);
    } catch (error) { Alert.alert('Error', 'Failed to send comment'); }
    finally { setSendingComment(false); }
  };

  const handleUploadFile = async () => {
      const options: ImagePicker.ImageLibraryOptions = { mediaType: 'mixed', includeBase64: false };
      ImagePicker.launchImageLibrary(options, async (response) => {
        if (!response.didCancel && !response.errorCode && response.assets) {
            try {
                const updatedTask = await taskService.uploadAttachment(taskId, response.assets[0]);
                syncTask(updatedTask);
            } catch (e:any) { Alert.alert('Upload Failed', e.message); }
        }
      });
  };

  const handleDownloadFile = (url: string) => {
      if (!url) return;
      Linking.openURL(url).catch(err => Alert.alert('Error', 'Cannot open file'));
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
                    {/* Status */}
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

                    {/* Date */}
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <Calendar size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.dueDate' as any) || 'Due Date'}</Text>
                        </View>
                        {editingField === 'dueDate' ? (
                            <TextInput style={[styles.miniInput, isDark && styles.darkInput]} value={tempValue} onChangeText={setTempValue} placeholder="YYYY-MM-DD" onBlur={() => handleUpdateField('dueDate', tempValue)} />
                        ) : (
                            <TouchableOpacity onPress={() => {setEditingField('dueDate'); setTempValue(task.dueDate?.split('T')[0] || '')}} style={styles.propValueContainer}>
                                <Text style={[styles.propValue, isDark && styles.darkSubText]}>{task.dueDate ? formatDate(task.dueDate) : '---'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Estimated Time */}
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

                    {/* Type */}
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

                    {/* Assignees */}
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <User size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.assignee' as any) || 'Assignee'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowAssignModal(true)} style={styles.propValueContainer}>
                            <Text style={{color:'#3B82F6', fontSize:12}}>+ {t('common.add' as any) || 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
                    {task.assignedTo?.map((a:any, idx) => (
                        <View key={idx} style={styles.assigneeRow}>
                            <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                                <View style={[styles.avatarSmall, {backgroundColor:'#E5E7EB'}]}>
                                    <Text style={{fontSize:10, fontWeight:'bold'}}>{(typeof a.userId==='object' ? a.userId.name : 'U').charAt(0).toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.assigneeName, isDark && styles.darkSubText]}>{typeof a.userId === 'object' ? a.userId.name : 'User'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleToggleAssignee(typeof a.userId==='object'?a.userId._id:a.userId)}>
                                <X size={14} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Priority */}
                    <View style={styles.propRow}>
                        <View style={styles.propLabelContainer}>
                            <Flag size={16} color="#666" />
                            <Text style={[styles.propLabel, isDark && styles.darkText]}>{t('tasks.priority' as any) || 'Priority'}</Text>
                        </View>
                        <TouchableOpacity style={[styles.priorityBadge, {backgroundColor: getPriorityColor(task.priority)+'20'}]} onPress={() => setShowPriorityPicker(true)}>
                            <Text style={{color: getPriorityColor(task.priority), fontSize:12, fontWeight:'bold'}}>{task.priority.toUpperCase()}</Text>
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

                {/* --- SCHEDULED WORK (Fix: Dropdown Status) --- */}
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
                    {/* List Schedule */}
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

                {/* --- ATTACHMENTS --- */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Tệp đính kèm ({task.attachments?.length||0})</Text>
                    {task.attachments?.map((file:any, idx:number) => (
                        <View key={idx} style={styles.fileCard}>
                            <View style={{flexDirection:'row', gap:10, alignItems:'center'}}>
                                <View style={styles.fileIcon}><File size={20} color="#3B82F6"/></View>
                                <View>
                                    <Text style={[styles.fileName, isDark && styles.darkText]}>{file.filename}</Text>
                                    <Text style={{fontSize:10, color:'#999'}}>{Math.round(file.size/1024)} KB</Text>
                                </View>
                            </View>
                            <View style={{flexDirection:'row', gap:15}}>
                                <TouchableOpacity onPress={() => handleDownloadFile(file.url)}>
                                    <Download size={18} color="#3B82F6" />
                                </TouchableOpacity>
                                <TouchableOpacity><Trash2 size={18} color="#EF4444"/></TouchableOpacity>
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
                    {comments.map((comment, index) => (
                        <View key={index} style={{marginBottom:15, flexDirection:'row', gap:10}}>
                            <View style={[styles.avatarSmall, {backgroundColor:'#ddd'}]}><Text>{(comment.user?.name||'U').charAt(0)}</Text></View>
                            <View style={{flex:1}}>
                                <View style={{backgroundColor: isDark ? '#374151' : '#F3F4F6', padding:10, borderRadius:10}}>
                                    <Text style={[{fontWeight:'bold', fontSize:12}, isDark && styles.darkText]}>{comment.user?.name}</Text>
                                    <Text style={{color: isDark ? '#D1D5DB' : '#333'}}>{comment.content}</Text>
                                </View>
                                {comment.files && comment.files.length > 0 && (
                                    <Image source={{uri: comment.files[0].url}} style={{width: 150, height: 150, borderRadius:10, marginTop:5, resizeMode:'cover'}} />
                                )}
                            </View>
                        </View>
                    ))}
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
                    {sendingComment ? <ActivityIndicator size="small" color="#3B82F6"/> : <Send size={20} color="#3B82F6"/>}
                </TouchableOpacity>
            </View>

            </KeyboardAvoidingView>
        ) : null}

        {/* --- ASSIGNEE MODAL (Fix: Display List) --- */}
        <Modal visible={showAssignModal} transparent onRequestClose={() => setShowAssignModal(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.assignModalContent, isDark && styles.darkContainer]}>
                    <Text style={[styles.sectionTitle, isDark && styles.darkText, {marginBottom:15}]}>{t('tasks.assignee' as any) || 'Assignees'}</Text>
                    <View style={{flex:1}}>
                        {groupMembers && groupMembers.length > 0 ? (
                            <FlatList
                                data={groupMembers}
                                keyExtractor={(item) => (typeof item.userId === 'object' ? item.userId._id : item.userId)}
                                renderItem={({item}) => {
                                    const uid = typeof item.userId === 'object' ? item.userId._id : item.userId;
                                    const uname = typeof item.userId === 'object' ? item.userId.name : item.name;
                                    const isSelected = task?.assignedTo?.some((a:any) => (typeof a.userId==='object'?a.userId._id:a.userId)===uid);
                                    return (
                                        <TouchableOpacity style={styles.assignItem} onPress={() => handleToggleAssignee(uid)}>
                                            <View style={{flexDirection:'row', gap:10, alignItems:'center'}}>
                                                <View style={[styles.avatarSmall, {backgroundColor: isSelected?'#3B82F6':'#ddd'}]}>
                                                    <Text style={{color:isSelected?'#fff':'#333', fontSize:10}}>{(uname||'U').charAt(0).toUpperCase()}</Text>
                                                </View>
                                                <Text style={[styles.assignText, isDark && styles.darkText]}>{uname}</Text>
                                            </View>
                                            {isSelected && <Check size={18} color="#3B82F6" />}
                                        </TouchableOpacity>
                                    )
                                }}
                            />
                        ) : (
                            <Text style={{textAlign:'center', marginTop:20, color:'#999'}}>{t('common.noResults' as any) || 'No results'}</Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setShowAssignModal(false)} style={styles.closeBtnText}><Text style={{color:'blue', fontWeight:'bold'}}>{t('common.done' as any) || 'Done'}</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* Selection Modals */}
        <SelectionModal visible={showStatusPicker} title="Chọn Trạng Thái" options={STATUS_OPTIONS} onClose={() => setShowStatusPicker(false)} onSelect={(val:string) => handleUpdateField('status', val)} t={t} />
        <SelectionModal visible={showPriorityPicker} title="Chọn Độ Ưu Tiên" options={PRIORITY_OPTIONS} onClose={() => setShowPriorityPicker(false)} onSelect={(val:string) => handleUpdateField('priority', val)} t={t} />
        <SelectionModal visible={showCategoryPicker} title="Chọn Loại" options={CATEGORY_OPTIONS} onClose={() => setShowCategoryPicker(false)} onSelect={(val:string) => handleUpdateField('category', val)} t={t} />
        <SelectionModal visible={showScheduleStatusPicker} title="Trạng Thái Lịch" options={SCHEDULE_STATUS_OPTIONS} onClose={() => setShowScheduleStatusPicker(false)} onSelect={(val:string) => {setNewSchedule({...newSchedule, status: val}); setShowScheduleStatusPicker(false)}} t={t} />

      </SafeAreaView>
    </Modal>
  );
}

// Reusable Selection Modal (Fix: Key Translation)
const SelectionModal = ({ visible, onClose, title, options, onSelect, t }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
            <View style={styles.selectionContent}>
                <Text style={styles.modalTitle}>{title}</Text>
                <FlatList data={options} keyExtractor={(item:any) => item.value} renderItem={({item}) => (
                    <TouchableOpacity style={styles.optionItem} onPress={() => onSelect(item.value)}>
                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                            {item.color && <View style={[styles.dot, {backgroundColor: item.color}]} />}
                            <Text style={styles.optionText}>{t ? (t(item.label as any) || item.label.split('.').pop()) : item.label}</Text>
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

  assigneeRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8, borderBottomWidth:1, borderBottomColor:'#f9f9f9', paddingBottom:5, marginLeft: 30 },
  assigneeName: { fontSize:13, color:'#555' },
  avatarSmall: { width:24, height:24, borderRadius:12, alignItems:'center', justifyContent:'center', marginRight:5 },

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
  fileIcon: { width:32, height:32, backgroundColor:'#EFF6FF', borderRadius:16, alignItems:'center', justifyContent:'center' },
  fileName: { fontSize: 14, fontWeight:'500' },
  addFileBtn: { flexDirection:'row', alignItems:'center', gap:5, marginTop:5 },

  footer: { padding: 10, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor:'#fff' },
  darkFooter: { borderTopColor: '#374151', backgroundColor:'#111827' },
  commentInput: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 },
  attachmentPreview: { position: 'absolute', top: -60, left: 10, backgroundColor: '#fff', padding: 5, borderRadius: 5, elevation: 5 },
  removeAttach: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, padding: 2 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:20 },
  assignModalContent: { backgroundColor:'#fff', padding:20, borderRadius:10, maxHeight:'60%', width: '100%' }, // Fix height for list
  assignItem: { flexDirection:'row', justifyContent:'space-between', padding:15, borderBottomWidth:1, borderColor:'#eee' },
  selectionContent: { backgroundColor:'#fff', padding:20, borderRadius:10, width:'80%', alignSelf:'center' },
  optionItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  assignText: { fontSize: 16 },
  closeBtnText: { marginTop: 15, alignItems: 'center', padding: 10 },

  darkText: { color: '#F9FAFB' },
  darkSubText: { color: '#D1D5DB' },
  darkInput: { backgroundColor: '#374151', color: '#fff', borderColor: '#4B5563' }
});