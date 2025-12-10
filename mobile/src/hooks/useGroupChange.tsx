"use client"

import { useEffect, useRef, useCallback, useState } from 'react';

// Types
type GroupChangeCallback = () => void;
type UnsubscribeFunction = () => void;

// Global event system for group changes - Optimized for mobile
class GroupChangeEventEmitter {
  private listeners: Set<GroupChangeCallback> = new Set();
  private isEmitting: boolean = false;

  subscribe(callback: GroupChangeCallback): UnsubscribeFunction {
    this.listeners.add(callback);
    
    // Return cleanup function
    return () => {
      // Use setTimeout to avoid modifying during emission
      setTimeout(() => {
        this.listeners.delete(callback);
      }, 0);
    };
  }

  emit(): void {
    // Prevent recursive emissions
    if (this.isEmitting) {
      console.warn('GroupChangeEmitter: Recursive emission detected');
      return;
    }

    this.isEmitting = true;
    
    try {
      // Convert to array to avoid iteration issues
      const callbacks = Array.from(this.listeners);
      
      // Use requestAnimationFrame for better mobile performance
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          callbacks.forEach(callback => {
            try {
              callback();
            } catch (error) {
              console.error('GroupChangeEmitter: Error in listener:', error);
            }
          });
        });
      } else {
        // Fallback for non-browser environments
        callbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('GroupChangeEmitter: Error in listener:', error);
          }
        });
      }
    } finally {
      this.isEmitting = false;
    }
  }

  getListenerCount(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Single instance for the app
export const groupChangeEmitter = new GroupChangeEventEmitter();

// Hook to listen for group changes - Mobile optimized
export function useGroupChange(onGroupChange: GroupChangeCallback, dependencies: any[] = []): void {
  const callbackRef = useRef<GroupChangeCallback>(onGroupChange);
  
  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = onGroupChange;
  }, [onGroupChange, ...dependencies]);

  // Stable callback with mobile optimizations
  const handleGroupChange = useCallback(() => {
    // Use requestIdleCallback for better mobile performance when possible
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        callbackRef.current();
      });
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        callbackRef.current();
      }, 0);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = groupChangeEmitter.subscribe(handleGroupChange);
    
    // Cleanup on unmount
    return () => {
      // Use setTimeout for cleanup to avoid blocking UI
      setTimeout(unsubscribe, 0);
    };
  }, [handleGroupChange]);
}

// Debounced trigger for mobile - prevents multiple rapid taps
export function triggerGroupChange(): void {
  // Use requestAnimationFrame for better performance
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      groupChangeEmitter.emit();
    });
  } else {
    groupChangeEmitter.emit();
  }
}

// Enhanced debounced version for mobile interactions
let debounceTimeout: NodeJS.Timeout | null = null;
export function triggerGroupChangeDebounced(delay: number = 300): void {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  
  debounceTimeout = setTimeout(() => {
    triggerGroupChange();
    debounceTimeout = null;
  }, delay);
}

// Mobile-optimized hook with touch feedback
export function useGroupChangeWithFeedback(
  onGroupChange: GroupChangeCallback, 
  options: {
    vibration?: boolean;
    visualFeedback?: boolean;
    dependencies?: any[];
  } = {}
): void {
  const { vibration = false, visualFeedback = true, dependencies = [] } = options;
  
  const enhancedCallback = useCallback(async () => {
    // Visual feedback (could be integrated with your UI)
    if (visualFeedback) {
      // Add active state to buttons or other visual indicators
      document.documentElement.classList.add('group-changing');
      setTimeout(() => {
        document.documentElement.classList.remove('group-changing');
      }, 300);
    }
    
    // Haptic feedback for mobile devices
    if (vibration && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50); // Short vibration
      } catch (error) {
        // Vibration not supported or failed
      }
    }
    
    // Execute the original callback
    await onGroupChange();
  }, [onGroupChange, vibration, visualFeedback]);

  useGroupChange(enhancedCallback, dependencies);
}

// Hook for components that need to show loading states during group changes
export function useGroupChangeLoading(): boolean {
  const [isLoading, setIsLoading] = useState(false);
  
  useGroupChange(() => {
    setIsLoading(true);
    
    // Auto hide loading after 3 seconds (fallback)
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    return () => clearTimeout(timeout);
  });

  return isLoading;
}

// Mobile-specific debug utility
export function useGroupChangeMobileDebug(name: string = 'Component'): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [GroupChange] ${name} registered listener`);
      
      const unsubscribe = groupChangeEmitter.subscribe(() => {
        console.log(`📱 [GroupChange] ${name} received update`);
        
        // Mobile-specific debug info
        if ('connection' in navigator) {
          const conn = (navigator as any).connection;
          if (conn) {
            console.log(`📱 Network: ${conn.effectiveType}, SaveData: ${conn.saveData}`);
          }
        }
      });

      return () => {
        unsubscribe();
        console.log(`📱 [GroupChange] ${name} unregistered listener`);
      };
    }
  }, [name]);
}

// Reset function for mobile testing
export function resetGroupChangeEmitter(): void {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
  groupChangeEmitter.clear();
}