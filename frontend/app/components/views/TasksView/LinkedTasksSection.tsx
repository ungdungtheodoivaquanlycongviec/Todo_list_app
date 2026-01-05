"use client"

import { useState, useCallback, useEffect } from "react"
import { Link2, X, ChevronDown, ExternalLink, AlertTriangle, ArrowRight, Copy, Trash2 } from "lucide-react"
import { taskService } from "../../../services/task.service"
import { useLanguage } from "../../../contexts/LanguageContext"
import { useToast } from "../../../contexts/ToastContext"
import type { Task, LinkedTask, LinkType } from "../../../services/types/task.types"

interface LinkedTasksSectionProps {
    taskId: string
    linkedTasks: LinkedTask[]
    folderId?: string
    onTaskUpdate: (updatedTask: Task) => void
    onNavigateToTask?: (taskId: string) => void
    disabled?: boolean
}

const LINK_TYPES: { value: LinkType; label: string; icon: string }[] = [
    { value: 'blocks', label: 'Blocks', icon: '🚫' },
    { value: 'blocked_by', label: 'Blocked by', icon: '⏸️' },
    { value: 'relates_to', label: 'Related to', icon: '🔗' },
    { value: 'duplicates', label: 'Duplicates', icon: '📋' },
]

export default function LinkedTasksSection({
    taskId,
    linkedTasks = [],
    folderId,
    onTaskUpdate,
    onNavigateToTask,
    disabled = false
}: LinkedTasksSectionProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Task[]>([])
    const [selectedLinkType, setSelectedLinkType] = useState<LinkType>('relates_to')
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const { t } = useLanguage()
    const toast = useToast()

    // Ensure linkedTasks is always an array
    const safeLinkedTasks = Array.isArray(linkedTasks) ? linkedTasks : []

    // Group linked tasks by type
    const groupedLinks = safeLinkedTasks.reduce((acc, link) => {
        if (!acc[link.linkType]) {
            acc[link.linkType] = []
        }
        acc[link.linkType].push(link)
        return acc
    }, {} as Record<LinkType, LinkedTask[]>)

    // Search for tasks to link - filter by same folder
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        try {
            setSearching(true)
            // Only search tasks in the same folder
            const filters: any = { search: query, limit: 10 }
            if (folderId) {
                filters.folderId = folderId
            }
            const response = await taskService.getAllTasks(filters)
            // Filter out the current task and already linked tasks
            const linkedTaskIds = safeLinkedTasks.map(lt =>
                typeof lt.taskId === 'object' ? lt.taskId._id : lt.taskId
            )
            const filtered = response.tasks.filter(t =>
                t._id !== taskId && !linkedTaskIds.includes(t._id)
            )
            setSearchResults(filtered)
        } catch (error) {
            console.error("Error searching tasks:", error)
        } finally {
            setSearching(false)
        }
    }, [taskId, safeLinkedTasks, folderId])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                handleSearch(searchQuery)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, handleSearch])

    const handleLinkTask = useCallback(async (linkedTaskId: string) => {
        if (loading) return

        try {
            setLoading(true)
            const updatedTask = await taskService.linkTask(taskId, linkedTaskId, selectedLinkType)
            onTaskUpdate(updatedTask)
            setShowAddModal(false)
            setSearchQuery("")
            setSearchResults([])
            toast.showSuccess(t('linkedTasks.linked') || "Task linked")
        } catch (error) {
            console.error("Error linking task:", error)
            toast.showError((error as Error).message)
        } finally {
            setLoading(false)
        }
    }, [taskId, selectedLinkType, loading, onTaskUpdate, toast, t])

    const handleUnlinkTask = useCallback(async (linkedTaskId: string) => {
        if (loading) return

        try {
            setLoading(true)
            const updatedTask = await taskService.unlinkTask(taskId, linkedTaskId)
            onTaskUpdate(updatedTask)
            toast.showSuccess(t('linkedTasks.unlinked') || "Task unlinked")
        } catch (error) {
            console.error("Error unlinking task:", error)
            toast.showError((error as Error).message)
        } finally {
            setLoading(false)
        }
    }, [taskId, loading, onTaskUpdate, toast, t])

    const getLinkedTaskId = (link: LinkedTask): string => {
        return typeof link.taskId === 'object' ? link.taskId._id : link.taskId
    }

    const getLinkedTaskTitle = (link: LinkedTask): string => {
        return typeof link.taskId === 'object' ? link.taskId.title : 'Unknown Task'
    }

    const getLinkedTaskStatus = (link: LinkedTask): string => {
        return typeof link.taskId === 'object' ? link.taskId.status : 'unknown'
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            case 'incomplete': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }
    }

    const getLinkTypeLabel = (type: LinkType) => {
        const found = LINK_TYPES.find(lt => lt.value === type)
        return found ? `${found.icon} ${t(`linkedTasks.${type}`) || found.label}` : type
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('linkedTasks.title') || 'Linked Tasks'}
                    </h3>
                    {safeLinkedTasks.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({safeLinkedTasks.length})
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    disabled={disabled}
                    className="text-blue-500 hover:text-blue-600 text-xs font-medium disabled:opacity-50"
                >
                    + {t('linkedTasks.addLink') || 'Link task'}
                </button>
            </div>

            {/* Linked tasks list grouped by type */}
            {safeLinkedTasks.length > 0 ? (
                <div className="space-y-3">
                    {Object.entries(groupedLinks).map(([type, links]) => (
                        <div key={type} className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {getLinkTypeLabel(type as LinkType)}
                            </div>
                            <div className="space-y-1">
                                {links.map((link) => {
                                    const linkedId = getLinkedTaskId(link)
                                    const title = getLinkedTaskTitle(link)
                                    const status = getLinkedTaskStatus(link)

                                    return (
                                        <div
                                            key={linkedId}
                                            className="group flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                        {title}
                                                    </span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(status)}`}>
                                                        {status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {onNavigateToTask && (
                                                    <button
                                                        onClick={() => onNavigateToTask(linkedId)}
                                                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                                        title={t('linkedTasks.viewTask') || 'View task'}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleUnlinkTask(linkedId)}
                                                    disabled={disabled || loading}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                    title={t('linkedTasks.unlink') || 'Unlink'}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-3 text-gray-400 dark:text-gray-500 text-sm">
                    {t('linkedTasks.noLinks') || 'No linked tasks'}
                </div>
            )}

            {/* Add Link Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {t('linkedTasks.addLink') || 'Link Task'}
                            </h4>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Link type selector */}
                        <div className="mb-4">
                            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                {t('linkedTasks.selectType') || 'Link type'}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {LINK_TYPES.map(lt => (
                                    <button
                                        key={lt.value}
                                        onClick={() => setSelectedLinkType(lt.value)}
                                        className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${selectedLinkType === lt.value
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {lt.icon} {t(`linkedTasks.${lt.value}`) || lt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search input */}
                        <div className="mb-4">
                            <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                {t('linkedTasks.selectTask') || 'Search and select a task'}
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('linkedTasks.searchPlaceholder') || 'Type to search tasks...'}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Search results */}
                        <div className="max-h-48 overflow-y-auto">
                            {searching ? (
                                <div className="text-center py-4 text-gray-500">
                                    {t('common.loading') || 'Searching...'}
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="space-y-1">
                                    {searchResults.map(task => (
                                        <button
                                            key={task._id}
                                            onClick={() => handleLinkTask(task._id)}
                                            disabled={loading}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                                                    {task.title}
                                                </span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(task.status)}`}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery ? (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    {t('common.noResults') || 'No tasks found'}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                    {t('linkedTasks.typeToSearch') || 'Type to search for tasks'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
