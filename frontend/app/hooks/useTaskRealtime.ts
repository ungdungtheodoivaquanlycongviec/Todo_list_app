import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { Task } from '../services/types/task.types';

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

const coerceTaskId = (task: Task | any, fallback?: string | null) => {
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
  incoming: any,
  eventKey: string
): TaskRealtimeEvent => {
  const payload = incoming?.payload ?? incoming ?? {};
  const task: Task | undefined = payload.task;
  const taskId: string | null =
    typeof payload.taskId === 'string'
      ? payload.taskId
      : payload.taskId
      ? payload.taskId.toString()
      : coerceTaskId(task, null);

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

export function useTaskRealtime(handlers: TaskRealtimeHandlers = {}) {
  const { socket } = useSocket();
  const handlerRef = useRef<TaskRealtimeHandlers>(handlers);

  useEffect(() => {
    handlerRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
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

    socket.on(EVENT_NAMES.created, handleCreated);
    socket.on(EVENT_NAMES.updated, handleUpdated);
    socket.on(EVENT_NAMES.deleted, handleDeleted);

    return () => {
      socket.off(EVENT_NAMES.created, handleCreated);
      socket.off(EVENT_NAMES.updated, handleUpdated);
      socket.off(EVENT_NAMES.deleted, handleDeleted);
    };
  }, [socket]);
}

