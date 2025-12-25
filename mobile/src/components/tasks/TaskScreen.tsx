import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  RefreshControl,
  Dimensions,
  Image,
  Platform,
  ActionSheetIOS,
} from 'react-native';
// ✅ Icons Lucide
import { 
  Plus, Search, List, Layout, Filter, ChevronDown, ChevronRight, 
  Clock, Calendar, AlertTriangle, CheckCircle2, MoreVertical, X,
  Tag, User
} from 'lucide-react-native';

import { Task } from '../../types/task.types';
import { taskService } from '../../services/task.service';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTimer, useTimerElapsed } from '../../context/TimerContext';
import { useFolder } from '../../context/FolderContext';
import { useRegional } from '../../context/RegionalContext';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';
import { useGroupChange } from '../../hooks/useGroupChange';

// Modals
import CreateTaskModal from './CreateTaskModal';
import TaskContextMenu from './TaskContextMenu';
import TaskDetailModal from './TaskDetailModal';
import RepeatTaskModal from './RepeatTaskModal';
import NoGroupState from '../common/NoGroupState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Helpers ---
const convertTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const months = parseInt(timeStr.match(/(\d+)\s*mo/i)?.[1] || '0');
  const days = parseInt(timeStr.match(/(\d+)\s*d(?!o)/i)?.[1] || '0');
  const hours = parseInt(timeStr.match(/(\d+)\s*h/i)?.[1] || '0');
  const minutes = parseInt(timeStr.match(/(\d+)\s*m(?!o)/i)?.[1] || '0');
  return (months * 9600) + (days * 480) + (hours * 60) + minutes;
};

// --- Sub-Component: TaskTimer ---
const TaskTimer = ({ task, isRunning }: { task: Task; isRunning: boolean }) => {
  const elapsedSeconds = useTimerElapsed(task._id);
  const loggedMinutes = (task as any).timeEntries?.reduce((acc: number, curr: any) => acc + (curr.hours * 60) + curr.minutes, 0) || 0;
  const currentSessionMinutes = isRunning ? Math.floor(elapsedSeconds / 60) : 0;
  const totalElapsedMinutes = loggedMinutes + currentSessionMinutes;
  const estimatedMinutes = convertTimeToMinutes(task.estimatedTime || "");
  const isOverEstimate = estimatedMinutes > 0 && totalElapsedMinutes > estimatedMinutes;

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isRunning) {
    return (
      <View style={[styles.timerBadge, isOverEstimate && styles.overEstimateBadge]}>
        <View style={[styles.timerDot, { backgroundColor: isOverEstimate ? '#B45309' : '#10b981' }]} />
        <Text style={[styles.timerTextRunning, isOverEstimate && styles.overEstimateText]}>
          {formatTime(elapsedSeconds)}
        </Text>
      </View>
    );
  }

  // Luôn hiển thị nếu có ước tính hoặc đã log giờ (để giống Web)
  if (loggedMinutes > 0 || task.estimatedTime) {
    return (
      <View style={styles.timeEstimate}>
        <Clock size={12} color="#6b7280" />
        <Text style={styles.timeText}>
          {task.estimatedTime || "—"}
        </Text>
        {isOverEstimate && <AlertTriangle size={12} color="#B45309" style={{marginLeft: 4}} />}
      </View>
    );
  }
  return (
    <View style={styles.timeEstimate}>
      <Clock size={12} color="#9ca3af" />
      <Text style={styles.timeText}>—</Text>
    </View>
  );
};

