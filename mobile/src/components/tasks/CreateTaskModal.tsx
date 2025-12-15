import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';


interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateTask: (taskData: any) => void;
  currentUser?: any;
  initialDueDate?: Date;
}

export default function CreateTaskModal({
  visible,
  onClose,
  onCreateTask,
  currentUser,
  initialDueDate,
}: CreateTaskModalProps) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Enhanced options
  const categoryOptions = [
    {
      value: 'Operational',
      label: 'Operational',
      color: '#2563eb',
      bgColor: '#dbeafe'
    },
    {
      value: 'Strategic',
      label: 'Strategic',
      color: '#059669',
      bgColor: '#d1fae5'
    },
    {
      value: 'Financial',
      label: 'Financial',
      color: '#d97706',
      bgColor: '#fef3c7'
    },
    {
      value: 'Technical',
      label: 'Technical',
      color: '#7c3aed',
      bgColor: '#ede9fe'
    },
    { 
      value: 'Other', 
      label: 'Other', 
      color: '#6b7280', 
      bgColor: '#f3f4f6' 
    },
  ];

  const priorityOptions = [
    {
      value: 'None',
      label: 'None',
      color: '#6b7280',
      bgColor: '#f3f4f6'
    },
    {
      value: 'Low',
      label: 'Low',
      color: '#059669',
      bgColor: '#d1fae5'
    },
    {
      value: 'Medium',
      label: 'Medium',
      color: '#d97706',
      bgColor: '#fef3c7'
    },
    {
      value: 'High',
      label: 'High',
      color: '#ea580c',
      bgColor: '#ffedd5'
    },
    {
      value: 'Urgent',
      label: 'Urgent',
      color: '#dc2626',
      bgColor: '#fee2e2'
    },
  ];

  const estimatedTimeOptions = [
    { value: '15m', label: '15 minutes' },
    { value: '30m', label: '30 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '2h', label: '2 hours' },
    { value: '4h', label: '4 hours' },
    { value: '1d', label: '1 day' },
    { value: '2d', label: '2 days' },
    { value: '1w', label: '1 week' },
  ];

  // Set initial due date when modal opens
  useEffect(() => {
    if (visible && initialDueDate) {
      const dateString = initialDueDate.toISOString().split('T')[0];
      setDueDate(dateString);
    }
  }, [visible, initialDueDate]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setPriority('Medium');
    setDueDate('');
    setTags('');
    setEstimatedTime('');
    setErrors({});
    setIsSubmitting(false);
    setShowCategoryDropdown(false);
    setShowPriorityDropdown(false);
    setShowTimeDropdown(false);
  };

  const validateForm = () => {
    const newErrors: { title?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Task title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        category: category || 'Other',
        priority,
        dueDate: dueDate || null,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        estimatedTime: estimatedTime || '',
      };

      console.log('Creating task with data:', taskData);
      await onCreateTask(taskData);

      // Close modal after successful creation
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
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
    return today.toISOString().split('T')[0];
  };

  const getSelectedCategory = () => {
    return categoryOptions.find(opt => opt.value === category) || categoryOptions[4];
  };

  const getSelectedPriority = () => {
    return priorityOptions.find(opt => opt.value === priority) || priorityOptions[2];
  };

  const renderDropdown = (options: any[], selectedValue: string, onSelect: (value: string) => void, isVisible: boolean, onToggle: (visible: boolean) => void) => {
    if (!isVisible) return null;

    return (
      <View style={[styles.dropdown, isDark && styles.darkDropdown]}>
        <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dropdownItem,
                selectedValue === option.value && styles.dropdownItemSelected,
                isDark && styles.darkDropdownItem
              ]}
              onPress={() => {
                onSelect(option.value);
                onToggle(false);
              }}
            >
              <View style={[
                styles.radioIndicator,
                selectedValue === option.value && styles.radioIndicatorSelected
              ]}>
                {selectedValue === option.value && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={[
                styles.dropdownText,
                isDark && styles.darkText,
                selectedValue === option.value && styles.dropdownTextSelected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, isDark && styles.darkHeader]}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, isDark && styles.darkText]}>
                Create New Task
              </Text>
              <Text style={[styles.subtitle, isDark && styles.darkSubtitle]}>
                Add a new task to your project
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeButton, isDark && styles.darkCloseButton]}
            >
              <Ionicons name="close" size={24} color={isDark ? '#e5e7eb' : '#6b7280'} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <View style={styles.labelWithIcon}>
                  <Feather name="bookmark" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                  <Text style={[styles.label, isDark && styles.darkText]}>
                    Task Title *
                  </Text>
                </View>
                {errors.title && (
                  <View style={styles.errorRow}>
                    <Feather name="alert-circle" size={14} color="#dc2626" />
                    <Text style={styles.errorText}>{errors.title}</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[
                  styles.input,
                  errors.title && styles.inputError,
                  isDark && styles.darkInput
                ]}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) {
                    setErrors({ ...errors, title: undefined });
                  }
                }}
                placeholder="What needs to be done?"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                multiline={true}
                numberOfLines={2}
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <View style={styles.labelWithIcon}>
                <Feather name="user" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                <Text style={[styles.label, isDark && styles.darkText]}>
                  Description
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textArea,
                  isDark && styles.darkInput
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the task in detail..."
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Category and Priority */}
            <View style={styles.row}>
              {/* Category */}
              <View style={styles.halfSection}>
                <View style={styles.labelWithIcon}>
                  <Feather name="flag" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                  <Text style={[styles.label, isDark && styles.darkText]}>
                    Type
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    isDark && styles.darkInput
                  ]}
                  onPress={() => {
                    setShowCategoryDropdown(!showCategoryDropdown);
                    setShowPriorityDropdown(false);
                    setShowTimeDropdown(false);
                  }}
                >
                  <View style={[
                    styles.categoryBadge,
                    { backgroundColor: getSelectedCategory().bgColor }
                  ]}>
                    <Text style={[
                      styles.categoryText,
                      { color: getSelectedCategory().color }
                    ]}>
                      {getSelectedCategory().label}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>

                {renderDropdown(
                  categoryOptions,
                  category,
                  setCategory,
                  showCategoryDropdown,
                  setShowCategoryDropdown
                )}
              </View>

              {/* Priority */}
              <View style={styles.halfSection}>
                <View style={styles.labelWithIcon}>
                  <Feather name="flag" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                  <Text style={[styles.label, isDark && styles.darkText]}>
                    Priority
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    isDark && styles.darkInput
                  ]}
                  onPress={() => {
                    setShowPriorityDropdown(!showPriorityDropdown);
                    setShowCategoryDropdown(false);
                    setShowTimeDropdown(false);
                  }}
                >
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getSelectedPriority().bgColor }
                  ]}>
                    <Text style={[
                      styles.priorityText,
                      { color: getSelectedPriority().color }
                    ]}>
                      {getSelectedPriority().label}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>

                {renderDropdown(
                  priorityOptions,
                  priority,
                  setPriority,
                  showPriorityDropdown,
                  setShowPriorityDropdown
                )}
              </View>
            </View>

            {/* Due Date and Estimated Time */}
            <View style={styles.row}>
              {/* Due Date */}
              <View style={styles.halfSection}>
                <View style={styles.labelWithIcon}>
                  <Feather name="calendar" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                  <Text style={[styles.label, isDark && styles.darkText]}>
                    Due Date
                  </Text>
                </View>
                <View style={[styles.inputWithIcon, isDark && styles.darkInput]}>
                  <Feather name="calendar" size={18} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.input,
                      isDark && styles.darkText,
                      styles.dateInput
                    ]}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="Select date"
                    placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                  />
                </View>
              </View>

              {/* Estimated Time */}
              <View style={styles.halfSection}>
                <View style={styles.labelWithIcon}>
                  <Feather name="clock" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                  <Text style={[styles.label, isDark && styles.darkText]}>
                    Time
                  </Text>
                </View>
                
                <View style={styles.timeInputRow}>
                  <View style={[styles.inputWithIcon, isDark && styles.darkInput, styles.flex1]}>
                    <Feather name="clock" size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={[
                        styles.input,
                        isDark && styles.darkText
                      ]}
                      value={estimatedTime}
                      onChangeText={setEstimatedTime}
                      placeholder="2h 30m"
                      placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.timeDropdown, isDark && styles.darkInput]}
                    onPress={() => {
                      setShowTimeDropdown(!showTimeDropdown);
                      setShowCategoryDropdown(false);
                      setShowPriorityDropdown(false);
                    }}
                  >
                    <Text style={[styles.timeDropdownText, isDark && styles.darkText]}>
                      Quick
                    </Text>
                    <Feather name="chevron-down" size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                  </TouchableOpacity>

                  {showTimeDropdown && (
                    <View style={[styles.timeDropdownMenu, isDark && styles.darkDropdown]}>
                      <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                        {estimatedTimeOptions.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.dropdownItem,
                              isDark && styles.darkDropdownItem
                            ]}
                            onPress={() => {
                              setEstimatedTime(option.value);
                              setShowTimeDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownText,
                              isDark && styles.darkText
                            ]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <View style={styles.labelWithIcon}>
                <Feather name="tag" size={18} color={isDark ? '#e5e7eb' : '#374151'} />
                <Text style={[styles.label, isDark && styles.darkText]}>
                  Tags
                </Text>
              </View>
              <View style={[styles.inputWithIcon, isDark && styles.darkInput]}>
                <Feather name="tag" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.darkText
                  ]}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="urgent, important, project-x"
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                />
              </View>
              <Text style={[styles.helperText, isDark && styles.darkSubtitle]}>
                Separate tags with commas
              </Text>
            </View>

            {/* Auto-assign Notice */}
            {currentUser && (
              <View style={[
                styles.userCard,
                isDark && styles.darkUserCard
              ]}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitial}>
                    {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[
                    styles.userTitle,
                    isDark && styles.darkText
                  ]}>
                    You will be assigned as the task creator
                  </Text>
                  <Text style={[
                    styles.userSubtitle,
                    isDark && styles.darkSubtitle
                  ]}>
                    {currentUser.name} • {currentUser.email}
                  </Text>
                  <Text style={[
                    styles.userNote,
                    isDark && styles.darkSubtitle
                  ]}>
                    You can add or change assignees later in the task details
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.footer, isDark && styles.darkFooter]}>
            <TouchableOpacity
              style={[styles.cancelButton, isDark && styles.darkCancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[
                styles.cancelButtonText,
                isDark && styles.darkText
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.createButton,
                (!title.trim() || isSubmitting) && styles.createButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.createButtonText}>
                  Create Task
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  darkContainer: {
    backgroundColor: '#1a202c',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkHeader: {
    borderBottomColor: '#374151',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  darkText: {
    color: '#f7fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  darkSubtitle: {
    color: '#a0aec0',
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
  },
  darkCloseButton: {
    backgroundColor: '#2d3748',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfSection: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#ffffff',
  },
  darkInput: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
    color: '#f7fafc',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  darkDropdown: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  darkDropdownItem: {
    backgroundColor: '#2d3748',
  },
  dropdownItemSelected: {
    backgroundColor: '#f3f4f6',
  },
  radioIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioIndicatorSelected: {
    borderColor: '#3b82f6',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownTextSelected: {
    fontWeight: '600',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  timeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    minWidth: 80,
  },
  timeDropdownText: {
    fontSize: 14,
    color: '#374151',
  },
  timeDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    left: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
    zIndex: 1000,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  darkUserCard: {
    backgroundColor: '#1e3a8a',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  userNote: {
    fontSize: 11,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  darkFooter: {
    backgroundColor: '#2d3748',
    borderTopColor: '#374151',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  darkCancelButton: {
    backgroundColor: '#4a5568',
    borderColor: '#6b7280',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  createButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});