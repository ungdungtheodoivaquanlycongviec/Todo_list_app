"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { taskService } from '../services/task.service'
import { useAuth } from './AuthContext'

interface ActiveTimer {
    taskId: string
    taskTitle: string
    startTime: Date
    userId: string
    userName?: string
    userAvatar?: string
}

interface TimerContextType {
    startTimer: (taskId: string, startTime: Date, taskTitle: string, userId: string, userName?: string, userAvatar?: string) => void
    stopTimer: (taskId: string) => Promise<any>
    getActiveTimer: (taskId: string) => ActiveTimer | undefined
    isTimerRunning: (taskId: string) => boolean
    isCurrentUserTimerRunning: (taskId: string) => boolean
    getElapsedTime: (taskId: string) => number
    getAllActiveTimers: (taskId: string) => ActiveTimer[]
    subscribeToTimerUpdates: (callback: () => void) => () => void
    syncTimersFromTask: (task: any) => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    // Store timers keyed by `taskId:userId` for per-user tracking
    const timersRef = useRef<Map<string, ActiveTimer>>(new Map())
    // Simple version counter to trigger re-renders
    const [version, setVersion] = useState(0)
    // Subscribers for components that want to be notified of changes
    const subscribersRef = useRef<Set<() => void>>(new Set())

    const notifySubscribers = useCallback(() => {
        subscribersRef.current.forEach(callback => callback())
    }, [])

    const subscribeToTimerUpdates = useCallback((callback: () => void) => {
        subscribersRef.current.add(callback)
        return () => {
            subscribersRef.current.delete(callback)
        }
    }, [])

    // Generate a unique key for timer storage
    const getTimerKey = useCallback((taskId: string, userId: string) => {
        return `${taskId}:${userId}`
    }, [])

    const startTimer = useCallback((taskId: string, startTime: Date, taskTitle: string, userId: string, userName?: string, userAvatar?: string) => {
        const key = getTimerKey(taskId, userId)

        // Only add if not already running
        if (!timersRef.current.has(key)) {
            timersRef.current.set(key, {
                taskId,
                taskTitle,
                startTime,
                userId,
                userName,
                userAvatar
            })
            setVersion(v => v + 1)
            notifySubscribers()
        }
    }, [getTimerKey, notifySubscribers])

    const stopTimer = useCallback(async (taskId: string) => {
        try {
            const updatedTask = await taskService.stopTimer(taskId)

            // Remove only current user's timer
            if (user?._id) {
                const key = getTimerKey(taskId, user._id)
                timersRef.current.delete(key)
            }

            setVersion(v => v + 1)
            notifySubscribers()

            return updatedTask
        } catch (error) {
            console.error('Error stopping timer:', error)
            throw error
        }
    }, [user, getTimerKey, notifySubscribers])

    // Get current user's timer for a task
    const getActiveTimer = useCallback((taskId: string) => {
        if (!user?._id) return undefined
        const key = getTimerKey(taskId, user._id)
        return timersRef.current.get(key)
    }, [user, getTimerKey])

    // Check if current user has a running timer on this task
    const isTimerRunning = useCallback((taskId: string) => {
        if (!user?._id) return false
        const key = getTimerKey(taskId, user._id)
        return timersRef.current.has(key)
    }, [user, getTimerKey])

    // Alias for clarity
    const isCurrentUserTimerRunning = isTimerRunning

    // Get all active timers for a task (all users)
    const getAllActiveTimers = useCallback((taskId: string) => {
        const timers: ActiveTimer[] = []
        timersRef.current.forEach((timer, key) => {
            if (timer.taskId === taskId) {
                timers.push(timer)
            }
        })
        return timers
    }, [])

    // Calculates elapsed time on-demand based on startTime (for current user)
    const getElapsedTime = useCallback((taskId: string) => {
        if (!user?._id) return 0
        const key = getTimerKey(taskId, user._id)
        const timer = timersRef.current.get(key)
        if (!timer) return 0
        return Math.floor((Date.now() - timer.startTime.getTime()) / 1000)
    }, [user, getTimerKey])

    // Sync timers from task data (called when task is loaded)
    const syncTimersFromTask = useCallback((task: any) => {
        if (!task || !task._id) return

        const taskId = task._id
        const activeTimers = task.activeTimers || []

        let hasChanges = false

        // Check for timers to remove
        const keysToRemove: string[] = []
        timersRef.current.forEach((timer, key) => {
            if (timer.taskId === taskId) {
                // Check if this timer still exists in activeTimers
                const stillExists = activeTimers.some((t: any) => {
                    const userId = typeof t.userId === 'object' ? t.userId._id : t.userId
                    return getTimerKey(taskId, userId) === key
                })
                if (!stillExists) {
                    keysToRemove.push(key)
                }
            }
        })

        if (keysToRemove.length > 0) {
            keysToRemove.forEach(key => timersRef.current.delete(key))
            hasChanges = true
        }

        // Add or update timers from task data
        activeTimers.forEach((timer: any) => {
            const userId = typeof timer.userId === 'object' ? timer.userId._id : timer.userId
            const userName = typeof timer.userId === 'object' ? timer.userId.name : undefined
            const userAvatar = typeof timer.userId === 'object' ? timer.userId.avatar : undefined

            if (userId) {
                const key = getTimerKey(taskId, userId)
                const existingTimer = timersRef.current.get(key)

                // Only add if timer doesn't exist yet
                if (!existingTimer) {
                    timersRef.current.set(key, {
                        taskId,
                        taskTitle: task.title || 'Task',
                        startTime: new Date(timer.startTime),
                        userId,
                        userName,
                        userAvatar
                    })
                    hasChanges = true
                }
            }
        })

        // Only trigger re-render if something actually changed
        if (hasChanges) {
            setVersion(v => v + 1)
            notifySubscribers()
        }
    }, [getTimerKey, notifySubscribers])

    return (
        <TimerContext.Provider
            value={{
                startTimer,
                stopTimer,
                getActiveTimer,
                isTimerRunning,
                isCurrentUserTimerRunning,
                getElapsedTime,
                getAllActiveTimers,
                subscribeToTimerUpdates,
                syncTimersFromTask
            }}
        >
            {children}
        </TimerContext.Provider>
    )
}

export function useTimer() {
    const context = useContext(TimerContext)
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider')
    }
    return context
}

// Hook for components that need real-time elapsed time updates for current user's timer
export function useTimerElapsed(taskId: string): number {
    const { getActiveTimer, getElapsedTime, subscribeToTimerUpdates } = useTimer()
    const [elapsed, setElapsed] = useState(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Function to start the interval
    const startInterval = useCallback(() => {
        // Clear any existing interval first
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        // Set initial elapsed time
        setElapsed(getElapsedTime(taskId))

        // Start updating every second
        intervalRef.current = setInterval(() => {
            setElapsed(getElapsedTime(taskId))
        }, 1000)
    }, [taskId, getElapsedTime])

    // Function to stop the interval
    const stopInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        setElapsed(0)
    }, [])

    // Check initial state and subscribe to updates
    React.useEffect(() => {
        // Check if timer is already running on mount
        const timer = getActiveTimer(taskId)
        if (timer) {
            startInterval()
        }

        // Subscribe to timer changes
        const unsubscribe = subscribeToTimerUpdates(() => {
            const timer = getActiveTimer(taskId)
            if (timer) {
                startInterval()
            } else {
                stopInterval()
            }
        })

        // Cleanup on unmount
        return () => {
            unsubscribe()
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [taskId, getActiveTimer, subscribeToTimerUpdates, startInterval, stopInterval])

    return elapsed
}
