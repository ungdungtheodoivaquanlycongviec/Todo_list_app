"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    icon?: 'delete' | 'warning' | 'none';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        // Fallback to native confirm if outside provider
        return {
            confirm: async (options: ConfirmOptions) => window.confirm(options.message)
        };
    }
    return context;
}

interface ConfirmDialogProps {
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmDialog({ isOpen, options, onConfirm, onCancel }: ConfirmDialogProps) {
    if (!isOpen) return null;

    const {
        title = 'Xác nhận',
        message,
        confirmText = 'Xác nhận',
        cancelText = 'Hủy',
        variant = 'danger',
        icon = 'warning'
    } = options;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: 'bg-red-100 dark:bg-red-900/30',
                    iconColor: 'text-red-600 dark:text-red-400',
                    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                };
            case 'warning':
                return {
                    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
                    iconColor: 'text-yellow-600 dark:text-yellow-400',
                    buttonBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
                };
            case 'info':
                return {
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
                };
            default:
                return {
                    iconBg: 'bg-red-100 dark:bg-red-900/30',
                    iconColor: 'text-red-600 dark:text-red-400',
                    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                };
        }
    };

    const styles = getVariantStyles();

    const renderIcon = () => {
        if (icon === 'none') return null;

        const IconComponent = icon === 'delete' ? Trash2 : AlertTriangle;

        return (
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
                <IconComponent className={`h-6 w-6 ${styles.iconColor}`} aria-hidden="true" />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl transition-all w-full max-w-md">
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-6">
                        <div className="flex flex-col items-center text-center">
                            {renderIcon()}

                            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                                {title}
                            </h3>

                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${styles.buttonBg}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const resolveRef = useRef<((value: boolean) => void) | undefined>(undefined);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        setOptions(opts);
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        resolveRef.current?.(true);
    }, []);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        resolveRef.current?.(false);
    }, []);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <ConfirmDialog
                isOpen={isOpen}
                options={options}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
}
