"use client"

import { useState, useCallback } from "react"
import { Check, Plus, Trash2, Edit2, X, CheckSquare, Square } from "lucide-react"
import { taskService } from "../../../services/task.service"
import { useLanguage } from "../../../contexts/LanguageContext"
import { useToast } from "../../../contexts/ToastContext"
import type { Task } from "../../../services/types/task.types"

interface ChecklistItem {
    _id?: string
    text: string
    isCompleted: boolean
    completedBy?: any
    completedAt?: string
    createdBy?: any
    createdAt?: string
}

interface ChecklistSectionProps {
    taskId: string
    checklist: ChecklistItem[]
    onTaskUpdate: (updatedTask: Task) => void
    disabled?: boolean
}

export default function ChecklistSection({ taskId, checklist = [], onTaskUpdate, disabled = false }: ChecklistSectionProps) {
    const [newItemText, setNewItemText] = useState("")
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [editingText, setEditingText] = useState("")
    const [loading, setLoading] = useState(false)
    const { t } = useLanguage()
    const toast = useToast()

    // Calculate progress
    const completedCount = checklist.filter(item => item.isCompleted).length
    const totalCount = checklist.length
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    const handleAddItem = useCallback(async () => {
        if (!newItemText.trim() || loading) return

        try {
            setLoading(true)
            const updatedTask = await taskService.addChecklistItem(taskId, newItemText.trim())
            onTaskUpdate(updatedTask)
            setNewItemText("")
            toast.showSuccess(t('checklist.itemAdded') || "Item added")
        } catch (error) {
            console.error("Error adding checklist item:", error)
            toast.showError((error as Error).message)
        } finally {
            setLoading(false)
        }
    }, [taskId, newItemText, loading, onTaskUpdate, toast, t])

    const handleToggleItem = useCallback(async (itemId: string) => {
        if (loading || !itemId) return

        try {
            setLoading(true)
            const updatedTask = await taskService.toggleChecklistItem(taskId, itemId)
            onTaskUpdate(updatedTask)
        } catch (error) {
            console.error("Error toggling checklist item:", error)
            toast.showError((error as Error).message)
        } finally {
            setLoading(false)
        }
    }, [taskId, loading, onTaskUpdate, toast])

    const handleDeleteItem = useCallback(async (itemId: string) => {
        if (loading || !itemId) return

        try {
            setLoading(true)
            const updatedTask = await taskService.deleteChecklistItem(taskId, itemId)
            onTaskUpdate(updatedTask)
            toast.showSuccess(t('checklist.itemDeleted') || "Item deleted")
        } catch (error) {
            console.error("Error deleting checklist item:", error)
            toast.showError((error as Error).message)
        } finally {
            setLoading(false)
        }
    }, [taskId, loading, onTaskUpdate, toast, t])

    const startEditing = (item: ChecklistItem) => {
        if (item._id) {
            setEditingItemId(item._id)
            setEditingText(item.text)
        }
    }

    const cancelEditing = () => {
        setEditingItemId(null)
        setEditingText("")
    }

    const handleUpdateItem = useCallback(async () => {
        if (!editingItemId || !editingText.trim() || loading) return

        try {
            setLoading(true)
            const updatedTask = await taskService.updateChecklistItem(taskId, editingItemId, editingText.trim())
            onTaskUpdate(updatedTask)
            setEditingItemId(null)
            setEditingText("")
        } catch (error) {
            console.error("Error updating checklist item:", error)
            toast.showError((error as Error).message)
        } finally {
            setLoading(false)
        }
    }, [taskId, editingItemId, editingText, loading, onTaskUpdate, toast])

    const handleKeyDown = (e: React.KeyboardEvent, action: 'add' | 'update') => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (action === 'add') {
                handleAddItem()
            } else {
                handleUpdateItem()
            }
        } else if (e.key === 'Escape') {
            if (action === 'update') {
                cancelEditing()
            }
        }
    }

    return (
        <div className="space-y-3">
            {/* Header with progress */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('checklist.title') || 'Checklist'}
                    </h3>
                    {totalCount > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({completedCount}/{totalCount})
                        </span>
                    )}
                </div>
                {totalCount > 0 && (
                    <span className={`text-xs font-medium ${progressPercent === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {progressPercent}%
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            )}

            {/* Checklist items */}
            <div className="space-y-1">
                {checklist.map((item: ChecklistItem) => {
                    // Extract completedBy user info
                    const completedByUser = item.completedBy && typeof item.completedBy === 'object'
                        ? item.completedBy
                        : null
                    const completedByName = completedByUser?.name || (item.completedBy ? 'Unknown' : null)
                    const completedByAvatar = completedByUser?.avatar
                    const completedByInitial = completedByName ? completedByName.charAt(0).toUpperCase() : '?'

                    // Format completedAt time
                    const formatCompletedAt = (dateStr: string | undefined) => {
                        if (!dateStr) return null
                        const date = new Date(dateStr)
                        const now = new Date()
                        const diffMs = now.getTime() - date.getTime()
                        const diffMins = Math.floor(diffMs / 60000)
                        const diffHours = Math.floor(diffMs / 3600000)
                        const diffDays = Math.floor(diffMs / 86400000)

                        if (diffMins < 1) return t('time.justNow') || 'Just now'
                        if (diffMins < 60) return `${diffMins}m ago`
                        if (diffHours < 24) return `${diffHours}h ago`
                        if (diffDays < 7) return `${diffDays}d ago`
                        return date.toLocaleDateString()
                    }

                    return (
                        <div
                            key={item._id || item.text}
                            className={`group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${item.isCompleted ? 'bg-gray-50/30 dark:bg-gray-800/30' : ''
                                }`}
                        >
                            {/* Checkbox */}
                            <button
                                onClick={() => item._id && handleToggleItem(item._id)}
                                disabled={disabled || loading}
                                className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${item.isCompleted
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                                    } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {item.isCompleted && <Check className="w-3 h-3" />}
                            </button>

                            {/* Text or edit input */}
                            {editingItemId === item._id ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, 'update')}
                                        className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleUpdateItem}
                                        disabled={loading}
                                        className="p-1 text-green-600 hover:text-green-700"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="p-1 text-gray-500 hover:text-gray-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    {/* Item text */}
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-sm ${item.isCompleted
                                                ? 'text-gray-400 dark:text-gray-500 line-through'
                                                : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {item.text}
                                        </span>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
                                            <button
                                                onClick={() => startEditing(item)}
                                                disabled={disabled || loading}
                                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                                title={t('checklist.editItem') || 'Edit'}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => item._id && handleDeleteItem(item._id)}
                                                disabled={disabled || loading}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                title={t('checklist.deleteItem') || 'Delete'}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Completed by info */}
                                    {item.isCompleted && completedByName && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {/* User avatar or initial */}
                                            <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {completedByAvatar ? (
                                                    <img
                                                        src={completedByAvatar}
                                                        alt={completedByName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-medium text-green-700 dark:text-green-300">
                                                        {completedByInitial}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {t('checklist.completedBy') || 'Completed by'} <span className="font-medium text-gray-500 dark:text-gray-400">{completedByName}</span>
                                                {item.completedAt && (
                                                    <span className="ml-1">• {formatCompletedAt(item.completedAt)}</span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Empty state */}
            {checklist.length === 0 && (
                <div className="text-center py-3 text-gray-400 dark:text-gray-500 text-sm">
                    {t('checklist.noItems') || 'No checklist items yet'}
                </div>
            )}

            {/* Add new item */}
            <div className="flex items-center gap-2 pt-2">
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'add')}
                    placeholder={t('checklist.addItem') || 'Add an item...'}
                    disabled={disabled || loading}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                />
                <button
                    onClick={handleAddItem}
                    disabled={disabled || loading || !newItemText.trim()}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {t('checklist.add') || 'Add'}
                </button>
            </div>
        </div>
    )
}
