"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Calendar,
  Flag,
  Clock,
  Tag,
  User,
  Bookmark,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (taskData: any) => void;
  currentUser?: any;
  initialDueDate?: Date;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onCreateTask,
  currentUser,
  initialDueDate,
}: CreateTaskModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Set initial due date when modal opens
  useEffect(() => {
    if (isOpen && initialDueDate) {
      const dateString = initialDueDate.toISOString().split('T')[0];
      const timeString = initialDueDate.toTimeString().split(' ')[0].substring(0, 5);
      setDueDate(dateString);
      // You might want to add a time field if needed
    }
  }, [isOpen, initialDueDate]);

  // Enhanced options
  const categoryOptions = [
    {
      value: "Operational",
      label: "Operational",
      color: "text-blue-600 bg-blue-50",
    },
    {
      value: "Strategic",
      label: "Strategic",
      color: "text-green-600 bg-green-50",
    },
    {
      value: "Financial",
      label: "Financial",
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      value: "Technical",
      label: "Technical",
      color: "text-purple-600 bg-purple-50",
    },
    { value: "Other", label: "Other", color: "text-gray-600 bg-gray-50" },
  ];

  const priorityOptions = [
    {
      value: "None",
      label: "None",
      color: "text-gray-500",
      bgColor: "bg-gray-100",
    },
    {
      value: "Low",
      label: "Low",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      value: "Medium",
      label: "Medium",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      value: "High",
      label: "High",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      value: "Urgent",
      label: "Urgent",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  const estimatedTimeOptions = [
    { value: "15m", label: "15 minutes" },
    { value: "30m", label: "30 minutes" },
    { value: "1h", label: "1 hour" },
    { value: "2h", label: "2 hours" },
    { value: "4h", label: "4 hours" },
    { value: "1d", label: "1 day" },
    { value: "2d", label: "2 days" },
    { value: "1w", label: "1 week" },
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setPriority("Medium");
    setDueDate("");
    setTags("");
    setEstimatedTime("");
    setErrors({});
    setIsSubmitting(false);
  };

  const validateForm = () => {
    const newErrors: { title?: string } = {};

    if (!title.trim()) {
      newErrors.title = "Task title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        category: category || "Other",
        priority,
        dueDate: dueDate || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        estimatedTime: estimatedTime || "",
      };

      console.log("Creating task with data:", taskData);
      await onCreateTask(taskData);

      // Close modal after successful creation
      handleClose();
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-8 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-[#1F1F1F]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('tasks.createTask')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('tasks.createTaskDesc')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <Bookmark className="w-4 h-4" />
                  {t('tasks.taskName')} *
                </label>
                {errors.title && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    {errors.title}
                  </span>
                )}
              </div>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) {
                    setErrors({ ...errors, title: undefined });
                  }
                }}
                className={`w-full p-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.title
                    ? "border-red-300 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                }`}
                placeholder="What needs to be done?"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                <User className="w-4 h-4" />
                {t('tasks.description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder={t('tasks.descriptionPlaceholder')}
              />
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  <Flag className="w-4 h-4" />
                  {t('tasks.category')}
                </label>
                <div className="space-y-2">
                  {categoryOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                        category === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={option.value}
                        checked={category === option.value}
                        onChange={(e) => setCategory(e.target.value)}
                        className="hidden"
                      />
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          category === option.value
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${option.color} px-2 py-1 rounded-full`}
                      >
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  <Flag className="w-4 h-4" />
                  {t('tasks.priority')}
                </label>
                <div className="space-y-2">
                  {priorityOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                        priority === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={option.value}
                        checked={priority === option.value}
                        onChange={(e) => setPriority(e.target.value)}
                        className="hidden"
                      />
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          priority === option.value
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${option.color} ${option.bgColor} px-3 py-1 rounded-full border`}
                      >
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Due Date and Estimated Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  <Calendar className="w-4 h-4" />
                  {t('tasks.dueDate')}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={getMinDate()}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Estimated Time */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  <Clock className="w-4 h-4" />
                  {t('tasks.estimatedTime')}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="e.g., 2h 30m"
                    />
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setEstimatedTime(e.target.value);
                      }
                    }}
                    className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-w-20"
                  >
                    <option value="">Quick select</option>
                    {estimatedTimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                <Tag className="w-4 h-4" />
                {t('tasks.tags')}
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder={t('tasks.tagsPlaceholder')}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('tasks.tagsHelper')}
              </p>
            </div>

            {/* Auto-assign Notice */}
            {currentUser && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">
                      {currentUser.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                      You will be assigned as the task creator
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      {currentUser.name} • {currentUser.email}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      You can add or change assignees later in the task details
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                t('tasks.createTask')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
