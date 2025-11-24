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
import { useSocket } from '../hooks/useSocket';

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
  const { currentGroup, user } = useAuth();
  const { socket } = useSocket();
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

        // Don't auto-select folder if there are no folders
        const nextFolder =
          folderList.length > 0
            ? (folderList.find(folder => folder._id === storedFolderId) ||
               folderList.find(folder => folder.isDefault) ||
               folderList[0] ||
               null)
            : null;

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

  // Listen for real-time folder updates
  useEffect(() => {
    if (!socket || !currentGroup?._id) return;

    const handleFolderUpdate = (data: {
      eventKey: string;
      folder: Folder;
      groupId: string;
    }) => {
      // Only refresh if the update is for the current group
      if (data.groupId !== currentGroup._id) {
        return;
      }

      const eventKey = data.eventKey;
      const folder = data.folder;

      // Group-level events: created, deleted - refresh for all users
      if (eventKey === 'folder:created' || eventKey === 'folder:deleted') {
        console.log('[FolderContext] Received group-level folder update:', eventKey);
        refreshFolders();
        return;
      }

      // Folder-specific events: updated, membersUpdated - only refresh if user is assigned
      // Note: Backend already filters recipients, but we double-check here for safety
      if (eventKey === 'folder:updated' || eventKey === 'folder:members:updated') {
        if (!folder || !folder.memberAccess) {
          return;
        }
        
        // Check if current user is assigned to this folder
        const isAssigned = folder.memberAccess.some(
          (access: { userId: string }) => access.userId === user?._id
        );

        if (isAssigned) {
          console.log('[FolderContext] Received folder update for assigned folder:', eventKey);
          refreshFolders();
        }
      }
    };

    socket.on('folders:update', handleFolderUpdate);

    return () => {
      socket.off('folders:update', handleFolderUpdate);
    };
  }, [socket, currentGroup?._id, user?._id, refreshFolders]);

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

