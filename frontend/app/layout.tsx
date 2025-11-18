import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { FolderProvider } from './contexts/FolderContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bordio - Task Management',
  description: 'Manage your tasks efficiently with Bordio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <FolderProvider>
            {children}
          </FolderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}