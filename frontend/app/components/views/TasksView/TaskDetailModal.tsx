"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import type { Task } from "../../../services/types/task.types"
import { taskService } from "../../../services/task.service"
import { useAuth } from "../../../contexts/AuthContext"

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
}

export default function TaskDetailModal({ taskId, isOpen, onClose, onTaskUpdate, onTaskDelete }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState("")
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [estimatedTime, setEstimatedTime] = useState("")
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState("")
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null)
  const { user: currentUser } = useAuth()

  const estimatedTimeOptions = ["15m", "30m", "1h", "2h", "4h", "1d", "2d", "1w"]

  useEffect(() => {
    if (isOpen && taskId) {
      console.log("Fetching task details for ID:", taskId)
      fetchTaskDetails()
    }
  }, [isOpen, taskId])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
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

  const handleEstimatedTimeChange = async (newEstimatedTime: string) => {
    if (!task) return

    try {
      console.log("Updating estimated time to:", newEstimatedTime)
      const updatedTask = await taskService.updateTask(taskId, {
        estimatedTime: newEstimatedTime,
      })
      setTask(updatedTask)
      setEstimatedTime(newEstimatedTime)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error updating estimated time:", error)
      alert("Failed to update estimated time: " + (error as Error).message)
    }
  }

  const fetchTaskDetails = async () => {
    try {
      setLoading(true)
      const taskData = await taskService.getTaskById(taskId)
      console.log("Task data received:", taskData)

      setTask(taskData)
      setDescription(taskData.description || "")
      setEstimatedTime(taskData.estimatedTime || "")

      if (taskData.comments && Array.isArray(taskData.comments)) {
        console.log("Raw comments:", taskData.comments)
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
    } catch (error) {
      console.error("Error fetching task details:", error)
      alert("Failed to load task details: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!task) return

    try {
      setSaving(true)

      const updateData: any = {}

      if (task.title !== undefined) updateData.title = task.title
      if (description !== undefined) updateData.description = description
      if (task.status !== undefined) updateData.status = task.status
      if (task.priority !== undefined) updateData.priority = task.priority
      if (task.dueDate !== undefined) updateData.dueDate = task.dueDate
      if (task.category !== undefined) updateData.category = task.category
      if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime

      console.log("Sending update data:", updateData)

      const updatedTask = await taskService.updateTask(taskId, updateData)
      console.log("Update response:", updatedTask)

      setTask(updatedTask)
      setEditing(false)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error updating task:", error)
      alert("Failed to update task: " + (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task || !confirm("Are you sure you want to delete this task?")) return

    try {
      await taskService.deleteTask(taskId)
      onTaskDelete(taskId)
      onClose()
    } catch (error) {
      console.error("Error deleting task:", error)
      alert("Failed to delete task: " + (error as Error).message)
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim() || !task) return

    try {
      console.log("Adding comment:", comment)
      const updatedTask = await taskService.addComment(taskId, comment)
      setComment("")

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
      alert("Failed to add comment: " + (error as Error).message)
    }
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentContent.trim() || !currentUser) {
      if (!currentUser) {
        alert("You must be logged in to update a comment")
      }
      return
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
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error updating comment:", error)
      alert("Failed to update comment: " + (error as Error).message)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?") || !currentUser) {
      if (!currentUser) {
        alert("You must be logged in to delete a comment")
      }
      return
    }

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
      alert("Failed to delete comment: " + (error as Error).message)
    }
  }

  const startEditingComment = (comment: Comment) => {
    if (!currentUser) {
      alert("You must be logged in to edit a comment")
      return
    }
    setEditingCommentId(comment._id!)
    setEditingCommentContent(comment.content)
    setShowCommentMenu(null)
  }

  const cancelEditingComment = () => {
    setEditingCommentId(null)
    setEditingCommentContent("")
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return

    try {
      console.log("Updating status to:", newStatus)
      const updatedTask = await taskService.updateTask(taskId, {
        status: newStatus,
      })
      setTask(updatedTask)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update status: " + (error as Error).message)
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (!task) return

    try {
      console.log("Updating priority to:", newPriority)
      const updatedTask = await taskService.updateTask(taskId, {
        priority: newPriority,
      })
      setTask(updatedTask)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error updating priority:", error)
      alert("Failed to update priority: " + (error as Error).message)
    }
  }

  const handleDueDateChange = async (newDueDate: string) => {
    if (!task) return

    try {
      console.log("Updating due date to:", newDueDate)
      const updatedTask = await taskService.updateTask(taskId, {
        dueDate: newDueDate,
      })
      setTask(updatedTask)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error updating due date:", error)
      alert("Failed to update due date: " + (error as Error).message)
    }
  }

  const handleCategoryChange = async (newCategory: string) => {
    if (!task) return

    try {
      console.log("Updating category to:", newCategory)
      const updatedTask = await taskService.updateTask(taskId, {
        category: newCategory,
      })
      setTask(updatedTask)
      onTaskUpdate(updatedTask)
    } catch (error) {
      console.error("Error updating category:", error)
      alert("Failed to update category: " + (error as Error).message)
    }
  }

  const getUserDisplayName = (comment: Comment): string => {
    if (comment.user && typeof comment.user === "object") {
      return comment.user.name || comment.user.email || "User"
    }
    return "User"
  }

  const getUserInitial = (comment: Comment): string => {
    const name = getUserDisplayName(comment)
    return name.charAt(0).toUpperCase()
  }

  const isCommentOwner = (comment: Comment): boolean => {
    if (!currentUser) return false

    if (comment.userId && typeof comment.userId === "string") {
      return comment.userId === currentUser._id
    }

    if (comment.user && typeof comment.user === "object") {
      return comment.user._id === currentUser._id
    }

    return false
  }

  const CommentMenu = ({
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
  )

  const CommentItem = ({ comment, index }: { comment: Comment; index: number }) => {
    const isEditing = editingCommentId === comment._id
    const isOwner = isCommentOwner(comment)

    return (
      <div key={comment._id || `comment-${index}`} className="flex gap-3 group">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
          {getUserInitial(comment)}
        </div>
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{getUserDisplayName(comment)}</span>
            <span className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString()}
              {comment.isEdited && " (edited)"}
            </span>

            {isOwner && !isEditing && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCommentMenu(showCommentMenu === comment._id ? null : comment._id!)
                  }}
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
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{comment.content}</p>
          )}

          {comment.attachment && (
            <div className="mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <Paperclip className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{comment.attachment.filename}</span>
                <a
                  href={comment.attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-600 ml-2"
                >
                  View
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

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
      {/* Backdrop hoàn toàn trong suốt - chỉ để bắt sự kiện click */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-1/2 bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Close Button - Cùng màu với modal và gần hơn */}
{/* --- Bắt đầu khối nút đóng tùy chỉnh --- */}
<div
    className="absolute top-6 left-0 w-9 h-9 z-10" // Đã sửa từ -left-8 thành left-0
    style={{
        /* Dòng này sẽ kéo component sang trái một khoảng bằng 50% chiều rộng của nó */
        transform: "translateX(-50%)",
    }}
>
    <div className="relative w-full h-full">
        {/* Lớp 1: Vòng tròn đầy đủ có viền và bóng */}
        <div className="absolute inset-0 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg"></div>

        {/* Lớp 2: Lớp che, có màu nền của modal, che đi nửa viền bên phải */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white dark:bg-gray-800"></div>

        {/* Lớp 3: Nút bấm trong suốt chứa icon 'X' để nhận sự kiện click và hover */}
        <button
            onClick={onClose}
            className="absolute inset-0 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/75 dark:hover:bg-gray-700/75 transition-colors"
            aria-label="Close"
        >
            <X className="w-5 h-5" />
        </button>
    </div>
</div>
{/* --- Kết thúc khối nút đóng tùy chỉnh --- */}

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 flex-1">
              {editing ? (
                <input
                  type="text"
                  value={task.title || ""}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                  className="text-xl font-semibold bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 flex-1 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {task.title || "Untitled Task"}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={handleDelete} className="p-2 text-red-500 hover:text-red-700">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Content - Split into 2/3 task details and 1/3 comments */}
          <div className="flex-1 overflow-hidden flex">
            {/* Task Details - 2/3 width */}
            <div className="w-2/3 border-r border-gray-200 dark:border-gray-700 overflow-auto">
              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                  {editing ? (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add a description..."
                    />
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {description || "No description provided"}
                    </p>
                  )}
                </div>

                {/* Scheduled Work */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Scheduled work</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Date</span>
                      <span>User</span>
                      <span>Estimated time</span>
                      <span>Time</span>
                    </div>
                    <div className="text-center py-4 text-gray-500">No scheduled work yet</div>
                    <button className="text-blue-500 hover:text-blue-600 text-sm">+ Schedule more work</button>
                  </div>
                </div>

                {/* Task Properties */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Properties</h3>

                  {/* Status */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <MessageSquare className="w-4 h-4" />
                      Status
                    </label>
                    <select
                      value={task.status || "todo"}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  {/* Type/Category */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Flag className="w-4 h-4" />
                      Type
                    </label>
                    <select
                      value={task.category || ""}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="Financial">Financial</option>
                      <option value="Strategic">Strategic</option>
                      <option value="Operational">Operational</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4" />
                      Due date
                    </label>
                    <input
                      type="date"
                      value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Estimated Time */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Clock className="w-4 h-4" />
                      Estimated time
                    </label>
                    {editing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={estimatedTime}
                          onChange={(e) => setEstimatedTime(e.target.value)}
                          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 2h 30m"
                        />
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setEstimatedTime(e.target.value)
                            }
                          }}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Quick select</option>
                          {estimatedTimeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:border-gray-400"
                        onClick={() => setEditing(true)}
                      >
                        {estimatedTime || "—"}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Flag className="w-4 h-4" />
                      Priority
                    </label>
                    <select
                      value={task.priority || "medium"}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4">
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4" />
                    Add address
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <Paperclip className="w-4 h-4" />
                    Attach file
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <PlayCircle className="w-4 h-4" />
                    Start timer
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <Timer className="w-4 h-4" />
                    Log time
                  </button>
                </div>
              </div>
            </div>

            <div className="w-1/3 overflow-auto flex flex-col">
              <div className="flex-1 p-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({comments.length})
                </h3>
                <div className="space-y-4">
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <CommentItem key={comment._id || `comment-${index}`} comment={comment} index={index} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No comments yet</div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Type a message..."
                        rows={3}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment()
                          }
                        }}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!comment.trim()}
                        className="absolute bottom-3 right-3 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send comment"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}