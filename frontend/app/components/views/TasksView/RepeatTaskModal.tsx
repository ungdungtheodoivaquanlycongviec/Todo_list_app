"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { X, Minus, Plus, ChevronDown, Calendar, Clock, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../../../services/types/task.types';
import { useLanguage } from '../../../contexts/LanguageContext';
import EstimatedTimePicker from './EstimatedTimePicker';

interface RepeatTaskModalProps {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: RepeatSettings) => void;
}

export interface RepeatSettings {
    isRepeating: boolean;
    repeatType: 'time-based' | 'after-completion';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    skipWeekends: boolean;
    startingFrom: Date;
    dueDateOption: 'not-set' | 'same-day' | 'next-day' | 'in-2-days' | 'in-3-days' | 'in-4-days' | 'in-5-days' | 'custom';
    dueDateDays: number;
    defaultStatus: 'todo' | 'in_progress';
    estimatedTime: string;
    endType: 'never' | 'on-date' | 'after-occurrences';
    endDate?: Date;
    occurrences?: number;
}

const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Day' },
    { value: 'weekly', label: 'Week' },
    { value: 'monthly', label: 'Month' },
    { value: 'yearly', label: 'Year' },
];

const DUE_DATE_OPTIONS = [
    { value: 'not-set', label: 'Not set', days: 0 },
    { value: 'same-day', label: 'Same day', days: 0 },
    { value: 'next-day', label: 'Next day', days: 1 },
    { value: 'in-2-days', label: 'in 2 days', days: 2 },
    { value: 'in-3-days', label: 'in 3 days', days: 3 },
    { value: 'in-4-days', label: 'in 4 days', days: 4 },
    { value: 'in-5-days', label: 'in 5 days', days: 5 },
    { value: 'custom', label: 'Custom', days: -1, isCustom: true },
];

const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do', icon: '📋' },
    { value: 'in_progress', label: 'In Progress', icon: '🔧' },
];

