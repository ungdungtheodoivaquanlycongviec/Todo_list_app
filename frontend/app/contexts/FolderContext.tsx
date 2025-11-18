'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Folder } from '../services/types/folder.types';
import { folderService } from '../services/folder.service';
import { useAuth } from './AuthContext';

interface FolderContextValue {
  folders: Folder[];
  currentFolder: Folder | null;
  loading: boolean;
  error: string | null;
  refreshFolders: (preferredFolderId?: string) => Promise<void>;
  selectFolder: (folderId: string) => void;
  createFolder: (name: string, description?: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
}

const FolderContext = createContext<FolderContextValue | undefined>(undefined);

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const { currentGroup } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = useMemo(() => {
    if (!currentGroup?._id) return null;
    return `folder-selection:${currentGroup._id}`;
  }, [currentGroup?._id]);

  const refreshFolders = useCallback(
    async (preferredFolderId?: string) => {
      if (!currentGroup?._id) {
        setFolders([]);
        setCurrentFolder(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await folderService.getFolders(currentGroup._id);
        const folderList = response.folders || [];
        setFolders(folderList);

        const storedFolderId =
          preferredFolderId ||
          (storageKey && typeof window !== 'undefined'
            ? window.localStorage.getItem(storageKey)
            : null);

        const nextFolder =
          folderList.find(folder => folder._id === storedFolderId) ||
          folderList.find(folder => folder.isDefault) ||
          folderList[0] ||
          null;

        setCurrentFolder(nextFolder);

        if (nextFolder && storageKey && typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, nextFolder._id);
        }
      } catch (err) {
        console.error('Failed to load folders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load folders');
        setFolders([]);
        setCurrentFolder(null);
      } finally {
        setLoading(false);
      }
    },
    [currentGroup?._id, storageKey]
  );

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  const selectFolder = useCallback(
    (folderId: string) => {
      const folder = folders.find(item => item._id === folderId) || null;
      setCurrentFolder(folder);
      if (folder && storageKey && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, folder._id);
      }
    },
    [folders, storageKey]
  );

  const createFolder = useCallback(
    async (name: string, description?: string) => {
      if (!currentGroup?._id) return;
      const folder = await folderService.createFolder(currentGroup._id, { name, description });
      await refreshFolders(folder?._id);
    },
    [currentGroup?._id, refreshFolders]
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (!currentGroup?._id) return;
      await folderService.deleteFolder(currentGroup._id, folderId);
      await refreshFolders();
    },
    [currentGroup?._id, refreshFolders]
  );

  const value: FolderContextValue = {
    folders,
    currentFolder,
    loading,
    error,
    refreshFolders,
    selectFolder,
    createFolder,
    deleteFolder
  };

  return <FolderContext.Provider value={value}>{children}</FolderContext.Provider>;
}

export const useFolder = () => {
  const context = useContext(FolderContext);
  if (!context) {
    throw new Error('useFolder must be used within a FolderProvider');
  }
  return context;
};

