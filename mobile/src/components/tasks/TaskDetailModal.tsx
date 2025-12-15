import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MinimalUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AssignedUser {
  userId: string | MinimalUser;
  assignedAt: string;
}

interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskUpdate: (updatedTask: any) => void;
  onTaskDelete: (taskId: string) => void;
  taskId: string;
  currentUser?: any;
}

interface Comment {
  _id?: string;
  userId?: string;
  user?: any;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  attachment?: any;
}

interface TimeEntry {
  _id?: string;
  user?: any;
  date: string;
  hours: number;
  minutes: number;
  description?: string;
  billable: boolean;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
}

interface ScheduledWork {
  _id?: string;
  user?: any;
  scheduledDate: string;
  estimatedHours: number;
  estimatedMinutes: number;
  description?: string;
  status: string;
  createdAt?: string;
}

export default function TaskDetailModal({
  visible,
  onClose,
  onTaskUpdate,
  onTaskDelete,
  taskId,
  currentUser,
}: TaskDetailModalProps) {
  const { isDark } = useTheme();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [estimatedTime, setEstimatedTime] = useState('');
  
  // State for editable fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  
  // Task properties state
  const [taskProperties, setTaskProperties] = useState({
    title: '',
    status: 'todo',
    dueDate: '',
    estimatedTime: '',
    type: 'Operational',
    priority: 'medium',
    description: ''
  });

  // Existing state for time entries and scheduled work
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [scheduledWork, setScheduledWork] = useState<ScheduledWork[]>([]);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [newTimeEntry, setNewTimeEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    minutes: 0,
    description: '',
    billable: true
  });
  const [showScheduledWorkForm, setShowScheduledWorkForm] = useState(false);
  const [newScheduledWork, setNewScheduledWork] = useState({
    scheduledDate: new Date().toISOString().split('T')[0],
    estimatedHours: 0,
    estimatedMinutes: 0,
    description: '',
    status: 'scheduled'
  });

  // NEW: State for custom status functionality
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
  const [customStatusName, setCustomStatusName] = useState('');
  const [customStatusColor, setCustomStatusColor] = useState('#3B82F6');

  // NEW: State for timer functionality
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // NEW: State for repeat task functionality
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [repeatSettings, setRepeatSettings] = useState({
    isRepeating: false,
    frequency: 'weekly',
    interval: 1,
    endDate: '',
    occurrences: null
  });

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const estimatedTimeOptions = ['15m', '30m', '1h', '2h', '4h', '1d', '2d', '1w'];
  const taskTypeOptions = ['Operational', 'Strategic', 'Financial', 'Technical', 'Other'];
  const priorityOptions = ['low', 'medium', 'high', 'urgent'];
  const statusOptions = ['todo', 'in_progress', 'completed', 'archived'];

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in_progress': return '#F59E0B';
      case 'archived': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'urgent':
        return { backgroundColor: '#FEE2E2', color: '#DC2626' };
      case 'high':
        return { backgroundColor: '#FFEDD5', color: '#EA580C' };
      case 'medium':
        return { backgroundColor: '#FEF3C7', color: '#D97706' };
      default:
        return { backgroundColor: '#D1FAE5', color: '#059669' };
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalLoggedTime = useCallback(() => {
    const totalMinutes = timeEntries.reduce((total, entry) => {
      return total + (entry.hours * 60) + (entry.minutes || 0);
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}h`;
  }, [timeEntries]);

  // Fetch task details
  const fetchTaskDetails = useCallback(async () => {
    if (!visible || !taskId) return;

    try {
      setLoading(true);
      // Simulate API call - replace with actual service
      // const taskData = await taskService.getTaskById(taskId);
      
      // Mock data for demonstration
      const mockTaskData = {
        _id: taskId,
        title: 'Sample Task',
        status: 'todo',
        description: 'This is a sample task description',
        dueDate: new Date().toISOString(),
        estimatedTime: '2h',
        type: 'Operational',
        priority: 'medium',
        assignedTo: [],
        comments: [],
        attachments: [],
        timeEntries: [],
        scheduledWork: []
      };
      
      setTask(mockTaskData);
      setTaskProperties({
        title: mockTaskData.title,
        status: mockTaskData.status,
        dueDate: mockTaskData.dueDate ? new Date(mockTaskData.dueDate).toISOString().split('T')[0] : '',
        estimatedTime: mockTaskData.estimatedTime,
        type: mockTaskData.type,
        priority: mockTaskData.priority,
        description: mockTaskData.description
      });
      
    } catch (error) {
      console.error('Error fetching task details:', error);
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  }, [visible, taskId]);

  useEffect(() => {
    if (visible) {
      fetchTaskDetails();
    }
  }, [visible, fetchTaskDetails]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timerStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timerStartTime]);

  const handleStartTimer = () => {
    if (!isTimerRunning) {
      setTimerStartTime(new Date());
      setIsTimerRunning(true);
    }
  };

  const handleStopTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerStartTime(null);
      setElapsedTime(0);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onTaskDelete(taskId);
            onClose();
          }
        }
      ]
    );
  };

  const handleAddComment = () => {
    if (!comment.trim() || !task) return;

    const newComment: Comment = {
      _id: Date.now().toString(),
      userId: currentUser?._id,
      user: currentUser,
      content: comment.trim(),
      createdAt: new Date().toISOString(),
      isEdited: false
    };

    setComments(prev => [...prev, newComment]);
    setComment('');
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setComments(prev => prev.filter(comment => comment._id !== commentId));
            setShowCommentMenu(null);
          }
        }
      ]
    );
  };

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment._id!);
    setEditingCommentContent(comment.content);
    setShowCommentMenu(null);
  };

  const handleUpdateComment = (commentId: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment._id === commentId
          ? {
              ...comment,
              content: editingCommentContent,
              updatedAt: new Date().toISOString(),
              isEdited: true,
            }
          : comment,
      ),
    );
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const isCommentOwner = (comment: Comment) => {
    return currentUser && comment.userId === currentUser._id;
  };

  const getUserDisplayName = (comment: Comment) => {
    return comment.user?.name || currentUser?.name || 'User';
  };

  const getUserInitial = (comment: Comment) => {
    const name = getUserDisplayName(comment);
    return name.charAt(0).toUpperCase();
  };

  // Assignee Section Component
  const AssigneeSection = ({ task }: { task: any }) => {
    const assignees = task.assignedTo || [];
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
            Assigned to ({assignees.length})
          </Text>
          <TouchableOpacity>
            <Text style={styles.addButtonText}>+ Add assignee</Text>
          </TouchableOpacity>
        </View>
        
        {assignees.length === 0 ? (
          <View style={[styles.emptyState, isDark && styles.darkEmptyState]}>
            <Feather name="user" size={32} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={[styles.emptyStateText, isDark && styles.darkText]}>No one assigned</Text>
            <TouchableOpacity>
              <Text style={styles.assignButtonText}>Assign someone</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.assigneesList}>
            {assignees.map((assignee: any, index: number) => (
              <View key={index} style={[styles.assigneeItem, isDark && styles.darkAssigneeItem]}>
                <View style={styles.assigneeAvatar}>
                  <Text style={styles.assigneeInitial}>
                    {assignee.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.assigneeInfo}>
                  <Text style={[styles.assigneeName, isDark && styles.darkText]}>
                    {assignee.userId?.name || 'Unknown User'}
                  </Text>
                  <Text style={[styles.assigneeEmail, isDark && styles.darkSubtitle]}>
                    {assignee.userId?.email || ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.removeAssigneeButton}>
                  <Feather name="trash-2" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Comment Item Component
  const CommentItem = ({ comment, index }: { comment: Comment; index: number }) => {
    const isEditing = editingCommentId === comment._id;
    const isOwner = isCommentOwner(comment);

    return (
      <View key={comment._id || `comment-${index}`} style={styles.commentItem}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentInitial}>
            {getUserInitial(comment)}
          </Text>
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentAuthor, isDark && styles.darkText]}>
              {getUserDisplayName(comment)}
            </Text>
            <Text style={[styles.commentDate, isDark && styles.darkSubtitle]}>
              {new Date(comment.createdAt).toLocaleDateString()}
              {comment.isEdited && ' (edited)'}
            </Text>
            
            {isOwner && !isEditing && (
              <TouchableOpacity
                style={styles.commentMenuButton}
                onPress={() => setShowCommentMenu(showCommentMenu === comment._id ? null : comment._id!)}
              >
                <Feather name="more-vertical" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            )}
          </View>

          {showCommentMenu === comment._id && (
            <View style={[styles.commentMenu, isDark && styles.darkDropdown]}>
              <TouchableOpacity
                style={styles.commentMenuItem}
                onPress={() => startEditingComment(comment)}
              >
                <Text style={[styles.commentMenuText, isDark && styles.darkText]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.commentMenuItem}
                onPress={() => handleDeleteComment(comment._id!)}
              >
                <Text style={styles.deleteMenuText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}

          {isEditing ? (
            <View style={styles.commentEditContainer}>
              <TextInput
                style={[styles.commentEditInput, isDark && styles.darkInput]}
                value={editingCommentContent}
                onChangeText={setEditingCommentContent}
                multiline
                numberOfLines={3}
                autoFocus
              />
              <View style={styles.commentEditActions}>
                <TouchableOpacity
                  style={styles.saveCommentButton}
                  onPress={() => handleUpdateComment(comment._id!)}
                  disabled={!editingCommentContent.trim()}
                >
                  <Feather name="check" size={14} color="#FFFFFF" />
                  <Text style={styles.saveCommentText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelCommentButton, isDark && styles.darkCancelButton]}
                  onPress={cancelEditingComment}
                >
                  <Text style={[styles.cancelCommentText, isDark && styles.darkText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={[styles.commentText, isDark && styles.darkText]}>
              {comment.content}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Time Entry Form Component
  const TimeEntryForm = () => (
    <View style={[styles.formContainer, isDark && styles.darkFormContainer]}>
      <Text style={[styles.formTitle, isDark && styles.darkText]}>Add Time Entry</Text>
      <View style={styles.formGrid}>
        <View style={styles.formField}>
          <Text style={[styles.formLabel, isDark && styles.darkSubtitle]}>Date</Text>
          <TextInput
            style={[styles.formInput, isDark && styles.darkInput]}
            value={newTimeEntry.date}
            onChangeText={(text) => setNewTimeEntry({...newTimeEntry, date: text})}
          />
        </View>
        <View style={styles.formField}>
          <Text style={[styles.formLabel, isDark && styles.darkSubtitle]}>Hours</Text>
          <TextInput
            style={[styles.formInput, isDark && styles.darkInput]}
            value={newTimeEntry.hours.toString()}
            onChangeText={(text) => setNewTimeEntry({...newTimeEntry, hours: parseInt(text) || 0})}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.formField}>
          <Text style={[styles.formLabel, isDark && styles.darkSubtitle]}>Minutes</Text>
          <TextInput
            style={[styles.formInput, isDark && styles.darkInput]}
            value={newTimeEntry.minutes.toString()}
            onChangeText={(text) => setNewTimeEntry({...newTimeEntry, minutes: parseInt(text) || 0})}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.formField}>
          <Text style={[styles.formLabel, isDark && styles.darkSubtitle]}>Billable</Text>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setNewTimeEntry({...newTimeEntry, billable: !newTimeEntry.billable})}
          >
            <View style={[styles.checkbox, newTimeEntry.billable && styles.checkboxChecked]}>
              {newTimeEntry.billable && <Feather name="check" size={12} color="#FFFFFF" />}
            </View>
            <Text style={[styles.checkboxLabel, isDark && styles.darkSubtitle]}>Billable</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.fullWidthField}>
          <Text style={[styles.formLabel, isDark && styles.darkSubtitle]}>Description</Text>
          <TextInput
            style={[styles.formInput, isDark && styles.darkInput]}
            value={newTimeEntry.description}
            onChangeText={(text) => setNewTimeEntry({...newTimeEntry, description: text})}
            placeholder="Optional description"
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          />
        </View>
      </View>
      <View style={styles.formActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {/* Handle add time entry */}}
        >
          <Text style={styles.primaryButtonText}>Add Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isDark && styles.darkSecondaryButton]}
          onPress={() => setShowTimeEntryForm(false)}
        >
          <Text style={[styles.secondaryButtonText, isDark && styles.darkText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!visible) return null;

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={[styles.loadingText, isDark && styles.darkText]}>
              Loading task details...
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!task) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load task details</Text>
            <TouchableOpacity style={styles.errorCloseButton} onPress={onClose}>
              <Text style={styles.errorCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, isDark && styles.darkHeader]}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, isDark && styles.darkText]}>
                {taskProperties.title || 'Untitled Task'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, isDark && styles.darkCloseButton]}
            >
              <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#374151'} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Task Properties */}
            <View style={styles.propertiesContainer}>
              {/* Status */}
              <TouchableOpacity 
                style={[styles.propertyItem, isDark && styles.darkPropertyItem]}
                onPress={() => {/* Start editing status */}}
              >
                <View style={styles.propertyLeft}>
                  <View 
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(taskProperties.status) }
                    ]} 
                  />
                  <Text style={[styles.propertyLabel, isDark && styles.darkText]}>
                    Status
                  </Text>
                </View>
                <View style={styles.propertyRight}>
                  <Text style={[styles.propertyValue, isDark && styles.darkText]}>
                    {getStatusDisplay(taskProperties.status)}
                  </Text>
                  <Feather name="edit-2" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </TouchableOpacity>

              {/* Due Date */}
              <TouchableOpacity 
                style={[styles.propertyItem, isDark && styles.darkPropertyItem]}
                onPress={() => {/* Start editing due date */}}
              >
                <View style={styles.propertyLeft}>
                  <Feather name="calendar" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.propertyLabel, isDark && styles.darkText]}>
                    Due date
                  </Text>
                </View>
                <View style={styles.propertyRight}>
                  <Text style={[styles.propertyValue, isDark && styles.darkText]}>
                    {taskProperties.dueDate ? new Date(taskProperties.dueDate).toLocaleDateString('en-GB') : '—'}
                  </Text>
                  <Feather name="edit-2" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </TouchableOpacity>

              {/* Estimated Time */}
              <TouchableOpacity 
                style={[styles.propertyItem, isDark && styles.darkPropertyItem]}
                onPress={() => {/* Start editing estimated time */}}
              >
                <View style={styles.propertyLeft}>
                  <Feather name="clock" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.propertyLabel, isDark && styles.darkText]}>
                    Estimated time
                  </Text>
                </View>
                <View style={styles.propertyRight}>
                  <Text style={[styles.propertyValue, isDark && styles.darkText]}>
                    {taskProperties.estimatedTime || '—'}
                  </Text>
                  <Feather name="edit-2" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </TouchableOpacity>

              {/* Type */}
              <TouchableOpacity 
                style={[styles.propertyItem, isDark && styles.darkPropertyItem]}
                onPress={() => {/* Start editing type */}}
              >
                <View style={styles.propertyLeft}>
                  <Feather name="flag" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.propertyLabel, isDark && styles.darkText]}>
                    Type
                  </Text>
                </View>
                <View style={styles.propertyRight}>
                  <Text style={[styles.propertyValue, isDark && styles.darkText]}>
                    {taskProperties.type}
                  </Text>
                  <Feather name="edit-2" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </TouchableOpacity>

              {/* Assignees */}
              <AssigneeSection task={task} />

              {/* Priority */}
              <TouchableOpacity 
                style={[styles.propertyItem, isDark && styles.darkPropertyItem]}
                onPress={() => {/* Start editing priority */}}
              >
                <View style={styles.propertyLeft}>
                  <Feather name="flag" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.propertyLabel, isDark && styles.darkText]}>
                    Priority
                  </Text>
                </View>
                <View style={styles.propertyRight}>
                  <View 
                    style={[
                      styles.priorityBadge,
                      getPriorityStyle(taskProperties.priority)
                    ]}
                  >
                    <Text style={styles.priorityText}>
                      {taskProperties.priority.charAt(0).toUpperCase() + taskProperties.priority.slice(1)}
                    </Text>
                  </View>
                  <Feather name="edit-2" size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, isDark && styles.darkActionButton]}
                onPress={() => setShowCustomStatusModal(true)}
              >
                <Feather name="plus" size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                <Text style={[styles.actionButtonText, isDark && styles.darkText]}>
                  Add status
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  isTimerRunning ? styles.timerButtonActive : styles.timerButton,
                  isDark && styles.darkActionButton
                ]}
                onPress={isTimerRunning ? handleStopTimer : handleStartTimer}
              >
                <Feather name="play-circle" size={16} color={isTimerRunning ? '#DC2626' : (isDark ? '#E5E7EB' : '#374151')} />
                <Text style={[
                  styles.actionButtonText,
                  isTimerRunning ? styles.timerButtonTextActive : {},
                  isDark && styles.darkText
                ]}>
                  {isTimerRunning ? `Stop (${formatElapsedTime(elapsedTime)})` : 'Start time'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, isDark && styles.darkActionButton]}
                onPress={() => setShowTimeEntryForm(!showTimeEntryForm)}
              >
                <Feather name="clock" size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                <Text style={[styles.actionButtonText, isDark && styles.darkText]}>
                  Log time
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, isDark && styles.darkActionButton]}
                onPress={() => setShowRepeatModal(true)}
              >
                <Feather name="refresh-cw" size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                <Text style={[styles.actionButtonText, isDark && styles.darkText]}>
                  Repeat task
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time Entry Form */}
            {showTimeEntryForm && <TimeEntryForm />}

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
                Description
              </Text>
              <TouchableOpacity 
                style={[styles.descriptionContainer, isDark && styles.darkInput]}
                onPress={() => {/* Start editing description */}}
              >
                <Text style={[styles.descriptionText, isDark && styles.darkText]}>
                  {taskProperties.description || 'Click to add a description...'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comments Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
                  <Feather name="message-square" size={16} color={isDark ? '#E5E7EB' : '#374151'} />
                  {' '}Comments ({comments.length})
                </Text>
              </View>
              
              <View style={styles.commentsList}>
                {comments.length > 0 ? (
                  comments.map((comment, index) => (
                    <CommentItem key={comment._id || `comment-${index}`} comment={comment} index={index} />
                  ))
                ) : (
                  <View style={styles.emptyComments}>
                    <Text style={[styles.emptyCommentsText, isDark && styles.darkSubtitle]}>
                      No comments yet
                    </Text>
                  </View>
                )}
              </View>

              {/* Comment Input */}
              <View style={styles.commentInputContainer}>
                <View style={styles.currentUserAvatar}>
                  <Text style={styles.currentUserInitial}>
                    {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.commentInputWrapper}>
                  <TextInput
                    style={[styles.commentInput, isDark && styles.darkInput]}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Type a message..."
                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !comment.trim() && styles.sendButtonDisabled]}
                    onPress={handleAddComment}
                    disabled={!comment.trim()}
                  >
                    <Feather name="send" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer with Delete Button */}
          <View style={[styles.footer, isDark && styles.darkFooter]}>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Feather name="trash-2" size={18} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete Task</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Custom Status Modal */}
      <Modal
        visible={showCustomStatusModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>
              Add Custom Status
            </Text>
            
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, isDark && styles.darkText]}>
                Status Name
              </Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.darkInput]}
                value={customStatusName}
                onChangeText={setCustomStatusName}
                placeholder="e.g., In Review, Blocked, On Hold"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </View>
            
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, isDark && styles.darkText]}>
                Color
              </Text>
              <View style={styles.colorPicker}>
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'].map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      customStatusColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setCustomStatusColor(color)}
                  />
                ))}
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, isDark && styles.darkCancelButton]}
                onPress={() => setShowCustomStatusModal(false)}
              >
                <Text style={[styles.modalButtonText, isDark && styles.darkText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, !customStatusName.trim() && styles.modalButtonDisabled]}
                onPress={() => {
                  // Handle add custom status
                  setShowCustomStatusModal(false);
                }}
                disabled={!customStatusName.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>Add Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkContainer: {
    backgroundColor: '#1F2937',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  darkHeader: {
    borderBottomColor: '#374151',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  darkText: {
    color: '#F9FAFB',
  },
  closeButton: {
    padding: 4,
  },
  darkCloseButton: {
    // Additional dark mode styles if needed
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  propertiesContainer: {
    gap: 8,
    marginBottom: 20,
  },
  propertyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  darkPropertyItem: {
    backgroundColor: '#374151',
  },
  propertyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  propertyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  propertyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  propertyValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  addButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  assignButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  darkEmptyState: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  assigneesList: {
    gap: 8,
  },
  assigneeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkAssigneeItem: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  assigneeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assigneeInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  assigneeInfo: {
    flex: 1,
  },
  assigneeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  assigneeEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeAssigneeButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  darkActionButton: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  timerButton: {
    // Uses base actionButton styles
  },
  timerButtonActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  timerButtonTextActive: {
    color: '#DC2626',
  },
  descriptionContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#F9FAFB',
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  commentsList: {
    gap: 16,
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentMenuButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  commentMenu: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  darkDropdown: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  commentMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commentMenuText: {
    fontSize: 14,
    color: '#374151',
  },
  deleteMenuText: {
    fontSize: 14,
    color: '#DC2626',
  },
  commentEditContainer: {
    gap: 8,
  },
  commentEditInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  commentEditActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveCommentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  cancelCommentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  darkCancelButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  cancelCommentText: {
    fontSize: 12,
    color: '#374151',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    padding: 24,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  currentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentUserInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
    paddingRight: 50,
  },
  sendButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  darkFooter: {
    backgroundColor: '#374151',
    borderTopColor: '#4B5563',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#374151',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  errorCloseButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  darkModalContent: {
    backgroundColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#000000',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtonPrimary: {
    backgroundColor: '#3B82F6',
  },
  modalButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  darkSubtitle: {
    color: '#9CA3AF',
  },
  // New styles for forms
  formContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  darkFormContainer: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
    minWidth: '45%',
  },
  fullWidthField: {
    width: '100%',
  },
  formLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  darkSecondaryButton: {
    backgroundColor: '#4B5563',
    borderColor: '#6B7280',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});