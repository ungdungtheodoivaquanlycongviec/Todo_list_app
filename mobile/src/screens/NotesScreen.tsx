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
import { notesService, Note } from '../services/notes.service';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NoGroupState from '../components/common/NoGroupState';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';


export default function NotesView() {
  const { currentGroup } = useAuth();
  const { isDark } = useTheme();
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

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedNotes = await notesService.getAllNotes(searchQuery);
      setNotes(fetchedNotes);
      
      // Select first note if none selected
      if (fetchedNotes.length > 0 && !selectedNote) {
        setSelectedNote(fetchedNotes[0]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      
      // Handle group requirement error gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("You must join or create a group")) {
        console.log("User needs to join/create a group for notes");
        setNotes([]);
        return;
      }
      
      // For other errors, show empty state
      setNotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedNote]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  // Search notes when search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadNotes();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, loadNotes]);

  const handleAddNote = async () => {
    try {
      setSaving(true);
      const newNote = await notesService.createNote({
        title: "Untitled Note",
        content: ""
      });
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setHasUnsavedChanges(false);
      setShowNoteList(false); // Switch to editor view on mobile
    } catch (error) {
      console.error('Error creating note:', error);
      Alert.alert('Error', 'Failed to create note');
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
    setShowNoteList(false); // Switch to editor view on mobile
  };

  const handleTitleChange = (newTitle: string) => {
    if (!selectedNote) return;
    
    setSelectedNote({
      ...selectedNote,
      title: newTitle
    });
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    if (!selectedNote) return;
    
    setSelectedNote({
      ...selectedNote,
      content: newContent
    });
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
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!noteId) return;
    
    try {
      await notesService.deleteNote(noteId);
      setNotes(notes.filter(note => note._id !== noteId));
      
      if (selectedNote?._id === noteId) {
        const remainingNotes = notes.filter(n => n._id !== noteId);
        setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
        if (remainingNotes.length === 0) {
          setShowNoteList(true); // Switch back to list view if no notes left
        }
      }
      setShowDeleteModal(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note');
    }
  };

  const confirmDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setShowDeleteModal(true);
  };

  const formatLastEdited = (note: Note) => {
    if (note.formattedLastEdited) {
      return note.formattedLastEdited;
    }
    
    const date = new Date(note.lastEdited);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getWordCount = (content: string) => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  };

  const getReadingTime = (content: string) => {
    const words = getWordCount(content);
    const minutes = Math.ceil(words / 200);
    return minutes === 0 ? '< 1 min' : `${minutes} min read`;
  };

  // Check if user has a current group
  if (!currentGroup) {
    return (
      <NoGroupState 
        title="Join or Create a Group to Manage Notes"
        description="You need to join or create a group to create and manage notes with your team."
      />
    );
  }

  // Note List View
  if (showNoteList || !selectedNote) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={[styles.header, isDark && styles.darkHeader]}>
          <Text style={[styles.title, isDark && styles.darkText]}>Notes</Text>
          <TouchableOpacity
            onPress={handleAddNote}
            disabled={saving}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, isDark && styles.darkSearchContainer]}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isDark && styles.darkText]}
            placeholder="Search notes..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Notes List */}
        <ScrollView
          style={styles.notesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading notes...</Text>
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text" size={64} color={isDark ? '#4b5563' : '#d1d5db'} />
              <Text style={[styles.emptyTitle, isDark && styles.darkText]}>
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </Text>
              <Text style={[styles.emptyDescription, isDark && styles.darkSubtitle]}>
                {searchQuery ? 'Try a different search term' : 'Create your first note to get started'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={handleAddNote}
                  style={styles.createFirstButton}
                >
                  <Text style={styles.createFirstButtonText}>Create First Note</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            notes.map((note) => (
              <TouchableOpacity
                key={note._id}
                style={[
                  styles.noteItem,
                  isDark && styles.darkNoteItem,
                  selectedNote?._id === note._id && styles.selectedNoteItem
                ]}
                onPress={() => handleNoteClick(note)}
              >
                <View style={styles.noteContent}>
                  <Text style={[styles.noteTitle, isDark && styles.darkText]} numberOfLines={2}>
                    {note.title || "Untitled Note"}
                  </Text>
                  {note.content ? (
                    <Text style={[styles.notePreview, isDark && styles.darkSubtitle]} numberOfLines={2}>
                      {note.content.replace(/#[^\s]+/g, '').trim() || "No content yet"}
                    </Text>
                  ) : null}
                  
                  <View style={styles.noteMeta}>
                    <View style={styles.metaRow}>
                      <Ionicons name="time" size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.metaText, isDark && styles.darkSubtitle]}>
                        {formatLastEdited(note)}
                      </Text>
                    </View>
                    {note.content && (
                      <Text style={[styles.wordCount, isDark && styles.darkSubtitle]}>
                        {getWordCount(note.content)} words
                      </Text>
                    )}
                  </View>
                </View>
                
                <TouchableOpacity
                  onPress={() => confirmDeleteNote(note._id!)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>
                Delete Note
              </Text>
              <Text style={[styles.modalMessage, isDark && styles.darkSubtitle]}>
                Are you sure you want to delete this note? This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteModalButton]}
                  onPress={() => noteToDelete && handleDeleteNote(noteToDelete)}
                >
                  <Text style={styles.deleteModalButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Note Editor View
  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Editor Header */}
        <View style={[styles.editorHeader, isDark && styles.darkHeader]}>
          <TouchableOpacity
            onPress={() => {
              if (hasUnsavedChanges) {
                saveNote(selectedNote);
              }
              setShowNoteList(true);
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#e5e7eb' : '#374151'} />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setIsPreviewMode(!isPreviewMode)}
              style={styles.headerButton}
            >
              <Ionicons 
                name={isPreviewMode ? "create" : "eye"} 
                size={20} 
                color={isDark ? '#e5e7eb' : '#374151'} 
              />
            </TouchableOpacity>
            
            {hasUnsavedChanges && (
              <View style={styles.unsavedIndicator}>
                <View style={styles.unsavedDot} />
                <Text style={[styles.unsavedText, isDark && styles.darkSubtitle]}>
                  Unsaved
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              onPress={() => saveNote(selectedNote)}
              disabled={saving || !hasUnsavedChanges}
              style={[styles.saveButton, (!hasUnsavedChanges || saving) && styles.saveButtonDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="save" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.editorScroll}>
          {/* Note Title */}
          <TextInput
            style={[styles.titleInput, isDark && styles.darkText]}
            placeholder="Note title..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            value={selectedNote.title}
            onChangeText={handleTitleChange}
            editable={!isPreviewMode}
          />

          {/* Note Meta Info */}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.metaText, isDark && styles.darkSubtitle]}>
                Last edited: {formatLastEdited(selectedNote)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="document-text" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.metaText, isDark && styles.darkSubtitle]}>
                {getWordCount(selectedNote.content)} words
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Text style={[styles.metaText, isDark && styles.darkSubtitle]}>
                {getReadingTime(selectedNote.content)}
              </Text>
            </View>
          </View>

          {/* Note Content */}
          {isPreviewMode ? (
            <View style={[styles.previewContainer, isDark && styles.darkPreviewContainer]}>
              <Text style={[styles.previewTitle, isDark && styles.darkText]}>
                {selectedNote.title || "Untitled Note"}
              </Text>
              <Text style={[styles.previewContent, isDark && styles.darkText]}>
                {selectedNote.content || (
                  <Text style={[styles.placeholderText, isDark && styles.darkSubtitle]}>
                    No content yet. Switch to edit mode to start writing.
                  </Text>
                )}
              </Text>
            </View>
          ) : (
            <TextInput
              style={[styles.contentInput, isDark && styles.darkText]}
              placeholder="Start writing your note... Use # for tags and ** for bold text"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={selectedNote.content}
              onChangeText={handleContentChange}
              multiline={true}
              textAlignVertical="top"
            />
          )}
        </ScrollView>

        {/* Quick Actions Bar */}
        <View style={[styles.actionsBar, isDark && styles.darkActionsBar]}>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="bookmark-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="pricetag-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="download-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.statsText, isDark && styles.darkSubtitle]}>
            {getWordCount(selectedNote.content)} words • {getReadingTime(selectedNote.content)}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  darkContainer: {
    backgroundColor: '#1a202c',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  darkHeader: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  darkText: {
    color: '#f7fafc',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  darkSearchContainer: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#374151',
  },
  notesList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  darkNoteItem: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  selectedNoteItem: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  darkSubtitle: {
    color: '#a0aec0',
  },
  wordCount: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  darkModalContent: {
    backgroundColor: '#2d3748',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteModalButton: {
    backgroundColor: '#dc2626',
  },
  deleteModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Editor Styles
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  unsavedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unsavedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  unsavedText: {
    fontSize: 14,
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  editorScroll: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    minHeight: 400,
  },
  previewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  darkPreviewContainer: {
    backgroundColor: '#2d3748',
    borderColor: '#4a5568',
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  previewContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  placeholderText: {
    fontStyle: 'italic',
    color: '#6b7280',
  },
  actionsBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  darkActionsBar: {
    backgroundColor: '#1f1f1f',
    borderTopColor: '#374151',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});