export default function TasksView() {
  const { currentGroup, user: currentUser } = useAuth();
  const { currentFolder } = useFolder();
  const { isDark } = useTheme();
  const { formatDate } = useRegional();
  const { startTimer, stopTimer, isTimerRunning, syncTimersFromTask } = useTimer();

  // States
  const [tasks, setTasks] = useState<{ todo: Task[], inProgress: Task[], incomplete: Task[], completed: Task[] }>({
    todo: [], inProgress: [], incomplete: [], completed: []
  });
  const [kanbanData, setKanbanData] = useState<any>(null);
  const [sectionsExpanded, setSectionsExpanded] = useState({ todo: true, inProgress: true, incomplete: true, completed: true });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; task: Task } | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [repeatModalTask, setRepeatModalTask] = useState<Task | null>(null);
  
  const [sortConfigs, setSortConfigs] = useState<Record<string, Array<{ key: string, direction: 'asc' | 'desc' }>>>({
    todo: [], inProgress: [], incomplete: [], completed: []
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Constants
  const priorityOptions = ['low', 'medium', 'high', 'urgent'];
  const statusOptions = ['todo', 'in_progress', 'completed', 'incomplete'];
  const categoryOptions = ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'];
  const sortOptions = [
    { key: 'title', label: 'Name' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'priority', label: 'Priority' },
    { key: 'estimatedTime', label: 'Est. Time' },
    { key: 'createdAt', label: 'Created' },
  ];

  // --- Functions ---
  const fetchTasks = useCallback(async () => {
    if (!currentFolder?._id) return;
    try {
      setLoading(true);
      if (viewMode === 'list') {
        const response = await taskService.getAllTasks({ folderId: currentFolder._id });
        const allTasks = response?.tasks || [];
        const organized = { todo: [], inProgress: [], incomplete: [], completed: [] } as any;
        
        allTasks.forEach((t: Task) => {
          if ((t as any).activeTimers?.length > 0) syncTimersFromTask(t);
          if (t.status === 'completed') organized.completed.push(t);
          else if (t.status === 'incomplete') organized.incomplete.push(t);
          else if (t.status === 'in_progress') organized.inProgress.push(t);
          else organized.todo.push(t);
        });
        setTasks(organized);
      } else {
        const response = await taskService.getKanbanView({ folderId: currentFolder._id });
        setKanbanData(response);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentFolder?._id, viewMode]);

  useGroupChange(() => { fetchTasks(); });
  useTaskRealtime({
    onTaskCreated: fetchTasks,
    onTaskUpdated: fetchTasks,
    onTaskDeleted: fetchTasks
  });
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const getDetailedAssignees = useCallback((task: Task) => {
    if (!task.assignedTo?.length) return { hasAssignees: false, assignees: [], totalCount: 0 };
    
    const assignees = task.assignedTo.filter(a => a.userId).map(a => {
      let userData: any = { name: 'Unknown', initial: 'U', _id: '' };
      if (typeof a.userId === 'string') {
        if (currentUser && a.userId === currentUser._id) {
          userData = { ...currentUser, name: 'You' };
        } else {
          const m = currentGroup?.members?.find((m:any) => {
             const mId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
             return mId === a.userId;
          });
          if (m) {
             const uObj = typeof m.userId === 'object' ? m.userId : null;
             userData = {
               _id: a.userId,
               name: uObj?.name || m.name || 'Unknown',
               avatar: uObj?.avatar || m.avatar,
             };
          }
        }
      } else {
        userData = a.userId;
      }
      return { 
        ...userData, 
        initial: (userData.name?.charAt(0) || 'U').toUpperCase() 
      };
    });

    return { hasAssignees: true, assignees, totalCount: assignees.length };
  }, [currentGroup, currentUser]);

  const getProcessedTasks = useCallback((sectionTasks: Task[], sectionKey: string) => {
    let processed = sectionTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const configs = sortConfigs[sectionKey];
    if (configs.length > 0) {
      processed = [...processed].sort((a, b) => {
        for (const config of configs) {
          let aVal: any = a[config.key as keyof Task];
          let bVal: any = b[config.key as keyof Task];
          if (config.key === 'priority') {
            const pMap: any = { low: 0, medium: 1, high: 2, urgent: 3 };
            aVal = pMap[aVal] ?? -1; bVal = pMap[bVal] ?? -1;
          } else if (config.key === 'estimatedTime') {
            aVal = convertTimeToMinutes(aVal); bVal = convertTimeToMinutes(bVal);
          } else if (['dueDate', 'createdAt'].includes(config.key)) {
            aVal = aVal ? new Date(aVal).getTime() : 0;
            bVal = bVal ? new Date(bVal).getTime() : 0;
          }
          if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return processed;
  }, [searchQuery, sortConfigs]);

  const handleSortSelect = (key: string, direction: 'asc'|'desc') => {
    const newConfig = [{ key, direction }];
    setSortConfigs({ todo: newConfig, inProgress: newConfig, incomplete: newConfig, completed: newConfig });
    setShowSortDropdown(false);
  };

  const handleContextMenuAction = async (action: string, task: Task) => {
    setContextMenu(null);
    try {
      switch (action) {
        case 'start_timer': const started = await taskService.startTimer(task._id); syncTimersFromTask(started); break;
        case 'stop_timer': const stopped = await stopTimer(task._id); syncTimersFromTask(stopped); break;
        case 'complete': await taskService.updateTask(task._id, { status: 'completed' }); break;
        case 'delete': Alert.alert('Delete', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => taskService.deleteTask(task._id) }]); break;
        case 'repeat_custom': setRepeatModalTask(task); setShowRepeatModal(true); break;
        case 'duplicate': await taskService.duplicateTask(task._id); break;
      }
      fetchTasks();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleQuickEdit = (task: Task, field: string) => {
    if (Platform.OS === 'ios') {
      const options = field === 'status' ? statusOptions : field === 'priority' ? priorityOptions : categoryOptions;
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, 'Cancel'], cancelButtonIndex: options.length, title: `Select ${field}` },
        async (idx) => {
          if (idx < options.length) {
            await taskService.updateTask(task._id, { [field]: options[idx] });
            fetchTasks();
          }
        }
      );
    }
  };

  // --- COMPONENT: Rich Task Row (List View đầy đủ thông tin) ---
  const TaskRow = ({ task, isCompleted, isOverdueMode }: { task: Task, isCompleted?: boolean, isOverdueMode?: boolean }) => {
    const assigneeInfo = getDetailedAssignees(task);
    const isRunning = isTimerRunning(task._id);
    const isOverdue = !isCompleted && task.dueDate && new Date(task.dueDate) < new Date();

    return (
      <TouchableOpacity 
        style={[styles.taskRow, isCompleted && styles.completedRow, (isOverdue || isOverdueMode) && styles.overdueRow]}
        onPress={() => { setSelectedTask(task._id); setShowTaskDetail(true); }}
        onLongPress={(e) => setContextMenu({ visible: true, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, task })}
      >
        {/* Cột màu Priority bên trái */}
        <View style={[styles.priorityLine, { backgroundColor: getPriorityColor(task.priority) }]} />
        
        <View style={styles.taskContent}>
          {/* Dòng 1: Title */}
          <View style={styles.taskHeader}>
            <Text style={[styles.taskTitle, isCompleted && styles.completedText]} numberOfLines={1}>{task.title}</Text>
          </View>

          {/* Dòng 2: Badges (Status, Category, Priority) - Giống Web */}
          <View style={styles.badgeRow}>
             {/* Status Badge */}
            <TouchableOpacity onPress={() => handleQuickEdit(task, 'status')} style={[styles.badge, styles.statusBadge]}>
               <Text style={styles.badgeText}>{task.status?.replace('_', ' ')}</Text>
            </TouchableOpacity>

            {/* Category Badge */}
            <TouchableOpacity onPress={() => handleQuickEdit(task, 'category')} style={[styles.badge, { backgroundColor: '#e0f2fe' }]}>
               <Tag size={10} color="#0369a1" style={{marginRight: 2}} />
               <Text style={[styles.badgeText, { color: '#0369a1' }]}>{task.category || 'Other'}</Text>
            </TouchableOpacity>

            {/* Priority Badge */}
            <TouchableOpacity onPress={() => handleQuickEdit(task, 'priority')} style={[styles.badge, { backgroundColor: getPriorityColorLight(task.priority) }]}>
               <Text style={[styles.badgeText, { color: getPriorityColorDark(task.priority) }]}>{task.priority}</Text>
            </TouchableOpacity>
          </View>

          {/* Dòng 3: Meta Info (Date, Time, Assignee) */}
          <View style={styles.metaFooter}>
             <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
                {/* Due Date */}
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <Calendar size={12} color={isOverdue ? '#dc2626' : '#6b7280'} />
                   <Text style={[styles.metaText, isOverdue && styles.overdueText, {marginLeft: 4}]}>
                     {task.dueDate ? formatDate(task.dueDate) : '—'}
                   </Text>
                </View>
                {/* Timer */}
                <TaskTimer task={task} isRunning={isRunning} />
             </View>

             {/* Assignee (Avatar + Name) */}
             <View style={styles.assigneeContainer}>
               {assigneeInfo.hasAssignees ? (
                 <>
                   {assigneeInfo.assignees[0].avatar ? (
                     <Image source={{uri: assigneeInfo.assignees[0].avatar}} style={styles.smallAvatar} />
                   ) : (
                     <View style={[styles.smallAvatar, {backgroundColor: '#e5e7eb'}]}>
                       <Text style={{fontSize: 8, fontWeight:'bold'}}>{assigneeInfo.assignees[0].initial}</Text>
                     </View>
                   )}
                   <Text style={styles.assigneeName} numberOfLines={1}>
                      {assigneeInfo.assignees[0].name.split(' ')[0]} 
                      {assigneeInfo.totalCount > 1 ? ` +${assigneeInfo.totalCount - 1}` : ''}
                   </Text>
                 </>
               ) : (
                 <Text style={[styles.metaText, {fontSize: 10, fontStyle: 'italic'}]}>Unassigned</Text>
               )}
             </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- COMPONENT: Kanban Card (Có Avatar & Description) ---
  const KanbanBoard = () => {
    if (!kanbanData?.kanbanBoard) return <Text style={{padding: 20, textAlign: 'center'}}>No Data</Text>;
    const columns = [
      { key: 'todo', title: 'To Do', color: '#f3f4f6' },
      { key: 'in_progress', title: 'In Progress', color: '#dbeafe' },
      { key: 'completed', title: 'Completed', color: '#dcfce7' },
      { key: 'incomplete', title: 'Incomplete', color: '#fee2e2' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{padding: 16}}>
        {columns.map(col => {
          const colTasks = kanbanData.kanbanBoard[col.key]?.tasks || [];
          return (
            <View key={col.key} style={[styles.kanbanCol, {backgroundColor: col.color}]}>
              <View style={styles.kanbanHeader}>
                <Text style={styles.kanbanTitle}>{col.title}</Text>
                <Text style={styles.kanbanCount}>{colTasks.length}</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {colTasks.map((t: Task) => {
                   const assigneeInfo = getDetailedAssignees(t);
                   const isRunning = isTimerRunning(t._id);
                   
                   return (
                    <TouchableOpacity 
                      key={t._id} 
                      style={styles.kanbanCard}
                      onPress={() => { setSelectedTask(t._id); setShowTaskDetail(true); }}
                    >
                      {/* Priority Tag */}
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                         <View style={[styles.badge, { backgroundColor: getPriorityColorLight(t.priority) }]}>
                            <Text style={[styles.badgeText, { color: getPriorityColorDark(t.priority) }]}>{t.priority}</Text>
                         </View>
                         {t.dueDate && (
                           <Text style={{fontSize: 10, color: '#6b7280'}}>{formatDate(t.dueDate)}</Text>
                         )}
                      </View>

                      {/* Title */}
                      <Text style={styles.kanbanCardTitle} numberOfLines={2}>{t.title}</Text>
                      
                      {/* Description (Mới thêm) */}
                      {t.description ? (
                         <Text style={styles.kanbanDesc} numberOfLines={2}>{t.description}</Text>
                      ) : null}

                      {/* Footer: Timer & Avatar (Mới thêm) */}
                      <View style={styles.kanbanFooter}>
                         <TaskTimer task={t} isRunning={isRunning} />
                         
                         <View style={{flexDirection:'row'}}>
                           {assigneeInfo.assignees.slice(0, 3).map((a, i) => (
                             <View key={i} style={[styles.miniAvatar, {marginLeft: i > 0 ? -6 : 0, zIndex: 3-i}]}>
                                {a.avatar ? <Image source={{uri: a.avatar}} style={styles.miniAvatarImg} /> : <Text style={styles.miniAvatarText}>{a.initial}</Text>}
                             </View>
                           ))}
                         </View>
                      </View>
                    </TouchableOpacity>
                   );
                })}
              </ScrollView>
            </View>
          )
        })}
      </ScrollView>
    );
  };

  if (!currentGroup) return <NoGroupState title="Join a Group" description="..." />;

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <View>
          <Text style={[styles.title, isDark && styles.darkText]}>Tasks</Text>
          <Text style={styles.folderName}>{currentFolder?.name || 'All Tasks'}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 10}}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setViewMode(v => v === 'list' ? 'kanban' : 'list')}>
            {viewMode === 'list' ? <Layout size={20} color="#374151" /> : <List size={20} color="#374151" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSortDropdown(true)}>
            <Filter size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, isDark && styles.darkSearch]}>
        <Search size={18} color="#9ca3af" />
        <TextInput 
          style={[styles.searchInput, isDark && styles.darkText]} 
          placeholder="Search tasks..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {viewMode === 'list' ? (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchTasks} />}>
          {(['todo', 'inProgress', 'incomplete', 'completed'] as const).map(section => {
            const processedTasks = getProcessedTasks(tasks[section], section); // Đã có logic sort
            const titleMap = { todo: 'To Do', inProgress: 'In Progress', incomplete: 'Incomplete', completed: 'Completed' };
            
            return (
              <View key={section} style={styles.sectionContainer}>
                <TouchableOpacity 
                  style={styles.sectionHeader} 
                  onPress={() => setSectionsExpanded(p => ({...p, [section]: !p[section]}))}
                >
                  {sectionsExpanded[section] ? <ChevronDown size={18} color="#6b7280" /> : <ChevronRight size={18} color="#6b7280" />}
                  <Text style={styles.sectionTitle}>{titleMap[section]}</Text>
                  <View style={styles.countBadge}><Text style={styles.countText}>{tasks[section].length}</Text></View>
                </TouchableOpacity>
                
                {sectionsExpanded[section] && (
                  <View>
                    {processedTasks.map(task => (
                      <TaskRow key={task._id} task={task} isCompleted={section === 'completed'} isOverdueMode={section === 'incomplete'} />
                    ))}
                    {processedTasks.length === 0 && <Text style={styles.emptySectionText}>No tasks</Text>}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <KanbanBoard />
      )}

      {/* Modals */}
      <Modal visible={showSortDropdown} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSortDropdown(false)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownHeader}>Sort By</Text>
            {sortOptions.map(opt => (
              <TouchableOpacity key={opt.key} style={styles.dropdownItem} onPress={() => handleSortSelect(opt.key, 'asc')}>
                <Text>{opt.label}</Text>
                {sortConfigs.todo[0]?.key === opt.key && <CheckCircle2 size={16} color="#3b82f6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {showCreateModal && <CreateTaskModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onCreateTask={() => { setShowCreateModal(false); fetchTasks(); }} currentUser={currentUser} groupMembers={currentGroup?.members || []} />}
      {showTaskDetail && selectedTask && <TaskDetailModal visible={showTaskDetail} taskId={selectedTask} onClose={() => setShowTaskDetail(false)} onTaskUpdate={fetchTasks} onTaskDelete={() => { fetchTasks(); setShowTaskDetail(false); }} />}
      {showRepeatModal && repeatModalTask && <RepeatTaskModal visible={showRepeatModal} task={repeatModalTask} onClose={() => setShowRepeatModal(false)} onSave={() => { fetchTasks(); setShowRepeatModal(false); }} />}
      {contextMenu && <TaskContextMenu visible={contextMenu.visible} x={contextMenu.x} y={contextMenu.y} task={contextMenu.task} onAction={handleContextMenuAction} onClose={() => setContextMenu(null)} />}
    </SafeAreaView>
  );
}

// --- Colors & Styles ---
const getPriorityColor = (p: string) => {
  switch(p) { case 'urgent': return '#ef4444'; case 'high': return '#f97316'; case 'medium': return '#eab308'; default: return '#3b82f6'; }
};
const getPriorityColorLight = (p: string) => {
  switch(p) { case 'urgent': return '#fee2e2'; case 'high': return '#ffedd5'; case 'medium': return '#fef9c3'; default: return '#dbeafe'; }
};
const getPriorityColorDark = (p: string) => {
  switch(p) { case 'urgent': return '#991b1b'; case 'high': return '#9a3412'; case 'medium': return '#854d0e'; default: return '#1e40af'; }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  darkContainer: { backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  darkHeader: { backgroundColor: '#1f2937', borderColor: '#374151' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  folderName: { fontSize: 13, color: '#6b7280' },
  darkText: { color: '#f9fafb' },
  addButton: { backgroundColor: '#3b82f6', padding: 8, borderRadius: 8 },
  iconButton: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  darkSearch: { backgroundColor: '#1f2937', borderColor: '#374151' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1f2937' },
  
  sectionContainer: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#4b5563', flex: 1, marginLeft: 8 },
  countBadge: { backgroundColor: '#e5e7eb', paddingHorizontal: 8, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '600' },
  emptySectionText: { textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 12 },

  // --- New Rich Task Row Styles ---
  taskRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  completedRow: { opacity: 0.6, backgroundColor: '#f9fafb' },
  overdueRow: { backgroundColor: '#fef2f2' },
  priorityLine: { width: 4, borderRadius: 2, marginRight: 12 },
  taskContent: { flex: 1, gap: 6 }, // Tăng gap giữa các dòng
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', flex: 1, lineHeight: 20 },
  completedText: { textDecorationLine: 'line-through', color: '#9ca3af' },
  
  // Badges Row
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadge: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  badgeText: { fontSize: 10, fontWeight: '500', color: '#4b5563', textTransform: 'capitalize' },

  // Meta Footer (Date, Time, Assignee)
  metaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  metaText: { fontSize: 11, color: '#4b5563' },
  overdueText: { color: '#dc2626', fontWeight: '500' },
  
  // Assignee
  assigneeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  assigneeName: { fontSize: 10, color: '#374151', marginLeft: 4, maxWidth: 60 },
  smallAvatar: { width: 14, height: 14, borderRadius: 7 },

  // Timer
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4 },
  overEstimateBadge: { backgroundColor: '#fef3c7' },
  timerDot: { width: 6, height: 6, borderRadius: 3 },
  timerTextRunning: { fontSize: 11, fontWeight: '700', color: '#166534' },
  overEstimateText: { color: '#b45309' },
  timeEstimate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: '#6b7280' },

  // Kanban Styles
  kanbanCol: { width: SCREEN_WIDTH * 0.75, marginRight: 12, borderRadius: 12, padding: 12, height: '100%' },
  kanbanHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  kanbanTitle: { fontWeight: '700', fontSize: 15, color: '#374151' },
  kanbanCount: { backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 8, borderRadius: 10, overflow:'hidden' },
  kanbanCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, shadowColor:'#000', shadowOpacity: 0.05, shadowRadius: 2 },
  kanbanCardTitle: { fontWeight: '600', color: '#1f2937', marginBottom: 6 },
  kanbanDesc: { fontSize: 11, color: '#6b7280', marginBottom: 8, lineHeight: 16 },
  kanbanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 8 },
  
  miniAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  miniAvatarImg: { width: 20, height: 20, borderRadius: 10 },
  miniAvatarText: { fontSize: 9, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 },
  dropdownMenu: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  dropdownHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  dropdownItem: { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#f3f4f6' }
});