import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { 
  X, Calendar, Flag, Clock, Tag, Users, Bookmark, 
  Search, ChevronDown, ChevronLeft, ChevronRight, Plus,
  CheckSquare, Square, AlignLeft, Check
} from 'lucide-react-native';

import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRegional } from '../../context/RegionalContext';
import { taskService } from '../../services/task.service';
import EstimatedTimePicker from './EstimatedTimePicker';
import { GroupMember } from '../../types/group.types';

// --- HELPERS ---
const getMemberInfo = (member: GroupMember | any) => {
  if (member.userId && typeof member.userId === 'object') {
    return {
      id: member.userId._id,
      name: member.userId.name || 'Unknown',
      email: member.userId.email || '',
      role: member.role,
      initial: (member.userId.name || 'U').charAt(0).toUpperCase()
    };
  }
  return {
    id: typeof member.userId === 'string' ? member.userId : (member._id || ''),
    name: member.name || 'Unknown',
    email: member.email || '',
    role: member.role,
    initial: (member.name || 'U').charAt(0).toUpperCase()
  };
};

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback khi tạo xong
  currentUser?: any;
  initialDueDate?: Date;
  groupMembers?: GroupMember[];
  folderId?: string; // Bắt buộc
  groupId?: string;
}

// --- SUB-COMPONENTS ---

