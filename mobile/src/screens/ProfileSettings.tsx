import React, { useState, useEffect } from 'react';
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
  FlatList
} from 'react-native';
// ✅ Sử dụng Lucide Icons
import { 
  ArrowLeft, User as UserIcon, Settings, Shield, 
  Camera, Upload, Eye, EyeOff, Check, Trash2, 
  Globe, Bell, Palette, ChevronDown, X, Calendar
} from 'lucide-react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { userService } from '../services/user.service';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api/apiClient';

interface ProfileSettingsProps {
  visible: boolean;
  onClose?: () => void;
}

type ThemeType = 'light' | 'dark' | 'auto';

// --- CUSTOM DROPDOWN MODAL ---
const CustomDropdown = ({ 
  visible, 
  onClose, 
  options, 
  value, 
  onSelect, 
  title,
  theme 
}: any) => {
  const isDark = theme === 'dark';
  const colors = getColors(isDark);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.dropdownContainer, isDark && styles.darkDropdownContainer]}>
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, isDark && styles.darkText]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            contentContainerStyle={{paddingBottom: 20}}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.dropdownItem, item.value === value && styles.dropdownItemActive]}
                onPress={() => { onSelect(item.value); onClose(); }}
              >
                <Text style={[
                  styles.dropdownItemText, 
                  isDark && styles.darkText,
                  item.value === value && styles.dropdownItemTextActive
                ]}>
                  {item.label}
                </Text>
                {item.value === value && <Check size={18} color={colors.bluePrimary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

// --- MAIN COMPONENT ---
export default function ProfileSettings({ visible, onClose }: ProfileSettingsProps) {
  const { user, updateUserTheme } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const colors = getColors(isDark);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: t('settings.profile') || 'Profile', icon: UserIcon },
    { id: 'preferences', label: t('settings.preferences') || 'Preferences', icon: Settings },
    { id: 'security', label: t('settings.security') || 'Security', icon: Shield },
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
        
        {/* HEADER */}
        <View style={[styles.header, isDark && styles.darkHeader]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitles}>
              <Text style={[styles.headerTitle, isDark && styles.darkText]}>
                {t('accountSettings.title') || 'Account Settings'}
              </Text>
            </View>
          </View>

          {/* ✅ TABS (Sửa lại layout Flex để đều nhau và không bị đè) */}
          <View style={styles.tabContainer}>
            <View style={[styles.tabsWrapper, isDark && styles.darkTabsWrapper]}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
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
                    <Icon 
                      size={16} 
                      color={isActive ? (isDark ? '#FFF' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280')} 
                    />
                    <Text 
                      style={[
                        styles.tabText,
                        isActive && styles.activeTabText,
                        isDark && styles.darkTabText,
                        isActive && isDark && styles.activeDarkTabText,
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* CONTENT */}
        <View style={[styles.contentArea, isDark && styles.darkContentArea]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {activeTab === 'profile' && (
              <MyProfileTab user={user} isDark={isDark} t={t} colors={colors} />
            )}
            {activeTab === 'preferences' && (
              <PreferencesTab 
                user={user} 
                updateUserTheme={updateUserTheme} 
                isDark={isDark} 
                t={t} 
                colors={colors}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab isDark={isDark} t={t} colors={colors} />
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ------------------------------------------------------------------
// 1. TAB PROFILE
// ------------------------------------------------------------------
function MyProfileTab({ user, isDark, t, colors }: any) {
  const { updateUser } = useAuth();
  
  const [name, setName] = useState(user.name);
  const [email] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        handleUploadAvatar(result.assets[0]);
      }
    } catch (error) { Alert.alert('Error', 'Cannot access gallery'); }
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
      const response = await apiClient.post('/users/me/avatar/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newAvatarUrl = response.data?.data?.user?.avatar || response.data?.user?.avatar;
      if (newAvatarUrl) {
        setAvatar(newAvatarUrl);
        await userService.updateAvatar(newAvatarUrl);
        await updateUser({ avatar: newAvatarUrl });
        showMsg(t('profile.updated') || 'Profile picture updated', 'success');
      }
    } catch (error: any) {
      showMsg(error.message || 'Failed to upload avatar', 'error');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await userService.updateProfile({ name });
      await updateUser({ name });
      setIsEditing(false);
      showMsg(t('profile.updated') || 'Profile updated successfully', 'success');
    } catch (error: any) {
      showMsg(error.message || 'Error updating profile', 'error');
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount') || 'Delete Account',
      t('profile.deleteConfirmMessage') || 'Are you sure?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('profile.deleteConfirmButton') || 'Delete', style: 'destructive', onPress: async () => {
            setLoading(true);
            try { await userService.deactivateAccount(); } 
            catch (error: any) { showMsg(error.message, 'error'); setLoading(false); }
          } 
        }
      ]
    );
  };

  const getInitials = (str: string) => str.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.tabContent}>
      <View style={[styles.card, isDark && styles.darkCard, {alignItems:'center', paddingTop: 24}]}>
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials(user.name)}</Text>
            </View>
          )}
          {isEditing && (
            <TouchableOpacity style={styles.cameraBadge} onPress={pickImage}>
              <Camera size={14} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {isEditing && (
           <TouchableOpacity onPress={pickImage} style={styles.uploadTextBtn}>
             <Upload size={16} color={colors.bluePrimary} />
             <Text style={[styles.uploadBtnText, {color: colors.bluePrimary}]}>{t('profile.uploadPhoto') || 'Change Photo'}</Text>
           </TouchableOpacity>
        )}
      </View>

      <View style={[styles.card, isDark && styles.darkCard]}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark && styles.darkText]}>{t('profile.fullName') || 'Full Name'}</Text>
          <TextInput
            style={[styles.input, isDark && styles.darkInput, !isEditing && styles.disabledInput]}
            value={name}
            onChangeText={setName}
            editable={isEditing}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark && styles.darkText]}>{t('profile.email') || 'Email'}</Text>
          <TextInput
            style={[styles.input, isDark && styles.darkInput, styles.disabledInput]}
            value={email}
            editable={false}
          />
        </View>

        <View style={styles.buttonRow}>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>{t('profile.editProfile') || 'Edit Profile'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editBtnGroup}>
              <TouchableOpacity onPress={() => { setIsEditing(false); setName(user.name); }} style={[styles.secondaryBtn, styles.flexBtn]}>
                <Text style={[styles.secondaryBtnText, isDark && styles.darkText]}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.primaryBtn, styles.flexBtn, loading && styles.disabledBtn]}>
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <>
                    <Check size={16} color="#FFF" style={{marginRight: 6}} />
                    <Text style={styles.primaryBtnText}>{t('common.save') || 'Save'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteLink}>
           <Trash2 size={16} color={colors.red} />
           <Text style={[styles.deleteLinkText, {color: colors.red}]}>{t('profile.deleteAccount') || 'Delete Account'}</Text>
        </TouchableOpacity>

        {message !== '' && (
          <View style={[styles.alertBox, messageType === 'error' ? styles.errorBox : styles.successBox]}>
            <Text style={[styles.alertText, messageType === 'error' ? styles.errorText : styles.successText]}>{message}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// 2. TAB PREFERENCES
// ------------------------------------------------------------------
function PreferencesTab({ user, updateUserTheme, isDark, t, colors }: any) {
  const { language, setLanguage } = useLanguage();
  const { updateUser } = useAuth();
  
  const [theme, setTheme] = useState<ThemeType>((user.theme as ThemeType) || 'light');
  const [timeZone, setTimeZone] = useState((user as any).regionalPreferences?.timeZone || 'UTC+00:00');
  const [dateFormat, setDateFormat] = useState((user as any).regionalPreferences?.dateFormat || 'DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState((user as any).regionalPreferences?.timeFormat || '24h');
  const [weekStart, setWeekStart] = useState((user as any).regionalPreferences?.weekStart || 'monday');
  const [notifications, setNotifications] = useState({
    email: (user as any).notificationSettings?.email ?? true,
    push: (user as any).notificationSettings?.push ?? true,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [currentModalConfig, setCurrentModalConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const openDropdown = (config: any) => {
    setCurrentModalConfig(config);
    setModalVisible(true);
  };

  const handleUpdate = async (key: string, val: any, type: 'theme' | 'lang' | 'regional' | 'notif') => {
    setLoading(true);
    try {
        if (type === 'theme') {
            await updateUserTheme(val);
            setTheme(val);
        } else if (type === 'lang') {
            await setLanguage(val);
        } else if (type === 'regional') {
            if(key === 'timeZone') setTimeZone(val);
            if(key === 'dateFormat') setDateFormat(val);
            if(key === 'timeFormat') setTimeFormat(val);
            if(key === 'weekStart') setWeekStart(val);
            const updated = await userService.updateRegionalPreferences({ [key]: val });
            await updateUser(updated);
        } else if (type === 'notif') {
            setNotifications(prev => ({...prev, [key]: val}));
        }
    } catch(e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const sections = [
    {
      title: t('settings.appearance') || "Appearance",
      icon: Palette,
      items: [
        { label: t('settings.language'), value: language === 'en' ? 'English' : 'Tiếng Việt', type: 'dropdown', 
          options: [{label: 'English', value: 'en'}, {label: 'Tiếng Việt', value: 'vi'}], 
          onSelect: (v: string) => handleUpdate('language', v, 'lang') },
        { label: t('settings.appearance'), value: theme.charAt(0).toUpperCase() + theme.slice(1), type: 'dropdown', 
          options: [{label: 'Light', value: 'light'}, {label: 'Dark', value: 'dark'}, {label: 'Auto', value: 'auto'}], 
          onSelect: (v: string) => handleUpdate('theme', v, 'theme') },
      ]
    },
    {
      title: t('settings.regional') || "Regional",
      icon: Globe,
      items: [
        { label: t('regional.timezone'), value: timeZone, type: 'dropdown', 
          options: [
            { value: 'UTC-12:00', label: 'UTC-12:00' },
            { value: 'UTC-07:00', label: 'UTC-07:00 (Pacific)' },
            { value: 'UTC-06:00', label: 'UTC-06:00 (Central)' },
            { value: 'UTC-05:00', label: 'UTC-05:00 (Eastern)' },
            { value: 'UTC+00:00', label: 'UTC+00:00 (GMT)' },
            { value: 'UTC+01:00', label: 'UTC+01:00 (Central European)' },
            { value: 'UTC+07:00', label: 'UTC+07:00 (Vietnam)' },
            { value: 'UTC+08:00', label: 'UTC+08:00 (China)' },
            { value: 'UTC+09:00', label: 'UTC+09:00 (Japan)' }
          ], 
          onSelect: (v: string) => handleUpdate('timeZone', v, 'regional') },
        { label: t('regional.dateFormat'), value: dateFormat, type: 'dropdown',
          options: [
            { value: 'DD MMM YYYY', label: '31 Dec 2025' },
            { value: 'MMM DD, YYYY', label: 'Dec 31, 2025' },
            { value: 'DD/MM/YYYY', label: '31/12/2025' },
            { value: 'MM/DD/YYYY', label: '12/31/2025' },
            { value: 'YYYY-MM-DD', label: '2025-12-31' }
          ],
          onSelect: (v: string) => handleUpdate('dateFormat', v, 'regional') },
        { label: t('regional.timeFormat'), value: timeFormat, type: 'dropdown',
          options: [{ value: '12h', label: '12h (8:00 PM)' }, { value: '24h', label: '24h (20:00)' }],
          onSelect: (v: string) => handleUpdate('timeFormat', v, 'regional') },
        { label: t('regional.weekStart'), value: weekStart === 'monday' ? 'Monday' : 'Sunday', type: 'dropdown',
          options: [
            { value: 'monday', label: t('regional.monday') || 'Monday' }, 
            { value: 'sunday', label: t('regional.sunday') || 'Sunday' }
          ],
          onSelect: (v: string) => handleUpdate('weekStart', v, 'regional') },
      ]
    },
    {
        title: t('notifications.title') || "Notifications",
        icon: Bell,
        items: [
            { label: t('notifications.email'), value: notifications.email, type: 'switch', 
              onChange: (v: boolean) => handleUpdate('email', v, 'notif') },
            { label: t('notifications.push'), value: notifications.push, type: 'switch', 
              onChange: (v: boolean) => handleUpdate('push', v, 'notif') },
        ]
    }
  ];

  return (
    <View style={styles.tabContent}>
      {sections.map((section, idx) => (
        <View key={idx} style={[styles.card, isDark && styles.darkCard]}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, {backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#EFF6FF'}]}>
                    <section.icon size={18} color={colors.bluePrimary} />
                </View>
                <Text style={[styles.cardTitle, isDark && styles.darkText]}>{section.title}</Text>
            </View>
            
            {section.items.map((item: any, i) => (
                <View key={i} style={[styles.settingRow, i !== 0 && styles.borderTop, isDark && styles.darkBorderTop]}>
                    <Text style={[styles.settingLabel, isDark && styles.darkText]}>{item.label}</Text>
                    
                    {item.type === 'switch' ? (
                        <Switch 
                            value={item.value} 
                            onValueChange={item.onChange}
                            trackColor={{ false: '#d1d5db', true: colors.bluePrimary }}
                            thumbColor="#FFF"
                        />
                    ) : (
                        <TouchableOpacity 
                            style={styles.dropdownTrigger}
                            onPress={() => openDropdown({ title: item.label, options: item.options, value: item.value, onSelect: item.onSelect })}
                        >
                            <Text style={[styles.dropdownValue, isDark && styles.darkSubtext]}>{item.value}</Text>
                            <ChevronDown size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            ))}
        </View>
      ))}

      {currentModalConfig && (
          <CustomDropdown 
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            {...currentModalConfig}
            theme={isDark ? 'dark' : 'light'}
          />
      )}
    </View>
  );
}

// ------------------------------------------------------------------
// 3. TAB SECURITY
// ------------------------------------------------------------------
function SecurityTab({ isDark, t, colors }: any) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');

  const handleChange = async () => {
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
        setMessage(t('security.passwordChanged') || 'Password changed');
        setMsgType('success');
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch(e: any) {
        setMessage(e.message || 'Error');
        setMsgType('error');
    } finally { setLoading(false); }
  };

  const PassInput = ({label, val, setVal, show, setShow, ph}: any) => (
    <View style={styles.inputContainer}>
        <Text style={[styles.label, isDark && styles.darkText]}>{label}</Text>
        <View style={styles.passInputWrapper}>
            <TextInput 
                style={[styles.input, styles.passInput, isDark && styles.darkInput]}
                value={val} onChangeText={setVal} secureTextEntry={!show} placeholder={ph} placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeBtn}>
                {show ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
            </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <View style={styles.tabContent}>
        <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText, {marginBottom: 16}]}>{t('security.changePassword') || 'Change Password'}</Text>
            <PassInput label={t('security.currentPassword')} val={oldPassword} setVal={setOldPassword} show={showOld} setShow={setShowOld} ph="Current password" />
            <PassInput label={t('security.newPassword')} val={newPassword} setVal={setNewPassword} show={showNew} setShow={setShowNew} ph="New password" />
            <Text style={[styles.helperText, isDark && styles.darkSubtext, {marginTop: -12, marginBottom: 12}]}>
               {t('security.passwordMinLength') || 'Must be at least 8 characters long.'}
            </Text>
            <PassInput label={t('security.confirmPassword')} val={confirmPassword} setVal={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} ph="Confirm password" />
            
            <TouchableOpacity onPress={handleChange} disabled={loading} style={[styles.primaryBtn, {marginTop: 8}]}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{t('security.updatePassword') || 'Update'}</Text>}
            </TouchableOpacity>
            
            {message !== '' && (
                <View style={[styles.alertBox, msgType === 'error' ? styles.errorBox : styles.successBox, {marginTop: 16}]}>
                    <Text style={[styles.alertText, msgType === 'error' ? styles.errorText : styles.successText]}>{message}</Text>
                </View>
            )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }]}>
             <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <Shield size={20} color="#3b82f6" />
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

        <View style={[styles.card, isDark && styles.darkCard, {marginTop: 16}]}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Calendar size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
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

// ------------------------------------------------------------------
// STYLES (Fixed Tab Layout)
// ------------------------------------------------------------------
const getColors = (isDark: boolean) => ({
    textPrimary: isDark ? '#F9FAFB' : '#111827',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    bluePrimary: isDark ? '#60A5FA' : '#3B82F6',
    red: isDark ? '#F87171' : '#EF4444',
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  darkContainer: { backgroundColor: '#111827' },
  contentArea: { flex: 1 },
  darkContentArea: { backgroundColor: '#111827' },
  scrollContent: { paddingBottom: 40 },
  tabContent: { padding: 16 },

  header: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  darkHeader: { backgroundColor: '#1f2937', borderBottomColor: '#374151' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { padding: 8, marginRight: 8 },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },

  // ✅ FIX: Tab Styles giống bản trước
  tabContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  tabsWrapper: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 4, borderRadius: 12, width: '100%' },
  darkTabsWrapper: { backgroundColor: '#374151' },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  activeTabItem: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  activeDarkTabItem: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginLeft: 6 },
  activeTabText: { color: '#111827' },
  darkTabText: { color: '#9ca3af' },
  activeDarkTabText: { color: '#FFF' },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  darkCard: { backgroundColor: '#1f2937' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },

  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3b82f6', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
  uploadTextBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  uploadBtnText: { fontWeight: '600', marginLeft: 6 },

  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  darkInput: { backgroundColor: '#374151', borderColor: '#4b5563', color: '#FFF' },
  passInputWrapper: { position: 'relative' },
  passInput: { paddingRight: 40 },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  disabledInput: { backgroundColor: '#f9fafb', color: '#9ca3af' },
  helperText: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  buttonRow: { flexDirection: 'row', marginTop: 8, marginBottom: 16 },
  primaryBtn: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  secondaryBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  editBtnGroup: { flexDirection: 'row', flex: 1, gap: 10 },
  flexBtn: { flex: 1 },
  disabledBtn: { opacity: 0.6 },

  deleteLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  deleteLinkText: { fontWeight: '600', marginLeft: 6 },

  alertBox: { padding: 12, borderRadius: 8 },
  successBox: { backgroundColor: '#ecfdf5' },
  errorBox: { backgroundColor: '#fef2f2' },
  alertText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  successText: { color: '#047857' },
  errorText: { color: '#b91c1c' },

  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  borderTop: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  darkBorderTop: { borderTopColor: '#374151' },
  settingLabel: { fontSize: 15, color: '#111827', flex: 1 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center' },
  dropdownValue: { fontSize: 14, color: '#6b7280', marginRight: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dropdownContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '50%' },
  darkDropdownContainer: { backgroundColor: '#1f2937' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dropdownTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: '#eff6ff' },
  dropdownItemText: { fontSize: 16, color: '#374151' },
  dropdownItemTextActive: { color: '#3b82f6', fontWeight: '600' },

  infoCard: { borderRadius: 12, padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 13, marginTop: 4, lineHeight: 18 },

  darkText: { color: '#f3f4f6' },
  darkSubtext: { color: '#9ca3af' },
});