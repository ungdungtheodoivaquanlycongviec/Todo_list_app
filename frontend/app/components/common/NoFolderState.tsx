"use client";

import React, { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import { useFolder } from '../../contexts/FolderContext';
import { useAuth } from '../../contexts/AuthContext';

export default function NoFolderState() {
  const { createFolder } = useFolder();
  const { currentGroup } = useAuth();
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      await createFolder(folderName.trim());
      setFolderName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <FolderPlus className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Folders Yet
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {currentGroup
            ? `Create your first folder in "${currentGroup.name}" to start organizing your tasks and notes.`
            : 'Create a folder to start organizing your tasks and notes.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full bg-white dark:bg-[#2E2E2E] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!folderName.trim() || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" />
                Create Folder
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

