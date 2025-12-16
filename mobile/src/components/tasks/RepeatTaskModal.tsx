import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  SafeAreaView,
  Platform,
  Dimensions,
  TextInput, // 👈 ĐÃ SỬA: Thêm TextInput vào đây
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Task } from '../../types/task.types';
import EstimatedTimePicker from './EstimatedTimePicker';

// --- Mock Hook & Icons ---
const useLanguage = () => ({ t: (key: string) => key });
const CalendarIcon = (props: any) => <Ionicons name="calendar-outline" {...props} />;
const ClockIcon = (props: any) => <Ionicons name="time-outline" {...props} />;
const SettingsIcon = (props: any) => <Ionicons name="settings-outline" {...props} />;
const ChevronDown = (props: any) => <Ionicons name="chevron-down" {...props} />;
const ChevronLeft = (props: any) => <Ionicons name="chevron-back" {...props} />;
const ChevronRight = (props: any) => <Ionicons name="chevron-forward" {...props} />;
const CloseIcon = (props: any) => <Ionicons name="close" {...props} />;
const PlusIcon = (props: any) => <Ionicons name="add" {...props} />;
const MinusIcon = (props: any) => <Ionicons name="remove" {...props} />;

// --- Types ---
interface RepeatTaskModalProps {
  task: Task;
  visible: boolean;
  onClose: () => void;
  onSave: (settings: RepeatSettings) => void;
}

export interface RepeatSettings {
  isRepeating: boolean;
  repeatType: 'time-based' | 'after-completion';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  skipWeekends: boolean;
  startingFrom: Date;
  dueDateOption: 'not-set' | 'same-day' | 'next-day' | 'in-2-days' | 'in-3-days' | 'in-4-days' | 'in-5-days' | 'custom';
  dueDateDays: number;
  defaultStatus: 'todo' | 'in_progress';
  estimatedTime: string;
  endType: 'never' | 'on-date' | 'after-occurrences';
  endDate?: Date;
  occurrences?: number;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

const DUE_DATE_OPTIONS = [
  { value: 'not-set', label: 'Not set', days: 0 },
  { value: 'same-day', label: 'Same day', days: 0 },
  { value: 'next-day', label: 'Next day', days: 1 },
  { value: 'in-2-days', label: 'in 2 days', days: 2 },
  { value: 'in-3-days', label: 'in 3 days', days: 3 },
  { value: 'in-4-days', label: 'in 4 days', days: 4 },
  { value: 'in-5-days', label: 'in 5 days', days: 5 },
  { value: 'custom', label: 'Custom', days: -1, isCustom: true },
];

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', icon: '📋' },
  { value: 'in_progress', label: 'In Progress', icon: '🔧' },
];

