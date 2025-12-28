import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
  ActivityIndicator, TextInput, Modal, Alert, Platform
} from 'react-native';
import {
  Plus, ChevronLeft, ChevronRight, Search, Filter, Folder, Tag,
  ZoomIn, ZoomOut, X, Circle, GripVertical, User, Calendar
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { taskService, Task } from '../services/task.service';
import { groupService } from '../services/group.service';
import { folderService } from '../services/folder.service'; 
import { useFolder } from '../context/FolderContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegional } from '../context/RegionalContext';
import { GroupMember } from '../types/group.types';

import CreateTaskModal from '../components/tasks/CreateTaskModal'; 
import TaskDetailModal from '../components/tasks/TaskDetailModal';
// ✅ Import NoFolderState
import NoFolderState from '../components/common/NoFolderState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ZoomLevel = 'days' | 'weeks' | 'months' | 'quarters';
type GroupBy = 'none' | 'folder' | 'category' | 'assignee' | 'status';

interface TimelineTask extends Omit<Task, 'startDate'> {
  startDate: Date;
  endDate: Date;
  left: number;
  width: number;
  row: number;
  [key: string]: any;
}

export default function TimelineView() {
  const { user: currentUser } = useAuth();
  const { isDark } = useTheme();
  
  const { currentFolder } = useFolder(); 
  
  const { t, language } = useLanguage();
  const { formatDate } = useRegional(); 

  const [tasks, setTasks] = useState<Task[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  // State local fallback ID
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>(currentFolder?._id);

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('weeks');
  const [currentDate, setCurrentDate] = useState(new Date());

  const scrollViewRef = useRef<ScrollView>(null);

  // --- 1. LẤY GROUP ID AN TOÀN ---
  const currentGroupId = useMemo(() => {
      if (!currentUser) return undefined;
      const user = currentUser as any;
      if (user.currentGroupId) return user.currentGroupId;
      if (user.groupId) return user.groupId;
      if (user.currentGroup && user.currentGroup._id) return user.currentGroup._id;
      return undefined;
  }, [currentUser]);

  useEffect(() => {
      if (currentFolder?._id) setActiveFolderId(currentFolder._id);
  }, [currentFolder]);

  // Constants
  const PIXELS_PER_DAY = useMemo(() => {
    switch (zoomLevel) {
      case 'days': return 60; 
      case 'weeks': return 30; 
      case 'months': return 15; 
      case 'quarters': return 8; 
      default: return 30;
    }
  }, [zoomLevel]);
  const DAYS_BUFFER = 45;

  const getTaskColor = (taskId: string) => {
    let hash = 0; for (let i = 0; i < taskId.length; i++) { hash = (hash << 5) - hash + taskId.charCodeAt(i); hash |= 0; }
    const hue = Math.abs(hash) % 360; return `hsl(${hue}, 65%, 55%)`;
  };

  // --- 2. FETCH DATA (ĐÃ SỬA LOGIC) ---
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      let targetFolderId = currentFolder?._id || activeFolderId;

      // ✅ FIX: Logic Auto-Select Folder thông minh hơn
      // Hỗ trợ cả Group và Personal Workspace
      if (!targetFolderId) {
          try {
              // 1. Xác định context ID (Group hoặc User)
              const contextId = currentGroupId || currentUser._id;
              // 2. Xác định cờ isPersonal (nếu không có group ID thì là personal)
              const isPersonal = !currentGroupId;

              if (contextId) {
                  // 3. Gọi service với cờ isPersonal (để tránh lỗi Group Not Found)
                  const res = await folderService.getFolders(contextId, isPersonal);
                  const folders = Array.isArray(res) ? res : ((res as any).folders || (res as any).data || []);
                  
                  if (folders.length > 0) {
                      const first = folders[0];
                      targetFolderId = first._id || first.id;
                      setActiveFolderId(targetFolderId);
                  }
              }
          } catch (err) { 
              console.warn("Auto-select failed:", err); 
          }
      }

      // Chỉ fetch tasks nếu đã có folder ID hợp lệ
      if (targetFolderId) {
          const res = await taskService.getAllTasks({ folderId: targetFolderId });
          setTasks((res.tasks || []) as Task[]);
      } else {
          // Nếu không có folder, clear tasks để tránh hiển thị rác
          setTasks([]);
      }

      if (currentGroupId && groupMembers.length === 0) {
          try {
             const res = await groupService.getGroupMembers(currentGroupId);
             const members = Array.isArray(res) ? res : ((res as any).data || []);
             setGroupMembers(members);
          } catch (err) {}
      }
    } catch (error) { 
        console.error('Error fetching:', error); 
    } finally { 
        setLoading(false); 
    }
  }, [currentUser, currentFolder, activeFolderId, currentGroupId, groupMembers.length]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenCreateModal = (preDate?: Date) => {
      const fid = currentFolder?._id || activeFolderId;
      if (!fid) { Alert.alert("Notice", "Select a folder first."); return; }
      setSelectedDateForCreate(preDate || new Date());
      setShowCreateModal(true);
  };

  // --- 3. TIMELINE LOGIC ---
  const dateRange = useMemo(() => {
    const start = new Date(currentDate); start.setDate(start.getDate() - DAYS_BUFFER);
    const end = new Date(currentDate); end.setDate(end.getDate() + DAYS_BUFFER);
    const dates: Date[] = []; let curr = new Date(start); 
    while (curr <= end) { dates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); } 
    return { start, end, dates };
  }, [currentDate]);

  const processedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (task.title.toLowerCase().includes(q) || (task.description && task.description.toLowerCase().includes(q)));
    });
    const groups: { [key: string]: Task[] } = {};
    if (groupBy === 'none') { groups[t('timeline.allTasks' as any) || 'All Tasks'] = filtered; } else {
      filtered.forEach(task => {
        let key = 'Uncategorized';
        if (groupBy === 'status') key = task.status || 'todo';
        else if (groupBy === 'folder' && task.folderId && typeof task.folderId === 'object') key = task.folderId.name;
        else if (groupBy === 'category') key = task.category || 'General';
        else if (groupBy === 'assignee') {
             if (task.assignedTo && task.assignedTo.length > 0) {
                 const u = task.assignedTo[0].userId; key = typeof u === 'object' ? (u as any).name : 'User';
             } else { key = t('timeline.unassigned' as any) || 'Unassigned'; }
        }
        if (!groups[key]) groups[key] = []; groups[key].push(task);
      });
    }
    return groups;
  }, [tasks, searchQuery, groupBy, t]);

  const timelineData = useMemo(() => {
    const allRows: { groupName: string; tasks: TimelineTask[]; height: number }[] = [];
    Object.entries(processedTasks).forEach(([groupName, groupTasks]) => {
      const mappedTasks = groupTasks.map(task => {
        const start = task.startDate ? new Date(task.startDate) : (task.createdAt ? new Date(task.createdAt) : new Date());
        const end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000);
        if (end < dateRange.start || start > dateRange.end) return null;
        const diffStart = (start.getTime() - dateRange.start.getTime()) / (1000 * 3600 * 24);
        const duration = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
        return { ...task, startDate: start, endDate: end, left: Math.max(0, diffStart * PIXELS_PER_DAY), width: duration * PIXELS_PER_DAY, row: 0 } as TimelineTask;
      }).filter(Boolean) as TimelineTask[];

      const rows: TimelineTask[][] = [];
      const sorted = mappedTasks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      sorted.forEach(task => {
        let placed = false;
        for (let i = 0; i < rows.length; i++) {
          const lastTask = rows[i][rows[i].length - 1];
          if (task.left >= (lastTask.left + lastTask.width + 5)) { rows[i].push(task); task.row = i; placed = true; break; }
        }
        if (!placed) { rows.push([task]); task.row = rows.length - 1; }
      });
      const rowHeight = 40;
      const totalHeight = Math.max(60, rows.length * (rowHeight + 10) + 40);
      allRows.push({ groupName, tasks: sorted, height: totalHeight });
    });
    return allRows;
  }, [processedTasks, dateRange, PIXELS_PER_DAY]);

  const navigateDate = (direction: 'prev' | 'next') => { const delta = direction === 'next' ? 7 : -7; const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() + delta); setCurrentDate(newDate); };
  const goToToday = () => setCurrentDate(new Date());
  useEffect(() => { if (scrollViewRef.current && dateRange.dates.length > 0) { const todayIndex = DAYS_BUFFER; const offset = (todayIndex * PIXELS_PER_DAY) - (SCREEN_WIDTH / 2) + 50; setTimeout(() => { scrollViewRef.current?.scrollTo({ x: Math.max(0, offset), animated: false }); }, 100); } }, [currentDate, PIXELS_PER_DAY]);
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  
  // ✅ Logic hiển thị Folder ID chính xác
  const displayFolderId = currentFolder?._id || activeFolderId;

  // --- RENDER ---

  // 1. Loading
  if (loading && !displayFolderId) {
    return <View style={[styles.container, styles.centered, isDark && styles.darkContainer]}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  // ✅ 2. FIX: Hiển thị NoFolderState để tạo folder
  if (!displayFolderId) {
    return (
        <NoFolderState />
    );
  }

  // 3. Main View
  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* HEADER */}
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, isDark && styles.darkText]}>{t('timeline.title' as any) || 'Timeline'}</Text>
            <Text style={{color: '#666', fontSize: 12}}>{currentFolder?.name || 'Loading...'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
             <TouchableOpacity style={styles.iconButton} onPress={() => setShowFilterModal(true)}><Filter size={20} color={isDark ? '#fff' : '#666'} /></TouchableOpacity>
             <TouchableOpacity style={styles.addButton} onPress={() => handleOpenCreateModal()}><Plus size={20} color="#fff" /></TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.controls, isDark && styles.darkControls]}>
          <TouchableOpacity onPress={() => navigateDate('prev')} style={styles.navBtn}>
              <ChevronLeft size={24} color={isDark ? '#fff' : '#333'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.dateDisplay}>
              <Calendar size={16} color={isDark ? '#fff' : '#333'} style={{marginRight: 6}} />
              <Text style={[styles.dateText, isDark && styles.darkText]}>
                  {currentDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}
              </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateDate('next')} style={styles.navBtn}>
              <ChevronRight size={24} color={isDark ? '#fff' : '#333'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLL */}
      <ScrollView style={styles.mainScroll} contentContainerStyle={{flexGrow: 1}}>
        <View style={styles.timelineWrapper}>
          
          <View style={[styles.sidebar, isDark && styles.darkSidebar]}>
            <View style={[styles.sidebarHeader, { height: 40, borderRightWidth: 1, borderColor: isDark ? '#374151' : '#e5e7eb' }]} /> 
            {timelineData.map((group, idx) => (
              <View 
                key={idx} 
                style={[
                    styles.groupLabelContainer, 
                    isDark && styles.darkGroupLabelContainer,
                    { height: group.height, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#eee' }
                ]}
              >
                <Text numberOfLines={2} style={[styles.groupLabel, isDark && styles.darkText]}>{group.groupName}</Text>
                <Text style={styles.groupCount}>({group.tasks.length})</Text>
              </View>
            ))}
          </View>
          
          {/* Grid */}
          <ScrollView horizontal ref={scrollViewRef} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View>
              <View style={[styles.dateHeaderRow, isDark && { borderBottomColor: '#374151', backgroundColor: '#111827' }]}>
                {dateRange.dates.map((date, idx) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <TouchableOpacity 
                        key={idx} 
                        style={[styles.dateCell, { width: PIXELS_PER_DAY, borderRightColor: isDark ? '#374151' : '#f3f4f6' }, isToday && { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}
                        onPress={() => handleOpenCreateModal(date)}
                    >
                      <Text style={[styles.dateDay, isDark && styles.darkText, isToday && { color: '#3b82f6' }]}>{date.getDate()}</Text>
                      <Text style={[styles.dateMonth, isDark && styles.darkSubText]}>{date.toLocaleDateString(locale, { weekday: 'narrow' })}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.gridContainer}>
                 {dateRange.dates.map((_, idx) => (
                    <View key={`grid-${idx}`} style={[styles.gridLine, { left: idx * PIXELS_PER_DAY, width: 1, height: '100%', backgroundColor: isDark ? '#374151' : '#f0f0f0' }]} />
                 ))}
                 
                 {timelineData.map((group, gIdx) => (
                   <View key={gIdx} style={{ height: group.height, position: 'relative', borderBottomWidth: 1, borderBottomColor: 'transparent' }}>
                     {group.tasks.map(task => (
                       <TouchableOpacity 
                            key={task._id} 
                            style={[
                                styles.taskBar, 
                                { left: task.left, width: task.width, top: task.row * 50 + 10, backgroundColor: getTaskColor(task._id) }
                            ]} 
                            onPress={() => { setSelectedTaskId(task._id); setShowTaskDetail(true); }}
                       >
                         <Text numberOfLines={1} style={styles.taskTitle}>{task.title}</Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                 ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* FILTER MODAL */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowFilterModal(false)} activeOpacity={1}>
          <View style={[styles.modalContent, isDark && styles.darkPanel]}>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Display Settings</Text>
            
            <Text style={[styles.label, isDark && styles.darkText, {marginTop: 10}]}>Zoom</Text>
            <View style={styles.optionRow}>
              {(['days', 'weeks', 'months'] as ZoomLevel[]).map(lvl => (
                <TouchableOpacity key={lvl} style={[styles.optionBtn, zoomLevel === lvl && styles.optionBtnActive]} onPress={() => setZoomLevel(lvl)}>
                  <Text style={[styles.optionText, zoomLevel === lvl && styles.optionTextActive]}>{lvl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, isDark && styles.darkText, {marginTop: 15}]}>Group By</Text>
            <View style={styles.optionRowWrap}>
              {(['none', 'status', 'folder', 'assignee'] as GroupBy[]).map(grp => (
                <TouchableOpacity key={grp} style={[styles.optionBtn, groupBy === grp && styles.optionBtnActive]} onPress={() => setGroupBy(grp)}>
                  <Text style={[styles.optionText, groupBy === grp && styles.optionTextActive]}>{grp}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={[styles.closeBtn, {marginTop: 20}]} onPress={() => setShowFilterModal(false)}>
                <Text style={{color:'#fff', fontWeight:'bold'}}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODALS */}
      {showCreateModal && (
        <CreateTaskModal
          key={displayFolderId || 'init'}
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchData()} 
          initialDueDate={selectedDateForCreate || currentDate}
          currentUser={currentUser}
          groupMembers={groupMembers}
          folderId={displayFolderId}
          groupId={currentGroupId}
        />
      )}

      {showTaskDetail && selectedTaskId && (
        <TaskDetailModal
          visible={showTaskDetail}
          taskId={selectedTaskId}
          onClose={() => { setShowTaskDetail(false); setSelectedTaskId(null); }}
          onTaskUpdate={fetchData} 
          onTaskDelete={fetchData} 
          groupMembers={groupMembers}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  darkContainer: { backgroundColor: '#111827' },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  darkHeader: { backgroundColor: '#1f2937', borderBottomColor: '#374151' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  addButton: { backgroundColor: '#3b82f6', padding: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  iconButton: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 8 },
  
  // Controls
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4 },
  darkControls: { backgroundColor: '#374151' }, 
  
  navBtn: { padding: 8 },
  dateDisplay: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  
  mainScroll: { flex: 1 },
  timelineWrapper: { flexDirection: 'row', minHeight: '100%' },
  
  // Sidebar
  sidebar: { width: 100, backgroundColor: '#fff', zIndex: 10 },
  darkSidebar: { backgroundColor: '#1f2937' },
  sidebarHeader: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  
  // Group Label
  groupLabelContainer: { justifyContent: 'center', paddingHorizontal: 8, backgroundColor: '#fff' },
  darkGroupLabelContainer: { backgroundColor: '#1f2937', borderRightWidth: 1, borderRightColor: '#374151' }, 
  
  groupLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  groupCount: { fontSize: 10, color: '#9ca3af' },
  dateHeaderRow: { flexDirection: 'row', height: 40, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff' },
  dateCell: { justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f3f4f6' },
  dateDay: { fontSize: 14, fontWeight: '600', color: '#374151' },
  dateMonth: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
  gridContainer: { position: 'relative', flex: 1 },
  gridLine: { position: 'absolute', top: 0 },
  taskBar: { position: 'absolute', height: 32, borderRadius: 6, justifyContent: 'center', paddingHorizontal: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
  taskTitle: { color: '#fff', fontSize: 12, fontWeight: '600' },
  text: { color: '#374151' },
  darkText: { color: '#f9fafb' },
  darkSubText: { color: '#9ca3af' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  darkPanel: { backgroundColor: '#1f2937' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 14, fontWeight:'600', color:'#333' },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionRowWrap: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  optionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: 'transparent' },
  optionBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  optionText: { fontSize: 14, color: '#6b7280' },
  optionTextActive: { color: '#3b82f6', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8, color: '#333' },
  darkInput: { borderColor: '#4b5563', color: '#fff', backgroundColor: '#374151' },
  closeBtn: { backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' }
});