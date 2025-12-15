// File: contexts/FolderContext.tsx (React Native Version)

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ⚠️ Thay thế localStorage bằng AsyncStorage
import { Folder } from '../types/folder.types';
import { folderService } from '../services/folder.service'; // Giả định service đã sẵn sàng
import { useAuth } from './AuthContext'; // Giả định AuthContext đã sẵn sàng
import { useSocket } from '../hooks/useSocket'; // Giả định useSocket hook đã sẵn sàng

// --- Interfaces (Giữ nguyên) ---

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

// --- Provider Component (Sửa đổi logic lưu trữ) ---

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

        // ⚠️ Thay thế localStorage.getItem bằng AsyncStorage.getItem
        const storedFolderId = preferredFolderId || (storageKey ? await AsyncStorage.getItem(storageKey) : null);

        // Logic tự động chọn folder (giữ nguyên)
        const nextFolder =
          folderList.length > 0
            ? (folderList.find(folder => folder._id === storedFolderId) ||
                folderList.find(folder => folder.isDefault) ||
                folderList[0] ||
                null)
            : null;

        setCurrentFolder(nextFolder);

        // ⚠️ Thay thế localStorage.setItem bằng AsyncStorage.setItem
        if (nextFolder && storageKey) {
          await AsyncStorage.setItem(storageKey, nextFolder._id);
        } else if (!nextFolder && storageKey) {
          await AsyncStorage.removeItem(storageKey);
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
    // Gọi refreshFolders khi group thay đổi hoặc lần đầu mount
    refreshFolders();
  }, [refreshFolders]);

  // Listen for real-time folder updates (Giữ nguyên logic Socket)
  useEffect(() => {
    if (!socket || !currentGroup?._id) return;

    const handleFolderUpdate = (data: {
      eventKey: string;
      folder: Folder;
      groupId: string;
    }) => {
      // Chỉ refresh nếu update là cho group hiện tại
      if (data.groupId !== currentGroup._id) {
        return;
      }

      const eventKey = data.eventKey;
      const folder = data.folder;

      // Group-level events: created, deleted, updated (refresh cho tất cả)
      if (eventKey === 'folder:created' || eventKey === 'folder:deleted') {
        console.log('[FolderContext] Received group-level folder update:', eventKey);
        // Không cần truyền preferredFolderId để tránh ghi đè logic chọn folder mặc định
        refreshFolders(); 
        return;
      }

      // Folder-specific events: updated, membersUpdated
      if (eventKey === 'folder:updated' || eventKey === 'folder:members:updated') {
        if (!folder || !folder.memberAccess) {
          return;
        }

        // Kiểm tra người dùng hiện tại có được gán vào folder này không
        const isAssigned = folder.memberAccess.some(
          (access: { userId: string }) => access.userId === user?._id
        );
        
        // Nếu folder hiện tại bị cập nhật tên/quyền, hoặc người dùng được gán/bỏ gán
        if (isAssigned || (currentFolder?._id === folder._id)) { 
          console.log('[FolderContext] Received folder update for assigned folder or current folder:', eventKey);
          refreshFolders(currentFolder?._id); // Giữ folder hiện tại được chọn nếu có thể
        }
      }
    };

    socket.on('folders:update', handleFolderUpdate);

    return () => {
      socket.off('folders:update', handleFolderUpdate);
    };
  }, [socket, currentGroup?._id, user?._id, refreshFolders, currentFolder?._id]);

  const selectFolder = useCallback(
    async (folderId: string) => {
      const folder = folders.find(item => item._id === folderId) || null;
      setCurrentFolder(folder);
      // ⚠️ Thay thế localStorage.setItem bằng AsyncStorage.setItem
      if (folder && storageKey) {
        await AsyncStorage.setItem(storageKey, folder._id);
      }
    },
    [folders, storageKey]
  );

  const createFolder = useCallback(
    async (name: string, description?: string) => {
      if (!currentGroup?._id) throw new Error('No active group selected.');
      const folder = await folderService.createFolder(currentGroup._id, { name, description });
      // Refresh và cố gắng chọn folder mới tạo
      await refreshFolders(folder?._id);
    },
    [currentGroup?._id, refreshFolders]
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (!currentGroup?._id) throw new Error('No active group selected.');
      await folderService.deleteFolder(currentGroup._id, folderId);
      // Refresh và tự động chọn folder tiếp theo
      await refreshFolders();
    },
    [currentGroup?._id, refreshFolders]
  );

  // --- Giá trị Context (Giữ nguyên) ---

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