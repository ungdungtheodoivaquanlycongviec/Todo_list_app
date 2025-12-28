import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { FolderPlus, Loader2 } from 'lucide-react-native'; 
import { useFolder } from '../../context/FolderContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
import { useLanguage } from '../../context/LanguageContext';

interface NoFolderStateProps {
  title?: string;
  description?: string;
}

export default function NoFolderState({ title, description }: NoFolderStateProps) {
  const { createFolder } = useFolder();
  const { currentGroup } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage(); 
  
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!folderName.trim() || loading) return;

    // ✅ FIX: Đã XÓA đoạn check (!currentGroup).
    // Bây giờ Context sẽ tự động dùng User ID nếu không có Group (Personal Workspace)

    setLoading(true);
    setError(null);

    try {
      await createFolder(folderName.trim(), folderDescription.trim() || undefined);
      setFolderName('');
      setFolderDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.generic' as any)); 
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDark);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <View style={styles.iconContainer}>
          <FolderPlus size={40} color={isDark ? '#93c5fd' : '#2563eb'} />
        </View>

        <Text style={styles.title}>
          {title || (t('folders.noFolders' as any) || 'No Folders')}
        </Text>

        <Text style={styles.description}>
          {description || (currentGroup
            ? (t('folders.createFirstFolder' as any, { groupName: currentGroup.name }) || `Create a folder for ${currentGroup.name}`)
            // Hiển thị text cho Personal Workspace nếu không có group
            : (t('folders.createFirstFolderNoGroup' as any) || 'Create a folder in your Personal Workspace'))}
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            value={folderName}
            onChangeText={setFolderName}
            placeholder={t('folders.enterFolderName' as any) || 'Folder name'}
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            style={styles.input}
            editable={!loading}
          />
          <TextInput
            value={folderDescription}
            onChangeText={setFolderDescription}
            placeholder={t('folders.enterFolderDescription' as any) || 'Description (optional)'}
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            style={[styles.input, styles.textArea]}
            editable={!loading}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
                <Loader2 color="#ffffff" size={20} />
                <Text style={styles.buttonText}>{t('folders.creating' as any) || 'Creating...'}</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <FolderPlus size={20} color="#ffffff" />
                <Text style={styles.buttonText}>{t('folders.createFolder' as any) || 'Create Folder'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#111827' : '#f9fafb',
    paddingHorizontal: 24,
  },
  contentWrapper: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 384,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#dbeafe',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#ffffff' : '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: isDark ? '#9ca3af' : '#4b5563',
    marginBottom: 32,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    gap: 16,
  },
  input: {
    width: '100%',
    backgroundColor: isDark ? '#2E2E2E' : '#ffffff',
    color: isDark ? '#ffffff' : '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
  },
  errorBox: {
    backgroundColor: isDark ? 'rgba(185, 28, 28, 0.2)' : '#fef2f2',
    borderColor: isDark ? '#991b1b' : '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: isDark ? '#f87171' : '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
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
    fontWeight: '500',
  },
});