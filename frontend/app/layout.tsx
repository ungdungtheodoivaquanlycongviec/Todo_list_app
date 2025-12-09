import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { FolderProvider } from './contexts/FolderContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { RegionalProvider } from './contexts/RegionalContext';

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
    <html lang="en" className="light">
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            <RegionalProvider>
              <FolderProvider>
                {children}
              </FolderProvider>
            </RegionalProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}