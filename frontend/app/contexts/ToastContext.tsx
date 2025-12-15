"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string) => void;
    showWarning: (message: string, title?: string) => void;
    showInfo: (message: string, title?: string) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Helper hook that provides a safe toast that won't throw if no provider exists
export function useSafeToast() {
    const context = useContext(ToastContext);

    const fallback: ToastContextType = {
        showToast: (message) => { alert(message); },
        showSuccess: (message) => { alert(message); },
        showError: (message) => { alert(message); },
        showWarning: (message) => { alert(message); },
        showInfo: (message) => { alert(message); },
        removeToast: () => { },
    };

    return context || fallback;
}

// Toast component for individual toast rendering
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    const bgColors = {
        success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
        info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    };

    const titleColors = {
        success: 'text-green-800 dark:text-green-200',
        error: 'text-red-800 dark:text-red-200',
        warning: 'text-yellow-800 dark:text-yellow-200',
        info: 'text-blue-800 dark:text-blue-200',
    };

    return (
        <div
            className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
        animate-in slide-in-from-right-5 fade-in duration-300
        ${bgColors[toast.type]}
        min-w-[320px] max-w-[450px]
      `}
        >
            <div className="flex-shrink-0 mt-0.5">
                {icons[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
                {toast.title && (
                    <p className={`font-semibold text-sm mb-1 ${titleColors[toast.type]}`}>
                        {toast.title}
                    </p>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {toast.message}
                </p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((
        message: string,
        type: ToastType = 'info',
        title?: string,
        duration: number = 5000
    ) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newToast: Toast = {
            id,
            type,
            title,
            message,
            duration,
        };

        setToasts((prev) => [...prev, newToast]);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const showSuccess = useCallback((message: string, title?: string) => {
        showToast(message, 'success', title || 'Thành công');
    }, [showToast]);

    const showError = useCallback((message: string, title?: string) => {
        showToast(message, 'error', title || 'Lỗi', 8000); // Errors stay longer
    }, [showToast]);

    const showWarning = useCallback((message: string, title?: string) => {
        showToast(message, 'warning', title || 'Cảnh báo');
    }, [showToast]);

    const showInfo = useCallback((message: string, title?: string) => {
        showToast(message, 'info', title);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, removeToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onRemove={removeToast} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
