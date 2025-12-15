"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  X,
  Calendar,
  Clock,
  Flag,
  MapPin,
  Paperclip,
  PlayCircle,
  Timer,
  MessageSquare,
  Edit2,
  Save,
  Trash2,
  Send,
  MoreVertical,
  Check,
  CloverIcon as CloseIcon,
  Plus,
  User,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import type { Task } from "../../../services/types/task.types"
import { taskService } from "../../../services/task.service"
import { useAuth } from "../../../contexts/AuthContext"
import { useTaskRealtime } from "../../../hooks/useTaskRealtime"
import { useFolder } from "../../../contexts/FolderContext"
import { getMemberRole, canAssignFolderMembers } from "../../../utils/groupRoleUtils"
import { useLanguage } from "../../../contexts/LanguageContext"
import { useRegional } from "../../../contexts/RegionalContext"
import { useTimer, useTimerElapsed } from "../../../contexts/TimerContext"
import { useToast } from "../../../contexts/ToastContext"
import { useConfirm } from "../../../contexts/ConfirmContext"
import EstimatedTimePicker from "./EstimatedTimePicker"
import MentionInput, { MentionableUser, parseMentions } from "../../common/MentionInput"
import MentionHighlight from "../../common/MentionHighlight"

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
  taskId: string
  isOpen: boolean
  onClose: () => void
  onTaskUpdate: (updatedTask: Task) => void
  onTaskDelete: (taskId: string) => void
}

interface Comment {
  _id?: string
  userId?: string
  user?: any
  content: string
  createdAt: string
  updatedAt?: string
  isEdited?: boolean
  attachment?: any
  mentions?: string[]
}

interface TimeEntry {
  _id?: string
  user?: any
  date: string
  hours: number
  minutes: number
  description?: string
  billable: boolean
  startTime?: string
  endTime?: string
  createdAt?: string
}

interface ScheduledWork {
  _id?: string
  user?: any
  scheduledDate: string
  estimatedHours: number
  estimatedMinutes: number
  description?: string
  status: string
  createdAt?: string
}

