import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket'; // Đã được sửa cho RN
import { Task } from '../types/task.types'; // Giả định Task type đã sẵn sàng

// --- INTERFACES (Giữ nguyên) ---

export interface TaskRealtimeEvent {
  eventKey: string;
  task?: Task | null;
  taskId?: string | null;
  groupId?: string | null;
  meta?: Record<string, any>;
  rawPayload: unknown;
}

interface TaskRealtimeHandlers {
  onTaskCreated?: (event: TaskRealtimeEvent) => void;
  onTaskUpdated?: (event: TaskRealtimeEvent) => void;
  onTaskDeleted?: (event: TaskRealtimeEvent) => void;
}

const EVENT_NAMES = {
  created: 'tasks:task.created',
  updated: 'tasks:task.updated',
  deleted: 'tasks:task.deleted'
} as const;

// --- UTILS (Giữ nguyên logic Web, chỉ sửa lỗi Implicit Any) ---

const coerceTaskId = (task: Task | any, fallback?: string | null): string | null => {
  if (!task) {
    return fallback ?? null;
  }

  const explicitId = task._id || task.id;
  if (!explicitId) {
    return fallback ?? null;
  }

  return typeof explicitId === 'string' ? explicitId : explicitId.toString();
};

const extractEvent = (
  incoming: any, // Sử dụng any để xử lý payload không xác định
  eventKey: string
): TaskRealtimeEvent => {
  const payload = incoming?.payload ?? incoming ?? {};
  const task: Task | undefined = payload.task;

  // Lấy Task ID (Giữ nguyên logic)
  const taskId: string | null =
    typeof payload.taskId === 'string'
      ? payload.taskId
      : payload.taskId
      ? payload.taskId.toString()
      : coerceTaskId(task, null);

  // Lấy Group ID (Giữ nguyên logic)
  const groupId =
    typeof payload.groupId === 'string'
      ? payload.groupId
      : payload.groupId
      ? payload.groupId.toString()
      : task?.groupId && typeof task.groupId === 'object'
      ? (task.groupId as any)._id?.toString?.() ?? task.groupId?.toString?.()
      : typeof task?.groupId === 'string'
      ? task.groupId
      : null;

  return {
    eventKey,
    task,
    taskId,
    groupId,
    meta: payload.meta ?? {},
    rawPayload: incoming
  };
};

// --- CUSTOM HOOK (Giữ nguyên logic Socket Listener) ---

export function useTaskRealtime(handlers: TaskRealtimeHandlers = {}) {
  // socket hiện có type là any | null (theo fix lỗi useSocket trước đó)
  const { socket } = useSocket(); 
  const handlerRef = useRef<TaskRealtimeHandlers>(handlers);

  // Cập nhật ref mỗi khi handlers thay đổi (để dùng trong useEffect không phụ thuộc)
  useEffect(() => {
    handlerRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    // Không cần thay đổi vì socket.on/off hoạt động trên RN Socket.IO client
    if (!socket) {
      return;
    }

    const handleCreated = (incoming: any) => {
      const event = extractEvent(incoming, 'task.created');
      handlerRef.current.onTaskCreated?.(event);
    };

    const handleUpdated = (incoming: any) => {
      const event = extractEvent(incoming, 'task.updated');
      handlerRef.current.onTaskUpdated?.(event);
    };

    const handleDeleted = (incoming: any) => {
      const event = extractEvent(incoming, 'task.deleted');
      handlerRef.current.onTaskDeleted?.(event);
    };

    // Đăng ký listeners
    socket.on(EVENT_NAMES.created, handleCreated);
    socket.on(EVENT_NAMES.updated, handleUpdated);
    socket.on(EVENT_NAMES.deleted, handleDeleted);

    // Hàm dọn dẹp
    return () => {
      socket.off(EVENT_NAMES.created, handleCreated);
      socket.off(EVENT_NAMES.updated, handleUpdated);
      socket.off(EVENT_NAMES.deleted, handleDeleted);
    };
  }, [socket]);
}