export default function RepeatTaskModal({ task, isOpen, onClose, onSave }: RepeatTaskModalProps) {
    const { t } = useLanguage();
    const [repeatType, setRepeatType] = useState<'time-based' | 'after-completion'>('time-based');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
    const [interval, setInterval] = useState(1);
    const [skipWeekends, setSkipWeekends] = useState(false);
    const [startingFrom, setStartingFrom] = useState(new Date());
    const [dueDateOption, setDueDateOption] = useState<'not-set' | 'same-day' | 'next-day' | 'in-2-days' | 'in-3-days' | 'in-4-days' | 'in-5-days' | 'custom'>('same-day');
    const [dueDateDays, setDueDateDays] = useState(1);
    const [defaultStatus, setDefaultStatus] = useState<'todo' | 'in_progress'>('in_progress');
    const [estimatedTime, setEstimatedTime] = useState('0h');
    const [endType, setEndType] = useState<'never' | 'on-date' | 'after-occurrences'>('never');
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [occurrences, setOccurrences] = useState(10);

    // Dropdowns state
    const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
    const [showDueDateDropdown, setShowDueDateDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showEndDropdown, setShowEndDropdown] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCustomDueDateModal, setShowCustomDueDateModal] = useState(false);
    const [showEstimatedTimePicker, setShowEstimatedTimePicker] = useState(false);

    // Calendar state for preview
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // Initialize from task repetition settings
    useEffect(() => {
        if (task.repetition) {
            setFrequency(task.repetition.frequency || 'daily');
            setInterval(task.repetition.interval || 1);
            if (task.repetition.endDate) {
                setEndType('on-date');
                setEndDate(new Date(task.repetition.endDate));
            } else if (task.repetition.occurrences) {
                setEndType('after-occurrences');
                setOccurrences(task.repetition.occurrences);
            }
        }
        if (task.estimatedTime) {
            setEstimatedTime(task.estimatedTime);
        }
        if (task.dueDate) {
            setStartingFrom(new Date(task.dueDate));
        }
    }, [task]);

    // Get display label for due date
    const getDueDateDisplayLabel = () => {
        if (dueDateOption === 'custom') {
            return `in ${dueDateDays} days`;
        }
        return DUE_DATE_OPTIONS.find(d => d.value === dueDateOption)?.label || 'Same day';
    };

    // Calculate scheduled repeat dates for calendar preview
    const scheduledDates = useMemo(() => {
        const dates: Date[] = [];
        const currentDate = new Date(startingFrom);
        const maxDates = 50; // Limit for performance

        for (let i = 0; i < maxDates; i++) {
            // Check if date should be skipped (weekends)
            if (skipWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
                // Skip to next weekday
                while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            // Check end conditions
            if (endType === 'on-date' && endDate && currentDate > endDate) break;
            if (endType === 'after-occurrences' && dates.length >= occurrences) break;

            dates.push(new Date(currentDate));

            // Calculate next occurrence
            switch (frequency) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + interval);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + (interval * 7));
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + interval);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + interval);
                    break;
            }
        }

        return dates;
    }, [startingFrom, frequency, interval, skipWeekends, endType, endDate, occurrences]);

    // Calendar helper functions
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];

        // Add empty slots for days before the first of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const isDateScheduled = (year: number, month: number, day: number) => {
        return scheduledDates.some(d =>
            d.getFullYear() === year &&
            d.getMonth() === month &&
            d.getDate() === day
        );
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const handleSave = () => {
        const settings: RepeatSettings = {
            isRepeating: true,
            repeatType,
            frequency,
            interval,
            skipWeekends,
            startingFrom,
            dueDateOption,
            dueDateDays,
            defaultStatus,
            estimatedTime,
            endType,
            endDate,
            occurrences,
        };
        onSave(settings);
        onClose();
    };

    if (!isOpen) return null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentCalendarDays = getDaysInMonth(calendarMonth);
    const nextMonth = new Date(calendarMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextCalendarDays = getDaysInMonth(nextMonth);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
                {/* Left Panel - Settings */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Repeat Type Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4">
                        <button
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${repeatType === 'time-based'
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            onClick={() => setRepeatType('time-based')}
                        >
                            Time-based
                        </button>
                        <button
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${repeatType === 'after-completion'
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            onClick={() => setRepeatType('after-completion')}
                        >
                            After completion
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        {repeatType === 'time-based'
                            ? 'Creates a new task on a specific date, regardless of previous task completion'
                            : 'Creates a new task after the current task is completed'}
                    </p>

                    {/* Repeat Every */}
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Repeat every
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setInterval(Math.max(1, interval - 1))}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{interval}</span>
                            <button
                                onClick={() => setInterval(interval + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                <Plus className="w-4 h-4" />
                            </button>

                            {/* Frequency Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-w-[100px]"
                                >
                                    <span>{FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label}</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                {showFrequencyDropdown && (
                                    <div className="absolute top-full right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                        {FREQUENCY_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${frequency === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                                    }`}
                                                onClick={() => {
                                                    setFrequency(option.value as any);
                                                    setShowFrequencyDropdown(false);
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Skip Weekends */}
                    <div className="flex items-center mb-6">
                        <input
                            type="checkbox"
                            id="skipWeekends"
                            checked={skipWeekends}
                            onChange={(e) => setSkipWeekends(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="skipWeekends" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Skip weekends
                        </label>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-6" />

                    {/* Starting From */}
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Starting from
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-w-[140px]"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(startingFrom)}</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            {showDatePicker && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-3">
                                    <input
                                        type="date"
                                        value={startingFrom.toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            setStartingFrom(new Date(e.target.value));
                                            setShowDatePicker(false);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Due date
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setShowDueDateDropdown(!showDueDateDropdown)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-w-[140px]"
                            >
                                <span>{getDueDateDisplayLabel()}</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            {showDueDateDropdown && (
                                <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                                    {DUE_DATE_OPTIONS.map((option, index) => (
                                        <React.Fragment key={option.value}>
                                            {option.isCustom && (
                                                <div className="border-t border-gray-200 dark:border-gray-700" />
                                            )}
                                            <button
                                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${dueDateOption === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                                    }`}
                                                onClick={() => {
                                                    if (option.isCustom) {
                                                        setShowDueDateDropdown(false);
                                                        setShowCustomDueDateModal(true);
                                                    } else {
                                                        setDueDateOption(option.value as any);
                                                        setShowDueDateDropdown(false);
                                                    }
                                                }}
                                            >
                                                {option.isCustom && <Settings className="w-4 h-4" />}
                                                {option.label}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Default Status */}
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Default status
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-w-[140px]"
                            >
                                <Settings className="w-4 h-4" />
                                <span>{STATUS_OPTIONS.find(s => s.value === defaultStatus)?.label}</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            {showStatusDropdown && (
                                <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                    {STATUS_OPTIONS.map(option => (
                                        <button
                                            key={option.value}
                                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${defaultStatus === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                                }`}
                                            onClick={() => {
                                                setDefaultStatus(option.value as any);
                                                setShowStatusDropdown(false);
                                            }}
                                        >
                                            <span>{option.icon}</span>
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Estimated Time - using EstimatedTimePicker */}
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Estimated time
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setShowEstimatedTimePicker(!showEstimatedTimePicker)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-w-[140px]"
                            >
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span>{estimatedTime || '0h'}</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            {showEstimatedTimePicker && (
                                <div className="absolute top-full right-0 mt-1 z-20">
                                    <EstimatedTimePicker
                                        value={estimatedTime}
                                        onSave={(value) => {
                                            setEstimatedTime(value);
                                            setShowEstimatedTimePicker(false);
                                        }}
                                        onClose={() => setShowEstimatedTimePicker(false)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ends */}
                    <div className="flex items-center justify-between mb-6">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Ends
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setShowEndDropdown(!showEndDropdown)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-w-[140px]"
                            >
                                <span>
                                    {endType === 'never' ? 'Never' : endType === 'on-date' ? formatDate(endDate || new Date()) : `After ${occurrences} times`}
                                </span>
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            {showEndDropdown && (
                                <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-2">
                                    <button
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${endType === 'never' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                            }`}
                                        onClick={() => {
                                            setEndType('never');
                                            setShowEndDropdown(false);
                                        }}
                                    >
                                        Never
                                    </button>
                                    <button
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${endType === 'on-date' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                            }`}
                                        onClick={() => {
                                            setEndType('on-date');
                                            setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days from now
                                        }}
                                    >
                                        On date...
                                    </button>
                                    {endType === 'on-date' && (
                                        <input
                                            type="date"
                                            value={endDate?.toISOString().split('T')[0] || ''}
                                            onChange={(e) => setEndDate(new Date(e.target.value))}
                                            className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                    <button
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${endType === 'after-occurrences' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                                            }`}
                                        onClick={() => setEndType('after-occurrences')}
                                    >
                                        After occurrences...
                                    </button>
                                    {endType === 'after-occurrences' && (
                                        <div className="flex items-center gap-2 mt-2 px-3">
                                            <input
                                                type="number"
                                                value={occurrences}
                                                onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                                                min={1}
                                                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-sm text-gray-500">times</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>

                {/* Right Panel - Calendar Preview */}
                <div className="w-80 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Scheduled repeats
                    </h3>

                    {/* Current Month Calendar */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={() => {
                                    const prev = new Date(calendarMonth);
                                    prev.setMonth(prev.getMonth() - 1);
                                    setCalendarMonth(prev);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                            </span>
                            <button
                                onClick={() => {
                                    const next = new Date(calendarMonth);
                                    next.setMonth(next.getMonth() + 1);
                                    setCalendarMonth(next);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <div key={i} className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {currentCalendarDays.map((day, i) => (
                                <div key={i} className="aspect-square flex items-center justify-center">
                                    {day && (
                                        <div
                                            className={`w-7 h-7 flex items-center justify-center text-xs rounded-full ${isDateScheduled(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
                                                ? 'bg-blue-500 text-white'
                                                : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {day}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Next Month Calendar */}
                    <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                            {monthNames[nextMonth.getMonth()]} {nextMonth.getFullYear()}
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <div key={i} className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {nextCalendarDays.map((day, i) => (
                                <div key={i} className="aspect-square flex items-center justify-center">
                                    {day && (
                                        <div
                                            className={`w-7 h-7 flex items-center justify-center text-xs rounded-full ${isDateScheduled(nextMonth.getFullYear(), nextMonth.getMonth(), day)
                                                ? 'bg-blue-500 text-white'
                                                : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {day}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Due Date Modal */}
            {showCustomDueDateModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowCustomDueDateModal(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-80 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Set due date
                        </h3>

                        <div className="flex items-center justify-between mb-6">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                In days
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setDueDateDays(Math.max(1, dueDateDays - 1))}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-8 text-center font-medium text-gray-900 dark:text-white">{dueDateDays}</span>
                                <button
                                    onClick={() => setDueDateDays(dueDateDays + 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCustomDueDateModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setDueDateOption('custom');
                                    setShowCustomDueDateModal(false);
                                }}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
