"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Save } from 'lucide-react';
import { notesService, Note } from '../../services/notes.service';

export default function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Load notes with search
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
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedNote]);

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
        title: "New note",
        content: ""
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
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && selectedNote && (
            <button
              onClick={() => saveNote(selectedNote)}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button 
            onClick={handleAddNote}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adding...' : 'Add new'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Notes List */}
        <div className="w-80 bg-white rounded-lg border border-gray-200 flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                Loading notes...
              </div>
            ) : notes.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note._id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 group relative ${
                    selectedNote?._id === note._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleNoteClick(note)}
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {note.title}
                  </div>
                  <div className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {note.content || "No text yet"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatLastEdited(note)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note._id!);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Note Editor */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
          {selectedNote ? (
            <>
              {/* Note Title */}
              <div className="p-6 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Title"
                  className="w-full text-2xl font-bold text-gray-900 border-none focus:outline-none placeholder-gray-400"
                  value={selectedNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>

              {/* Note Content */}
              <div className="flex-1 p-6">
                <textarea
                  placeholder="Write your text here..."
                  className="w-full h-full text-gray-700 border-none focus:outline-none resize-none text-lg leading-relaxed"
                  value={selectedNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                />
              </div>

              {/* Last Edited */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Last edited: {formatLastEdited(selectedNote)}
                </div>
                {hasUnsavedChanges && (
                  <div className="text-sm text-orange-500">
                    Unsaved changes
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              {loading ? 'Loading...' : 'Select a note to view or create a new one'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}