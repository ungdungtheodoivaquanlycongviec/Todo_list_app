"use client";

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { userService } from '../services/user.service';
import { User, Language } from '../services/types/auth.types';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Settings, 
  Shield, 
  Camera,
  Bell,
  Palette,
  Globe,
  Languages,
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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: UserIcon },
    { id: 'preferences', label: t('settings.preferences'), icon: Settings },
    { id: 'security', label: t('settings.security'), icon: Shield }
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
                {t('accountSettings.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('accountSettings.description')}
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
  const { t } = useLanguage();
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
      
      setMessage(t('profile.updated'));
      setIsEditing(false);
      await updateUser({ name, avatar: updatedUser.avatar });
    } catch (error: any) {
      setMessage(error.message || t('error.generic'));
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('profile.personalInfo')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('profile.personalInfoDesc')}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Avatar Section - CHIẾM TOÀN BỘ CHIỀU RỘNG TRÊN MOBILE */}
        <div className="w-full lg:w-1/3">
          <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-2xl p-6 w-full">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 text-left">{t('profile.profilePicture')}</h3>
            
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
                    {t('profile.uploadPhoto')}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('profile.photoRequirements')}
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
                  {t('profile.fullName')}
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 text-left"
                  placeholder={t('profile.enterFullName')}
                />
              </div>

              {/* Email Field */}
              <div className="w-full">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  {t('profile.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-[#2E2E2E] text-gray-500 dark:text-gray-400 focus:outline-none cursor-not-allowed text-left"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-left">
                  {t('profile.emailChangeNote')}
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
                    {t('profile.editProfile')}
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
                          {t('accountSettings.saving')}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {t('profile.saveChanges')}
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
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsDeleting(true)}
                className="px-6 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-4 h-4" />
                {t('profile.deleteAccount')}
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
                      {t('profile.deleteConfirmTitle')}
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      {t('profile.deleteConfirmMessage')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 w-full sm:w-auto"
                      >
                        {loading ? t('accountSettings.deleting') : t('profile.deleteConfirmButton')}
                      </button>
                      <button
                        onClick={() => setIsDeleting(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-gray-500 w-full sm:w-auto"
                      >
                        {t('common.cancel')}
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
  const { updateUser } = useAuth();
  const { language, setLanguage: setLanguageContext, t } = useLanguage();
  const [theme, setTheme] = useState<ThemeType>(user.theme as ThemeType || 'light');
  const [timeZone, setTimeZone] = useState((user as any).regionalPreferences?.timeZone || 'UTC+00:00');
  const [dateFormat, setDateFormat] = useState((user as any).regionalPreferences?.dateFormat || 'DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState((user as any).regionalPreferences?.timeFormat || '24h');
  const [weekStart, setWeekStart] = useState((user as any).regionalPreferences?.weekStart || 'monday');
  const [notifications, setNotifications] = useState({
    email: (user as any).notificationSettings?.email ?? true,
    push: (user as any).notificationSettings?.push ?? true,
    desktop: false
  });

  const handleLanguageChange = async (newLanguage: Language) => {
    try {
      setLoading(true);
      setMessage('');
      await setLanguageContext(newLanguage);
      setMessage(t('language.updated'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error updating language');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = async (key: 'email' | 'push' | 'desktop', value: boolean) => {
    try {
      setLoading(true);
      setMessage('');
      
      // Update notification preferences via API
      const { notificationService } = await import('../services/notification.service');
      await notificationService.updatePreferences({ [key]: value });
      
      setNotifications(prev => ({ ...prev, [key]: value }));
      setMessage(t('notifications.updated'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newTheme: ThemeType) => {
    setLoading(true);
    setMessage('');
    try {
      await updateUserTheme(newTheme);
      setTheme(newTheme);
      setMessage(t('theme.updated'));
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegionalPreferenceChange = async (preference: 'timeZone' | 'dateFormat' | 'timeFormat' | 'weekStart', value: string) => {
    try {
      setLoading(true);
      setMessage('');
      
      const updatedUser = await userService.updateRegionalPreferences({ [preference]: value });
      await updateUser(updatedUser);
      
      // Update local state
      if (preference === 'timeZone') setTimeZone(value);
      else if (preference === 'dateFormat') setDateFormat(value);
      else if (preference === 'timeFormat') setTimeFormat(value);
      else if (preference === 'weekStart') setWeekStart(value);
      
      setMessage(t('regional.updated'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const preferenceSections = [
    {
      title: t('settings.language'),
      icon: Languages,
      fields: [
        {
          label: t('settings.language'),
          description: t('language.description'),
          type: "radio" as const,
          options: [
            { value: 'en', label: 'English' },
            { value: 'vi', label: 'Tiếng Việt' }
          ],
          value: language,
          onChange: handleLanguageChange
        }
      ]
    },
    {
      title: t('settings.appearance'),
      icon: Palette,
      fields: [
        {
          label: t('settings.appearance'),
          description: t('theme.description'),
          type: "radio" as const,
          options: [
            { value: 'light', label: t('theme.light') },
            { value: 'dark', label: t('theme.dark') },
            { value: 'auto', label: t('theme.auto') }
          ],
          value: theme,
          onChange: handleThemeChange
        }
      ]
    },
    {
      title: t('settings.regional'),
      icon: Globe,
      fields: [
        {
          label: t('regional.timezone'),
          description: t('regional.timezoneDesc'),
          type: "select" as const,
          options: [
            { value: 'UTC-12:00', label: 'UTC-12:00' },
            { value: 'UTC-07:00', label: 'UTC-07:00 (Pacific Time)' },
            { value: 'UTC-06:00', label: 'UTC-06:00 (Central Time)' },
            { value: 'UTC-05:00', label: 'UTC-05:00 (Eastern Time)' },
            { value: 'UTC+00:00', label: 'UTC+00:00 (GMT)' },
            { value: 'UTC+01:00', label: 'UTC+01:00 (Central European)' },
            { value: 'UTC+07:00', label: 'UTC+07:00 (Vietnam)' },
            { value: 'UTC+08:00', label: 'UTC+08:00 (China Standard)' },
            { value: 'UTC+09:00', label: 'UTC+09:00 (Japan Standard)' }
          ],
          value: timeZone,
          onChange: setTimeZone
        },
        {
          label: t('regional.dateFormat'),
          description: t('regional.dateFormatDesc'),
          type: "radio" as const,
          options: [
            { value: 'DD MMM YYYY', label: '31 Dec 2025' },
            { value: 'MMM DD, YYYY', label: 'Dec 31, 2025' },
            { value: 'DD/MM/YYYY', label: '31/12/2025' },
            { value: 'MM/DD/YYYY', label: '12/31/2025' },
            { value: 'YYYY-MM-DD', label: '2025-12-31' }
          ],
          value: dateFormat,
          onChange: setDateFormat
        },
        {
          label: t('regional.timeFormat'),
          description: t('regional.timeFormatDesc'),
          type: "radio" as const,
          options: [
            { value: '12h', label: t('regional.12hour') + ' (8:00 PM)' },
            { value: '24h', label: t('regional.24hour') + ' (20:00)' }
          ],
          value: timeFormat,
          onChange: setTimeFormat
        },
        {
          label: t('regional.weekStart'),
          description: t('regional.weekStartDesc'),
          type: "radio" as const,
          options: [
            { value: 'monday', label: t('regional.monday') },
            { value: 'sunday', label: t('regional.sunday') }
          ],
          value: weekStart,
          onChange: setWeekStart
        }
      ]
    },
    {
      title: t('notifications.title'),
      icon: Bell,
      fields: [
        {
          label: t('notifications.email'),
          description: t('notifications.emailDesc'),
          type: "toggle" as const,
          value: notifications.email,
          onChange: (value: boolean) => setNotifications(prev => ({ ...prev, email: value }))
        },
        {
          label: t('notifications.push'),
          description: t('notifications.pushDesc'),
          type: "toggle" as const,
          value: notifications.push,
          onChange: (value: boolean) => setNotifications(prev => ({ ...prev, push: value }))
        },
        {
          label: t('notifications.desktop'),
          description: t('notifications.desktopDesc'),
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('preferences.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('preferences.description')}
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
                                onChange={async () => {
                                  const newValue = option.value;
                                  
                                  // Handle language preference
                                  if (field.label === t('settings.language')) {
                                    await handleLanguageChange(newValue as Language);
                                    return;
                                  }
                                  
                                  // Handle theme
                                  if (field.label === t('settings.appearance')) {
                                    (field.onChange as (value: string) => void)(newValue);
                                    return;
                                  }
                                  
                                  // Handle regional preferences
                                  (field.onChange as (value: string) => void)(newValue);
                                  if (field.label === t('regional.dateFormat')) {
                                    await handleRegionalPreferenceChange('dateFormat', newValue);
                                  } else if (field.label === t('regional.timeFormat')) {
                                    await handleRegionalPreferenceChange('timeFormat', newValue);
                                  } else if (field.label === t('regional.weekStart')) {
                                    await handleRegionalPreferenceChange('weekStart', newValue);
                                  }
                                }}
                                disabled={loading}
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
                          onChange={(e) => {
                            const newValue = e.target.value;
                            field.onChange(newValue);
                            if (field.label === 'Time Zone') {
                              handleRegionalPreferenceChange('timeZone', newValue);
                            }
                          }}
                          disabled={loading}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1F1F1F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {field.options.map((option) => {
                            const optionValue = typeof option === 'string' ? option : option.value;
                            const optionLabel = typeof option === 'string' ? option : option.label;
                            return (
                              <option key={optionValue} value={optionValue}>
                                {optionLabel}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      {field.type === 'toggle' && (
                        <button
                          onClick={async () => {
                            const newValue = !field.value;
                            field.onChange(newValue);
                            
                            // Handle notification preferences
                            if (field.label === 'Email Notifications') {
                              await handleNotificationChange('email', newValue);
                            } else if (field.label === 'Push Notifications') {
                              await handleNotificationChange('push', newValue);
                            }
                          }}
                          disabled={loading}
                          className={`w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
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
  const { t } = useLanguage();
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
      setMessage(t('security.passwordMismatch'));
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setMessage(t('security.passwordMinLength'));
      setLoading(false);
      return;
    }

    try {
      await userService.changePassword(oldPassword, newPassword);
      setMessage(t('security.passwordChanged'));
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('security.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('security.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Change Password Form */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-2xl p-6 w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 text-left">
              {t('security.changePassword')}
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  {t('security.currentPassword')}
                </label>
                <PasswordInput
                  value={oldPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPassword(e.target.value)}
                  placeholder={t('security.enterCurrentPassword')}
                  showPassword={showOldPassword}
                  setShowPassword={setShowOldPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  {t('security.newPassword')}
                </label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  placeholder={t('security.enterNewPassword')}
                  showPassword={showNewPassword}
                  setShowPassword={setShowNewPassword}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-left">
                  {t('security.passwordMinLength')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  {t('security.confirmPassword')}
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  placeholder={t('security.confirmNewPassword')}
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
                    {t('security.updatingPassword')}
                  </>
                ) : (
                  t('security.updatePassword')
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
              {t('security.passwordTips')}
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 text-left">
              <li>• {t('security.tipMinChars')}</li>
              <li>• {t('security.tipNumbers')}</li>
              <li>• {t('security.tipCommon')}</li>
              <li>• {t('security.tipReuse')}</li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-2xl p-6">
            <Shield className="w-6 h-6 text-gray-600 dark:text-gray-400 mb-3" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 text-left">
              {t('security.lastChanged')}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 text-left">
              {t('security.lastChangedInfo', { time: '2 months' })}
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