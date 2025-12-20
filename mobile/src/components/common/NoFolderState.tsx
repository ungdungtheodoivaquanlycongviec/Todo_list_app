import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { FolderPlus, Loader2 } from 'lucide-react-native';
import { useFolder } from '../../context/FolderContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext'; // Cần thêm ThemeContext

export default function NoFolderState() {
  const { createFolder } = useFolder();
  const { currentGroup } = useAuth();
  const { t } = useLanguage();
  const { isDark } = useTheme(); // Lấy theme từ context

  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!folderName.trim() || loading) return;

    setLoading(true);
    setError(null);
    Keyboard.dismiss(); // Ẩn bàn phím khi submit

    try {
      await createFolder(folderName.trim(), folderDescription.trim() || undefined);
      setFolderName('');
      setFolderDescription('');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.darkContainer]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          
          {/* Icon Circle */}
          <View style={[styles.iconCircle, isDark && styles.darkIconCircle]}>
            <FolderPlus size={40} color={isDark ? '#60A5FA' : '#2563EB'} />
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, isDark && styles.darkText]}>
            {t('folders.noFolders')}
          </Text>

          <Text style={[styles.subtitle, isDark && styles.darkSubtitle]}>
            {currentGroup
              ? t('folders.createFirstFolder', { groupName: currentGroup.name })
              : t('folders.createFirstFolderNoGroup')}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isDark && styles.darkInput]}
                value={folderName}
                onChangeText={setFolderName}
                placeholder={t('folders.enterFolderName')}
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea, isDark && styles.darkInput]}
                value={folderDescription}
                onChangeText={setFolderDescription}
                placeholder={t('folders.enterFolderDescription') || 'Enter folder description (optional)'}
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                multiline
                numberOfLines={3}
                textAlignVertical="top" // Android fix
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorBox, isDark && styles.darkErrorBox]}>
                <Text style={[styles.errorText, isDark && styles.darkErrorText]}>
                  {error}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (!folderName.trim() || loading) && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!folderName.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.buttonText}>{t('folders.creating')}</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <FolderPlus size={18} color="#FFF" />
                  <Text style={styles.buttonText}>{t('folders.createFolder')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  darkIconCircle: {
    backgroundColor: 'rgba(30, 58, 138, 0.5)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  darkText: {
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  darkSubtitle: {
    color: '#9CA3AF',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#F9FAFB',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14, // Đảm bảo text bắt đầu từ trên cùng
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  darkErrorBox: {
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    borderColor: '#7F1D1D',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  darkErrorText: {
    color: '#F87171',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});