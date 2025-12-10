"use client"

import React, { createContext, useContext, useState, useCallback, useRef, useSyncExternalStore } from 'react'
import { taskService } from '../services/task.service'

interface ActiveTimer {
    taskId: string
    taskTitle: string
    startTime: Date
}

interface TimerContextType {
    startTimer: (taskId: string, startTime: Date, taskTitle: string) => void
    stopTimer: (taskId: string) => Promise<any>
    getActiveTimer: (taskId: string) => ActiveTimer | undefined
    isTimerRunning: (taskId: string) => boolean
    getElapsedTime: (taskId: string) => number
    subscribeToTimerUpdates: (callback: () => void) => () => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: React.ReactNode }) {
    // Use ref to store timers to avoid re-rendering all consumers
    const timersRef = useRef<Map<string, ActiveTimer>>(new Map())
    // Simple version counter to trigger re-renders only when timers are added/removed
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

    const startTimer = useCallback((taskId: string, startTime: Date, taskTitle: string) => {
        // Only add if not already running
        if (!timersRef.current.has(taskId)) {
            timersRef.current.set(taskId, {
                taskId,
                taskTitle,
                startTime
            })
            setVersion(v => v + 1) // Trigger re-render for components checking isTimerRunning
            notifySubscribers()
        }
    }, [notifySubscribers])

    const stopTimer = useCallback(async (taskId: string) => {
        try {
            const updatedTask = await taskService.stopTimer(taskId)

            timersRef.current.delete(taskId)
            setVersion(v => v + 1) // Trigger re-render
            notifySubscribers()

            return updatedTask
        } catch (error) {
            console.error('Error stopping timer:', error)
            throw error
        }
    }, [notifySubscribers])

    const getActiveTimer = useCallback((taskId: string) => {
        return timersRef.current.get(taskId)
    }, [])

    const isTimerRunning = useCallback((taskId: string) => {
        return timersRef.current.has(taskId)
    }, [])

    // Calculates elapsed time on-demand based on startTime
    const getElapsedTime = useCallback((taskId: string) => {
        const timer = timersRef.current.get(taskId)
        if (!timer) return 0
        return Math.floor((Date.now() - timer.startTime.getTime()) / 1000)
    }, [])

    return (
        <TimerContext.Provider
            value={{
                startTimer,
                stopTimer,
                getActiveTimer,
                isTimerRunning,
                getElapsedTime,
                subscribeToTimerUpdates
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

// Hook for components that need real-time elapsed time updates
export function useTimerElapsed(taskId: string): number {
    const { getActiveTimer, getElapsedTime, subscribeToTimerUpdates } = useTimer()
    const [elapsed, setElapsed] = useState(() => getElapsedTime(taskId))
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Start/stop interval based on whether timer is active
    React.useEffect(() => {
        const timer = getActiveTimer(taskId)

        if (timer) {
            // Update immediately
            setElapsed(getElapsedTime(taskId))

            // Then update every second
            intervalRef.current = setInterval(() => {
                setElapsed(getElapsedTime(taskId))
            }, 1000)
        } else {
            setElapsed(0)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [taskId, getActiveTimer, getElapsedTime])

    // Subscribe to timer changes (start/stop)
    React.useEffect(() => {
        const unsubscribe = subscribeToTimerUpdates(() => {
            const timer = getActiveTimer(taskId)
            if (timer) {
                setElapsed(getElapsedTime(taskId))
            } else {
                setElapsed(0)
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
            }
        })
        return unsubscribe
    }, [taskId, subscribeToTimerUpdates, getActiveTimer, getElapsedTime])

    return elapsed
}
