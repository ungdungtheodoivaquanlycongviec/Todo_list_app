"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIStateContextType {
  isTaskDetailOpen: boolean;
  setIsTaskDetailOpen: (open: boolean) => void;
  pendingTaskIdFromNotification: string | null;
  setPendingTaskIdFromNotification: (taskId: string | null) => void;
  pendingConversationIdFromNotification: string | null;
  setPendingConversationIdFromNotification: (conversationId: string | null) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
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
        setPendingConversationIdFromNotification
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
}
