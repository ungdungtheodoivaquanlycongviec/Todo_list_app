'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { translations, TranslationKey } from '../i18n/translations';
import { userService } from '../services/user.service';
import { Language } from '../services/types/auth.types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize language from user or localStorage
  useEffect(() => {
    // Priority: user preference > localStorage > default 'en'
    if (user?.language) {
      setLanguageState(user.language);
      document.documentElement.lang = user.language;
    } else if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as Language;
      if (savedLang && ['en', 'vi'].includes(savedLang)) {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
      }
    }
  }, [user?.language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setIsLoading(true);
    try {
      // Immediately update UI
      setLanguageState(lang);
      document.documentElement.lang = lang;
      
      // Persist to localStorage for non-logged-in state
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang);
      }
      
      // Update on backend if user is logged in
      if (user) {
        const updatedUser = await userService.updateLanguage(lang);
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update language:', error);
      // Revert on error
      setLanguageState(user?.language || 'en');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, setUser]);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    // Get translation for current language, fallback to English, then to key
    const langTranslations = translations[language] as Record<string, string>;
    const enTranslations = translations['en'] as Record<string, string>;
    let text: string = langTranslations?.[key] || enTranslations?.[key] || key;
    
    // Replace parameters like {{count}}, {{name}}
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    }
    
    return text;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    isLoading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Export a type-safe translation function that can be used outside React components
export type { TranslationKey };