export default function RepeatTaskModal({ task, visible, onClose, onSave }: RepeatTaskModalProps) {
  const { t } = useLanguage();
  const [repeatType, setRepeatType] = useState<'time-based' | 'after-completion'>('time-based');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [interval, setInterval] = useState(1);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [startingFrom, setStartingFrom] = useState(new Date());
  const [dueDateOption, setDueDateOption] = useState<string>('same-day');
  const [dueDateDays, setDueDateDays] = useState(1);
  const [defaultStatus, setDefaultStatus] = useState<'todo' | 'in_progress'>('in_progress');
  const [estimatedTime, setEstimatedTime] = useState('0h');
  const [endType, setEndType] = useState<'never' | 'on-date' | 'after-occurrences'>('never');
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [occurrences, setOccurrences] = useState(10);

  // Modal visibility states
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showCustomDueDateInput, setShowCustomDueDateInput] = useState(false);
  const [showEstimatedTimePicker, setShowEstimatedTimePicker] = useState(false);

  // Calendar state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Initialize
  useEffect(() => {
    if (task.repetition) {
      setFrequency(task.repetition.frequency || 'daily');
      setInterval(task.repetition.interval || 1);
      if (task.repetition.endDate) {
        setEndType('on-date');
        setEndDate(new Date(task.repetition.endDate));
      } else if (task.repetition.occurrences) {
        setEndType('after-occurrences');
        setOccurrences(task.repetition.occurrences);
      }
    }
    if (task.estimatedTime) setEstimatedTime(task.estimatedTime);
    if (task.dueDate) setStartingFrom(new Date(task.dueDate));
  }, [task]);

  const getDueDateDisplayLabel = () => {
    if (dueDateOption === 'custom') return `in ${dueDateDays} days`;
    return DUE_DATE_OPTIONS.find(d => d.value === dueDateOption)?.label || 'Same day';
  };

  // --- Logic Calculate Scheduled Dates ---
  const scheduledDates = useMemo(() => {
    const dates: Date[] = [];
    let currentDate = new Date(startingFrom);
    const maxDates = 50;

    for (let i = 0; i < maxDates; i++) {
      if (skipWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      if (endType === 'on-date' && endDate && currentDate > endDate) break;
      if (endType === 'after-occurrences' && dates.length >= occurrences) break;

      dates.push(new Date(currentDate));

      switch (frequency) {
        case 'daily': currentDate.setDate(currentDate.getDate() + interval); break;
        case 'weekly': currentDate.setDate(currentDate.getDate() + (interval * 7)); break;
        case 'monthly': currentDate.setMonth(currentDate.getMonth() + interval); break;
        case 'yearly': currentDate.setFullYear(currentDate.getFullYear() + interval); break;
      }
    }
    return dates;
  }, [startingFrom, frequency, interval, skipWeekends, endType, endDate, occurrences]);

  // --- Calendar Helpers ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const isDateScheduled = (year: number, month: number, day: number) => {
    return scheduledDates.some(d => 
      d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const handleSave = () => {
    onSave({
      isRepeating: true,
      repeatType,
      frequency,
      interval,
      skipWeekends,
      startingFrom,
      dueDateOption: dueDateOption as any,
      dueDateDays,
      defaultStatus,
      estimatedTime,
      endType,
      endDate,
      occurrences,
    });
    onClose();
  };

  // --- Simple Calendar Component ---
  const SimpleCalendar = ({ targetDate, onSelect }: { targetDate?: Date, onSelect?: (date: Date) => void }) => {
    const [viewDate, setViewDate] = useState(targetDate || new Date());
    const days = getDaysInMonth(viewDate);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const handleDayPress = (day: number) => {
      if (onSelect) {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onSelect(newDate);
      }
    };

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => {
            const prev = new Date(viewDate); prev.setMonth(prev.getMonth() - 1); setViewDate(prev);
          }}>
            <ChevronLeft size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
          <TouchableOpacity onPress={() => {
            const next = new Date(viewDate); next.setMonth(next.getMonth() + 1); setViewDate(next);
          }}>
            <ChevronRight size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {days.map((d, i) => (
            <TouchableOpacity 
              key={i} 
              style={[
                styles.dayCell, 
                (!onSelect && d && isDateScheduled(viewDate.getFullYear(), viewDate.getMonth(), d)) ? styles.scheduledDay : null,
                (onSelect && d && targetDate && targetDate.getDate() === d && targetDate.getMonth() === viewDate.getMonth()) ? styles.selectedDay : null
              ]}
              disabled={!d || (!onSelect && !d)}
              onPress={() => d && handleDayPress(d)}
            >
              <Text style={[
                styles.dayText, 
                (!onSelect && d && isDateScheduled(viewDate.getFullYear(), viewDate.getMonth(), d)) ? styles.scheduledDayText : null,
                (onSelect && d && targetDate && targetDate.getDate() === d && targetDate.getMonth() === viewDate.getMonth()) ? styles.selectedDayText : null
              ]}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // --- Helper: Options Modal ---
  const OptionsModal = ({ visible, onClose, title, children }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><CloseIcon size={24} color="#333" /></TouchableOpacity>
          </View>
          {children}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><CloseIcon size={24} color="#333" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Repeat Task</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, repeatType === 'time-based' && styles.toggleBtnActive]} 
              onPress={() => setRepeatType('time-based')}
            >
              <Text style={[styles.toggleText, repeatType === 'time-based' && styles.toggleTextActive]}>Time-based</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, repeatType === 'after-completion' && styles.toggleBtnActive]} 
              onPress={() => setRepeatType('after-completion')}
            >
              <Text style={[styles.toggleText, repeatType === 'after-completion' && styles.toggleTextActive]}>After completion</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            {repeatType === 'time-based' 
              ? 'Creates a new task on a specific date, regardless of completion.' 
              : 'Creates a new task after the current task is completed.'}
          </Text>

          {/* Repeat Every */}
          <View style={styles.section}>
            <Text style={styles.label}>Repeat every</Text>
            <View style={styles.row}>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setInterval(Math.max(1, interval - 1))} style={styles.stepperBtn}><MinusIcon size={20} color="#333" /></TouchableOpacity>
                <Text style={styles.stepperValue}>{interval}</Text>
                <TouchableOpacity onPress={() => setInterval(interval + 1)} style={styles.stepperBtn}><PlusIcon size={20} color="#333" /></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowFrequencyModal(true)}>
                <Text style={styles.dropdownText}>{FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label}</Text>
                <ChevronDown size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Skip Weekends */}
          <View style={styles.switchRow}>
            <Text style={styles.label}>Skip weekends</Text>
            <Switch value={skipWeekends} onValueChange={setSkipWeekends} trackColor={{ false: '#767577', true: '#3b82f6' }} />
          </View>

          <View style={styles.divider} />

          {/* Starting From */}
          <View style={styles.section}>
            <Text style={styles.label}>Starting from</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowDatePicker(true)}>
              <CalendarIcon size={18} color="#666" style={{marginRight: 8}} />
              <Text style={styles.dropdownText}>{formatDate(startingFrom)}</Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Due Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Due date</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowDueDateModal(true)}>
              <Text style={styles.dropdownText}>{getDueDateDisplayLabel()}</Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Default Status */}
          <View style={styles.section}>
            <Text style={styles.label}>Default status</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowStatusModal(true)}>
              <SettingsIcon size={18} color="#666" style={{marginRight: 8}} />
              <Text style={styles.dropdownText}>{STATUS_OPTIONS.find(s => s.value === defaultStatus)?.label}</Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Estimated Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Estimated time</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowEstimatedTimePicker(true)}>
              <ClockIcon size={18} color="#666" style={{marginRight: 8}} />
              <Text style={styles.dropdownText}>{estimatedTime || '0h'}</Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Ends */}
          <View style={styles.section}>
            <Text style={styles.label}>Ends</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowEndModal(true)}>
              <Text style={styles.dropdownText}>
                {endType === 'never' ? 'Never' : endType === 'on-date' ? formatDate(endDate || new Date()) : `After ${occurrences} times`}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Calendar Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Scheduled Repeats Preview</Text>
            <SimpleCalendar /> 
          </View>
        </ScrollView>

        {/* --- MODALS --- */}

        {/* Frequency Modal */}
        <OptionsModal visible={showFrequencyModal} onClose={() => setShowFrequencyModal(false)} title="Frequency">
          {FREQUENCY_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value} style={styles.optionItem} onPress={() => { setFrequency(opt.value as any); setShowFrequencyModal(false); }}>
              <Text style={styles.optionText}>{opt.label}</Text>
              {frequency === opt.value && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
            </TouchableOpacity>
          ))}
        </OptionsModal>

        {/* Due Date Modal */}
        <OptionsModal visible={showDueDateModal} onClose={() => setShowDueDateModal(false)} title="Due Date">
          {DUE_DATE_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value} style={styles.optionItem} onPress={() => {
              if (opt.isCustom) { setShowDueDateModal(false); setShowCustomDueDateInput(true); }
              else { setDueDateOption(opt.value); setShowDueDateModal(false); }
            }}>
              <Text style={styles.optionText}>{opt.label}</Text>
              {dueDateOption === opt.value && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
            </TouchableOpacity>
          ))}
        </OptionsModal>

        {/* Status Modal */}
        <OptionsModal visible={showStatusModal} onClose={() => setShowStatusModal(false)} title="Default Status">
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value} style={styles.optionItem} onPress={() => { setDefaultStatus(opt.value as any); setShowStatusModal(false); }}>
              <Text style={styles.optionText}>{opt.label}</Text>
              {defaultStatus === opt.value && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
            </TouchableOpacity>
          ))}
        </OptionsModal>

        {/* Ends Modal */}
        <OptionsModal visible={showEndModal} onClose={() => setShowEndModal(false)} title="Ends">
          <TouchableOpacity style={styles.optionItem} onPress={() => { setEndType('never'); setShowEndModal(false); }}>
            <Text style={styles.optionText}>Never</Text>
            {endType === 'never' && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionItem} onPress={() => { setEndType('on-date'); setEndDate(new Date(Date.now() + 30*86400000)); setShowEndModal(false); setShowEndDatePicker(true); }}>
            <Text style={styles.optionText}>On date...</Text>
            {endType === 'on-date' && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionItem} onPress={() => { setEndType('after-occurrences'); setShowEndModal(false); }}>
            <Text style={styles.optionText}>After occurrences...</Text>
            {endType === 'after-occurrences' && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
          </TouchableOpacity>
          
          {endType === 'after-occurrences' && (
             <View style={styles.occurrenceInputRow}>
                <TextInput 
                  style={styles.occurrenceInput} 
                  keyboardType="number-pad" 
                  value={occurrences.toString()} 
                  onChangeText={(t: string) => setOccurrences(parseInt(t) || 1)} // 👈 ĐÃ SỬA KIỂU DỮ LIỆU
                />
                <Text>times</Text>
             </View>
          )}
        </OptionsModal>

        {/* Date Pickers */}
        <OptionsModal visible={showDatePicker} onClose={() => setShowDatePicker(false)} title="Select Start Date">
          <SimpleCalendar targetDate={startingFrom} onSelect={(date) => { setStartingFrom(date); setShowDatePicker(false); }} />
        </OptionsModal>

        <OptionsModal visible={showEndDatePicker} onClose={() => setShowEndDatePicker(false)} title="Select End Date">
          <SimpleCalendar targetDate={endDate || new Date()} onSelect={(date) => { setEndDate(date); setShowEndDatePicker(false); }} />
        </OptionsModal>

        {/* Custom Due Date Input */}
        <OptionsModal visible={showCustomDueDateInput} onClose={() => setShowCustomDueDateInput(false)} title="Set Days">
           <View style={styles.stepperRowCenter}>
              <TouchableOpacity onPress={() => setDueDateDays(Math.max(1, dueDateDays - 1))} style={styles.stepperBtnLarge}><MinusIcon size={24} color="#333" /></TouchableOpacity>
              <Text style={styles.stepperValueLarge}>{dueDateDays}</Text>
              <TouchableOpacity onPress={() => setDueDateDays(dueDateDays + 1)} style={styles.stepperBtnLarge}><PlusIcon size={24} color="#333" /></TouchableOpacity>
           </View>
           <TouchableOpacity style={styles.confirmBtn} onPress={() => { setDueDateOption('custom'); setShowCustomDueDateInput(false); }}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
           </TouchableOpacity>
        </OptionsModal>

        {/* Estimated Time Picker */}
        <EstimatedTimePicker 
          visible={showEstimatedTimePicker} 
          value={estimatedTime} 
          onSave={setEstimatedTime} 
          onClose={() => setShowEstimatedTimePicker(false)} 
        />

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  closeBtn: { padding: 4 },
  saveBtn: { padding: 4 },
  saveText: { color: '#2563EB', fontWeight: '600', fontSize: 16 },
  content: { flex: 1, padding: 16 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 8, padding: 4, marginBottom: 8 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { color: '#6B7280', fontWeight: '500', fontSize: 14 },
  toggleTextActive: { color: '#111827', fontWeight: '600' },
  helperText: { fontSize: 13, color: '#6B7280', marginBottom: 24 },

  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  stepperBtn: { padding: 8 },
  stepperValue: { width: 30, textAlign: 'center', fontWeight: '600', fontSize: 16 },
  dropdown: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10 },
  dropdownText: { fontSize: 15, color: '#111827' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8, marginBottom: 24 },

  // Preview Calendar
  previewContainer: { marginTop: 10, padding: 16, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 40 },
  previewTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  
  // Calendar UI
  calendarContainer: { width: '100%' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarTitle: { fontSize: 15, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  weekDayText: { width: 30, textAlign: 'center', fontSize: 12, color: '#6B7280' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, color: '#374151' },
  scheduledDay: { backgroundColor: '#3B82F6', borderRadius: 99 },
  scheduledDayText: { color: '#FFF', fontWeight: '600' },
  selectedDay: { backgroundColor: '#2563EB', borderRadius: 99 },
  selectedDayText: { color: '#FFF', fontWeight: 'bold' },

  // Modals Overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 16, color: '#374151' },
  
  // Occurrence Input
  occurrenceInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'center' },
  occurrenceInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, width: 60, padding: 8, textAlign: 'center', marginRight: 8, fontSize: 16 },

  // Custom Due Date Stepper
  stepperRowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginVertical: 20 },
  stepperBtnLarge: { padding: 12, backgroundColor: '#F3F4F6', borderRadius: 12 },
  stepperValueLarge: { fontSize: 24, fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});