"use client"

import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';

interface Note {
  id: number;
  title: string;
  content: string;
  lastEdited: string;
  isNew?: boolean;
}

export default function NotesView() {
  // TODO: Replace with API calls
  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      title: "New note",
      content: "",
      lastEdited: "Today",
      isNew: true
    },
    {
      id: 2,
      title: "Normal text",
      content: "Normal text content goes here...",
      lastEdited: "Yesterday"
    }
  ]);

  const [selectedNote, setSelectedNote] = useState<Note>(notes[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddNote = () => {
    // TODO: Connect to backend API
    console.log('Add new note - connect to API');
    const newNote: Note = {
      id: Date.now(),
      title: "New note",
      content: "",
      lastEdited: "Today",
      isNew: true
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
  };

  const handleTitleChange = (newTitle: string) => {
    // TODO: Connect to backend API
    setSelectedNote({
      ...selectedNote,
      title: newTitle
    });
    
    // Update in notes list
    setNotes(notes.map(note => 
      note.id === selectedNote.id ? { ...note, title: newTitle } : note
    ));
  };

  const handleContentChange = (newContent: string) => {
    // TODO: Connect to backend API
    setSelectedNote({
      ...selectedNote,
      content: newContent
    });
    
    // Update in notes list
    setNotes(notes.map(note => 
      note.id === selectedNote.id ? { ...note, content: newContent } : note
    ));
  };

  const formatLastEdited = () => {
    if (selectedNote.lastEdited === "Today") {
      return "Today";
    } else if (selectedNote.lastEdited === "Yesterday") {
      return "Yesterday";
    } else {
      return selectedNote.lastEdited;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <button 
          onClick={handleAddNote}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add new
        </button>
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
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedNote?.id === note.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
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
                  {note.lastEdited}
                </div>
              </div>
            ))}
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
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  Last edited: {formatLastEdited()}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a note to view or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}