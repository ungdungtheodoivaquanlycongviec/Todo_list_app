import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Folder } from '../types/folder.types';
import { folderService } from '../services/folder.service';
import { groupService } from '../services/group.service'; // ✅ Import groupService
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
  updateFolder: (folderId: string, data: Partial<Folder>) => Promise<void>;
}

const FolderContext = createContext<FolderContextValue | undefined>(undefined);

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const { currentGroup, user } = useAuth();
  const { socket } = useSocket();
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ AUTO SELECT STATE: Lưu ID của nhóm mặc định (Personal Workspace)
  const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);

  // Context ID: Group được chọn HOẶC Group mặc định tự tìm thấy
  const contextId = currentGroup?._id || defaultGroupId;

  const storageKey = useMemo(() => {
    if (!contextId) return null;
    return `folder-selection:${contextId}`;
  }, [contextId]);

  // --- 🔥 MAGIC FUNCTION: Tự động tìm & Auto-select Group ---
  const getEffectiveGroupId = useCallback(async () => {
    // 1. Nếu đang chọn group (Manual Select) -> Dùng luôn
    if (currentGroup?._id) return currentGroup._id;

    // 2. Nếu đã Auto-select được trước đó -> Dùng luôn
    if (defaultGroupId) return defaultGroupId;

    try {
      // 3. Gọi API lấy danh sách group
      const response = await groupService.getAllGroups();
      
      const groups = Array.isArray(response) 
        ? response 
        : (response as any).data || (response as any).groups || [];
      
      if (groups.length > 0) {
        // ✅ AUTO SELECT: Lấy group đầu tiên và lưu vào state
        const firstGroupId = groups[0]._id;
        setDefaultGroupId(firstGroupId); // Cache lại để dùng cho UI
        return firstGroupId;
      }
      
      // 4. Nếu chưa có group nào -> Tự tạo "Personal Workspace"
      console.log("Creating default Personal Workspace...");
      const newGroupResponse = await groupService.createGroup({
        name: "Personal Workspace",
        description: "My private notes"
      });
      
      const rawGroup = newGroupResponse as any;
      const newGroupId = rawGroup._id || rawGroup.id || rawGroup.data?._id;

      if (newGroupId) {
          setDefaultGroupId(newGroupId); // Cache lại
          return newGroupId;
      }
      
      // Fallback cuối cùng nếu tạo thất bại nhưng không throw
      throw new Error("Failed to resolve Group ID");

    } catch (err: any) {
      console.error("Cannot resolve group ID:", err);
      
      // Fallback: Nếu lỗi Permission, thử dùng User ID (cho 1 số backend đặc thù)
      if (err.message && (err.message.includes('permission') || err.message.includes('403'))) {
         if (user?._id) return user._id;
      }
      throw err;
    }
  }, [currentGroup, defaultGroupId, user]);

  // --- 1. REFRESH FOLDERS ---
  const refreshFolders = useCallback(
    async (preferredFolderId?: string) => {
      if (!user) {
        setFolders([]);
        setCurrentFolder(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // ✅ Tự động kích hoạt Auto-Select Group tại đây
        const targetId = await getEffectiveGroupId();

        // Gọi service lấy folder
        const response = await folderService.getFolders(targetId);
        
        const rawList = Array.isArray(response) ? response : (response as any).folders || (response as any).data || [];
        const folderList: Folder[] = rawList;
        
        setFolders(folderList);

        const storedFolderId = preferredFolderId || (storageKey ? await AsyncStorage.getItem(storageKey) : null);

        const nextFolder =
          folderList.length > 0
            ? (folderList.find((folder) => folder._id === storedFolderId) ||
               folderList.find((folder) => folder.isDefault) ||
               folderList[0] ||
               null)
            : null;

        setCurrentFolder(nextFolder);

        if (nextFolder && storageKey) {
          await AsyncStorage.setItem(storageKey, nextFolder._id);
        } else if (!nextFolder && storageKey) {
          await AsyncStorage.removeItem(storageKey);
        }

      } catch (err) {
        console.log('Failed to load folders (silent):', err);
        setFolders([]);
        setCurrentFolder(null);
      } finally {
        setLoading(false);
      }
    },
    [user, getEffectiveGroupId, storageKey]
  );

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  // --- 2. SOCKET ---
  useEffect(() => {
    if (!socket) return;

    const handleFolderUpdate = async (data: {
      eventKey: string;
      folder: Folder;
      groupId?: string;
    }) => {
      // Logic: Refresh nếu update thuộc về group đang active (tay hoặc auto)
      const activeId = currentGroup?._id || defaultGroupId;
      
      if (data.groupId && data.groupId === activeId) {
         await refreshFolders(currentFolder?._id);
      } else if (!activeId) {
         await refreshFolders(currentFolder?._id);
      }
    };

    socket.on('folders:update', handleFolderUpdate);
    return () => {
      socket.off('folders:update', handleFolderUpdate);
    };
  }, [socket, currentGroup?._id, defaultGroupId, refreshFolders, currentFolder?._id]);

  // --- 3. ACTIONS ---

  const selectFolder = useCallback(
    async (folderId: string) => {
      const folder = folders.find(item => item._id === folderId) || null;
      setCurrentFolder(folder);
      if (folder && storageKey) {
        await AsyncStorage.setItem(storageKey, folder._id);
      }
    },
    [folders, storageKey]
  );

  // ✅ CREATE FOLDER
  const createFolder = useCallback(
    async (name: string, description?: string) => {
      // Lấy ID (Auto select nếu cần)
      const targetId = await getEffectiveGroupId();
      
      const folder = await folderService.createFolder(targetId, { name, description });
      
      // Refresh list
      // Nếu đang ở đúng group đó thì chỉ cần refresh folder
      if (currentGroup?._id === targetId || defaultGroupId === targetId) {
          await refreshFolders(folder?._id);
      } else {
          // Trường hợp hiếm: vừa tạo group mới xong
          // Delay nhẹ để backend index
          setTimeout(async () => {
             const response = await folderService.getFolders(targetId);
             const list = Array.isArray(response) ? response : (response as any).folders || [];
             setFolders(list);
             if (list.length > 0) setCurrentFolder(list[0]);
          }, 500);
      }
    },
    [getEffectiveGroupId, currentGroup?._id, defaultGroupId, refreshFolders]
  );

  // ✅ UPDATE FOLDER
  const updateFolder = useCallback(
    async (folderId: string, data: Partial<Folder>) => {
      const targetId = await getEffectiveGroupId();
      await folderService.updateFolder(targetId, folderId, data);
      await refreshFolders(currentFolder?._id);
    },
    [getEffectiveGroupId, refreshFolders, currentFolder?._id]
  );

  // ✅ DELETE FOLDER
  const deleteFolder = useCallback(
    async (folderId: string) => {
      const targetId = await getEffectiveGroupId();
      await folderService.deleteFolder(targetId, folderId);
      await refreshFolders();
    },
    [getEffectiveGroupId, refreshFolders]
  );

  const value: FolderContextValue = {
    folders,
    currentFolder,
    loading,
    error,
    refreshFolders,
    selectFolder,
    createFolder,
    deleteFolder,
    updateFolder
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