import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Switch,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';

import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { User } from '../types/auth.types';
import { useTheme } from '../context/ThemeContext';

interface ProfileSettingsProps {
  visible: boolean;
  onClose?: () => void;
}

type ThemeType = 'light' | 'dark' | 'auto';

export default function ProfileSettings({ visible, onClose }: ProfileSettingsProps) {
  const { user, updateUserTheme } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: 'person' },
    { id: 'preferences', label: 'Preferences', icon: 'settings' },
    { id: 'security', label: 'Security', icon: 'shield-checkmark' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={[styles.header, isDark && styles.darkHeader]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#d1d5db' : '#374151'} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, isDark && styles.darkText]}>
                Account Settings
              </Text>
              <Text style={[styles.headerSubtitle, isDark && styles.darkSubtext]}>
                Manage your profile, preferences, and security
              </Text>
            </View>
          </View>

          {/* Tab Navigation */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabContainer}
          >
            <View style={[styles.tabs, isDark && styles.darkTabs]}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id as any)}
                  style={[
                    styles.tab,
                    activeTab === tab.id && styles.activeTab,
                    isDark && styles.darkTab,
                    activeTab === tab.id && isDark && styles.activeDarkTab,
                  ]}
                >
                  <Ionicons 
                    name={tab.icon as any} 
                    size={16} 
                    color={
                      activeTab === tab.id 
                        ? (isDark ? '#ffffff' : '#111827')
                        : (isDark ? '#9ca3af' : '#6b7280')
                    } 
                  />
                  <Text style={[
                    styles.tabText,
                    activeTab === tab.id && styles.activeTabText,
                    isDark && styles.darkTabText,
                    activeTab === tab.id && isDark && styles.activeDarkTabText,
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.content}>
          <View style={styles.contentInner}>
            {activeTab === 'profile' && (
              <MyProfileTab 
                user={user}
                loading={loading}
                setLoading={setLoading}
                message={message}
                setMessage={setMessage}
                isDark={isDark}
              />
            )}
            {activeTab === 'preferences' && (
              <PreferencesTab 
                user={user}
                updateUserTheme={updateUserTheme}
                loading={loading}
                setLoading={setLoading}
                message={message}
                setMessage={setMessage}
                isDark={isDark}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab 
                loading={loading}
                setLoading={setLoading}
                message={message}
                setMessage={setMessage}
                isDark={isDark}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// MyProfileTab Component
function MyProfileTab({ user, loading, setLoading, message, setMessage, isDark }: any) {
  const { updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const updatedUser = await userService.updateProfile({ name, avatar });
      setMessage('Profile updated successfully');
      setIsEditing(false);
      await updateUser({ name, avatar: updatedUser.avatar });
    } catch (error: any) {
      setMessage(error.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await userService.deactivateAccount();
              // Handle logout and redirect
            } catch (error: any) {
              setMessage(error.message || 'Error deleting account');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.tabContent}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          Personal Information
        </Text>
        <Text style={[styles.sectionSubtitle, isDark && styles.darkSubtext]}>
          Update your personal details
        </Text>
      </View>

      {/* Avatar Section */}
      <View style={[styles.avatarSection, isDark && styles.darkSection]}>
        <Text style={[styles.avatarTitle, isDark && styles.darkText]}>
          Profile Picture
        </Text>
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {getInitials(user.name)}
              </Text>
            </View>
          )}
          {isEditing && (
            <TouchableOpacity style={styles.cameraButton}>
              <Ionicons name="camera" size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        {/* Name Field */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.darkText]}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.darkInput,
              !isEditing && styles.disabledInput
            ]}
            value={name}
            onChangeText={setName}
            editable={isEditing}
            placeholder="Enter your full name"
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          />
        </View>

        {/* Email Field */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && styles.darkText]}>Email Address</Text>
          <TextInput
            style={[
              styles.input,
              isDark && styles.darkInput,
              styles.disabledInput
            ]}
            value={email}
            editable={false}
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          />
          <Text style={[styles.helperText, isDark && styles.darkSubtext]}>
            Contact support to change your email
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editButtons}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                style={[styles.primaryButton, loading && styles.disabledButton]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsEditing(false);
                  setName(user.name);
                  setAvatar(user.avatar || '');
                }}
                style={styles.secondaryButton}
              >
                <Text style={[styles.secondaryButtonText, isDark && styles.darkText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setIsDeleting(true)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Delete Confirmation */}
        {isDeleting && (
          <View style={[styles.deleteConfirmation, isDark && styles.darkDeleteConfirmation]}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <View style={styles.deleteText}>
              <Text style={styles.deleteTitle}>Delete Account</Text>
              <Text style={[styles.deleteDescription, isDark && styles.darkSubtext]}>
                This action cannot be undone. All your data will be permanently lost.
              </Text>
            </View>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={loading}
                style={[styles.confirmDeleteButton, loading && styles.disabledButton]}
              >
                <Text style={styles.confirmDeleteText}>
                  {loading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsDeleting(false)}
                style={styles.cancelDeleteButton}
              >
                <Text style={[styles.cancelDeleteText, isDark && styles.darkText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Message */}
        {message && (
          <View style={[
            styles.message,
            message.includes('Error') ? styles.errorMessage : styles.successMessage,
            isDark && (message.includes('Error') ? styles.darkErrorMessage : styles.darkSuccessMessage)
          ]}>
            <Text style={[
              styles.messageText,
              message.includes('Error') ? styles.errorMessageText : styles.successMessageText
            ]}>
              {message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// PreferencesTab Component
interface PreferencesTabProps {
  user: User;
  updateUserTheme: (theme: string) => Promise<void>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  message: string;
  setMessage: (message: string) => void;
  isDark: boolean;
}

function PreferencesTab({ user, updateUserTheme, loading, setLoading, message, setMessage, isDark }: PreferencesTabProps) {
  const [theme, setTheme] = useState<ThemeType>((user.theme as ThemeType) || 'light');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    desktop: false
  });

  // Sửa lỗi TypeScript bằng cách kiểm tra type
  const handleThemeChange = async (newTheme: string) => {
    // Kiểm tra xem newTheme có phải là ThemeType hợp lệ không
    if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'auto') {
      setLoading(true);
      setMessage('');
      try {
        await updateUserTheme(newTheme);
        setTheme(newTheme as ThemeType);
        setMessage('Theme updated successfully');
      } catch (error: any) {
        setMessage(error.message || 'Error updating theme');
      } finally {
        setLoading(false);
      }
    }
  };

  const preferenceSections = [
    {
      title: "Appearance",
      icon: "color-palette" as const,
      fields: [
        {
          label: "Theme",
          description: "Choose how the app looks",
          type: "radio" as const,
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'Auto (System)' }
          ],
          value: theme,
          onChange: handleThemeChange
        }
      ]
    },
    {
      title: "Notifications",
      icon: "notifications" as const,
      fields: [
        {
          label: "Email Notifications",
          description: "Receive updates via email",
          type: "toggle" as const,
          value: notifications.email,
          onChange: (value: boolean) => setNotifications(prev => ({ ...prev, email: value }))
        },
        {
          label: "Push Notifications",
          description: "Receive app notifications",
          type: "toggle" as const,
          value: notifications.push,
          onChange: (value: boolean) => setNotifications(prev => ({ ...prev, push: value }))
        },
      ]
    }
  ];

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Preferences</Text>
        <Text style={[styles.sectionSubtitle, isDark && styles.darkSubtext]}>
          Customize your app experience
        </Text>
      </View>

      <View style={styles.preferencesList}>
        {preferenceSections.map((section) => (
          <View key={section.title} style={[styles.preferenceSection, isDark && styles.darkSection]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name={section.icon} size={20} color="#6b7280" />
              <Text style={[styles.preferenceSectionTitle, isDark && styles.darkText]}>
                {section.title}
              </Text>
            </View>

            {section.fields.map((field, index) => (
              <View key={index} style={styles.preferenceField}>
                <View style={styles.preferenceInfo}>
                  <Text style={[styles.preferenceLabel, isDark && styles.darkText]}>
                    {field.label}
                  </Text>
                  <Text style={[styles.preferenceDescription, isDark && styles.darkSubtext]}>
                    {field.description}
                  </Text>
                </View>

                {field.type === 'radio' && (
                  <View style={styles.radioOptions}>
                    {field.options.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => field.onChange(option.value)}
                        style={styles.radioOption}
                      >
                        <View style={[
                          styles.radioCircle,
                          field.value === option.value && styles.radioCircleSelected
                        ]}>
                          {field.value === option.value && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[
                          styles.radioLabel,
                          isDark && styles.darkText,
                          field.value === option.value && styles.radioLabelSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {field.type === 'toggle' && (
                  <Switch
                    value={field.value}
                    onValueChange={field.onChange}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor="#ffffff"
                  />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      {message && (
        <View style={[
          styles.message,
          message.includes('Error') ? styles.errorMessage : styles.successMessage,
          isDark && (message.includes('Error') ? styles.darkErrorMessage : styles.darkSuccessMessage)
        ]}>
          <Text style={[
            styles.messageText,
            message.includes('Error') ? styles.errorMessageText : styles.successMessageText
          ]}>
            {message}
          </Text>
        </View>
      )}
    </View>
  );
}

// SecurityTab Component
interface SecurityTabProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  message: string;
  setMessage: (message: string) => void;
  isDark: boolean;
}

function SecurityTab({ loading, setLoading, message, setMessage, isDark }: SecurityTabProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    setLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await userService.changePassword(oldPassword, newPassword);
      setMessage('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage(error.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ 
    value, 
    onChange, 
    placeholder, 
    showPassword, 
    setShowPassword 
  }: any) => (
    <View style={styles.passwordInput}>
      <TextInput
        style={[styles.input, isDark && styles.darkInput]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
        secureTextEntry={!showPassword}
      />
      <TouchableOpacity
        onPress={() => setShowPassword(!showPassword)}
        style={styles.passwordToggle}
      >
        <Ionicons 
          name={showPassword ? "eye-off" : "eye"} 
          size={20} 
          color={isDark ? '#9ca3af' : '#6b7280'} 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Security</Text>
        <Text style={[styles.sectionSubtitle, isDark && styles.darkSubtext]}>
          Manage your password and security
        </Text>
      </View>

      {/* Change Password Form */}
      <View style={[styles.securitySection, isDark && styles.darkSection]}>
        <Text style={[styles.securityTitle, isDark && styles.darkText]}>
          Change Password
        </Text>

        <View style={styles.passwordForm}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Current Password</Text>
            <PasswordInput
              value={oldPassword}
              onChange={setOldPassword}
              placeholder="Enter current password"
              showPassword={showOldPassword}
              setShowPassword={setShowOldPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>New Password</Text>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter new password"
              showPassword={showNewPassword}
              setShowPassword={setShowNewPassword}
            />
            <Text style={[styles.helperText, isDark && styles.darkSubtext]}>
              Must be at least 8 characters long
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Confirm New Password</Text>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
              showPassword={showConfirmPassword}
              setShowPassword={setShowConfirmPassword}
            />
          </View>

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.disabledButton]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Security Tips */}
      <View style={[styles.tipsSection, isDark && styles.darkSection]}>
        <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
        <Text style={[styles.tipsTitle, isDark && styles.darkText]}>Password Tips</Text>
        <View style={styles.tipsList}>
          <Text style={[styles.tip, isDark && styles.darkSubtext]}>• Use at least 8 characters</Text>
          <Text style={[styles.tip, isDark && styles.darkSubtext]}>• Include numbers and symbols</Text>
          <Text style={[styles.tip, isDark && styles.darkSubtext]}>• Avoid common words</Text>
          <Text style={[styles.tip, isDark && styles.darkSubtext]}>• Don't reuse passwords</Text>
        </View>
      </View>

      {message && (
        <View style={[
          styles.message,
          message.includes('Error') ? styles.errorMessage : styles.successMessage,
          isDark && (message.includes('Error') ? styles.darkErrorMessage : styles.darkSuccessMessage)
        ]}>
          <Text style={[
            styles.messageText,
            message.includes('Error') ? styles.errorMessageText : styles.successMessageText
          ]}>
            {message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 8,
  },
  darkHeader: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#374151',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  tabContainer: {
    paddingHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  darkTabs: {
    backgroundColor: '#2e2e2e',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  darkTab: {
    // Additional dark mode styles
  },
  activeDarkTab: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#111827',
  },
  darkTabText: {
    color: '#9ca3af',
  },
  activeDarkTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  avatarSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  darkSection: {
    backgroundColor: '#2e2e2e',
  },
  avatarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    // Form section styles
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  darkInput: {
    backgroundColor: '#2e2e2e',
    borderColor: '#4b5563',
    color: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  actionButtons: {
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  editButtons: {
    gap: 12,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmation: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  darkDeleteConfirmation: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
  },
  deleteText: {
    marginLeft: 32,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  deleteDescription: {
    fontSize: 14,
    color: '#b91c1c',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cancelDeleteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelDeleteText: {
    fontWeight: '600',
    color: '#374151',
  },
  message: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  successMessage: {
    backgroundColor: '#d1fae5',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
  },
  darkSuccessMessage: {
    backgroundColor: '#064e3b',
  },
  darkErrorMessage: {
    backgroundColor: '#7f1d1d',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  successMessageText: {
    color: '#065f46',
  },
  errorMessageText: {
    color: '#b91c1c',
  },
  // Preferences styles
  preferencesList: {
    gap: 16,
  },
  preferenceSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  preferenceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  preferenceField: {
    marginBottom: 20,
  },
  preferenceInfo: {
    marginBottom: 12,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  radioOptions: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  radioLabel: {
    fontSize: 16,
    color: '#374151',
  },
  radioLabelSelected: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  // Security styles
  securitySection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  passwordForm: {
    gap: 16,
  },
  passwordInput: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  tipsSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  tipsList: {
    width: '100%',
  },
  tip: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  darkText: {
    color: '#f9fafb',
  },
  darkSubtext: {
    color: '#d1d5db',
  },
});