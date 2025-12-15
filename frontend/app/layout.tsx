import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { FolderProvider } from './contexts/FolderContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { RegionalProvider } from './contexts/RegionalContext';
import { UIStateProvider } from './contexts/UIStateContext';
import { TimerProvider } from './contexts/TimerContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SMA - Software Management Application',
  description: 'Software Management Application - Manage your projects, tasks, and teams efficiently',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            <RegionalProvider>
              <FolderProvider>
                <TimerProvider>
                  <UIStateProvider>
                    <ToastProvider>
                      <ConfirmProvider>
                        {children}
                      </ConfirmProvider>
                    </ToastProvider>
                  </UIStateProvider>
                </TimerProvider>
              </FolderProvider>
            </RegionalProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

