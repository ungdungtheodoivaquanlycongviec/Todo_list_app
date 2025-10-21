"use client";

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { User } from '../services/types/auth.types';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Settings, 
  Shield, 
  Camera,
  Bell,
  Palette,
  Globe,
  Eye,
  EyeOff,
  Check,
  Upload,
  Trash2
} from 'lucide-react';

interface ProfileSettingsProps {
  onClose?: () => void;
}

type ThemeType = 'light' | 'dark' | 'auto';

export default function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { user, updateUserTheme } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1A1A1A]">
      {/* Header - CHIẾM TOÀN BỘ CHIỀU RỘNG */}
      <div className="bg-white dark:bg-[#1F1F1F] border-b border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onClose}
              className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Account Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your profile, preferences, and security settings
              </p>
            </div>
          </div>

          {/* Tab Navigation - CHIẾM TOÀN BỘ CHIỀU RỘNG */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-[#2E2E2E] rounded-2xl p-1 w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - CHIẾM TOÀN BỘ CHIỀU RỘNG, CĂN TRÁI */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#1A1A1A]">
        <div className="w-full p-8">
          <div className="bg-white dark:bg-[#1F1F1F] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 w-full">
            <div className="p-8 w-full">
              {activeTab === 'profile' && (
                <MyProfileTab 
                  user={user}
                  loading={loading}
                  setLoading={setLoading}
                  message={message}
                  setMessage={setMessage}
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
                />
              )}
              {activeTab === 'security' && (
                <SecurityTab 
                  loading={loading}
                  setLoading={setLoading}
                  message={message}
                  setMessage={setMessage}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MyProfileTab - CHIẾM TOÀN BỘ CHIỀU RỘNG, CĂN TRÁI
function MyProfileTab({ user, loading, setLoading, message, setMessage }: any) {
  const { updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      let updatedUser;
      
      // If there's a new avatar file, upload it first
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/me/avatar/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          let errorMessage = 'Failed to upload avatar'
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.message || errorMessage
          } catch (parseError) {
            errorMessage = `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
          }
          throw new Error(errorMessage);
        }

        let uploadResult
        try {
          uploadResult = await uploadResponse.json();
        } catch (parseError) {
          throw new Error('Invalid response from server');
        }
        updatedUser = await userService.updateProfile({ name, avatar: uploadResult.data.user.avatar });
      } else {
        // Just update name and avatar URL
        updatedUser = await userService.updateProfile({ name, avatar });
      }
      
      setMessage('Profile updated successfully');
      setIsEditing(false);
      await updateUser({ name, avatar: updatedUser.avatar });
    } catch (error: any) {
      setMessage(error.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await userService.deactivateAccount();
      window.location.href = '/';
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error deleting account');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header - CĂN TRÁI */}
      <div className="text-left w-full">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Information</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Update your personal details and profile picture
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Avatar Section - CHIẾM TOÀN BỘ CHIỀU RỘNG TRÊN MOBILE */}
        <div className="w-full lg:w-1/3">
          <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-2xl p-6 w-full">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 text-left">Profile Picture</h3>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {avatarPreview || avatar ? (
                  <img 
                    src={avatarPreview || avatar} 
                    alt="Avatar Preview" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-[#1F1F1F] shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white dark:border-[#1F1F1F] shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {getInitials(user.name)}
                    </span>
                  </div>
                )}
                
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-blue-600 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                )}
              </div>

              {isEditing && (
                <div className="text-center w-full">
                  <label className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 justify-center">
                    <Upload className="w-4 h-4" />
                    Upload new photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    JPG, PNG or GIF. Max 5MB.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Section - CHIẾM TOÀN BỘ CHIỀU RỘNG */}
        <div className="w-full lg:w-2/3">
          <div className="space-y-6 w-full">
            <div className="grid grid-cols-1 gap-6 w-full">
              {/* Name Field */}
              <div className="w-full">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 text-left"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field */}
              <div className="w-full">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-[#2E2E2E] text-gray-500 dark:text-gray-400 focus:outline-none cursor-not-allowed text-left"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-left">
                  Contact support to change your email address
                </p>
              </div>
            </div>

            {/* Action Buttons - CĂN TRÁI */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 gap-4 w-full">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md w-full sm:w-auto text-center"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center gap-2 justify-center w-full sm:w-auto"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setName(user.name);
                        setAvatar(user.avatar || '');
                        setAvatarPreview('');
                      }}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all w-full sm:w-auto text-center"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsDeleting(true)}
                className="px-6 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>

            {/* Delete Confirmation */}
            {isDeleting && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 w-full">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                      Delete Account
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 w-full sm:w-auto"
                      >
                        {loading ? 'Deleting...' : 'Yes, delete my account'}
                      </button>
                      <button
                        onClick={() => setIsDeleting(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-gray-500 w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-xl w-full text-left ${
                message.includes('Error') 
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                  : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
}

function PreferencesTab({ user, updateUserTheme, loading, setLoading, message, setMessage }: PreferencesTabProps) {
  const [theme, setTheme] = useState<ThemeType>(user.theme as ThemeType || 'light');
  const [timeZone, setTimeZone] = useState('UTC-07:00');
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [weekStart, setWeekStart] = useState('monday');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    desktop: false
  });

  const handleThemeChange = async (newTheme: ThemeType) => {
    setLoading(true);
    setMessage('');
    try {
      await updateUserTheme(newTheme);
      setTheme(newTheme);
      setMessage('Theme updated successfully');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error updating theme');
    } finally {
      setLoading(false);
    }
  };

  const preferenceSections = [
    {
      title: "Appearance",
      icon: Palette,
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
      title: "Regional",
      icon: Globe,
      fields: [
        {
          label: "Time Zone",
          description: "Set your local time zone",
          type: "select" as const,
          options: [
            'UTC-12:00', 'UTC-07:00 (Pacific Time)', 'UTC-06:00 (Central Time)',
            'UTC-05:00 (Eastern Time)', 'UTC+00:00 (GMT)', 'UTC+01:00 (Central European)',
            'UTC+08:00 (China Standard)', 'UTC+09:00 (Japan Standard)'
          ],
          value: timeZone,
          onChange: setTimeZone
        },
        {
          label: "Date Format",
          description: "Choose how dates are displayed",
          type: "radio" as const,
          options: [
            { value: 'DD MMM YYYY', label: '31 Dec 2025' },
            { value: 'MMM DD, YYYY', label: 'Dec 31, 2025' },
            { value: 'DD/MM/YYYY', label: '31/12/2025' },
            { value: 'MM/DD/YYYY', label: '12/31/2025' }
          ],
          value: dateFormat,
          onChange: setDateFormat
        },
        {
          label: "Time Format",
          description: "Choose how time is displayed",
          type: "radio" as const,
          options: [
            { value: '12h', label: '12 hours (8:00 PM)' },
            { value: '24h', label: '24 hours (20:00)' }
          ],
          value: timeFormat,
          onChange: setTimeFormat
        },
        {
          label: "Week Starts On",
          description: "First day of the week",
          type: "radio" as const,
          options: [
            { value: 'monday', label: 'Monday' },
            { value: 'sunday', label: 'Sunday' }
          ],
          value: weekStart,
          onChange: setWeekStart
        }
      ]
    },
    {
      title: "Notifications",
      icon: Bell,
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
          description: "Receive browser notifications",
          type: "toggle" as const,
          value: notifications.push,
          onChange: (value: boolean) => setNotifications(prev => ({ ...prev, push: value }))
        },
        {
          label: "Desktop Notifications",
          description: "Show desktop notifications",
          type: "toggle" as const,
          value: notifications.desktop,
          onChange: (value: boolean) => setNotifications(prev => ({ ...prev, desktop: value }))
        }
      ]
    }
  ];

  return (
    <div className="space-y-8 w-full">
      <div className="text-left w-full">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Customize your application experience
        </p>
      </div>

      <div className="space-y-6 w-full">
        {preferenceSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-gray-50 dark:bg-[#2E2E2E] rounded-2xl p-6 w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{section.title}</h3>
              </div>

              <div className="space-y-6 w-full">
                {section.fields.map((field, index) => (
                  <div key={index} className="flex items-center justify-between w-full">
                    <div className="flex-1 text-left">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        {field.label}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {field.description}
                      </p>
                    </div>
                    
                    <div className="ml-4">
                      {field.type === 'radio' && (
                        <div className="flex gap-4">
                          {field.options.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={field.label}
                                value={option.value}
                                checked={field.value === option.value}
                                onChange={() => field.onChange(option.value as ThemeType)}
                                className="hidden"
                              />
                              <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                                field.value === option.value
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {field.value === option.value && (
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                )}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === 'select' && (
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1F1F1F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === 'toggle' && (
                        <button
                          onClick={() => field.onChange(!field.value)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            field.value 
                              ? 'bg-blue-500' 
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              field.value ? 'transform translate-x-7' : 'transform translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <div className={`p-4 rounded-xl w-full text-left ${
          message.includes('Error') 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}

// SecurityTab Component
interface SecurityTabProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  message: string;
  setMessage: (message: string) => void;
}

function SecurityTab({ loading, setLoading, message, setMessage }: SecurityTabProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setMessage(error.response?.data?.message || 'Error changing password');
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
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 text-left"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-8 w-full">
      <div className="text-left w-full">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security Settings</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your password and account security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Change Password Form */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-2xl p-6 w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 text-left">
              Change Password
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Current Password
                </label>
                <PasswordInput
                  value={oldPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  showPassword={showOldPassword}
                  setShowPassword={setShowOldPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  New Password
                </label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  showPassword={showNewPassword}
                  setShowPassword={setShowNewPassword}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-left">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Confirm New Password
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  showPassword={showConfirmPassword}
                  setShowPassword={setShowConfirmPassword}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Security Tips */}
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-3" />
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2 text-left">
              Password Tips
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 text-left">
              <li>• Use at least 8 characters</li>
              <li>• Include numbers and symbols</li>
              <li>• Avoid common words</li>
              <li>• Don't reuse passwords</li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-2xl p-6">
            <Shield className="w-6 h-6 text-gray-600 dark:text-gray-400 mb-3" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 text-left">
              Last Changed
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 text-left">
              Your password was last changed 2 months ago
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl w-full text-left ${
          message.includes('Error') 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}