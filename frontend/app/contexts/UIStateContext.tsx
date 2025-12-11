"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIStateContextType {
    isTaskDetailOpen: boolean;
    setIsTaskDetailOpen: (open: boolean) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function UIStateProvider({ children }: { children: ReactNode }) {
    const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

    return (
        <UIStateContext.Provider value={{ isTaskDetailOpen, setIsTaskDetailOpen }}>
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
