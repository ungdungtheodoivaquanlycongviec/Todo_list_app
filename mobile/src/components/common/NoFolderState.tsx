import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { FolderPlus, Loader2 } from 'lucide-react-native';
import { useFolder } from '../../context/FolderContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
// 1. THÊM import useLanguage để đồng bộ i18n
import { useLanguage } from '../../context/LanguageContext'; // Giả định có LanguageContext

export default function NoFolderState() {
  const { createFolder } = useFolder();
  const { currentGroup } = useAuth();
  const { isDark } = useTheme();
  // 1. THÊM t (translation function)
  const { t } = useLanguage(); 
  
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!folderName.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      await createFolder(folderName.trim());
      setFolderName('');
    } catch (err) {
      // 2. ĐỒNG BỘ XỬ LÝ LỖI (Sử dụng t())
      setError(err instanceof Error ? err.message : t('error.generic')); 
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDark);
  
  // 3. ĐỒNG BỘ ICON - SỬ DỤNG 'folder-add' hoặc 'add-circle' để thay thế FolderPlus
  const folderIcon = 'add-circle-outline'; // Sử dụng icon thêm mới folder rõ ràng hơn

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Icon Area */}
        <View style={styles.iconContainer}>
          {/* Thay thế folder-open-outline bằng icon thêm folder */}
          <Ionicons name={folderIcon} size={40} color={isDark ? '#93c5fd' : '#2563eb'} />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {/* 4. ĐỒNG BỘ TEXT */}
          {t('folders.noFolders')}
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          {/* 4. ĐỒNG BỘ TEXT */}
          {currentGroup
            ? t('folders.createFirstFolder', { groupName: currentGroup.name })
            : t('folders.createFirstFolderNoGroup')}
        </Text>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Input */}
          <TextInput
            value={folderName}
            onChangeText={setFolderName}
            // 4. ĐỒNG BỘ TEXT
            placeholder={t('folders.enterFolderName')}
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            style={styles.input}
            editable={!loading}
          />
          
          {/* Error Message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!folderName.trim() || loading}
            style={[
              styles.button, 
              (!folderName.trim() || loading) && styles.buttonDisabled
            ]}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                {/* 4. ĐỒNG BỘ TEXT */}
                <Text style={styles.buttonText}>{t('folders.creating')}</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                {/* ĐỔI ICON sang icon Thêm */}
                <Ionicons name={folderIcon} size={16} color="#ffffff" />
                {/* 4. ĐỒNG BỘ TEXT */}
                <Text style={styles.buttonText}>{t('folders.createFolder')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  // ... Styles giữ nguyên ...
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#111827' : '#f9fafb', // dark:bg-gray-900 vs bg-gray-50
    paddingHorizontal: 24,
  },
  contentWrapper: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 384, // max-w-md
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#dbeafe', // dark:bg-blue-900/30 vs bg-blue-100
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24, // mb-6
  },
  title: {
    fontSize: 24, // text-2xl
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#111827', // dark:text-white vs text-gray-900
    marginBottom: 8, // mb-2
  },
  description: {
    fontSize: 16,
    color: isDark ? '#9ca3af' : '#4b5563', // dark:text-gray-400 vs text-gray-600
    marginBottom: 32, // mb-8
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    gap: 16, // space-y-4
  },
  input: {
    width: '100%',
    backgroundColor: isDark ? '#2E2E2E' : '#ffffff', // dark:bg-[#2E2E2E] vs bg-white
    color: isDark ? '#ffffff' : '#111827', // dark:text-white vs text-gray-900
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
    borderRadius: 12, // rounded-xl
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db', // dark:border-gray-600 vs border-gray-300
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: isDark ? 'rgba(185, 28, 28, 0.2)' : '#fef2f2', // dark:bg-red-900/20 vs bg-red-50
    borderColor: isDark ? '#991b1b' : '#fecaca', // dark:border-red-800 vs border-red-200
    borderWidth: 1,
    borderRadius: 12, // rounded-xl
    padding: 12, // p-3
  },
  errorText: {
    color: isDark ? '#f87171' : '#dc2626', // dark:text-red-400 vs text-red-600
    fontSize: 14, // text-sm
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb', // base color blue-600
    paddingVertical: 12, // py-3
    paddingHorizontal: 16, // px-4
    borderRadius: 12, // rounded-xl
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500', // font-medium
  },
});