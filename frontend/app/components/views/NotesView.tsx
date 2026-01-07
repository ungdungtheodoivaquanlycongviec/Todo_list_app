"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Indent } from '../../extensions/IndentExtension';
import { FontSize } from '../../extensions/FontSizeExtension';
import {
  Plus,
  Search,
  Trash2,
  Save,
  MoreVertical,
  Clock,
  FileText,
  Edit3,
  Bookmark,
  BookmarkCheck,
  Tag,
  MoreHorizontal,
  FolderOpen,
  Star,
  Download,
  Share2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { notesService, Note } from '../../services/notes.service';
import { useGroupChange } from '../../hooks/useGroupChange';
import { useAuth } from '../../contexts/AuthContext';
import { useFolder } from '../../contexts/FolderContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRegional } from '../../contexts/RegionalContext';
import NoGroupState from '../common/NoGroupState';
import NoFolderState from '../common/NoFolderState';
import { FormattingToolbar, EditorRuler } from '../common/FormattingToolbar';
import { ShareNoteModal } from '../notes/ShareNoteModal';
import '../common/editor.css';

export default function NotesView() {
  const { currentGroup } = useAuth();
  const { currentFolder } = useFolder();
  const { t } = useLanguage();
  const { formatDate } = useRegional();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // State for share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingNote, setSharingNote] = useState(false);

  // Ref to track the current selected note ID (avoids stale closure issues)
  const selectedNoteIdRef = React.useRef<string | null>(null);
  // Ref to prevent onUpdate from firing during note switch
  const isSwitchingNoteRef = React.useRef(false);

  // Container ref and width for ruler
  const editorPaperRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // Tiptap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: t('notes.noteContentPlaceholder') }),
      Typography,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Indent,
    ],
    content: selectedNote?.content || '',
    editable: !isPreviewMode,
    immediatelyRender: false, // Required for SSR/Next.js compatibility
    onUpdate: ({ editor }) => {
      // Don't update if we're in the middle of switching notes
      if (isSwitchingNoteRef.current) return;
      // Use the ref to get current note ID
      if (selectedNoteIdRef.current) {
        handleContentChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor prose prose-lg max-w-none focus:outline-none min-h-[400px]',
      },
    },
  });

  // Track editor container width for ruler
  useEffect(() => {
    const updateWidth = () => {
      if (editorPaperRef.current) {
        setContainerWidth(editorPaperRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [selectedNote]);

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Sync editor content when selectedNote changes
  useEffect(() => {
    if (editor && selectedNote) {
      // Update the ref
      selectedNoteIdRef.current = selectedNote._id || null;
      // Set switching flag before content update
      isSwitchingNoteRef.current = true;
      editor.commands.setContent(selectedNote.content || '');
      // Clear flag after a short delay to allow the update to complete
      setTimeout(() => {
        isSwitchingNoteRef.current = false;
      }, 50);
    } else {
      selectedNoteIdRef.current = null;
    }
  }, [selectedNote?._id, editor]);

  // Listen for global group change events
  useGroupChange(() => {
    console.log('Group change detected, reloading NotesView');
    loadNotes();
  });

  // Load notes with search
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedNotes = await notesService.getAllNotes(searchQuery, 1, 50, currentFolder?._id);
      setNotes(fetchedNotes);

      // Select first note if current selection is not available
      if (fetchedNotes.length === 0) {
        setSelectedNote(null);
      } else if (!selectedNote || !fetchedNotes.find(note => note._id === selectedNote._id)) {
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
    }
  }, [searchQuery, selectedNote, currentFolder?._id]);

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
        content: "",
        folderId: currentFolder?._id
      });
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNoteClick = (note: Note) => {
    // Don't do anything if clicking the same note
    if (selectedNote?._id === note._id) return;

    // Save current note in background (don't await)
    if (hasUnsavedChanges && selectedNote) {
      // Fire and forget - save runs in background
      notesService.updateNote(selectedNote._id!, {
        title: selectedNote.title,
        content: selectedNote.content,
      }).then(updatedNote => {
        // Update the notes list with saved version
        setNotes(prev => prev.map(n => n._id === updatedNote._id ? updatedNote : n));
      }).catch(err => {
        console.error('Error auto-saving note:', err);
      });
    }

    // Switch immediately
    isSwitchingNoteRef.current = true;
    setSelectedNote(note);
    setHasUnsavedChanges(false);
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
      // Content includes per-paragraph indent styling in HTML
      const updatedNote = await notesService.updateNote(note._id, {
        title: note.title,
        content: note.content,
      });

      setNotes(notes.map(n => n._id === note._id ? updatedNote : n));
      setSelectedNote(updatedNote);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving note:', error);
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
        setSelectedNote(notes.length > 1 ? notes.find(n => n._id !== noteId) || null : null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Toggle bookmark status
  const handleToggleBookmark = async () => {
    if (!selectedNote?._id) return;
    try {
      const updatedNote = await notesService.toggleBookmark(selectedNote._id);
      setNotes(notes.map(n => n._id === updatedNote._id ? updatedNote : n));
      setSelectedNote(updatedNote);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Update sharing settings
  const handleUpdateSharing = async (visibility: 'private' | 'folder' | 'specific', sharedWith: string[]) => {
    if (!selectedNote?._id) return;
    try {
      setSharingNote(true);
      const updatedNote = await notesService.updateSharing(selectedNote._id, visibility, sharedWith);
      setNotes(notes.map(n => n._id === updatedNote._id ? updatedNote : n));
      setSelectedNote(updatedNote);
      setShowShareModal(false);
    } catch (error) {
      console.error('Error updating sharing:', error);
    } finally {
      setSharingNote(false);
    }
  };

  // Download note as DOCX (Word-compatible HTML)
  const handleDownloadDocx = () => {
    if (!selectedNote) return;

    // Create a Word-compatible HTML document
    const htmlContent = `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${selectedNote.title || 'Untitled Note'}</title>
        <style>
          body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; }
          h1 { font-size: 24pt; margin-bottom: 12pt; }
          h2 { font-size: 18pt; margin-bottom: 10pt; }
          h3 { font-size: 14pt; margin-bottom: 8pt; }
          p { margin-bottom: 8pt; }
        </style>
      </head>
      <body>
        <h1>${selectedNote.title || 'Untitled Note'}</h1>
        ${selectedNote.content || '<p>No content</p>'}
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-word' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNote.title || 'note'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      return t('time.today');
    } else if (diffDays === 2) {
      return t('time.yesterday');
    } else if (diffDays <= 7) {
      return t('time.daysAgo', { count: diffDays - 1 });
    } else {
      return formatDate(date);
    }
  };

  const getWordCount = (content: string) => {
    // Strip HTML tags for accurate word count
    const textContent = content.replace(/<[^>]*>/g, ' ').trim();
    return textContent ? textContent.split(/\s+/).filter(word => word.length > 0).length : 0;
  };

  // Helper to strip HTML tags for preview text
  const stripHtmlTags = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')  // Replace tags with space
      .replace(/&nbsp;/g, ' ')   // Replace &nbsp;
      .replace(/&amp;/g, '&')    // Replace &amp;
      .replace(/&lt;/g, '<')     // Replace &lt;
      .replace(/&gt;/g, '>')     // Replace &gt;
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .trim();
  };

  const getReadingTime = (content: string) => {
    const words = getWordCount(content);
    const minutes = Math.ceil(words / 200);
    return minutes === 0 ? t('notes.lessThanMinRead') : `${minutes} ${t('notes.minRead')}`;
  };

  // Check if user has a current group
  if (!currentGroup) {
    return (
      <NoGroupState
        title={t('groups.joinOrCreate')}
        description={t('groups.joinOrCreateDesc')}
      />
    );
  }

  // Check if user has a current folder
  if (!currentFolder) {
    return <NoFolderState />;
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-700 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-80'} flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <div className="flex flex-col gap-1 transition-opacity duration-500 ease-in-out">
                <h1 className="text-2xl font-bold text-gray-900">{t('notes.title')}</h1>
                {currentFolder && (
                  <span className="text-xs text-gray-500">
                    {t('notes.folder')}: <span className="font-medium text-gray-700">{currentFolder.name}</span>
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600 transition-transform duration-500" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600 transition-transform duration-500" />
              )}
            </button>
          </div>

          {/* Search and New Note - Animate out when collapsed */}
          <div className={`transition-all duration-700 ease-in-out overflow-hidden ${sidebarCollapsed ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'
            }`}>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('notes.searchNotes')}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleAddNote}
                disabled={saving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300 hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap">{t('notes.newNote')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notes List - Animate out when collapsed */}
        <div className={`flex-1 transition-all duration-700 ease-in-out overflow-hidden ${sidebarCollapsed ? 'max-h-0 opacity-0' : 'max-h-full opacity-100'
          }`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm">{t('notes.loadingNotes')}</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-4 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm mb-2">
                {searchQuery ? t('notes.noNotesFound') : t('notes.noNotes')}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddNote}
                  className="text-blue-500 hover:text-blue-600 font-medium text-sm"
                >
                  {t('notes.addFirstNote')}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-300 group relative ${selectedNote?._id === note._id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  onClick={() => handleNoteClick(note)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {note.isBookmarked && (
                        <BookmarkCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <h3 className="font-semibold text-gray-900 truncate">
                        {note.title || "Untitled Note"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note._id!);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {note.content && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                      {stripHtmlTags(note.content) || t('notes.noContent')}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatLastEdited(note)}</span>
                    </div>
                    {note.content && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {getWordCount(note.content)} {t('notes.words')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimal view when collapsed */}
        {sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleAddNote}
              disabled={saving}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center disabled:opacity-50 transition-all duration-300 hover:shadow-md"
              title={t('notes.newNote')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col transition-all duration-500 ease-in-out">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300"
                    title={isPreviewMode ? t('notes.editMode') : t('notes.previewMode')}
                  >
                    {isPreviewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="text-sm text-gray-500 transition-opacity duration-300">
                    {isPreviewMode ? t('notes.previewing') : t('notes.editing')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 text-sm text-orange-500 transition-all duration-300">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      {t('notes.unsavedChanges')}
                    </div>
                  )}

                  <button
                    onClick={() => saveNote(selectedNote)}
                    disabled={saving || !hasUnsavedChanges}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-md font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? t('notes.saving') : t('common.save')}
                  </button>

                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note Title */}
              <input
                type="text"
                placeholder={t('notes.noteTitlePlaceholder')}
                className="w-full text-3xl font-bold text-gray-900 border-none focus:outline-none placeholder-gray-400 bg-transparent transition-all duration-300"
                value={selectedNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                readOnly={isPreviewMode}
              />

              {/* Note Meta */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 transition-opacity duration-300">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {t('notes.lastEdited')}: {formatLastEdited(selectedNote)}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {getWordCount(selectedNote.content)} {t('notes.words')}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {getReadingTime(selectedNote.content)}
                </div>
              </div>
            </div>

            {/* Formatting Toolbar - only show in edit mode */}
            {!isPreviewMode && editor && (
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                <FormattingToolbar editor={editor} />
              </div>
            )}

            {/* Note Content */}
            <div className="flex-1 overflow-auto transition-all duration-300 bg-gray-100">
              {isPreviewMode ? (
                <div className="max-w-4xl mx-auto p-8 prose prose-lg transition-all duration-500">
                  <div className="bg-white rounded-xl p-8 border border-gray-200 transition-all duration-300 hover:shadow-sm">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6 transition-colors duration-300">
                      {selectedNote.title || t('notes.untitled')}
                    </h1>
                    <div
                      className="rich-text-editor text-gray-700 leading-relaxed text-lg transition-colors duration-300"
                      dangerouslySetInnerHTML={{ __html: selectedNote.content || `<p class="text-gray-400 italic">${t('notes.noContentPreview')}</p>` }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  ref={editorPaperRef}
                  className="max-w-4xl mx-auto px-8 py-6 transition-all duration-300"
                >
                  {/* Editor paper area with visible border */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                    {/* Word-style ruler with per-paragraph indent control */}
                    <EditorRuler
                      editor={editor}
                      containerWidth={containerWidth}
                    />
                    {/* Editor content - indent styling is per-paragraph via Tiptap */}
                    <div
                      className="min-h-[500px] p-6"
                      onKeyDown={(e) => {
                        // Prevent Tab from moving focus outside editor
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          e.stopPropagation();
                          if (editor) {
                            // If in a list, use native list sink/lift for nested lists
                            if (editor.isActive('listItem')) {
                              if (e.shiftKey) {
                                editor.commands.liftListItem('listItem');
                              } else {
                                editor.commands.sinkListItem('listItem');
                              }
                            } else {
                              // Non-list content uses custom indent
                              if (e.shiftKey) {
                                editor.commands.decreaseIndent();
                              } else {
                                editor.commands.increaseIndent();
                              }
                            }
                          }
                        }
                      }}
                    >
                      <div className="rich-text-editor-container">
                        <EditorContent editor={editor} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-white border-t border-gray-200 p-4 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Bookmark Button */}
                  <button
                    tabIndex={-1}
                    onClick={handleToggleBookmark}
                    className={`p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110 ${selectedNote?.isBookmarked ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    title={selectedNote?.isBookmarked ? t('notes.removeBookmark') : t('notes.addBookmark')}
                  >
                    {selectedNote?.isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  {/* Tag Button - only show if note has tags */}
                  {selectedNote?.tags && selectedNote.tags.length > 0 && (
                    <button
                      tabIndex={-1}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110"
                      title={t('notes.manageTags')}
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                  )}

                  {/* Share Button */}
                  <button
                    tabIndex={-1}
                    onClick={() => setShowShareModal(true)}
                    className={`p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110 ${selectedNote?.visibility !== 'private' ? 'text-green-500' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    title={t('notes.shareNote')}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  {/* Download Button */}
                  <button
                    tabIndex={-1}
                    onClick={handleDownloadDocx}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110"
                    title={t('notes.downloadDocx')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 transition-opacity duration-300">
                  <span>{getWordCount(selectedNote.content)} {t('notes.words')}</span>
                  <span>•</span>
                  <span>{getReadingTime(selectedNote.content)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 transition-all duration-500">
            <FileText className="w-24 h-24 text-gray-300 mb-6 transition-all duration-700" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2 transition-colors duration-300">
              {t('notes.noNoteSelected')}
            </h2>
            <p className="text-gray-500 mb-6 text-center max-w-md transition-colors duration-300">
              {notes.length === 0
                ? t('notes.getStarted')
                : t('notes.selectOrCreate')
              }
            </p>
            <button
              onClick={handleAddNote}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all duration-500 hover:shadow-lg transform hover:scale-105 font-medium"
            >
              <Plus className="w-5 h-5" />
              {saving ? t('notes.creating') : t('notes.createNewNote')}
            </button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && selectedNote && (
        <ShareNoteModal
          note={selectedNote}
          folder={currentFolder}
          members={currentGroup?.members || []}
          onClose={() => setShowShareModal(false)}
          onSave={handleUpdateSharing}
          saving={sharingNote}
        />
      )}
    </div>
  );
}