export default function TaskDetailModal({ taskId, isOpen, onClose, onTaskUpdate, onTaskDelete }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState("")
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [estimatedTime, setEstimatedTime] = useState("")

  // State for editable fields
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState("")

  // Task properties state
  const [taskProperties, setTaskProperties] = useState({
    title: "",
    status: "todo",
    dueDate: "",
    estimatedTime: "",
    type: "Operational",
    priority: "medium",
    description: ""
  })

  // Existing state for time entries and scheduled work
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [scheduledWork, setScheduledWork] = useState<ScheduledWork[]>([])
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false)
  const [newTimeEntry, setNewTimeEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    minutes: 0,
    description: "",
    billable: true
  })
  const [showScheduledWorkForm, setShowScheduledWorkForm] = useState(false)
  const [newScheduledWork, setNewScheduledWork] = useState({
    scheduledDate: new Date().toISOString().split('T')[0],
    estimatedHours: 0,
    estimatedMinutes: 0,
    description: "",
    status: "scheduled"
  })

  // NEW: State for custom status functionality
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false)
  const [customStatusName, setCustomStatusName] = useState("")
  const [customStatusColor, setCustomStatusColor] = useState("#3B82F6")

  // Use global timer context for persistent timer state
  const { startTimer: contextStartTimer, stopTimer: contextStopTimer, isTimerRunning: checkTimerRunning, getAllActiveTimers, syncTimersFromTask } = useTimer()
  const isTimerRunning = checkTimerRunning(taskId)
  const elapsedTime = useTimerElapsed(taskId)
  const [showActiveTimersPopup, setShowActiveTimersPopup] = useState(false)

  // NEW: State for repeat task functionality
  const [showRepeatModal, setShowRepeatModal] = useState(false)
  const [repeatSettings, setRepeatSettings] = useState({
    isRepeating: false,
    frequency: "weekly",
    interval: 1,
    endDate: "",
    occurrences: null
  })

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState("")
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null)
  const commentsScrollRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef<number>(0)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null)
  const [pendingAttachmentPreview, setPendingAttachmentPreview] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [showEstimatedTimePicker, setShowEstimatedTimePicker] = useState(false)

  const { user: currentUser, currentGroup } = useAuth()
  const { currentFolder } = useFolder()
  const { t } = useLanguage()
  const { formatDate, convertFromUserTimezone, convertToUserTimezone } = useRegional()
  const toast = useToast()
  const confirmDialog = useConfirm()

  // Check if user can assign to others
  const currentUserRole = currentGroup ? getMemberRole(currentGroup, currentUser?._id) : null
  const canAssignToOthers = canAssignFolderMembers(currentUserRole)

  // Get folder member access list
  const folderMemberAccess = currentFolder && !currentFolder.isDefault
    ? new Set((currentFolder.memberAccess || []).map((access: any) => access.userId).filter(Boolean))
    : null

  const estimatedTimeOptions = ["15m", "30m", "1h", "2h", "4h", "1d", "2d", "1w"]
  const taskTypeOptions = ["Operational", "Strategic", "Financial", "Technical", "Other"]
  const priorityOptions = ["low", "medium", "high", "urgent"]
  const statusOptions = ["todo", "in_progress", "completed", "incomplete", "archived"]

  // State for assign functionality
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // NEW: Helper để lấy danh sách assignees chi tiết
  const getDetailedAssignees = (task: Task) => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return {
        hasAssignees: false,
        assignees: [],
        currentUserIsAssigned: false,
        totalCount: 0
      };
    }

    const assignees = (task.assignedTo as AssignedUser[])
      .filter(assignment => assignment && assignment.userId)
      .map(assignment => {
        // Xử lý cả trường hợp userId là string hoặc object
        let userData;

        if (typeof assignment.userId === 'string') {
          // Nếu là currentUser, sử dụng thông tin currentUser
          if (currentUser && assignment.userId === currentUser._id) {
            userData = {
              _id: currentUser._id,
              name: currentUser.name || 'You',
              email: currentUser.email || '',
              avatar: currentUser.avatar
            };
          } else {
            // Try to resolve from group members
            const member = currentGroup?.members?.find((m: any) => {
              const memberId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
              return memberId === assignment.userId;
            });
            
            if (member) {
              const userObj = typeof member.userId === 'object' ? member.userId : null;
              const userName = userObj?.name || member.name;
              if (userName) {
                userData = {
                  _id: assignment.userId,
                  name: userName,
                  email: userObj?.email || member.email || '',
                  avatar: userObj?.avatar || member.avatar
                };
              } else {
                // Fallback if no name found
                userData = {
                  _id: assignment.userId,
                  name: 'Loading...',
                  email: '',
                  avatar: undefined
                };
              }
            } else {
              // Fallback if not found in members
              userData = {
                _id: assignment.userId,
                name: 'Loading...',
                email: '',
                avatar: undefined
              };
            }
          }
        } else if (assignment.userId && typeof assignment.userId === 'object') {
          // Nếu userId là object (đã populated)
          const user = assignment.userId as MinimalUser;
          userData = {
            _id: user._id,
            name: user.name || 'Unknown User',
            email: user.email || '',
            avatar: user.avatar
          };
        } else {
          // Fallback nếu userId không hợp lệ
          return null;
        }

        if (!userData) return null;

        return {
          ...userData,
          initial: (userData.name?.charAt(0) || 'U').toUpperCase()
        };
      })
      .filter((assignee): assignee is NonNullable<typeof assignee> => assignee !== null);

    const currentUserIsAssigned = currentUser &&
      assignees.some(assignee => assignee._id === currentUser._id);

    return {
      hasAssignees: assignees.length > 0,
      assignees,
      currentUserIsAssigned,
      totalCount: assignees.length
    };
  };

  // Helper to get mentionable users from task assignees
  const getMentionableUsers = useCallback((taskData: Task | null): MentionableUser[] => {
    if (!taskData || !taskData.assignedTo || taskData.assignedTo.length === 0) {
      return [];
    }

    const users: MentionableUser[] = [];

    (taskData.assignedTo as AssignedUser[]).forEach(assignment => {
      if (!assignment || !assignment.userId) return;

      if (typeof assignment.userId === 'string') {
        // If current user matches, use their info
        if (currentUser && assignment.userId === currentUser._id && currentUser.name) {
          users.push({
            _id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email || '',
            avatar: currentUser.avatar || undefined
          });
        } else {
          // Try to find in group members
          const member = currentGroup?.members?.find((m: any) => {
            const memberId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
            return memberId === assignment.userId;
          });
          if (member) {
            const userObj = typeof member.userId === 'object' ? member.userId : null;
            const userName = userObj?.name || member.name;
            if (userName) {
              users.push({
                _id: assignment.userId,
                name: userName,
                email: userObj?.email || member.email || '',
                avatar: userObj?.avatar || member.avatar
              });
            }
          }
        }
      } else if (assignment.userId && typeof assignment.userId === 'object') {
        const user = assignment.userId as MinimalUser;
        if (user._id && user.name) {
          users.push({
            _id: user._id,
            name: user.name,
            email: user.email || '',
            avatar: user.avatar
          });
        }
      }
    });

    return users.filter((user): user is MentionableUser => !!user._id && !!user.name);
  }, [currentUser, currentGroup]);

  // NEW: Assignee Section Component
  const AssigneeSection = ({ task }: { task: Task }) => {
    const assigneeInfo = getDetailedAssignees(task);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('assignee.assignedTo')} ({assigneeInfo.totalCount})
          </h4>
          {(canAssignToOthers || assigneeInfo.totalCount === 0) && (
            <button
              onClick={handleAddAssignee}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              {t('assignee.addAssignee')}
            </button>
          )}
        </div>

        {assigneeInfo.assignees.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">{t('assignee.noOneAssigned')}</p>
            {(canAssignToOthers || !currentUser) && (
              <button
                onClick={handleAddAssignee}
                className="text-blue-500 hover:text-blue-600 text-xs mt-1"
              >
                {t('assignee.assignSomeone')}
              </button>
            )}
            {!canAssignToOthers && currentUser && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('assignee.autoAssign')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {assigneeInfo.assignees.map((assignee) => (
              <div
                key={assignee._id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}>
                  {assignee.avatar ? (
                    <img
                      src={assignee.avatar}
                      alt={assignee.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    assignee.initial
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {assignee.name}
                    </span>
                    {assigneeInfo.currentUserIsAssigned && assignee._id === currentUser?._id && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {assignee.email}
                  </p>
                </div>
                {(canAssignToOthers || assignee._id === currentUser?._id) && (
                  <button
                    onClick={() => handleUnassign(assignee._id)}
                    disabled={saving}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const syncTaskState = useCallback((taskData: Task) => {
    setTask(taskData)
    setDescription(taskData.description || "")
    setEstimatedTime(taskData.estimatedTime || "")

    // Convert UTC date from backend to user's timezone for display in input
    let displayDueDate = ""
    if (taskData.dueDate) {
      const userDate = convertToUserTimezone(taskData.dueDate)
      displayDueDate = userDate.toISOString().split('T')[0]
    }

    setTaskProperties({
      title: taskData.title || "",
      status: taskData.status || "todo",
      dueDate: displayDueDate,
      estimatedTime: taskData.estimatedTime || "",
      type: (taskData as any).type || "Operational",
      priority: taskData.priority || "medium",
      description: taskData.description || ""
    })

    if ((taskData as any).timeEntries && Array.isArray((taskData as any).timeEntries)) {
      setTimeEntries((taskData as any).timeEntries)
    } else {
      setTimeEntries([])
    }

    if ((taskData as any).scheduledWork && Array.isArray((taskData as any).scheduledWork)) {
      setScheduledWork((taskData as any).scheduledWork)
    } else {
      setScheduledWork([])
    }

    if (taskData.comments && Array.isArray(taskData.comments)) {
      const formattedComments: Comment[] = taskData.comments.map((comment: any) => ({
        _id: comment._id || comment.userId,
        userId: comment.userId || comment.user?._id || comment.user,
        user: comment.user,
        content: comment.content || "",
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        isEdited: comment.isEdited || false,
        attachment: comment.attachment,
      }))
      setComments(formattedComments)
    } else {
      setComments([])
    }

    // Sync all active timers from task data
    syncTimersFromTask(taskData)
  }, [convertToUserTimezone, syncTimersFromTask])

  const fetchTaskDetails = useCallback(async () => {
    if (!isOpen || !taskId) return

    try {
      setLoading(true)
      const taskData = await taskService.getTaskById(taskId)

      syncTaskState(taskData)
    } catch (error) {
      console.error("Error fetching task details:", error)
      toast.showError((error as Error).message, "Lỗi tải task")
    } finally {
      setLoading(false)
    }
  }, [isOpen, taskId, syncTaskState])

  useEffect(() => {
    fetchTaskDetails()
  }, [fetchTaskDetails])

  useTaskRealtime({
    onTaskUpdated: ({ task: updatedTask, taskId: updatedId }) => {
      if (!updatedId || updatedId !== taskId) return

      if (updatedTask) {
        syncTaskState(updatedTask)
        onTaskUpdate(updatedTask)
      } else {
        fetchTaskDetails()
      }
    },
    onTaskDeleted: ({ taskId: deletedId }) => {
      if (!deletedId || deletedId !== taskId) return
      onTaskDelete(taskId)
      onClose()
    }
  })

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose()
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    const handleClickOutside = () => {
      setShowCommentMenu(null)
    }

    if (showCommentMenu) {
      document.addEventListener("click", handleClickOutside)
      return () => {
        document.removeEventListener("click", handleClickOutside)
      }
    }
  }, [showCommentMenu])

  // Timer is now managed by TimerContext - no local interval needed

  // Save individual field to database
  const saveFieldToDatabase = async (field: string, value: any) => {
    if (!task) return

    try {
      setSaving(true)

      // Convert date fields from user timezone to UTC for backend storage
      let updateValue = value
      if (field === 'dueDate' && value) {
        const userDate = new Date(value + 'T23:59:59') // Set to end of day
        updateValue = convertFromUserTimezone(userDate).toISOString()
      }

      const updateData = { [field]: updateValue }
      const updatedTask = await taskService.updateTask(taskId, updateData)

      setTask(updatedTask)
      onTaskUpdate(updatedTask)

      // Update local state with the original value (for display)
      setTaskProperties(prev => ({
        ...prev,
        [field]: value
      }))

    } catch (error) {
      console.error(`Error updating ${field}:`, error)
      toast.showError((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Start editing a field
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field)
    setTempValue(currentValue)
  }

  // Save field changes
  const saveField = (field: string) => {
    if (tempValue !== taskProperties[field as keyof typeof taskProperties]) {
      saveFieldToDatabase(field, tempValue)
    }
    setEditingField(null)
    setTempValue("")
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingField(null)
    setTempValue("")
  }

  // Handle key events for inputs
  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      saveField(field)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // Handle quick time selection
  const handleQuickTimeSelect = (time: string) => {
    saveFieldToDatabase('estimatedTime', time)
  }

  // NEW: Custom status handlers
  const handleAddCustomStatus = async () => {
    if (!customStatusName.trim()) return

    try {
      // Use the new API method to set custom status
      const updatedTask = await taskService.setCustomStatus(taskId, customStatusName.trim(), customStatusColor)

      setTask(updatedTask)
      onTaskUpdate(updatedTask)

      setShowCustomStatusModal(false)
      setCustomStatusName("")
      setCustomStatusColor("#3B82F6")
    } catch (error) {
      console.error("Error adding custom status:", error)
      toast.showError((error as Error).message, "Lỗi thêm trạng thái")
    }
  }

  // NEW: Assign/unassign handlers
  const handleAddAssignee = () => {
    setShowAssignModal(true)
  }

  const handleConfirmAssign = async () => {
    if (!task || selectedMembers.length === 0) return

    try {
      setSaving(true)
      const response = await taskService.assignUsersToTask(taskId, selectedMembers)

      // Refresh task details
      await fetchTaskDetails()

      setShowAssignModal(false)
      setSelectedMembers([])
    } catch (error) {
      console.error("Error assigning users:", error)
      toast.showError((error as Error).message, "Lỗi gán người dùng")
    } finally {
      setSaving(false)
    }
  }

  const handleUnassign = async (userId: string) => {
    if (!task) return

    try {
      setSaving(true)
      await taskService.unassignUserFromTask(taskId, userId)

      // Refresh task details
      await fetchTaskDetails()
    } catch (error) {
      console.error("Error unassigning user:", error)
      toast.showError((error as Error).message, "Lỗi bỏ gán người dùng")
    } finally {
      setSaving(false)
    }
  }

  // NEW: Timer handlers
  const handleStartTimer = async () => {
    if (!isTimerRunning && currentUser?._id) {
      try {
        const updatedTask = await taskService.startTimer(taskId)
        setTask(updatedTask)
        onTaskUpdate(updatedTask)

        // Sync timers from the updated task
        syncTimersFromTask(updatedTask)
      } catch (error) {
        console.error("Error starting timer:", error)
        toast.showError((error as Error).message, "Lỗi bắt đầu timer")
      }
    }
  }

  const handleStopTimer = async () => {
    if (isTimerRunning) {
      try {
        const updatedTask = await contextStopTimer(taskId)
        setTask(updatedTask)
        onTaskUpdate(updatedTask)

        // Update time entries from the response
        if ((updatedTask as any).timeEntries) {
          setTimeEntries((updatedTask as any).timeEntries)
        }

        // Sync timers from the updated task
        syncTimersFromTask(updatedTask)
      } catch (error) {
        console.error("Error stopping timer:", error)
        toast.showError((error as Error).message, "Lỗi dừng timer")
      }
    }
  }

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // NEW: Repeat task handlers
  const handleSaveRepeatSettings = async () => {
    try {
      const repetitionData = {
        isRepeating: repeatSettings.isRepeating,
        frequency: repeatSettings.frequency,
        interval: repeatSettings.interval,
        endDate: repeatSettings.endDate ? new Date(repeatSettings.endDate).toISOString() : null,
        occurrences: repeatSettings.occurrences
      }

      const updatedTask = await taskService.setTaskRepetition(taskId, repetitionData)
      setTask(updatedTask)
      onTaskUpdate(updatedTask)
      setShowRepeatModal(false)
    } catch (error) {
      console.error("Error saving repeat settings:", error)
      toast.showError((error as Error).message, "Lỗi lưu cài đặt lặp lại")
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'incomplete': return 'bg-red-500'
      case 'archived': return 'bg-gray-500'
      default: return 'bg-blue-500'
    }
  }

  // Get status display text
  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Get priority color and style
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    }
  }

  // Existing handlers for time entries
  const handleAddTimeEntry = useCallback(async () => {
    if (!task) return

    try {
      const timeEntryToAdd = {
        ...newTimeEntry,
        user: currentUser?._id,
        date: new Date(newTimeEntry.date).toISOString()
      }

      // Build update object - include status change if currently todo
      const updateData: any = {
        timeEntries: [...timeEntries, timeEntryToAdd]
      }

      // Auto-change status from todo to in_progress when logging time
      if (taskProperties.status === 'todo') {
        updateData.status = 'in_progress'
      }

      const updatedTask = await taskService.updateTask(taskId, updateData)

      setTimeEntries((updatedTask as any).timeEntries || [])

      // Update local task properties status if changed
      if (updatedTask.status !== taskProperties.status) {
        setTaskProperties(prev => ({ ...prev, status: updatedTask.status }))
      }

      setNewTimeEntry({
        date: new Date().toISOString().split('T')[0],
        hours: 0,
        minutes: 0,
        description: "",
        billable: true
      })
      setShowTimeEntryForm(false)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error adding time entry:", error)
      toast.showError((error as Error).message, "Lỗi thêm thời gian")
    }
  }, [task, newTimeEntry, timeEntries, currentUser, taskId, onTaskUpdate, taskProperties.status])

  // Handler for adding scheduled work
  const handleAddScheduledWork = useCallback(async () => {
    if (!task) return

    try {
      const scheduledWorkToAdd = {
        ...newScheduledWork,
        user: currentUser?._id,
        scheduledDate: new Date(newScheduledWork.scheduledDate).toISOString()
      }

      const updatedTask = await taskService.updateTask(taskId, {
        scheduledWork: [...scheduledWork, scheduledWorkToAdd]
      })

      setScheduledWork((updatedTask as any).scheduledWork || [])
      setNewScheduledWork({
        scheduledDate: new Date().toISOString().split('T')[0],
        estimatedHours: 0,
        estimatedMinutes: 0,
        description: "",
        status: "scheduled"
      })
      setShowScheduledWorkForm(false)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error adding scheduled work:", error)
      toast.showError((error as Error).message, "Lỗi thêm công việc dự kiến")
    }
  }, [task, newScheduledWork, scheduledWork, currentUser, taskId, onTaskUpdate])

  // Handler for deleting time entry
  const handleDeleteTimeEntry = useCallback(async (index: number) => {
    if (!task) return

    const confirmed = await confirmDialog.confirm({
      title: 'Xóa mục thời gian',
      message: 'Bạn có chắc chắn muốn xóa mục thời gian này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger',
      icon: 'delete'
    })

    if (!confirmed) return

    try {
      const updatedTimeEntries = timeEntries.filter((_, i) => i !== index)
      const updatedTask = await taskService.updateTask(taskId, {
        timeEntries: updatedTimeEntries
      })

      setTimeEntries(updatedTimeEntries)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error deleting time entry:", error)
      toast.showError((error as Error).message, "Lỗi xóa mục thời gian")
    }
  }, [task, timeEntries, taskId, onTaskUpdate])

  // Handler for deleting scheduled work
  const handleDeleteScheduledWork = useCallback(async (index: number) => {
    if (!task) return

    const confirmed = await confirmDialog.confirm({
      title: 'Xóa công việc dự kiến',
      message: 'Bạn có chắc chắn muốn xóa công việc dự kiến này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger',
      icon: 'delete'
    })

    if (!confirmed) return

    try {
      const updatedScheduledWork = scheduledWork.filter((_, i) => i !== index)
      const updatedTask = await taskService.updateTask(taskId, {
        scheduledWork: updatedScheduledWork
      })

      setScheduledWork(updatedScheduledWork)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error deleting scheduled work:", error)
      toast.showError((error as Error).message, "Lỗi xóa công việc dự kiến")
    }
  }, [task, scheduledWork, taskId, onTaskUpdate])

  // Calculate total logged time
  const getTotalLoggedTime = useCallback(() => {
    const totalMinutes = timeEntries.reduce((total, entry) => {
      return total + (entry.hours * 60) + (entry.minutes || 0)
    }, 0)

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}h`
  }, [timeEntries])

  // Rest of your existing handlers
  const handleDelete = useCallback(async () => {
    if (!task) return

    const confirmed = await confirmDialog.confirm({
      title: 'Xóa task',
      message: 'Bạn có chắc chắn muốn xóa task này không? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger',
      icon: 'delete'
    })

    if (!confirmed) return

    try {
      await taskService.deleteTask(taskId)
      onTaskDelete(taskId)
      onClose()
    } catch (error) {
      console.error("Error deleting task:", error)
      toast.showError((error as Error).message, "Lỗi xóa task")
    }
  }, [task, taskId, onTaskDelete, onClose])

  // FIXED: Allow comments on all task statuses regardless of due date
  const handleAddComment = useCallback(async () => {
    if ((!comment.trim() && !pendingAttachment) || !task) return

    // REMOVED: All restrictions - comments are now available for all tasks without due date dependency
    try {
      setUploadingFiles(true)
      let updatedTask

      if (pendingAttachment) {
        // Use addCommentWithFile when there's an attachment
        updatedTask = await taskService.addCommentWithFile(taskId, comment.trim(), pendingAttachment)
      } else {
        // Use regular addComment for text-only comments
        updatedTask = await taskService.addComment(taskId, comment)
      }

      // Clear comment and attachment
      setComment("")
      setPendingAttachment(null)
      if (pendingAttachmentPreview) {
        URL.revokeObjectURL(pendingAttachmentPreview)
        setPendingAttachmentPreview(null)
      }

      if (updatedTask.comments && Array.isArray(updatedTask.comments)) {
        const formattedComments: Comment[] = updatedTask.comments.map((comment: any) => ({
          _id: comment._id || comment.userId,
          userId: comment.userId || comment.user?._id || comment.user,
          user: comment.user,
          content: comment.content || "",
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          isEdited: comment.isEdited || false,
          attachment: comment.attachment,
        }))
        setComments(formattedComments)
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.showError((error as Error).message, "Lỗi thêm bình luận")
    } finally {
      setUploadingFiles(false)
    }
  }, [comment, task, taskId, pendingAttachment, pendingAttachmentPreview])

  const handleUpdateComment = useCallback(async (commentId: string) => {
    if (!editingCommentContent.trim() || !currentUser) {
      if (!currentUser) {
        toast.showWarning("Bạn phải đăng nhập để cập nhật bình luận")
      }
      return
    }

    // Save scroll position before state change
    if (commentsScrollRef.current) {
      scrollPositionRef.current = commentsScrollRef.current.scrollTop
    }

    try {
      console.log("Updating comment:", commentId, editingCommentContent)

      const result = await taskService.updateComment(taskId, commentId, currentUser._id, editingCommentContent)

      if (result.success) {
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId
              ? {
                ...comment,
                content: editingCommentContent,
                updatedAt: new Date().toISOString(),
                isEdited: true,
              }
              : comment,
          ),
        )
        setEditingCommentId(null)
        setEditingCommentContent("")

        // Restore scroll position after state change
        requestAnimationFrame(() => {
          if (commentsScrollRef.current && scrollPositionRef.current > 0) {
            commentsScrollRef.current.scrollTop = scrollPositionRef.current
          }
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error updating comment:", error)
      toast.showError((error as Error).message, "Lỗi cập nhật bình luận")
    }
  }, [editingCommentContent, currentUser, taskId])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!currentUser) {
      toast.showWarning("Bạn phải đăng nhập để xóa bình luận")
      return
    }

    const confirmed = await confirmDialog.confirm({
      title: 'Xóa bình luận',
      message: 'Bạn có chắc chắn muốn xóa bình luận này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger',
      icon: 'delete'
    })

    if (!confirmed) return

    try {
      console.log("Deleting comment:", commentId)

      const result = await taskService.deleteComment(taskId, commentId, currentUser._id)

      if (result.success) {
        setComments((prev) => prev.filter((comment) => comment._id !== commentId))
        setShowCommentMenu(null)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast.showError((error as Error).message, "Lỗi xóa bình luận")
    }
  }, [currentUser, taskId])

  const getUserDisplayName = useCallback((comment: Comment): string => {
    // Check if comment has user object with name
    if (comment.user && typeof comment.user === "object") {
      return (comment.user as MinimalUser).name || (comment.user as MinimalUser).email || "User";
    }

    // Check if userId is an object (populated user)
    if (comment.userId && typeof comment.userId === "object") {
      return (comment.userId as MinimalUser).name || (comment.userId as MinimalUser).email || "User";
    }

    // If userId is string, try to find user in assignees or use current user
    if (typeof comment.userId === "string") {
      // Check if it's current user
      if (currentUser && comment.userId === currentUser._id) {
        return currentUser.name || currentUser.email || "You";
      }

      // Check in task assignees
      if (task && task.assignedTo) {
        const assignee = task.assignedTo.find((assignment: any) =>
          assignment.userId && typeof assignment.userId === 'object' &&
          (assignment.userId as MinimalUser)._id === comment.userId
        );
        if (assignee && typeof assignee.userId === 'object') {
          return (assignee.userId as MinimalUser).name || (assignee.userId as MinimalUser).email || "User";
        }
      }
    }

    return "User";
  }, [currentUser, task]);

  const getUserInitial = useCallback((comment: Comment): string => {
    const name = getUserDisplayName(comment);
    return name.charAt(0).toUpperCase();
  }, [getUserDisplayName]);

  const getUserAvatar = useCallback((comment: Comment): string | null => {
    // Check if comment has user object with avatar
    if (comment.user && typeof comment.user === "object") {
      return (comment.user as MinimalUser).avatar || null;
    }

    // Check if userId is an object (populated user)
    if (comment.userId && typeof comment.userId === "object") {
      return (comment.userId as MinimalUser).avatar || null;
    }

    // If userId is string, try to find user in assignees or use current user
    if (typeof comment.userId === "string") {
      // Check if it's current user
      if (currentUser && comment.userId === currentUser._id) {
        return currentUser.avatar || null;
      }

      // Check in task assignees
      if (task && task.assignedTo) {
        const assignee = task.assignedTo.find((assignment: any) =>
          assignment.userId && typeof assignment.userId === 'object' &&
          (assignment.userId as MinimalUser)._id === comment.userId
        );
        if (assignee && typeof assignee.userId === 'object') {
          return (assignee.userId as MinimalUser).avatar || null;
        }
      }
    }

    return null;
  }, [currentUser, task]);

  const isCommentOwner = useCallback((comment: Comment): boolean => {
    if (!currentUser) return false;

    if (comment.userId && typeof comment.userId === "object") {
      return (comment.userId as MinimalUser)._id === currentUser._id;
    }

    if (typeof comment.userId === "string") {
      return comment.userId === currentUser._id;
    }

    return false;
  }, [currentUser]);

  const startEditingComment = useCallback((comment: Comment) => {
    if (!currentUser) {
      toast.showWarning("Bạn phải đăng nhập để chỉnh sửa bình luận")
      return
    }
    setEditingCommentId(comment._id!)
    setEditingCommentContent(comment.content)
    setShowCommentMenu(null)
  }, [currentUser])

  const cancelEditingComment = useCallback(() => {
    // Save scroll position before state change
    if (commentsScrollRef.current) {
      scrollPositionRef.current = commentsScrollRef.current.scrollTop
    }

    setEditingCommentId(null)
    setEditingCommentContent("")

    // Restore scroll position after state change
    requestAnimationFrame(() => {
      if (commentsScrollRef.current && scrollPositionRef.current > 0) {
        commentsScrollRef.current.scrollTop = scrollPositionRef.current
      }
    })
  }, [])

  // Handler for comment attachment - stores file for preview before sending
  const handleCommentAttachment = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0] // Only allow one attachment per comment

    // Revoke previous preview URL if exists
    if (pendingAttachmentPreview) {
      URL.revokeObjectURL(pendingAttachmentPreview)
    }

    setPendingAttachment(file)

    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      setPendingAttachmentPreview(URL.createObjectURL(file))
    } else {
      setPendingAttachmentPreview(null)
    }

    // Clear file input
    event.target.value = ''
  }, [pendingAttachmentPreview])

  // Remove pending attachment
  const removePendingAttachment = useCallback(() => {
    if (pendingAttachmentPreview) {
      URL.revokeObjectURL(pendingAttachmentPreview)
    }
    setPendingAttachment(null)
    setPendingAttachmentPreview(null)
  }, [pendingAttachmentPreview])

  // File upload handler for TASK attachments (not comments)
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setUploadingFiles(true)
      const formData = new FormData()

      // Add all selected files to FormData
      Array.from(files).forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      })

      if (!response.ok) {
        let errorMessage = 'Failed to upload files'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        throw new Error('Invalid response from server')
      }

      // Update task with new attachments
      setTask(result.data)
      onTaskUpdate(result.data)

      // Clear file input
      event.target.value = ''

    } catch (error) {
      console.error('Error uploading files:', error)
      toast.showError((error as Error).message, "Lỗi tải tệp lên")
    } finally {
      setUploadingFiles(false)
    }
  }, [taskId, onTaskUpdate])

  // Delete attachment handler
  const handleDeleteAttachment = useCallback(async (attachmentId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Xóa tệp đính kèm',
      message: 'Bạn có chắc chắn muốn xóa tệp đính kèm này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger',
      icon: 'delete'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = 'Failed to delete attachment'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        throw new Error('Invalid response from server')
      }

      // Update task with removed attachment
      setTask(result.data)
      onTaskUpdate(result.data)

    } catch (error) {
      console.error('Error deleting attachment:', error)
      toast.showError((error as Error).message, "Lỗi xóa tệp đính kèm")
    }
  }, [taskId, onTaskUpdate])

  const CommentMenu = useCallback(({
    commentId,
    onEdit,
    onDelete,
  }: {
    commentId: string
    onEdit: () => void
    onDelete: () => void
  }) => (
    <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-32">
      <button
        onClick={onEdit}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        Delete
      </button>
    </div>
  ), [])

  const CommentItem = useCallback(({ comment, index }: { comment: Comment; index: number }) => {
    const isEditing = editingCommentId === comment._id
    const isOwner = isCommentOwner(comment)

    const avatarUrl = getUserAvatar(comment);

    return (
      <div key={comment._id || `comment-${index}`} className="flex gap-3 group">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={getUserDisplayName(comment)}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initial if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = getUserInitial(comment);
                  parent.className = parent.className.replace('overflow-hidden', '') + ' bg-blue-500';
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
              {getUserInitial(comment)}
            </div>
          )}
        </div>
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{getUserDisplayName(comment)}</span>
            <span className="text-xs text-gray-500">
              {formatDate(comment.createdAt)}
              {comment.isEdited && " (edited)"}
            </span>

            {isOwner && !isEditing && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Save scroll position before state change
                    if (commentsScrollRef.current) {
                      scrollPositionRef.current = commentsScrollRef.current.scrollTop
                    }
                    setShowCommentMenu(showCommentMenu === comment._id ? null : comment._id!)
                  }}
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {showCommentMenu === comment._id && (
                  <CommentMenu
                    commentId={comment._id!}
                    onEdit={() => startEditingComment(comment)}
                    onDelete={() => handleDeleteComment(comment._id!)}
                  />
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingCommentContent}
                onChange={(e) => setEditingCommentContent(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateComment(comment._id!)}
                  disabled={!editingCommentContent.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={cancelEditingComment}
                  className="flex items-center gap-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <CloseIcon className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <MentionHighlight
              content={comment.content}
              mentions={comment.mentions || []}
              currentUserId={currentUser?._id}
              className="text-sm text-gray-600 dark:text-gray-400"
            />
          )}

          {comment.attachment && comment.attachment.url && comment.attachment.filename && (
            <div className="mt-2 inline-block">
              {comment.attachment.mimetype?.startsWith('image/') ? (
                <button
                  type="button"
                  onClick={() => setLightboxImage(comment.attachment!.url)}
                  className="cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 inline-block"
                >
                  <img
                    src={comment.attachment.url}
                    alt={comment.attachment.filename}
                    className="max-w-full max-h-48 object-contain block"
                  />
                </button>
              ) : (
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{comment.attachment.filename}</p>
                      {comment.attachment.size && (
                        <p className="text-xs text-gray-500">{(comment.attachment.size / 1024).toFixed(1)} KB</p>
                      )}
                    </div>
                    <a
                      href={comment.attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-600 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded"
                    >
                      View
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }, [editingCommentId, editingCommentContent, showCommentMenu, commentsScrollRef, scrollPositionRef, isCommentOwner, getUserInitial, getUserDisplayName, getUserAvatar, CommentMenu, startEditingComment, handleDeleteComment, handleUpdateComment, cancelEditingComment, formatDate, setLightboxImage])

  // Restore scroll position after showCommentMenu changes
  useEffect(() => {
    if (commentsScrollRef.current && scrollPositionRef.current > 0) {
      commentsScrollRef.current.scrollTop = scrollPositionRef.current
    }
  }, [showCommentMenu])

  // Time Entry Form Component
  const TimeEntryForm = () => (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 mt-2">
      <h4 className="text-sm font-medium mb-3">{t('taskDetail.addTimeEntry')}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.date')}</label>
          <input
            type="date"
            value={newTimeEntry.date}
            onChange={(e) => setNewTimeEntry({ ...newTimeEntry, date: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.hours')}</label>
          <input
            type="number"
            value={newTimeEntry.hours}
            onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hours: parseInt(e.target.value) || 0 })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.minutes')}</label>
          <input
            type="number"
            value={newTimeEntry.minutes}
            onChange={(e) => setNewTimeEntry({ ...newTimeEntry, minutes: parseInt(e.target.value) || 0 })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={newTimeEntry.billable}
              onChange={(e) => setNewTimeEntry({ ...newTimeEntry, billable: e.target.checked })}
              className="mr-2"
            />
            {t('taskDetail.billable')}
          </label>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.description')}</label>
          <input
            type="text"
            value={newTimeEntry.description}
            onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
            placeholder={t('taskDetail.optionalDescription')}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleAddTimeEntry}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          {t('taskDetail.addEntry')}
        </button>
        <button
          onClick={() => setShowTimeEntryForm(false)}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
        >
          {t('taskDetail.cancel')}
        </button>
      </div>
    </div>
  )

  // Scheduled Work Form Component
  const ScheduledWorkForm = () => (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 mt-2">
      <h4 className="text-sm font-medium mb-3">{t('taskDetail.scheduleWork')}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.date')}</label>
          <input
            type="date"
            value={newScheduledWork.scheduledDate}
            onChange={(e) => setNewScheduledWork({ ...newScheduledWork, scheduledDate: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.estimatedHours')}</label>
          <input
            type="number"
            value={newScheduledWork.estimatedHours}
            onChange={(e) => setNewScheduledWork({ ...newScheduledWork, estimatedHours: parseInt(e.target.value) || 0 })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.estimatedMinutes')}</label>
          <input
            type="number"
            value={newScheduledWork.estimatedMinutes}
            onChange={(e) => setNewScheduledWork({ ...newScheduledWork, estimatedMinutes: parseInt(e.target.value) || 0 })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.status')}</label>
          <select
            value={newScheduledWork.status}
            onChange={(e) => setNewScheduledWork({ ...newScheduledWork, status: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          >
            <option value="scheduled">{t('taskDetail.scheduled')}</option>
            <option value="in-progress">{t('taskDetail.inProgress')}</option>
            <option value="completed">{t('taskDetail.completed')}</option>
            <option value="cancelled">{t('taskDetail.cancelled')}</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('taskDetail.description')}</label>
          <input
            type="text"
            value={newScheduledWork.description}
            onChange={(e) => setNewScheduledWork({ ...newScheduledWork, description: e.target.value })}
            placeholder={t('taskDetail.optionalDescription')}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleAddScheduledWork}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          {t('taskDetail.scheduleWork')}
        </button>
        <button
          onClick={() => setShowScheduledWorkForm(false)}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
        >
          {t('taskDetail.cancel')}
        </button>
      </div>
    </div>
  )

  if (!currentUser) {
    return (
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading user information...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  if (loading) {
    return (
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading task details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="text-red-600">Failed to load task details</div>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Modal - Responsive: full width on mobile, 2/3 on tablet, 1/2 on desktop */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[85%] md:w-[75%] lg:w-[60%] xl:w-1/2 bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 left-0 w-9 h-9 z-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            style={{
              transform: "translateX(-50%)",
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 flex-1">
              {editingField === 'title' ? (
                <input
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => saveField('title')}
                  onKeyDown={(e) => handleKeyDown(e, 'title')}
                  className="text-xl font-semibold bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 flex-1 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                  onClick={() => startEditing('title', taskProperties.title)}
                >
                  {taskProperties.title || "Untitled Task"}
                </h2>
              )}
              {saving && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content - Responsive: stack on mobile, side-by-side on larger screens */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Task Details - Full width on mobile, 60% on larger screens */}
            <div className="flex-1 md:w-3/5 md:flex-none border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 overflow-auto scrollbar-minimal">
              <div className="p-6 space-y-6">
                {/* Task Properties - Interactive */}
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-3 h-3 ${getStatusColor(taskProperties.status)} rounded-full flex-shrink-0`}></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taskDetail.statusLabel')}</span>
                    </div>
                    {editingField === 'status' ? (
                      <select
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveField('status')}
                        className="flex-1 max-w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        {statusOptions.map(option => (
                          <option key={option} value={option}>
                            {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className="flex items-center gap-2 flex-1 justify-end"
                        onClick={() => startEditing('status', taskProperties.status)}
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {getStatusDisplay(taskProperties.status)}
                        </span>
                        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taskDetail.dueDateLabel')}</span>
                    </div>
                    {editingField === 'dueDate' ? (
                      <input
                        type="date"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveField('dueDate')}
                        onKeyDown={(e) => handleKeyDown(e, 'dueDate')}
                        className="flex-1 max-w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="flex items-center gap-2 flex-1 justify-end"
                        onClick={() => startEditing('dueDate', taskProperties.dueDate)}
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {task.dueDate ? formatDate(task.dueDate) : "—"}
                        </span>
                        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Estimated Time */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group relative">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taskDetail.estimatedTimeLabel')}</span>
                    </div>
                    <div
                      className="flex items-center gap-2 flex-1 justify-end"
                      onClick={() => setShowEstimatedTimePicker(true)}
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400">{taskProperties.estimatedTime || "—"}</span>
                      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {showEstimatedTimePicker && (
                      <EstimatedTimePicker
                        value={taskProperties.estimatedTime}
                        onSave={(value) => {
                          saveFieldToDatabase('estimatedTime', value);
                          setShowEstimatedTimePicker(false);
                        }}
                        onClose={() => setShowEstimatedTimePicker(false)}
                      />
                    )}
                  </div>

                  {/* Type */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Flag className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taskDetail.typeLabel')}</span>
                    </div>
                    {editingField === 'type' ? (
                      <select
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveField('type')}
                        className="flex-1 max-w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        {taskTypeOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className="flex items-center gap-2 flex-1 justify-end"
                        onClick={() => startEditing('type', taskProperties.type)}
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">{taskProperties.type}</span>
                        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* UPDATED: Assignees Section */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <AssigneeSection task={task} />
                  </div>

                  {/* Priority */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Flag className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tasks.priority')}</span>
                    </div>
                    {editingField === 'priority' ? (
                      <select
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={() => saveField('priority')}
                        className="flex-1 max-w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        {priorityOptions.map(option => (
                          <option key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className="flex items-center gap-2 flex-1 justify-end"
                        onClick={() => startEditing('priority', taskProperties.priority)}
                      >
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityStyle(taskProperties.priority)}`}>
                          {taskProperties.priority.charAt(0).toUpperCase() + taskProperties.priority.slice(1)}
                        </div>
                        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4">
                  <button
                    onClick={() => setShowCustomStatusModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t('taskDetail.addStatus')}
                  </button>

                  {/* Timer Button - Hidden for completed/incomplete tasks */}
                  {taskProperties.status !== 'completed' && taskProperties.status !== 'incomplete' && (
                    <div className="relative flex items-center gap-1">
                      <button
                        onClick={isTimerRunning ? handleStopTimer : handleStartTimer}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors shadow-sm ${isTimerRunning
                          ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <PlayCircle className="w-4 h-4" />
                        {isTimerRunning ? `${t('taskDetail.stopTimer')} (${formatElapsedTime(elapsedTime)})` : t('taskDetail.startTime')}
                      </button>

                      {/* Active Timers Menu Button */}
                      {getAllActiveTimers(taskId).length > 0 && (
                        <button
                          onClick={() => setShowActiveTimersPopup(!showActiveTimersPopup)}
                          className="flex items-center justify-center px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm"
                          title="View active timers"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}

                      {/* Active Timers Popup */}
                      {showActiveTimersPopup && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Active Timers</h4>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {getAllActiveTimers(taskId).map((timer) => {
                              const timerElapsed = Math.floor((Date.now() - timer.startTime.getTime()) / 1000)
                              const isCurrentUser = timer.userId === currentUser?._id

                              return (
                                <div key={timer.userId} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden">
                                    {timer.userAvatar ? (
                                      <img src={timer.userAvatar} alt={timer.userName || 'User'} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                        {(timer.userName || 'U').charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {timer.userName || 'Unknown User'}
                                      </span>
                                      {isCurrentUser && (
                                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded">You</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatElapsedTime(timerElapsed)}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => setShowActiveTimersPopup(false)}
                              className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Log Time Button - Hidden for completed/incomplete tasks */}
                  {taskProperties.status !== 'completed' && taskProperties.status !== 'incomplete' && (
                    <button
                      onClick={() => setShowTimeEntryForm(!showTimeEntryForm)}
                      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                    >
                      <Timer className="w-4 h-4" />
                      {t('taskDetail.logTime')}
                    </button>
                  )}

                  <button
                    onClick={() => setShowRepeatModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('taskDetail.repeatTask')}
                  </button>
                </div>

                {/* Time Entry Form */}
                {showTimeEntryForm && <TimeEntryForm />}

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('taskDetail.description')}</h3>
                  {editingField === 'description' ? (
                    <textarea
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={() => saveField('description')}
                      rows={4}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a description..."
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                      onClick={() => startEditing('description', taskProperties.description)}
                    >
                      {taskProperties.description || "Click to add a description..."}
                    </p>
                  )}
                </div>

                {/* Scheduled Work - Available for all tasks regardless of due date */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taskDetail.scheduledWork')}</h3>
                    <button
                      onClick={() => setShowScheduledWorkForm(!showScheduledWorkForm)}
                      className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      {t('taskDetail.scheduleWork')}
                    </button>
                  </div>

                  {/* Scheduled Work Form */}
                  {showScheduledWorkForm && <ScheduledWorkForm />}

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {scheduledWork.length > 0 ? (
                      <>
                        <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span>{t('taskDetail.date')}</span>
                          <span>{t('taskDetail.user')}</span>
                          <span>{t('taskDetail.estimatedTimeLabel')}</span>
                          <span>{t('taskDetail.statusLabel')}</span>
                        </div>
                        {scheduledWork.map((work, index) => (
                          <div key={index} className="grid grid-cols-4 gap-4 text-sm items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
                            <span className="text-gray-900 dark:text-gray-100">
                              {formatDate(work.scheduledDate)}
                            </span>
                            <span className="text-gray-500">
                              <User className="w-4 h-4 inline mr-1" />
                              {work.user?.name || "Me"}
                            </span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {work.estimatedHours > 0 && `${work.estimatedHours}h `}
                              {work.estimatedMinutes > 0 && `${work.estimatedMinutes}m`}
                              {work.estimatedHours === 0 && work.estimatedMinutes === 0 && "—"}
                            </span>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 rounded text-xs ${work.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                work.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  work.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}>
                                {work.status}
                              </span>
                              <button
                                onClick={() => handleDeleteScheduledWork(index)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500">{t('taskDetail.noScheduledWork')}</div>
                    )}
                  </div>
                </div>

                {/* Logged Time - Available for all tasks regardless of due date */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taskDetail.loggedTime')}</h3>
                    {/* <button 
                      onClick={() => setShowTimeEntryForm(!showTimeEntryForm)}
                      className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      {t('taskDetail.logTime')}
                    </button> */}
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {timeEntries.length > 0 ? (
                      <>
                        <div className="grid grid-cols-6 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span className="col-span-2">{t('taskDetail.date')}</span>
                          <span>{t('taskDetail.user')}</span>
                          <span>{t('taskDetail.description')}</span>
                          <span>{t('taskDetail.billable')}</span>
                          <span>{t('taskDetail.time')}</span>
                        </div>

                        {/* Logged time entries */}
                        <div className="space-y-3">
                          {timeEntries.map((entry, index) => (
                            <div key={index} className="grid grid-cols-6 gap-4 text-sm items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
                              <span className="col-span-2 text-gray-900 dark:text-gray-100">
                                {formatDate(entry.date)}
                              </span>
                              <span className="text-gray-500 flex items-center">
                                {entry.user?.avatar ? (
                                  <img
                                    src={entry.user.avatar}
                                    alt={entry.user.name || "User"}
                                    className="w-5 h-5 rounded-full mr-1 object-cover"
                                  />
                                ) : (
                                  <User className="w-4 h-4 mr-1" />
                                )}
                                {entry.user?.name || "Unknown"}
                              </span>
                              <span className="text-gray-500 truncate" title={entry.description}>
                                {entry.description || "-"}
                              </span>
                              <span className="text-gray-500">{entry.billable ? "$" : "-"}</span>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {entry.hours > 0 && `${entry.hours}h `}
                                  {entry.minutes > 0 && `${entry.minutes}m`}
                                  {entry.hours === 0 && entry.minutes === 0 && "—"}
                                </span>
                                <button
                                  onClick={() => handleDeleteTimeEntry(index)}
                                  className="text-red-500 hover:text-red-700 ml-2"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {t('taskDetail.total')}: {getTotalLoggedTime()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500">{t('taskDetail.noTimeEntries')}</div>
                    )}
                  </div>
                </div>

                {/* Files Section - Available for all tasks regardless of due date */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    {t('taskDetail.files')} ({task.attachments?.length || 0})
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    {task.attachments && task.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {task.attachments.map((attachment: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {attachment.filename}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.round(attachment.size / 1024)} KB
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 text-sm"
                              >
                                {t('taskDetail.view')}
                              </a>
                              <button
                                onClick={() => handleDeleteAttachment(attachment._id)}
                                className="text-red-500 hover:text-red-600 text-sm"
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">{t('taskDetail.noFilesAttached')}</p>
                      </div>
                    )}

                    <div className="mt-4">
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                        onChange={handleFileUpload}
                        disabled={uploadingFiles}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload"
                        className={`flex items-center gap-2 text-sm cursor-pointer ${uploadingFiles
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-blue-500 hover:text-blue-600'
                          }`}
                      >
                        {uploadingFiles ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            {t('taskDetail.uploading')}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            {t('taskDetail.attachFile')}
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments - Full width on mobile, 40% on larger screens - FIXED: Always show comment form for all task statuses regardless of due date */}
            <div className="flex-1 md:w-2/5 md:flex-none flex flex-col h-full min-h-[300px] md:min-h-0 overflow-hidden">
              <div ref={commentsScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-minimal">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t('taskDetail.comments')} ({comments.length})
                </h3>
                <div className="space-y-4">
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <CommentItem key={comment._id || `comment-${index}`} comment={comment} index={index} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">{t('taskDetail.noCommentsYet')}</div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                {/* FIXED: Always show comment form - no restrictions based on due date or task status */}
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0 overflow-hidden self-start mt-1">
                    {currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name || "User"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = currentUser?.name?.charAt(0)?.toUpperCase() || "U";
                            parent.className = parent.className.replace('overflow-hidden', '') + ' bg-blue-500';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Pending attachment preview */}
                    {pendingAttachment && (
                      <div className="mb-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center gap-2">
                          {pendingAttachmentPreview ? (
                            <img
                              src={pendingAttachmentPreview}
                              alt={pendingAttachment.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded">
                              <Paperclip className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{pendingAttachment.name}</p>
                            <p className="text-xs text-gray-500">{(pendingAttachment.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            onClick={removePendingAttachment}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-end gap-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2">
                      <label className={`p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors flex-shrink-0 ${uploadingFiles ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Paperclip className="w-4 h-4" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleCommentAttachment}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                          disabled={uploadingFiles}
                        />
                      </label>
                      <div className="flex-1 min-w-0">
                        <MentionInput
                          value={comment}
                          onChange={setComment}
                          onSubmit={handleAddComment}
                          placeholder={t('taskDetail.typeMessage')}
                          mentionableUsers={getMentionableUsers(task)}
                          disabled={uploadingFiles}
                          className="bg-transparent text-gray-900 dark:text-gray-100 text-sm focus:outline-none resize-none min-h-[24px] max-h-[80px] py-1 border-0 px-0"
                        />
                      </div>
                      <button
                        onClick={handleAddComment}
                        disabled={(!comment.trim() && !pendingAttachment) || uploadingFiles}
                        className="p-1.5 text-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label="Send comment"
                      >
                        {uploadingFiles ? (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Status Modal */}
      {showCustomStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('customStatus.title')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('customStatus.name')}
                </label>
                <input
                  type="text"
                  value={customStatusName}
                  onChange={(e) => setCustomStatusName(e.target.value)}
                  placeholder={t('customStatus.namePlaceholder')}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('customStatus.color')}
                </label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setCustomStatusColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${customStatusColor === color ? 'border-gray-900 dark:border-gray-100' : 'border-gray-300'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddCustomStatus}
                disabled={!customStatusName.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('customStatus.addStatus')}
              </button>
              <button
                onClick={() => setShowCustomStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repeat Task Modal */}
      {showRepeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('repeatTask.title')}
            </h3>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRepeating"
                  checked={repeatSettings.isRepeating}
                  onChange={(e) => setRepeatSettings({ ...repeatSettings, isRepeating: e.target.checked })}
                  className="mr-3"
                />
                <label htmlFor="isRepeating" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('repeatTask.enableRepetition')}
                </label>
              </div>

              {repeatSettings.isRepeating && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('repeatTask.repeatEvery')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={repeatSettings.interval}
                        onChange={(e) => setRepeatSettings({ ...repeatSettings, interval: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <select
                        value={repeatSettings.frequency}
                        onChange={(e) => setRepeatSettings({ ...repeatSettings, frequency: e.target.value })}
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="daily">{t('repeatTask.daily')}</option>
                        <option value="weekly">{t('repeatTask.weekly')}</option>
                        <option value="monthly">{t('repeatTask.monthly')}</option>
                        <option value="yearly">{t('repeatTask.yearly')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('repeatTask.endDate')}
                    </label>
                    <input
                      type="date"
                      value={repeatSettings.endDate}
                      onChange={(e) => setRepeatSettings({ ...repeatSettings, endDate: e.target.value })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveRepeatSettings}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {t('misc.saveSettings')}
              </button>
              <button
                onClick={() => setShowRepeatModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Members Modal */}
      {showAssignModal && currentGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('assignee.addAssignees')}
            </h3>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {currentGroup.members
                .filter((member) => {
                  const userId = typeof member.userId === 'object' ? member.userId._id : member.userId;

                  // If user cannot assign to others, only show themselves
                  if (!canAssignToOthers) {
                    return userId === currentUser?._id;
                  }

                  // If task has a folder, only show users with folder access
                  if (folderMemberAccess && task?.folderId) {
                    return folderMemberAccess.has(userId);
                  }

                  // Otherwise show all members
                  return true;
                })
                .map((member) => {
                  const userId = typeof member.userId === 'object' ? member.userId._id : member.userId;
                  // Properly extract user info with fallbacks
                  let userName = 'Unknown';
                  let userEmail = '';
                  let userAvatar: string | undefined;
                  
                  if (typeof member.userId === 'object' && member.userId) {
                    userName = member.userId.name || member.name || 'Unknown';
                    userEmail = member.userId.email || member.email || '';
                    userAvatar = member.userId.avatar || member.avatar;
                  } else {
                    userName = member.name || 'Unknown';
                    userEmail = member.email || '';
                    userAvatar = member.avatar;
                  }

                  const isAlreadyAssigned = task?.assignedTo?.some(
                    (assignee: any) => {
                      const assigneeId = typeof assignee.userId === 'object' ? assignee.userId._id : assignee.userId;
                      return assigneeId === userId;
                    }
                  );

                  const isSelected = selectedMembers.includes(userId);

                  return (
                    <label
                      key={userId}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isAlreadyAssigned
                        ? 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isAlreadyAssigned}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, userId]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== userId));
                          }
                        }}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${isSelected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'
                          }`}>
                          {userAvatar ? (
                            <img
                              src={userAvatar}
                              alt={userName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            (userName?.charAt(0) || 'U').toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {userName}
                            </span>
                            {isAlreadyAssigned && (
                              <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                Already assigned
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {userEmail}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}

              {currentGroup.members.filter((member) => {
                const userId = typeof member.userId === 'object' ? member.userId._id : member.userId;
                if (!canAssignToOthers) {
                  return userId === currentUser?._id;
                }
                if (folderMemberAccess && task?.folderId) {
                  return folderMemberAccess.has(userId);
                }
                return true;
              }).length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">
                      {!canAssignToOthers
                        ? "Bạn chỉ có thể gán task cho chính mình"
                        : folderMemberAccess && task?.folderId
                          ? "Không có thành viên nào có quyền truy cập vào folder này"
                          : "No members in this group"}
                    </p>
                  </div>
                )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfirmAssign}
                disabled={selectedMembers.length === 0 || saving}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : `Add ${selectedMembers.length} assignee(s)`}
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedMembers([]);
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for viewing images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Full size preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={lightboxImage}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-white hover:text-gray-300 text-sm whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span>{t('chat.openInNewTab')}</span>
            </a>
          </div>
        </div>
      )}
    </>
  )
}