const DatePickerModal = ({ visible, onClose, onSelect, initialDate, isDark, t }: any) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(selectedDate);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const handleDayPress = (day: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    onSelect(newDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.datePickerContent, isDark && styles.darkOptionsContent]}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity style={styles.arrowLeft} onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}>
              <ChevronLeft size={24} color={isDark ? "#FFF" : "#374151"} />
            </TouchableOpacity>
            <Text style={[styles.calendarTitle, isDark && styles.darkText]}>
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
            <TouchableOpacity style={styles.arrowRight} onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}>
              <ChevronRight size={24} color={isDark ? "#FFF" : "#374151"} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.weekText}>{d}</Text>)}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: firstDay }).map((_, i) => <View key={`empty-${i}`} style={styles.dayCell} />)}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const isSelected = initialDate && initialDate.getDate() === day && initialDate.getMonth() === selectedDate.getMonth();
              const isToday = new Date().getDate() === day && new Date().getMonth() === selectedDate.getMonth();
              return (
                <TouchableOpacity key={day} style={[styles.dayCell, isSelected && styles.selectedDay, isToday && !isSelected && styles.todayCell]} onPress={() => handleDayPress(day)}>
                  <Text style={[styles.dayText, isDark && styles.darkText, isSelected && styles.selectedDayText]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={styles.dateFooter}>
            <TouchableOpacity onPress={() => { onSelect(null); onClose(); }}>
               <Text style={styles.clearDateText}>{t('common.clear' as any) || 'Clear'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.todayBtn} onPress={() => { onSelect(new Date()); onClose(); }}>
               <Text style={styles.todayText}>{t('timeline.today' as any) || 'Today'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const AssigneePickerModal = ({ visible, onClose, members, selectedIds, onToggle, isDark, t }: any) => {
  const [search, setSearch] = useState('');
  const filteredMembers = useMemo(() => {
    return members.filter((m: any) => {
      const info = getMemberInfo(m);
      return info.name.toLowerCase().includes(search.toLowerCase()) || 
             info.email.toLowerCase().includes(search.toLowerCase());
    });
  }, [members, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.fullScreenModal, isDark && styles.darkContainer]}>
        <View style={[styles.modalHeader, isDark && styles.darkBorder]}>
          <Text style={[styles.pickerTitle, isDark && styles.darkText]}>{t('tasks.assignTo' as any) || 'Assign To'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={24} color={isDark ? "#FFF" : "#333"} /></TouchableOpacity>
        </View>
        <View style={[styles.searchContainer, isDark && styles.darkInput]}>
          <Search size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput 
            style={[styles.searchInput, isDark && styles.darkText]} 
            placeholder={t('common.search' as any) || 'Search'}
            placeholderTextColor="#9CA3AF"
            value={search} onChangeText={setSearch}
          />
        </View>
        <FlatList
          data={filteredMembers}
          keyExtractor={(item: any) => getMemberInfo(item).id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>{t('common.noResults' as any) || 'No results'}</Text>}
          renderItem={({ item }) => {
            const info = getMemberInfo(item);
            const isSelected = selectedIds.includes(info.id);
            return (
              <TouchableOpacity style={[styles.memberItem, isDark && styles.darkBorder]} onPress={() => onToggle(info.id)}>
                <View style={[styles.avatarSmall, { backgroundColor: isSelected ? '#3B82F6' : '#E5E7EB' }]}>
                  <Text style={[styles.avatarTextSmall, isSelected && { color: '#FFF' }]}>{info.initial}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.memberName, isDark && styles.darkText]}>{info.name}</Text>
                  <Text style={styles.memberEmail}>{info.email}</Text>
                </View>
                {isSelected ? <CheckSquare size={24} color="#3B82F6" /> : <Square size={24} color={isDark ? "#6B7280" : "#D1D5DB"} />}
              </TouchableOpacity>
            );
          }}
        />
        <View style={[styles.modalFooter, isDark && styles.darkBorder]}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
             <Text style={styles.primaryBtnText}>{t('common.done' as any) || 'Done'} ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const OptionsModal = ({ visible, onClose, title, options, onSelect, currentVal, isDark }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.optionsContent, isDark && styles.darkOptionsContent]}>
          <Text style={[styles.optionsTitle, isDark && styles.darkText]}>{title}</Text>
          {options.map((opt: any) => (
            <TouchableOpacity key={opt.value} style={[styles.optionItem, isDark && styles.darkBorder]} onPress={() => { onSelect(opt.value); onClose(); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.dot, { backgroundColor: opt.color || '#666' }]} />
                <Text style={[styles.optionText, isDark && styles.darkText]}>{opt.label}</Text>
              </View>
              {currentVal === opt.value && <Check size={20} color="#3b82f6" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function CreateTaskModal({
  visible,
  onClose,
  onSuccess,
  currentUser,
  initialDueDate,
  groupMembers = [],
  folderId,
  groupId
}: CreateTaskModalProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage(); 
  const { formatDate, convertFromUserTimezone } = useRegional();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [tags, setTags] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Visibility States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);

  // Options
  const categoryOptions = useMemo(() => [
    { value: 'Operational', label: t('category.operational' as any) || 'Operational', color: '#2563eb', bgColor: '#dbeafe' },
    { value: 'Strategic', label: t('category.strategic' as any) || 'Strategic', color: '#059669', bgColor: '#d1fae5' },
    { value: 'Financial', label: t('category.financial' as any) || 'Financial', color: '#d97706', bgColor: '#fef3c7' },
    { value: 'Technical', label: t('category.technical' as any) || 'Technical', color: '#7c3aed', bgColor: '#ede9fe' },
    { value: 'Other', label: t('category.other' as any) || 'Other', color: '#6b7280', bgColor: '#f3f4f6' },
  ], [t]);

  const priorityOptions = useMemo(() => [
    { value: 'None', label: t('priority.none' as any) || 'None', color: '#6b7280', bgColor: '#f3f4f6' },
    { value: 'Low', label: t('priority.low' as any) || 'Low', color: '#059669', bgColor: '#d1fae5' },
    { value: 'Medium', label: t('priority.medium' as any) || 'Medium', color: '#d97706', bgColor: '#fef3c7' },
    { value: 'High', label: t('priority.high' as any) || 'High', color: '#ea580c', bgColor: '#ffedd5' },
    { value: 'Urgent', label: t('priority.urgent' as any) || 'Urgent', color: '#dc2626', bgColor: '#fee2e2' },
  ], [t]);

  useEffect(() => {
    if (visible) {
      resetForm();
      if (initialDueDate) setDueDate(initialDueDate);
      // Auto-assign to current user initially if not set
      if (currentUser && selectedAssignees.length === 0) {
          setSelectedAssignees([currentUser._id]);
      }
      console.log("🟢 [MODAL OPENED] Context Props:", { folderId, groupId });
    }
  }, [visible, initialDueDate]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setCategory(''); setPriority('Medium');
    setDueDate(null); setTags(''); setEstimatedTime(''); setSelectedAssignees([]);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { 
        Alert.alert(t('common.required' as any) || 'Required', t('tasks.taskName' as any) + ' is missing'); 
        return; 
    }
    
    // 🔥 CHẶN VÀ CẢNH BÁO NẾU THIẾU ID
    if (!folderId) {
        Alert.alert(
            t('common.error' as any) || 'System Error', 
            'Missing Folder ID. Please try to reload.'
        ); 
        console.error("❌ MISSING FOLDER ID");
        return;
    }

    setIsSubmitting(true);
    try {
      // 1. Convert Date (UTC)
      let dueDateUTC: string | null = null;
      if (dueDate) {
        const endOfDay = new Date(dueDate);
        endOfDay.setHours(23, 59, 59, 999);
        dueDateUTC = convertFromUserTimezone(endOfDay).toISOString();
      }

      // 2. Map Assignees (Array Objects)
      const finalAssignees = selectedAssignees.length > 0 
        ? selectedAssignees.map(id => ({ userId: id })) 
        : (currentUser ? [{ userId: currentUser._id }] : []);

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        category: category || 'Other',
        status: 'todo',
        priority: priority.toLowerCase(), // Quan trọng: lowercase
        startDate: new Date().toISOString(),
        dueDate: dueDateUTC,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        estimatedTime: estimatedTime || '',
        assignedTo: finalAssignees,
        folderId: folderId, 
        groupId: groupId 
      };

      console.log("🚀 [MODAL] Sending Payload:", JSON.stringify(taskData));
      
      // 3. Gọi Service
      await taskService.createTask(taskData);
      
      Alert.alert(t('common.success' as any) || 'Success', t('tasks.created' as any) || "Task created!");
      if (onSuccess) onSuccess(); 
      resetForm();
      onClose();

    } catch (error: any) { 
        console.error("🔴 [MODAL] Error:", error);
        Alert.alert(t('common.error' as any) || 'Failed', error.message || 'Unknown error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const getSelectedCategory = () => categoryOptions.find(c => c.value === category) || categoryOptions[4];
  const getSelectedPriority = () => priorityOptions.find(p => p.value === priority) || priorityOptions[2];
  
  const toggleAssignee = (id: string) => setSelectedAssignees(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  
  const selectedMembersInfo = groupMembers
    .map(m => getMemberInfo(m))
    .filter(info => selectedAssignees.includes(info.id));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          
          <View style={[styles.header, isDark && styles.darkBorder]}>
            <View>
              <Text style={[styles.headerTitle, isDark && styles.darkText]}>{t('tasks.createTask' as any) || 'New Task'}</Text>
              <Text style={styles.headerSubtitle}>{t('tasks.createTaskDesc' as any) || 'Add to project'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.headerCloseBtn, isDark && styles.darkBtnBg]}>
              <X size={24} color={isDark ? '#FFF' : '#333'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Bookmark size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.taskName' as any) || 'Task Name'} *</Text>
              </View>
              <TextInput 
                style={[styles.input, isDark && styles.darkInput]} 
                value={title} 
                onChangeText={setTitle} 
                placeholder={t('tasks.taskName' as any) || "Enter task name"}
                placeholderTextColor="#9CA3AF" 
                autoFocus
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <AlignLeft size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.description' as any) || 'Description'}</Text>
              </View>
              <TextInput 
                style={[styles.input, styles.textArea, isDark && styles.darkInput]} 
                value={description} 
                onChangeText={setDescription} 
                placeholder={t('tasks.descriptionPlaceholder' as any) || "Add details..."}
                placeholderTextColor="#9CA3AF" 
                multiline numberOfLines={3} 
                textAlignVertical="top" 
              />
            </View>

            {/* Category & Priority */}
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <View style={styles.labelRow}>
                  <Flag size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                  <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.category' as any) || 'Category'}</Text>
                </View>
                <TouchableOpacity style={[styles.dropdown, isDark && styles.darkInput]} onPress={() => setShowCategoryModal(true)}>
                  <View style={[styles.badge, { backgroundColor: getSelectedCategory().bgColor }]}>
                    <Text style={{ color: getSelectedCategory().color, fontWeight: '600', fontSize: 12 }}>{getSelectedCategory().label}</Text>
                  </View>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <View style={styles.halfCol}>
                <View style={styles.labelRow}>
                  <Flag size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                  <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.priority' as any) || 'Priority'}</Text>
                </View>
                <TouchableOpacity style={[styles.dropdown, isDark && styles.darkInput]} onPress={() => setShowPriorityModal(true)}>
                  <View style={[styles.badge, { backgroundColor: getSelectedPriority().bgColor }]}>
                    <Text style={{ color: getSelectedPriority().color, fontWeight: '600', fontSize: 12 }}>{getSelectedPriority().label}</Text>
                  </View>
                  <ChevronDown size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date & Time */}
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <View style={styles.labelRow}>
                  <Calendar size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                  <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.dueDate' as any) || 'Due Date'}</Text>
                </View>
                <TouchableOpacity style={[styles.inputWithIcon, isDark && styles.darkInput]} onPress={() => setShowDateModal(true)}>
                  <Text style={[styles.inputText, !dueDate && { color: '#9CA3AF' }, isDark && styles.darkText]}>
                    {dueDate ? formatDate(dueDate) : (t('tasks.selectDueDate' as any) || 'Select date')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.halfCol}>
                <View style={styles.labelRow}>
                  <Clock size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                  <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.estimatedTime' as any) || 'Est. Time'}</Text>
                </View>
                <TouchableOpacity style={[styles.inputWithIcon, isDark && styles.darkInput]} onPress={() => setShowTimePicker(true)}>
                  <Text style={[styles.inputText, !estimatedTime && { color: '#9CA3AF' }, isDark && styles.darkText]}>
                    {estimatedTime || (t('tasks.selectEstimatedTime' as any) || 'Set time')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Assign To */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Users size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.assignTo' as any) || 'Assign To'}</Text>
              </View>
              <TouchableOpacity style={[styles.assigneeBox, isDark && styles.darkInput]} onPress={() => setShowAssigneeModal(true)}>
                {selectedMembersInfo.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                    {selectedMembersInfo.map((info: any) => (
                      <View key={info.id} style={styles.assigneeChip}>
                        <View style={styles.avatarTiny}><Text style={styles.avatarTextTiny}>{info.initial}</Text></View>
                        <Text style={styles.chipText}>{info.name}</Text>
                        <TouchableOpacity onPress={() => toggleAssignee(info.id)}><X size={14} color="#666" /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: '#9CA3AF', flex: 1 }}>{t('tasks.selectAssignees' as any) || 'Select assignees...'}</Text>
                )}
                <Plus size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Notice: You will be assigned */}
            {selectedAssignees.length === 0 && currentUser && (
                <View style={[styles.noticeBox, isDark && styles.darkNotice]}>
                    <View style={styles.avatarSmall}>
                        <Text style={styles.avatarTextSmall}>{currentUser.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.noticeTitle, isDark && styles.darkText]}>{t('tasks.youWillBeAssigned' as any) || 'You will be assigned'}</Text>
                        <Text style={styles.noticeSub}>{t('tasks.canChangeAssigneesLater' as any) || 'You can change this later.'}</Text>
                    </View>
                </View>
            )}

            {/* Tags */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Tag size={14} color={isDark ? "#e5e7eb" : "#374151"} />
                <Text style={[styles.label, isDark && styles.darkText]}>{t('tasks.tags' as any) || 'Tags'}</Text>
              </View>
              <View style={[styles.inputWithIcon, isDark && styles.darkInput]}>
                <TextInput 
                  style={[styles.flexInput, isDark && styles.darkText]} 
                  value={tags} 
                  onChangeText={setTags} 
                  placeholder={t('tasks.tagsPlaceholder' as any) || "Comma separated"} 
                  placeholderTextColor="#9CA3AF" 
                />
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* FOOTER */}
          <View style={[styles.footer, isDark && styles.darkFooter]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{t('common.cancel' as any) || 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createBtn, isSubmitting && styles.disabledBtn]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createText}>{t('tasks.createTask' as any) || 'Create'}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* SUB MODALS */}
        <OptionsModal visible={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Category" options={categoryOptions} onSelect={setCategory} currentVal={category} isDark={isDark} />
        <OptionsModal visible={showPriorityModal} onClose={() => setShowPriorityModal(false)} title="Priority" options={priorityOptions} onSelect={setPriority} currentVal={priority} isDark={isDark} />
        <DatePickerModal visible={showDateModal} onClose={() => setShowDateModal(false)} onSelect={setDueDate} initialDate={dueDate} isDark={isDark} t={t} />
        <AssigneePickerModal visible={showAssigneeModal} onClose={() => setShowAssigneeModal(false)} members={groupMembers} selectedIds={selectedAssignees} onToggle={toggleAssignee} isDark={isDark} t={t} />
        <EstimatedTimePicker visible={showTimePicker} value={estimatedTime} onSave={setEstimatedTime} onClose={() => setShowTimePicker(false)} />

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  darkContainer: { backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  darkBorder: { borderBottomColor: '#374151' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6B7280' },
  headerCloseBtn: { padding: 4, borderRadius: 8, backgroundColor: '#F3F4F6' },
  darkBtnBg: { backgroundColor: '#374151' },
  content: { padding: 16 },
  formGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, fontSize: 16, color: '#1F2937', backgroundColor: '#FFF' },
  darkInput: { backgroundColor: '#1F2937', borderColor: '#4B5563', color: '#F9FAFB' },
  inputError: { borderColor: '#DC2626' },
  textArea: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  halfCol: { flex: 1 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, height: 50 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 12, height: 50 },
  inputText: { fontSize: 16, color: '#1F2937', marginLeft: 8 },
  flexInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1F2937' },
  assigneeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, minHeight: 50 },
  assigneeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 16, padding: 4, paddingRight: 8 },
  avatarTiny: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  avatarTextTiny: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  chipText: { fontSize: 12, color: '#1E40AF', marginRight: 6 },
  
  // Notice Box
  noticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, gap: 12, marginTop: -10, marginBottom: 15 },
  darkNotice: { backgroundColor: '#1F2937' },
  noticeTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  noticeSub: { fontSize: 12, color: '#6B7280' },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  avatarTextSmall: { color: '#FFF', fontWeight: 'bold' },

  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFF', gap: 12 },
  darkFooter: { backgroundColor: '#111827', borderTopColor: '#374151' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '600' },
  createBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  createText: { color: '#FFF', fontWeight: '600' },
  disabledBtn: { backgroundColor: '#93C5FD' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  darkOptionsContent: { backgroundColor: '#1F2937' },
  optionsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  optionText: { fontSize: 16, color: '#374151' },
  darkText: { color: '#F9FAFB' },
  helperText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  
  // DATE PICKER STYLES
  datePickerContent: { backgroundColor: '#FFF', margin: 20, borderRadius: 16, padding: 16, alignSelf: 'center', width: 320, marginTop: 'auto', marginBottom: 'auto' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative' },
  calendarTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  arrowLeft: { position: 'absolute', left: 0, padding: 5 },
  arrowRight: { position: 'absolute', right: 0, padding: 5 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekText: { width: 30, textAlign: 'center', color: '#6B7280', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 14, color: '#374151' },
  selectedDay: { backgroundColor: '#2563EB', borderRadius: 20 },
  selectedDayText: { color: '#FFF', fontWeight: 'bold' },
  todayCell: { borderWidth: 1, borderColor: '#2563EB', borderRadius: 20 },
  dateFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  clearDateText: { color: '#EF4444', fontWeight: '600' },
  todayBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  todayText: { color: '#2563EB', fontWeight: '600' },

  // ASSIGNEE PICKER STYLES
  fullScreenModal: { flex: 1, backgroundColor: '#FFF', marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  closeBtn: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', margin: 16, paddingHorizontal: 12, borderRadius: 10, height: 44 },
  searchInput: { flex: 1, fontSize: 16, color: '#1F2937' },
  memberItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  memberName: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  memberEmail: { fontSize: 12, color: '#6B7280' },
  memberRole: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primaryBtn: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});