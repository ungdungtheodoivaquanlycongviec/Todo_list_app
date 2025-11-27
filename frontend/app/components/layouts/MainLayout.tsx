"use client"

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ToolsSidebar from './ToolsSidebar';
import TopBar from './TopBar';
import ProfileSettings from '../ProfileSettings';
import { User } from '../../services/types/auth.types';
import { useFolder } from '../../contexts/FolderContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Menu, PanelsTopLeft, X } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  user: User;
  onLogout: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export default function MainLayout({ 
  children, 
  activeView, 
  onViewChange,
  user,
  onLogout,
  theme,
  onThemeChange
}: MainLayoutProps) {
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolsSidebarOpen, setIsToolsSidebarOpen] = useState(false);
  const { currentFolder } = useFolder();
  const { t } = useLanguage();
  const hasFolder = !!currentFolder;

  const handleViewChange = (view: string) => {
    if (view === 'profile') {
      setShowProfileSettings(true);
    } else {
      onViewChange(view);
      setShowProfileSettings(false);
    }
  };

  const closeAllPanels = () => {
    setIsSidebarOpen(false);
    setIsToolsSidebarOpen(false);
  };

  const sidebarPanel = (
    <div className="h-full bg-white dark:bg-[#1F1F1F] w-full">
      <Sidebar />
    </div>
  );

  const toolsPanel = (
    <div className="h-full bg-white dark:bg-[#1F1F1F] border-l border-gray-200 dark:border-gray-800 w-full">
      <ToolsSidebar activeView={activeView} onViewChange={handleViewChange} />
    </div>
  );

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <button
            aria-label="Open navigation"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Workspace</p>
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {currentFolder?.name || 'My dashboard'}
            </p>
          </div>
        </div>
        {hasFolder && (
          <button
            aria-label="Open tools"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            onClick={() => setIsToolsSidebarOpen(true)}
          >
            <PanelsTopLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className={`flex-1 min-h-0 w-full lg:grid ${
        hasFolder && !showProfileSettings
          ? 'lg:grid-cols-[240px_72px_minmax(0,1fr)] xl:grid-cols-[260px_100px_minmax(0,1fr)]'
          : 'lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]'
      }`}>
        {/* Sidebar - desktop */}
        <div className="hidden lg:block border-r border-gray-200 dark:border-gray-800">
          {sidebarPanel}
        </div>

        {/* Tools sidebar - desktop */}
        {!showProfileSettings && hasFolder && (
          <div className="hidden lg:block border-r border-gray-200 dark:border-gray-800">
            {toolsPanel}
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          <TopBar 
            user={user} 
            onLogout={onLogout}
            theme={theme}
            onThemeChange={onThemeChange}
            onProfileClick={() => setShowProfileSettings(true)}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            {showProfileSettings ? (
              <div className="h-full overflow-y-auto bg-white dark:bg-gray-900">
                <ProfileSettings onClose={() => setShowProfileSettings(false)} />
              </div>
            ) : (
              <div className="h-full min-h-0 overflow-hidden">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeAllPanels} />
          <div className="relative h-full w-4/5 max-w-sm bg-white dark:bg-[#1F1F1F] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Navigation</p>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={closeAllPanels}
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto">
              {sidebarPanel}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tools Drawer */}
      {isToolsSidebarOpen && hasFolder && !showProfileSettings && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeAllPanels} />
          <div className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-white dark:bg-[#1F1F1F] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('tools.title')}</p>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={closeAllPanels}
                aria-label="Close tools"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto">
              {toolsPanel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}