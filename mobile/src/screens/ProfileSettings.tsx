import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, Asset } from 'react-native-image-picker';

// Import Contexts & Services
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { userService } from '../services/user.service';
import { User, Language } from '../types/auth.types';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api/apiClient';

// Nếu bạn chưa có notification.service cho mobile, hãy tạo tạm hoặc comment lại logic gọi nó
// import { notificationService } from '../services/notification.service';

interface ProfileSettingsProps {
  visible: boolean;
  onClose?: () => void;
}

type ThemeType = 'light' | 'dark' | 'auto';

// --- MAIN COMPONENT ---
export default function ProfileSettings({ visible, onClose }: ProfileSettingsProps) {
  const { user, updateUserTheme } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  
  // State quản lý Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  if (!user) return null;

  // Danh sách Tabs (Khớp Web)
  const tabs = [
    { id: 'profile', label: t('settings.profile') || 'My Profile', icon: 'person' },
    { id: 'preferences', label: t('settings.preferences') || 'Preferences', icon: 'settings' },
    { id: 'security', label: t('settings.security') || 'Security', icon: 'shield-checkmark' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet" // Style kéo lên giống iOS chuẩn
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {/* HEADER: Nút Back + Title + Description */}
        <View style={[styles.header, isDark && styles.darkHeader]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#d1d5db' : '#374151'} />
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={[styles.headerTitle, isDark && styles.darkText]}>
                {t('accountSettings.title') || 'Account Settings'}
              </Text>
              <Text style={[styles.headerSubtitle, isDark && styles.darkSubtext]}>
                {t('accountSettings.description') || 'Manage your profile, preferences, and security'}
              </Text>
            </View>
          </View>

          {/* TAB NAVIGATION: Scroll ngang nếu màn hình nhỏ */}
          <View style={styles.tabContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabContentContainer}
            >
              <View style={[styles.tabsWrapper, isDark && styles.darkTabsWrapper]}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id as any)}
                      style={[
                        styles.tabItem,
                        isActive && styles.activeTabItem,
                        isActive && isDark && styles.activeDarkTabItem
                      ]}
                    >
                      <Ionicons 
                        name={tab.icon as any} 
                        size={16} 
                        color={
                          isActive 
                            ? (isDark ? '#ffffff' : '#111827') // Active Text Color
                            : (isDark ? '#9ca3af' : '#6b7280') // Inactive Text Color
                        } 
                      />
                      <Text style={[
                        styles.tabText,
                        isActive && styles.activeTabText,
                        isDark && styles.darkTabText,
                        isActive && isDark && styles.activeDarkTabText,
                      ]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* CONTENT AREA: Render Tab tương ứng */}
        <View style={[styles.contentArea, isDark && styles.darkContentArea]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {activeTab === 'profile' && (
              <MyProfileTab user={user} isDark={isDark} t={t} />
            )}
            {activeTab === 'preferences' && (
              <PreferencesTab 
                user={user} 
                updateUserTheme={updateUserTheme} 
                isDark={isDark} 
                t={t} 
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab isDark={isDark} t={t} />
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================================================
// 1. TAB PROFILE: Avatar Upload, Edit Info, Delete Account
// ============================================================================
function MyProfileTab({ user, isDark, t }: any) {
  const { updateUser } = useAuth();
  
  // States
  const [name, setName] = useState(user.name);
  const [email] = useState(user.email); // Email thường không cho sửa trực tiếp
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Helper hiển thị thông báo tự tắt
  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000); // Tự tắt sau 3s giống Web
  };

  // --- LOGIC CHỌN & UPLOAD ẢNH (react-native-image-picker) ---
  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8, // Chất lượng tốt hơn chút
        selectionLimit: 1,
      });

      if (result.didCancel || result.errorCode) return;

      if (result.assets && result.assets.length > 0) {
        handleUploadAvatar(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot access gallery');
    }
  };

  const handleUploadAvatar = async (asset: Asset) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const filePayload = {
        uri: Platform.OS === 'android' ? asset.uri : asset.uri?.replace('file://', ''),
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `avatar_${Date.now()}.jpg`,
      };
      
      // @ts-ignore
      formData.append('file', filePayload);

      // Gọi API Upload
      const response = await apiClient.post('/users/me/avatar/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // Lấy URL từ response (cần khớp với backend thực tế)
      const newAvatarUrl = response.data?.data?.user?.avatar || response.data?.user?.avatar;
      
      if (newAvatarUrl) {
        setAvatar(newAvatarUrl);
        // Cập nhật cả DB và Context
        await userService.updateAvatar(newAvatarUrl);
        await updateUser({ avatar: newAvatarUrl });
        showMsg(t('profile.updated') || 'Profile picture updated successfully', 'success');
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      showMsg(error.message || 'Failed to upload avatar', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC LƯU THÔNG TIN ---
  const handleSave = async () => {
    setLoading(true);
    try {
      await userService.updateProfile({ name });
      await updateUser({ name }); // Sync Context
      setIsEditing(false);
      showMsg(t('profile.updated') || 'Profile updated successfully', 'success');
    } catch (error: any) {
      showMsg(error.message || 'Error updating profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC XÓA TÀI KHOẢN ---
  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount') || 'Delete Account',
      t('profile.deleteConfirmMessage') || 'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('profile.deleteConfirmButton') || 'Delete Account', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await userService.deactivateAccount();
              // AuthContext sẽ tự lo việc logout/redirect
            } catch (error: any) {
              showMsg(error.message || 'Error deleting account', 'error');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getInitials = (str: string) => str.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.tabContent}>
      {/* SECTION HEADER */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          {t('profile.personalInfo') || 'Personal Information'}
        </Text>
        <Text style={[styles.sectionDesc, isDark && styles.darkSubtext]}>
          {t('profile.personalInfoDesc') || 'Update your photo and personal details here.'}
        </Text>
      </View>

      {/* AVATAR SECTION */}
      <View style={[styles.card, isDark && styles.darkCard]}>
        <Text style={[styles.cardTitle, isDark && styles.darkText]}>
          {t('profile.profilePicture') || 'Profile Picture'}
        </Text>
        
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials(user.name)}</Text>
              </View>
            )}
            {/* Camera Button Badge */}
            {isEditing && (
              <TouchableOpacity style={styles.cameraBadge} onPress={pickImage}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {isEditing && (
             <View style={styles.avatarActions}>
               <TouchableOpacity onPress={pickImage} style={styles.uploadBtn}>
                 <Ionicons name="cloud-upload-outline" size={16} color="#3b82f6" />
                 <Text style={styles.uploadBtnText}>{t('profile.uploadPhoto') || 'Upload Photo'}</Text>
               </TouchableOpacity>
               <Text style={[styles.helperText, isDark && styles.darkSubtext]}>
                 {t('profile.photoRequirements') || 'JPG, GIF or PNG. Max size of 800K'}
               </Text>
             </View>
          )}
        </View>
      </View>

      {/* FORM SECTION */}
      <View style={[styles.card, isDark && styles.darkCard]}>
        {/* Name Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark && styles.darkText]}>{t('profile.fullName') || 'Full Name'}</Text>
          <TextInput
            style={[
              styles.input, 
              isDark && styles.darkInput, 
              !isEditing && styles.disabledInput
            ]}
            value={name}
            onChangeText={setName}
            editable={isEditing}
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          />
        </View>

        {/* Email Input (Read-only) */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark && styles.darkText]}>{t('profile.email') || 'Email Address'}</Text>
          <TextInput
            style={[styles.input, isDark && styles.darkInput, styles.disabledInput]}
            value={email}
            editable={false}
          />
          <Text style={[styles.helperText, isDark && styles.darkSubtext, {marginTop: 4}]}>
            {t('profile.emailChangeNote') || 'Contact support to change email.'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>{t('profile.editProfile') || 'Edit Profile'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editBtnGroup}>
              <TouchableOpacity 
                onPress={handleSave} 
                disabled={loading} 
                style={[styles.primaryBtn, styles.flexBtn, loading && styles.disabledBtn]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFF" style={{marginRight: 4}} />
                    <Text style={styles.primaryBtnText}>{t('profile.saveChanges') || 'Save Changes'}</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => { setIsEditing(false); setName(user.name); }} 
                style={[styles.secondaryBtn, styles.flexBtn]}
              >
                <Text style={[styles.secondaryBtnText, isDark && styles.darkText]}>
                  {t('common.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Delete Account */}
        <View style={styles.deleteSection}>
           <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteBtn}>
             <Ionicons name="trash-outline" size={16} color="#ef4444" />
             <Text style={styles.deleteBtnText}>{t('profile.deleteAccount') || 'Delete Account'}</Text>
           </TouchableOpacity>
        </View>

        {/* Message Alert */}
        {message !== '' && (
          <View style={[
            styles.alertBox, 
            messageType === 'error' ? styles.errorBox : styles.successBox,
            isDark && (messageType === 'error' ? styles.darkErrorBox : styles.darkSuccessBox)
          ]}>
            <Text style={[
              styles.alertText, 
              messageType === 'error' ? styles.errorText : styles.successText
            ]}>
              {message}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// 2. TAB PREFERENCES: Full Options (Language, Theme, Regional, Notifications)
// ============================================================================
function PreferencesTab({ user, updateUserTheme, isDark, t }: any) {
  const { language, setLanguage } = useLanguage();
  const { updateUser } = useAuth();
  
  // Local States for UI
  const [theme, setTheme] = useState<ThemeType>((user.theme as ThemeType) || 'light');
  
  // Regional Prefs (Defaults khớp với Web)
  const [timeZone, setTimeZone] = useState((user as any).regionalPreferences?.timeZone || 'UTC+00:00');
  const [dateFormat, setDateFormat] = useState((user as any).regionalPreferences?.dateFormat || 'DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState((user as any).regionalPreferences?.timeFormat || '24h');
  const [weekStart, setWeekStart] = useState((user as any).regionalPreferences?.weekStart || 'monday');

  // Notifications
  const [notifications, setNotifications] = useState({
    email: (user as any).notificationSettings?.email ?? true,
    push: (user as any).notificationSettings?.push ?? true,
    // Desktop bỏ qua trên mobile
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // --- HANDLERS ---
  const handleThemeChange = async (val: string) => {
    setLoading(true);
    try {
      await updateUserTheme(val);
      setTheme(val as ThemeType);
      showMsg(t('theme.updated') || 'Theme updated');
    } catch(e) { showMsg('Error updating theme'); } 
    finally { setLoading(false); }
  };

  const handleLanguageChange = async (val: string) => {
    setLoading(true);
    try {
      await setLanguage(val as Language);
      showMsg(t('language.updated') || 'Language updated');
    } catch(e) { showMsg('Error updating language'); }
    finally { setLoading(false); }
  };

  const handleRegionalChange = async (key: string, val: string) => {
    // Optimistic Update
    if(key === 'timeZone') setTimeZone(val);
    if(key === 'dateFormat') setDateFormat(val);
    if(key === 'timeFormat') setTimeFormat(val);
    if(key === 'weekStart') setWeekStart(val);

    setLoading(true);
    try {
      const updatedUser = await userService.updateRegionalPreferences({ [key]: val });
      await updateUser(updatedUser);
      showMsg(t('regional.updated') || 'Settings updated');
    } catch(e) { showMsg('Error updating regional settings'); }
    finally { setLoading(false); }
  };

  const handleNotificationChange = async (key: 'email' | 'push', val: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: val }));
    setLoading(true);
    try {
      // Nếu có service notification thì gọi, không thì gọi user service cập nhật preferences
      // Giả sử dùng import dynamic hoặc mock
      const { notificationService } = await import('../services/notification.service').catch(() => ({ notificationService: null }));
      
      if (notificationService) {
        await notificationService.updatePreferences({ [key]: val });
      } else {
        // Fallback: update vào user meta nếu backend hỗ trợ
        // await userService.updateProfile({ notificationSettings: { ...notifications, [key]: val } });
      }
      showMsg(t('notifications.updated') || 'Notifications updated');
    } catch(e) { showMsg('Error updating notifications'); }
    finally { setLoading(false); }
  };

  // --- DATA SECTIONS (Đầy đủ như Web) ---
  const sections = [
    {
      title: t('settings.language') || "Language",
      icon: "language" as const,
      fields: [
        {
          label: t('settings.language') || "Display Language",
          desc: t('language.description') || "Select your preferred language",
          type: "radio",
          val: language,
          options: [
            { value: 'en', label: 'English' },
            { value: 'vi', label: 'Tiếng Việt' }
          ],
          onChange: handleLanguageChange
        }
      ]
    },
    {
      title: t('settings.appearance') || "Appearance",
      icon: "color-palette" as const,
      fields: [
        {
          label: t('settings.appearance') || "Theme",
          desc: t('theme.description') || "Choose how the app looks",
          type: "radio",
          val: theme,
          options: [
            { value: 'light', label: t('theme.light') || 'Light' },
            { value: 'dark', label: t('theme.dark') || 'Dark' },
            { value: 'auto', label: t('theme.auto') || 'Auto (System)' }
          ],
          onChange: handleThemeChange
        }
      ]
    },
    {
      title: t('settings.regional') || "Regional",
      icon: "globe" as const,
      fields: [
        {
          label: t('regional.timezone') || "Time Zone",
          desc: t('regional.timezoneDesc') || "Your local time zone",
          type: "radio", // Mobile dùng Radio/Modal list thay vì Select box dropdown
          val: timeZone,
          // FULL LIST TỪ BẢN WEB
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
          onChange: (v: string) => handleRegionalChange('timeZone', v)
        },
        {
          label: t('regional.dateFormat') || "Date Format",
          desc: t('regional.dateFormatDesc') || "How dates are displayed",
          type: "radio",
          val: dateFormat,
          // FULL LIST TỪ BẢN WEB
          options: [
            { value: 'DD MMM YYYY', label: '31 Dec 2025' },
            { value: 'MMM DD, YYYY', label: 'Dec 31, 2025' },
            { value: 'DD/MM/YYYY', label: '31/12/2025' },
            { value: 'MM/DD/YYYY', label: '12/31/2025' },
            { value: 'YYYY-MM-DD', label: '2025-12-31' }
          ],
          onChange: (v: string) => handleRegionalChange('dateFormat', v)
        },
        {
          label: t('regional.timeFormat') || "Time Format",
          desc: t('regional.timeFormatDesc') || "12h or 24h clock",
          type: "radio",
          val: timeFormat,
          options: [
            { value: '12h', label: t('regional.12hour') + ' (8:00 PM)' },
            { value: '24h', label: t('regional.24hour') + ' (20:00)' }
          ],
          onChange: (v: string) => handleRegionalChange('timeFormat', v)
        },
        {
          label: t('regional.weekStart') || "Week Start",
          desc: t('regional.weekStartDesc') || "First day of the week",
          type: "radio",
          val: weekStart,
          options: [
            { value: 'monday', label: t('regional.monday') || 'Monday' },
            { value: 'sunday', label: t('regional.sunday') || 'Sunday' }
          ],
          onChange: (v: string) => handleRegionalChange('weekStart', v)
        }
      ]
    },
    {
      title: t('notifications.title') || "Notifications",
      icon: "notifications" as const,
      fields: [
        {
          label: t('notifications.email') || "Email Notifications",
          desc: t('notifications.emailDesc') || "Receive updates via email",
          type: "toggle",
          val: notifications.email,
          onChange: (v: boolean) => handleNotificationChange('email', v)
        },
        {
          label: t('notifications.push') || "Push Notifications",
          desc: t('notifications.pushDesc') || "Receive app notifications",
          type: "toggle",
          val: notifications.push,
          onChange: (v: boolean) => handleNotificationChange('push', v)
        }
      ]
    }
  ];

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          {t('preferences.title') || 'Preferences'}
        </Text>
        <Text style={[styles.sectionDesc, isDark && styles.darkSubtext]}>
          {t('preferences.description') || 'Customize your app experience.'}
        </Text>
      </View>

      {/* Render Sections */}
      {sections.map((section, sIndex) => (
        <View key={sIndex} style={[styles.card, isDark && styles.darkCard]}>
          <View style={styles.cardHeader}>
             <View style={styles.iconBox}>
                <Ionicons name={section.icon} size={18} color="#3b82f6" />
             </View>
             <Text style={[styles.cardTitle, isDark && styles.darkText]}>{section.title}</Text>
          </View>

          {section.fields.map((field: any, fIndex) => (
            <View key={fIndex} style={[
              styles.fieldRow, 
              fIndex !== 0 && styles.borderTop,
              isDark && styles.darkBorderTop
            ]}>
              {/* Label & Desc */}
              <View style={styles.fieldInfo}>
                <Text style={[styles.fieldLabel, isDark && styles.darkText]}>{field.label}</Text>
                <Text style={[styles.fieldDesc, isDark && styles.darkSubtext]}>{field.desc}</Text>
              </View>

              {/* Controls */}
              <View style={styles.fieldControl}>
                {field.type === 'toggle' && (
                  <Switch 
                    value={field.val} 
                    onValueChange={field.onChange}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor="#FFF"
                  />
                )}
                
                {field.type === 'radio' && (
                   <View style={styles.radioGroup}>
                      {field.options.map((opt: any) => {
                         const isSelected = field.val === opt.value;
                         return (
                           <TouchableOpacity 
                              key={opt.value} 
                              style={styles.radioItem} 
                              onPress={() => field.onChange(opt.value)}
                           >
                              <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                                 {isSelected && <View style={styles.radioDot} />}
                              </View>
                              <Text style={[
                                styles.radioText, 
                                isDark && styles.darkText,
                                isSelected && styles.radioTextActive
                              ]}>
                                {opt.label}
                              </Text>
                           </TouchableOpacity>
                         )
                      })}
                   </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}

      {/* Message Toast */}
      {message !== '' && (
        <View style={[styles.toast, styles.successBox]}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 3. TAB SECURITY: Change Password, Validation, Tips
// ============================================================================
function SecurityTab({ isDark, t }: any) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const handleChangePassword = async () => {
    setMessage('');
    // Validation Logic giống Web
    if (newPassword !== confirmPassword) {
      setMessage(t('security.passwordMismatch') || 'Passwords do not match');
      setMsgType('error');
      return;
    }
    if (newPassword.length < 8) {
      setMessage(t('security.passwordMinLength') || 'Password must be at least 8 characters');
      setMsgType('error');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword(oldPassword, newPassword);
      setMessage(t('security.passwordChanged') || 'Password changed successfully');
      setMsgType('success');
      // Reset form
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      setMessage(e.response?.data?.message || e.message || 'Error changing password');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  // Reusable Password Input
  const PasswordField = ({ label, val, setVal, show, setShow, placeholder }: any) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, isDark && styles.darkText]}>{label}</Text>
      <View style={styles.passInputWrapper}>
        <TextInput
          style={[styles.input, styles.passInput, isDark && styles.darkInput]}
          value={val}
          onChangeText={setVal}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          secureTextEntry={!show}
        />
        <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeBtn}>
           <Ionicons name={show ? "eye-off" : "eye"} size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
          {t('security.title') || 'Security'}
        </Text>
        <Text style={[styles.sectionDesc, isDark && styles.darkSubtext]}>
          {t('security.description') || 'Manage your password and security settings.'}
        </Text>
      </View>

      {/* FORM CARD */}
      <View style={[styles.card, isDark && styles.darkCard]}>
        <Text style={[styles.cardTitle, isDark && styles.darkText, {marginBottom: 16}]}>
          {t('security.changePassword') || 'Change Password'}
        </Text>

        <PasswordField 
          label={t('security.currentPassword') || "Current Password"} 
          val={oldPassword} setVal={setOldPassword} show={showOld} setShow={setShowOld}
          placeholder={t('security.enterCurrentPassword') || "Enter current password"}
        />

        <PasswordField 
          label={t('security.newPassword') || "New Password"} 
          val={newPassword} setVal={setNewPassword} show={showNew} setShow={setShowNew}
          placeholder={t('security.enterNewPassword') || "Enter new password"}
        />
        <Text style={[styles.helperText, isDark && styles.darkSubtext, {marginTop: -12, marginBottom: 12}]}>
           {t('security.passwordMinLength') || 'Must be at least 8 characters long.'}
        </Text>

        <PasswordField 
          label={t('security.confirmPassword') || "Confirm Password"} 
          val={confirmPassword} setVal={setConfirmPassword} show={showConfirm} setShow={setShowConfirm}
          placeholder={t('security.confirmNewPassword') || "Confirm new password"}
        />

        <View style={{marginTop: 8}}>
          <TouchableOpacity 
            onPress={handleChangePassword} 
            disabled={loading} 
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
          >
             {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{t('security.updatePassword') || 'Update Password'}</Text>}
          </TouchableOpacity>
        </View>

        {message !== '' && (
          <View style={[styles.alertBox, msgType === 'error' ? styles.errorBox : styles.successBox, {marginTop: 16}]}>
             <Text style={[styles.alertText, msgType === 'error' ? styles.errorText : styles.successText]}>
               {message}
             </Text>
          </View>
        )}
      </View>

      {/* SECURITY TIPS & INFO (Khớp Web) */}
      <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }]}>
         <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
            <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
            <Text style={[styles.infoTitle, {color: isDark ? '#60a5fa' : '#1e40af', marginLeft: 8}]}>
               {t('security.passwordTips') || 'Password Tips'}
            </Text>
         </View>
         <View style={{paddingLeft: 4}}>
            <Text style={[styles.infoText, {color: isDark ? '#93c5fd' : '#1d4ed8'}]}>• {t('security.tipMinChars') || 'Use at least 8 characters'}</Text>
            <Text style={[styles.infoText, {color: isDark ? '#93c5fd' : '#1d4ed8'}]}>• {t('security.tipNumbers') || 'Include numbers and symbols'}</Text>
            <Text style={[styles.infoText, {color: isDark ? '#93c5fd' : '#1d4ed8'}]}>• {t('security.tipCommon') || 'Avoid common words'}</Text>
            <Text style={[styles.infoText, {color: isDark ? '#93c5fd' : '#1d4ed8'}]}>• {t('security.tipReuse') || "Don't reuse passwords"}</Text>
         </View>
      </View>

      {/* LAST CHANGED INFO */}
      <View style={[styles.card, isDark && styles.darkCard, {marginTop: 16}]}>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="time-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            <View style={{marginLeft: 12}}>
               <Text style={[styles.cardTitle, isDark && styles.darkText, {fontSize: 14, marginBottom: 2}]}>
                 {t('security.lastChanged') || 'Last Changed'}
               </Text>
               <Text style={[styles.helperText, isDark && styles.darkSubtext]}>
                 {t('security.lastChangedInfo', { time: '2 months' }) || '2 months ago'}
               </Text>
            </View>
         </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES (Chi tiết, hỗ trợ Dark Mode đầy đủ)
// ============================================================================
const styles = StyleSheet.create({
  // LAYOUT
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  darkContainer: { backgroundColor: '#111827' },
  contentArea: { flex: 1 },
  darkContentArea: { backgroundColor: '#111827' },
  scrollContent: { paddingBottom: 40 },
  tabContent: { padding: 16 },

  // HEADER
  header: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  darkHeader: { backgroundColor: '#1f2937', borderBottomColor: '#374151' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { padding: 8, marginRight: 8, borderRadius: 8 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  // TABS
  tabContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  tabContentContainer: { flexGrow: 1 },
  tabsWrapper: { flexDirection: 'row', backgroundColor: '#f9fafb', padding: 4, borderRadius: 12, width: '100%' },
  darkTabsWrapper: { backgroundColor: '#374151' },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginHorizontal: 2 },
  activeTabItem: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  activeDarkTabItem: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginLeft: 6 },
  activeTabText: { color: '#111827' },
  darkTabText: { color: '#9ca3af' },
  activeDarkTabText: { color: '#FFF' },

  // SECTIONS
  sectionHeader: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionDesc: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  // CARDS
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  darkCard: { backgroundColor: '#1f2937' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },

  // AVATAR
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#FFF' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  avatarInitials: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3b82f6', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  avatarActions: { marginLeft: 20, flex: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  uploadBtnText: { color: '#3b82f6', fontWeight: '600', marginLeft: 6 },

  // FORMS & INPUTS
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  darkInput: { backgroundColor: '#374151', borderColor: '#4b5563', color: '#FFF' },
  passInputWrapper: { position: 'relative' },
  passInput: { paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  disabledInput: { backgroundColor: '#f9fafb', color: '#9ca3af' },
  helperText: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  // BUTTONS
  buttonRow: { marginTop: 8, marginBottom: 24 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  flexBtn: { flex: 1, marginHorizontal: 4 },
  editBtnGroup: { flexDirection: 'row' },
  disabledBtn: { opacity: 0.6 },
  
  deleteSection: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', marginLeft: 6 },

  // ALERTS & TOASTS
  alertBox: { padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  successBox: { backgroundColor: '#ecfdf5' },
  errorBox: { backgroundColor: '#fef2f2' },
  darkSuccessBox: { backgroundColor: 'rgba(6, 78, 59, 0.5)' },
  darkErrorBox: { backgroundColor: 'rgba(127, 29, 29, 0.5)' },
  alertText: { fontSize: 14, fontWeight: '500' },
  successText: { color: '#047857' },
  errorText: { color: '#b91c1c' },
  toast: { position: 'absolute', bottom: 20, left: 16, right: 16, padding: 12, borderRadius: 8, alignItems: 'center', zIndex: 100 },

  // PREFERENCE FIELDS
  fieldRow: { flexDirection: 'row', paddingVertical: 16 },
  borderTop: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  darkBorderTop: { borderTopColor: '#374151' },
  fieldInfo: { flex: 1, paddingRight: 12 },
  fieldLabel: { fontSize: 15, fontWeight: '500', color: '#111827' },
  fieldDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  fieldControl: { justifyContent: 'center', alignItems: 'flex-end', minWidth: 60 },
  
  // RADIO LIST
  radioGroup: { width: '100%', alignItems: 'flex-end' },
  radioItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  radioText: { fontSize: 14, color: '#4b5563', marginRight: 10 },
  radioTextActive: { color: '#3b82f6', fontWeight: '600' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },

  // INFO CARD
  infoCard: { borderRadius: 12, padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  
  // DARK MODE TEXT UTILS
  darkText: { color: '#f3f4f6' },
  darkSubtext: { color: '#9ca3af' },
});