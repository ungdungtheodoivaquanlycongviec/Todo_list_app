"use client"

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';
import { User } from '../services/types/auth.types';
import { ArrowLeft } from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header - KHÔNG CÓ BORDER Ở ĐÂY */}
      <div className="bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Main Content - TOÀN BỘ CHIỀU RỘNG */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="h-full flex">
          {/* CONTAINER CHÍNH - CÓ BORDER TRÁI ĐỂ THẲNG HÀNG VỚI SIDEBAR */}
          <div className="flex-1 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            {/* Tab Headers - TOÀN BỘ CHIỀU RỘNG */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 py-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  My Profile
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`flex-1 py-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'preferences'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Preferences
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 py-4 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'security'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Security
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
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

// My Profile Tab Component - GIỮ NGUYÊN
interface TabProps {
  user: User;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  message: string;
  setMessage: (message: string) => void;
}

function MyProfileTab({ user, loading, setLoading, message, setMessage }: TabProps) {
  const { updateUser } = useAuth(); // THÊM HOOK NÀY
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
      
      // CẬP NHẬT USER TRONG AUTH CONTEXT - QUAN TRỌNG
      await updateUser({ name, avatar });
      
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
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
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Personal Information</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Update your personal information and avatar.
      </p>

      <div className="mt-6 flex flex-col lg:flex-row">
        <div className="flex-grow space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div className="mt-1">
              <input
                type="email"
                id="email"
                value={email}
                disabled
                className="block w-full shadow-sm sm:text-sm bg-gray-100 border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-600 dark:text-gray-300"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email cannot be changed
            </p>
          </div>

          {/* Avatar Field */}
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Avatar URL
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                disabled={!isEditing}
                className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit
                </button>
              ) : (
                <div className="space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(user.name);
                      setAvatar(user.avatar || '');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsDeleting(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Account
            </button>
          </div>

          {/* Confirmation for Delete */}
          {isDeleting && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-300">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="mt-2 space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button
                  onClick={() => setIsDeleting(false)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className={`mt-4 text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>

        {/* Avatar Preview */}
        <div className="mt-6 flex-grow-0 lg:mt-0 lg:ml-6">
          <div className="mt-1 lg:mt-0">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Avatar Preview</span>
            <div className="mt-2">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt="Avatar Preview" 
                  className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-2 border-gray-400 dark:border-gray-500">
                  <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                    {getInitials(user.name)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preferences Tab Component - GIỮ NGUYÊN
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

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Preferences</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Manage your application preferences and display settings.
      </p>

      <div className="mt-6 space-y-6">
        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
          <div className="mt-2 flex items-center space-x-4">
            {(['light', 'dark', 'auto'] as ThemeType[]).map((option) => (
              <div key={option} className="flex items-center">
                <input
                  id={`theme-${option}`}
                  name="theme"
                  type="radio"
                  checked={theme === option}
                  onChange={() => handleThemeChange(option)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <label
                  htmlFor={`theme-${option}`}
                  className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Time Zone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Zone
          </label>
          <select
            id="timezone"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="UTC-12:00">UTC-12:00</option>
            <option value="UTC-07:00">UTC-07:00 (Pacific Time)</option>
            <option value="UTC-06:00">UTC-06:00 (Central Time)</option>
            <option value="UTC-05:00">UTC-05:00 (Eastern Time)</option>
            <option value="UTC+00:00">UTC+00:00 (GMT)</option>
            <option value="UTC+01:00">UTC+01:00 (Central European)</option>
            <option value="UTC+08:00">UTC+08:00 (China Standard)</option>
            <option value="UTC+09:00">UTC+09:00 (Japan Standard)</option>
          </select>
        </div>

        {/* Date Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Format</label>
          <div className="mt-2 flex items-center space-x-4">
            {[
              { value: 'DD MMM YYYY', label: '31 Dec 2025' },
              { value: 'MMM DD, YYYY', label: 'Dec 31, 2025' },
              { value: 'DD/MM/YYYY', label: '31/12/2025' },
              { value: 'MM/DD/YYYY', label: '12/31/2025' }
            ].map((format) => (
              <div key={format.value} className="flex items-center">
                <input
                  id={`date-${format.value}`}
                  name="dateFormat"
                  type="radio"
                  checked={dateFormat === format.value}
                  onChange={() => setDateFormat(format.value)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <label
                  htmlFor={`date-${format.value}`}
                  className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {format.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Time Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Format</label>
          <div className="mt-2 flex items-center space-x-4">
            {[
              { value: '12h', label: '12 hours (8:00 PM)' },
              { value: '24h', label: '24 hours (20:00)' }
            ].map((format) => (
              <div key={format.value} className="flex items-center">
                <input
                  id={`time-${format.value}`}
                  name="timeFormat"
                  type="radio"
                  checked={timeFormat === format.value}
                  onChange={() => setTimeFormat(format.value)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <label
                  htmlFor={`time-${format.value}`}
                  className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {format.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Week Start */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Week Starts On</label>
          <div className="mt-2 flex items-center space-x-4">
            {['monday', 'sunday'].map((day) => (
              <div key={day} className="flex items-center">
                <input
                  id={`week-${day}`}
                  name="weekStart"
                  type="radio"
                  checked={weekStart === day}
                  onChange={() => setWeekStart(day)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <label
                  htmlFor={`week-${day}`}
                  className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize"
                >
                  {day}
                </label>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// Security Tab Component - GIỮ NGUYÊN
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
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

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Change Password</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Update your password to keep your account secure.
      </p>

      <form onSubmit={handleChangePassword} className="mt-6 space-y-6">
        <div>
          <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Password
          </label>
          <div className="mt-1">
            <input
              type="password"
              id="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </label>
          <div className="mt-1">
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Password must be at least 8 characters long
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm New Password
          </label>
          <div className="mt-1">
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="block w-full shadow-sm sm:text-sm focus:ring-blue-500 focus:border-blue-500 border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>

        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}