import { useEffect, useRef } from 'react';

// Global event system for group changes
class GroupChangeEventEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit() {
    this.listeners.forEach(callback => callback());
  }
}

export const groupChangeEmitter = new GroupChangeEventEmitter();

// Hook to listen for group changes and trigger reload
export function useGroupChange(onGroupChange: () => void) {
  const callbackRef = useRef(onGroupChange);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onGroupChange;
  }, [onGroupChange]);

  useEffect(() => {
    const unsubscribe = groupChangeEmitter.subscribe(() => {
      callbackRef.current();
    });

    return unsubscribe;
  }, []);
}

// Function to trigger group change event
export function triggerGroupChange() {
  groupChangeEmitter.emit();
}
