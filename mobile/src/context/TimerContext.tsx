import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
// Đảm bảo đường dẫn import đúng với cấu trúc dự án Mobile của bạn
import { taskService } from '../services/task.service';
import { useAuth } from './AuthContext';

// --- Interfaces (Giữ nguyên) ---
interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  startTime: Date;
  userId: string;
  userName?: string;
  userAvatar?: string;
}

interface TimerContextType {
  startTimer: (taskId: string, startTime: Date, taskTitle: string, userId: string, userName?: string, userAvatar?: string) => void;
  stopTimer: (taskId: string) => Promise<any>;
  getActiveTimer: (taskId: string) => ActiveTimer | undefined;
  isTimerRunning: (taskId: string) => boolean;
  isCurrentUserTimerRunning: (taskId: string) => boolean;
  getElapsedTime: (taskId: string) => number;
  getAllActiveTimers: (taskId: string) => ActiveTimer[];
  subscribeToTimerUpdates: (callback: () => void) => () => void;
  syncTimersFromTask: (task: any) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Store timers keyed by `taskId:userId`
  const timersRef = useRef<Map<string, ActiveTimer>>(new Map());
  
  // Version counter to trigger re-renders only when structure changes (start/stop), not every second
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [version, setVersion] = useState(0);
  
  // Subscribers mechanism
  const subscribersRef = useRef<Set<() => void>>(new Set());

  const notifySubscribers = useCallback(() => {
    subscribersRef.current.forEach(callback => callback());
  }, []);

  const subscribeToTimerUpdates = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const getTimerKey = useCallback((taskId: string, userId: string) => {
    return `${taskId}:${userId}`;
  }, []);

  // --- Core Functions ---

  const startTimer = useCallback((taskId: string, startTime: Date, taskTitle: string, userId: string, userName?: string, userAvatar?: string) => {
    const key = getTimerKey(taskId, userId);

    if (!timersRef.current.has(key)) {
      timersRef.current.set(key, {
        taskId,
        taskTitle,
        startTime,
        userId,
        userName,
        userAvatar
      });
      setVersion(v => v + 1);
      notifySubscribers();
    }
  }, [getTimerKey, notifySubscribers]);

  const stopTimer = useCallback(async (taskId: string) => {
    try {
      // Gọi API stop timer
      const updatedTask = await taskService.stopTimer(taskId);

      // Chỉ xóa timer của user hiện tại trên Client state
      if (user?._id) {
        const key = getTimerKey(taskId, user._id);
        timersRef.current.delete(key);
      }

      setVersion(v => v + 1);
      notifySubscribers();

      return updatedTask;
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  }, [user, getTimerKey, notifySubscribers]);

  const getActiveTimer = useCallback((taskId: string) => {
    if (!user?._id) return undefined;
    const key = getTimerKey(taskId, user._id);
    return timersRef.current.get(key);
  }, [user, getTimerKey]);

  const isTimerRunning = useCallback((taskId: string) => {
    if (!user?._id) return false;
    const key = getTimerKey(taskId, user._id);
    return timersRef.current.has(key);
  }, [user, getTimerKey]);

  const isCurrentUserTimerRunning = isTimerRunning;

  const getAllActiveTimers = useCallback((taskId: string) => {
    const timers: ActiveTimer[] = [];
    timersRef.current.forEach((timer) => {
      if (timer.taskId === taskId) {
        timers.push(timer);
      }
    });
    return timers;
  }, []);

  const getElapsedTime = useCallback((taskId: string) => {
    if (!user?._id) return 0;
    const key = getTimerKey(taskId, user._id);
    const timer = timersRef.current.get(key);
    if (!timer) return 0;
    // Tính toán thời gian trôi qua dựa trên startTime
    return Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
  }, [user, getTimerKey]);

  // --- Sync Data Function ---
  // Hàm này quan trọng để đồng bộ khi mới load App hoặc load Task list
  const syncTimersFromTask = useCallback((task: any) => {
    if (!task || !task._id) return;

    const taskId = task._id;
    const activeTimers = task.activeTimers || [];

    let hasChanges = false;

    // 1. Tìm và xóa các timer không còn tồn tại trên server
    const keysToRemove: string[] = [];
    timersRef.current.forEach((timer, key) => {
      if (timer.taskId === taskId) {
        const stillExists = activeTimers.some((t: any) => {
          const userId = typeof t.userId === 'object' ? t.userId._id : t.userId;
          return getTimerKey(taskId, userId) === key;
        });
        if (!stillExists) {
          keysToRemove.push(key);
        }
      }
    });

    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => timersRef.current.delete(key));
      hasChanges = true;
    }

    // 2. Thêm hoặc cập nhật timer từ server về client
    activeTimers.forEach((timer: any) => {
      const userId = typeof timer.userId === 'object' ? timer.userId._id : timer.userId;
      const userName = typeof timer.userId === 'object' ? timer.userId.name : undefined;
      const userAvatar = typeof timer.userId === 'object' ? timer.userId.avatar : undefined;

      if (userId) {
        const key = getTimerKey(taskId, userId);
        const existingTimer = timersRef.current.get(key);

        if (!existingTimer) {
          timersRef.current.set(key, {
            taskId,
            taskTitle: task.title || 'Task',
            startTime: new Date(timer.startTime),
            userId,
            userName,
            userAvatar
          });
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setVersion(v => v + 1);
      notifySubscribers();
    }
  }, [getTimerKey, notifySubscribers]);

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
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

// --- Hook Real-time UI Update ---
// Hook này dùng trong component React Native để cập nhật số giây mỗi giây
export function useTimerElapsed(taskId: string): number {
  const { getActiveTimer, getElapsedTime, subscribeToTimerUpdates } = useTimer();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set giá trị ngay lập tức
    setElapsed(getElapsedTime(taskId));

    // Cập nhật mỗi giây
    intervalRef.current = setInterval(() => {
      setElapsed(getElapsedTime(taskId));
    }, 1000);
  }, [taskId, getElapsedTime]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsed(0);
  }, []);

  useEffect(() => {
    // 1. Check ngay khi mount
    const timer = getActiveTimer(taskId);
    if (timer) {
      startInterval();
    }

    // 2. Lắng nghe sự kiện start/stop từ context
    const unsubscribe = subscribeToTimerUpdates(() => {
      const currentTimer = getActiveTimer(taskId);
      if (currentTimer) {
        startInterval();
      } else {
        stopInterval();
      }
    });

    // 3. Cleanup khi unmount
    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId, getActiveTimer, subscribeToTimerUpdates, startInterval, stopInterval]);

  return elapsed;
}