import React, { createContext, useContext, useState, ReactNode } from 'react';

// --- 1. ĐỊNH NGHĨA TYPES (Giữ nguyên như Web) ---
interface UIStateContextType {
  // Trạng thái mở Modal chi tiết Task (thường dùng cho Custom Modal hoặc BottomSheet)
  isTaskDetailOpen: boolean;
  setIsTaskDetailOpen: (open: boolean) => void;

  // ID Task đang chờ xử lý từ thông báo (Push Notification)
  pendingTaskIdFromNotification: string | null;
  setPendingTaskIdFromNotification: (taskId: string | null) => void;

  // ID Chat đang chờ xử lý từ thông báo
  pendingConversationIdFromNotification: string | null;
  setPendingConversationIdFromNotification: (conversationId: string | null) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

// --- 2. PROVIDER ---
export function UIStateProvider({ children }: { children: ReactNode }) {
  // State quản lý Modal
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  // State quản lý Deep Link / Notification
  const [pendingTaskIdFromNotification, setPendingTaskIdFromNotification] = useState<string | null>(null);
  const [pendingConversationIdFromNotification, setPendingConversationIdFromNotification] = useState<string | null>(null);

  return (
    <UIStateContext.Provider
      value={{
        isTaskDetailOpen,
        setIsTaskDetailOpen,
        pendingTaskIdFromNotification,
        setPendingTaskIdFromNotification,
        pendingConversationIdFromNotification,
        setPendingConversationIdFromNotification,
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

// --- 3. HOOK (Custom Hook để dùng gọn hơn) ---
export function useUIState() {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
}