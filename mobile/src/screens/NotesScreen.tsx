import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Plus, Search, Trash2, Save, 
  Clock, FileText, Edit3, Eye, ArrowLeft,
  X, FolderOpen
} from 'lucide-react-native';

import { notesService, Note } from '../services/notes.service';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFolder } from '../context/FolderContext';
import { useLanguage } from '../context/LanguageContext';
import { useRegional } from '../context/RegionalContext';
import { useGroupChange } from '../hooks/useGroupChange';

import NoFolderState from '../components/common/NoFolderState';
// ✅ KHÔNG CẦN NoGroupState ở đây nữa vì ta muốn cho phép tạo Personal Folder
// import NoGroupState from '../components/common/NoGroupState';

export default function NotesView() {
  const { currentGroup } = useAuth();
  const { currentFolder } = useFolder();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { formatDate } = useRegional();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showNoteList, setShowNoteList] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  // --- LOGIC ---

  const loadNotes = useCallback(async () => {
    // Chỉ load khi ĐÃ CÓ folder
    if (!currentFolder?._id) {
        setLoading(false);
        return;
    }

    try {
      setLoading(true);
      const fetchedNotes = await notesService.getAllNotes(searchQuery, 1, 50, currentFolder._id);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, currentFolder?._id]);

  useGroupChange(() => {
    setShowNoteList(true);
    loadNotes();
  });

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const handleAddNote = async () => {
    if (!currentFolder?._id) {
        Alert.alert(t('common.error' as any) || 'Error', t('notes.noFolderSelected' as any) || 'No folder selected');
        return;
    }

    try {
      setSaving(true);
      const newNote = await notesService.createNote({
        title: t('notes.untitled' as any) || "Untitled Note",
        content: "",
        folderId: currentFolder._id
      });
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setHasUnsavedChanges(false);
      setShowNoteList(false);
    } catch (error) {
      Alert.alert(t('common.error' as any) || 'Error', t('notes.createFailed' as any) || 'Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const handleNoteClick = (note: Note) => {
    if (hasUnsavedChanges && selectedNote) {
      saveNote(selectedNote);
    }
    setSelectedNote(note);
    setHasUnsavedChanges(false);
    setShowNoteList(false);
  };

  const handleBackToList = () => {
    if (hasUnsavedChanges && selectedNote) {
      saveNote(selectedNote);
    }
    setShowNoteList(true);
  };

  const handleTitleChange = (newTitle: string) => {
    if (!selectedNote) return;
    setSelectedNote({ ...selectedNote, title: newTitle });
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    if (!selectedNote) return;
    setSelectedNote({ ...selectedNote, content: newContent });
    setHasUnsavedChanges(true);
  };

  const saveNote = async (note: Note) => {
    if (!note._id) return;
    try {
      setSaving(true);
      const updatedNote = await notesService.updateNote(note._id, {
        title: note.title,
        content: note.content
      });
      setNotes(notes.map(n => n._id === note._id ? updatedNote : n));
      setSelectedNote(updatedNote);
      setHasUnsavedChanges(false);
    } catch (error) {
      Alert.alert(t('common.error' as any) || 'Error', t('notes.saveFailed' as any) || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setShowDeleteModal(true);
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await notesService.deleteNote(noteToDelete);
      setNotes(notes.filter(note => note._id !== noteToDelete));
      if (selectedNote?._id === noteToDelete) {
        setSelectedNote(null);
        setShowNoteList(true);
      }
      setShowDeleteModal(false);
      setNoteToDelete(null);
    } catch (error) {
      Alert.alert(t('common.error' as any) || 'Error', t('notes.deleteFailed' as any) || 'Failed to delete');
    }
  };

  const formatLastEdited = (note: Note) => {
    if (!note.lastEdited && !note.updatedAt) return '';
    const dateStr = note.lastEdited || note.updatedAt || new Date().toISOString();
    return formatDate(dateStr);
  };

  const getWordCount = (content: string) => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  };

  const getReadingTime = (content: string) => {
    const words = getWordCount(content);
    const minutes = Math.ceil(words / 200);
    return minutes === 0 ? '< 1 min' : `${minutes} min read`;
  };

  // --- RENDER ---

  // ✅ FIX: Bỏ đoạn check !currentGroup return NoGroupState
  // Giờ đây nó sẽ trôi xuống check currentFolder

  // Nếu chưa chọn/tạo folder (kể cả Personal) -> Hiện màn hình tạo Folder
  if (!currentFolder) {
      return (
          <NoFolderState />
      );
  }

  // VIEW 1: LIST
  if (showNoteList) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <View style={[styles.header, isDark && styles.darkHeader]}>
          <View>
            <Text style={[styles.title, isDark && styles.darkText]}>{t('notes.title' as any) || 'Notes'}</Text>
            <Text style={{color: '#666', fontSize: 12}}>{currentFolder.name}</Text>
          </View>
          <TouchableOpacity onPress={handleAddNote} disabled={saving} style={styles.addButton}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, isDark && styles.darkSearchContainer]}>
          <Search size={20} color={isDark ? '#9ca3af' : '#6b7280'} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isDark && styles.darkText]}
            placeholder={t('notes.searchNotes' as any) || "Search notes..."}
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          style={styles.notesList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={[styles.loadingText, isDark && styles.darkSubText]}>{t('common.loading' as any) || 'Loading'}...</Text>
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={64} color={isDark ? '#4b5563' : '#d1d5db'} />
              <Text style={[styles.emptyTitle, isDark && styles.darkText]}>
                {searchQuery ? (t('notes.noNotesFound' as any) || 'No notes found') : (t('notes.noNotes' as any) || 'No notes yet')}
              </Text>
              <Text style={[styles.emptyDescription, isDark && styles.darkSubText]}>
                {searchQuery ? (t('notes.tryDifferentSearch' as any) || 'Try another keyword') : (t('notes.createFirst' as any) || 'Create your first note')}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={handleAddNote} style={styles.createFirstButton}>
                  <Text style={styles.createFirstButtonText}>{t('notes.newNote' as any) || 'New Note'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            notes.map((note) => (
              <TouchableOpacity
                key={note._id}
                style={[styles.noteItem, isDark && styles.darkNoteItem]}
                onPress={() => handleNoteClick(note)}
              >
                <View style={styles.noteContent}>
                  <Text style={[styles.noteTitle, isDark && styles.darkText]} numberOfLines={1}>
                    {note.title || (t('notes.untitled' as any) || "Untitled")}
                  </Text>
                  {note.content ? (
                    <Text style={[styles.notePreview, isDark && styles.darkSubText]} numberOfLines={2}>
                      {note.content.replace(/#[^\s]+/g, '').trim() || (t('notes.noContent' as any) || "No content")}
                    </Text>
                  ) : null}
                  <View style={styles.noteMeta}>
                    <View style={styles.metaRow}>
                      <Clock size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.metaText, isDark && styles.darkSubText]}>
                        {formatLastEdited(note)}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => confirmDeleteNote(note._id!)} style={styles.deleteButton}>
                  <Trash2 size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>{t('common.delete' as any) || 'Delete'}</Text>
              <Text style={[styles.modalMessage, isDark && styles.darkSubText]}>
                {t('notes.confirmDelete' as any) || 'Are you sure?'}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowDeleteModal(false)}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel' as any) || 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.deleteModalButton]} onPress={handleDeleteNote}>
                  <Text style={styles.deleteModalButtonText}>{t('common.delete' as any) || 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // VIEW 2: EDITOR
  if (!selectedNote) return null;

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.editorHeader, isDark && styles.darkHeader]}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <ArrowLeft size={24} color={isDark ? '#e5e7eb' : '#374151'} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setIsPreviewMode(!isPreviewMode)} style={styles.headerButton}>
              {isPreviewMode ? <Edit3 size={20} color={isDark ? '#e5e7eb' : '#374151'} /> : <Eye size={20} color={isDark ? '#e5e7eb' : '#374151'} />}
            </TouchableOpacity>
            {hasUnsavedChanges && (
              <View style={styles.unsavedIndicator}>
                <View style={styles.unsavedDot} />
                <Text style={[styles.unsavedText, isDark && styles.darkSubText]}>{t('notes.unsaved' as any) || 'Unsaved'}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => saveNote(selectedNote)} disabled={saving || !hasUnsavedChanges} style={[styles.saveButton, (!hasUnsavedChanges || saving) && styles.saveButtonDisabled]}>
              {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Save size={18} color="#ffffff" />}
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={styles.editorScroll} keyboardDismissMode="interactive">
          <TextInput
            style={[styles.titleInput, isDark && styles.darkText]}
            placeholder={t('notes.noteTitlePlaceholder' as any) || "Title"}
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            value={selectedNote.title}
            onChangeText={handleTitleChange}
            editable={!isPreviewMode}
          />
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Clock size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.metaText, isDark && styles.darkSubText]}>{formatLastEdited(selectedNote)}</Text>
            </View>
            <View style={styles.metaItem}>
              <FileText size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.metaText, isDark && styles.darkSubText]}>{getWordCount(selectedNote.content)} {t('notes.words' as any) || 'words'}</Text>
            </View>
          </View>
          {isPreviewMode ? (
            <View style={[styles.previewContainer, isDark && styles.darkPreviewContainer]}>
              <Text style={[styles.previewContent, isDark && styles.darkText]}>{selectedNote.content || (t('notes.noContent' as any) || "No content")}</Text>
            </View>
          ) : (
            <TextInput
              style={[styles.contentInput, isDark && styles.darkText]}
              placeholder={t('notes.noteContentPlaceholder' as any) || "Start typing..."}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={selectedNote.content}
              onChangeText={handleContentChange}
              multiline={true}
              textAlignVertical="top"
              scrollEnabled={false}
            />
          )}
          <View style={{height: 100}} /> 
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  darkContainer: { backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  darkHeader: { backgroundColor: '#1f2937', borderBottomColor: '#374151' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  darkText: { color: '#f9fafb' },
  darkSubText: { color: '#9ca3af' },
  addButton: { backgroundColor: '#3b82f6', padding: 8, borderRadius: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', margin: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  darkSearchContainer: { backgroundColor: '#374151', borderColor: '#4b5563' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 16, color: '#374151' },
  notesList: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 50 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  createFirstButton: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  createFirstButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  noteItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  darkNoteItem: { backgroundColor: '#1f2937', borderColor: '#374151' },
  noteContent: { flex: 1 },
  noteTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  notePreview: { fontSize: 14, color: '#6b7280', marginBottom: 8, lineHeight: 18 },
  noteMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  deleteButton: { padding: 8, marginLeft: 8 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { padding: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { padding: 8 },
  unsavedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unsavedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  unsavedText: { fontSize: 14, color: '#6b7280' },
  saveButton: { backgroundColor: '#3b82f6', padding: 8, borderRadius: 8 },
  saveButtonDisabled: { backgroundColor: '#9ca3af' },
  editorScroll: { flex: 1, padding: 16 },
  titleInput: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  metaInfo: { flexDirection: 'row', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contentInput: { flex: 1, fontSize: 16, color: '#374151', lineHeight: 24, minHeight: 400 },
  previewContainer: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  darkPreviewContainer: { backgroundColor: '#1f2937', borderColor: '#374151' },
  previewContent: { fontSize: 16, color: '#374151', lineHeight: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  darkModalContent: { backgroundColor: '#1f2937' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  modalMessage: { fontSize: 16, color: '#6b7280', marginBottom: 24, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f3f4f6' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  deleteModalButton: { backgroundColor: '#dc2626' },
  deleteModalButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});