"use client"

import React, { useState, useEffect, useCallback } from 'react';
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
import NoGroupState from '../common/NoGroupState';
import NoFolderState from '../common/NoFolderState';

export default function NotesView() {
  const { currentGroup } = useAuth();
  const { currentFolder } = useFolder();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, []);

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
    if (hasUnsavedChanges && selectedNote) {
      saveNote(selectedNote);
    }
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
      const updatedNote = await notesService.updateNote(note._id, {
        title: note.title,
        content: note.content
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

  // Check if user has a current folder
  if (!currentFolder) {
    return <NoFolderState />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-700 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-80'} flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <div className="flex flex-col gap-1 transition-opacity duration-500 ease-in-out">
                <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
                {currentFolder && (
                  <span className="text-xs text-gray-500">
                    Folder: <span className="font-medium text-gray-700">{currentFolder.name}</span>
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
          <div className={`transition-all duration-700 ease-in-out overflow-hidden ${
            sidebarCollapsed ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'
          }`}>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
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
                <span className="whitespace-nowrap">New Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notes List - Animate out when collapsed */}
        <div className={`flex-1 transition-all duration-700 ease-in-out overflow-hidden ${
          sidebarCollapsed ? 'max-h-0 opacity-0' : 'max-h-full opacity-100'
        }`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-4 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm mb-2">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleAddNote}
                  className="text-blue-500 hover:text-blue-600 font-medium text-sm"
                >
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all duration-300 group relative ${
                    selectedNote?._id === note._id 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                  onClick={() => handleNoteClick(note)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
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
                      {note.content.replace(/#[^\s]+/g, '').trim() || "No content yet"}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatLastEdited(note)}</span>
                    </div>
                    {note.content && (
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {getWordCount(note.content)} words
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
              title="New Note"
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
                    title={isPreviewMode ? 'Edit mode' : 'Preview mode'}
                  >
                    {isPreviewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="text-sm text-gray-500 transition-opacity duration-300">
                    {isPreviewMode ? 'Previewing' : 'Editing'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 text-sm text-orange-500 transition-all duration-300">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      Unsaved changes
                    </div>
                  )}
                  
                  <button
                    onClick={() => saveNote(selectedNote)}
                    disabled={saving || !hasUnsavedChanges}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-md font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>

                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note Title */}
              <input
                type="text"
                placeholder="Note title..."
                className="w-full text-3xl font-bold text-gray-900 border-none focus:outline-none placeholder-gray-400 bg-transparent transition-all duration-300"
                value={selectedNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                readOnly={isPreviewMode}
              />

              {/* Note Meta */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 transition-opacity duration-300">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Last edited: {formatLastEdited(selectedNote)}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {getWordCount(selectedNote.content)} words
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {getReadingTime(selectedNote.content)}
                </div>
              </div>
            </div>

            {/* Note Content */}
            <div className="flex-1 overflow-auto transition-all duration-300">
              {isPreviewMode ? (
                <div className="max-w-4xl mx-auto p-8 prose prose-lg transition-all duration-500">
                  <div className="bg-white rounded-xl p-8 border border-gray-200 transition-all duration-300 hover:shadow-sm">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6 transition-colors duration-300">
                      {selectedNote.title || "Untitled Note"}
                    </h1>
                    <div className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap transition-colors duration-300">
                      {selectedNote.content || (
                        <div className="text-gray-400 italic">No content yet. Switch to edit mode to start writing.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto p-8 transition-all duration-300">
                  <textarea
                    placeholder="Start writing your note... Use # for tags and ** for bold text"
                    className="w-full h-full min-h-[500px] text-gray-700 border-none focus:outline-none resize-none text-lg leading-relaxed bg-transparent placeholder-gray-400 transition-all duration-300"
                    value={selectedNote.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-white border-t border-gray-200 p-4 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
                    <Bookmark className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
                    <Tag className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500 transition-opacity duration-300">
                  <span>{getWordCount(selectedNote.content)} words</span>
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
              No note selected
            </h2>
            <p className="text-gray-500 mb-6 text-center max-w-md transition-colors duration-300">
              {notes.length === 0 
                ? "Get started by creating your first note to capture your thoughts and ideas."
                : "Select a note from the sidebar or create a new one to start editing."
              }
            </p>
            <button
              onClick={handleAddNote}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all duration-500 hover:shadow-lg transform hover:scale-105 font-medium"
            >
              <Plus className="w-5 h-5" />
              {saving ? 'Creating...' : 'Create New Note'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}