// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { useAuth } from './AuthContext';
import { translations, TranslationKey } from '../i18n/translations';
import { userService } from '../services/user.service'; 
import { Language } from '../types/auth.types';

const ASYNC_STORAGE_KEY = 'app_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 👇 QUAN TRỌNG: Phải có chữ 'export' ở đây
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(false);

  // ... (Giữ nguyên logic bên trong của bạn) ...
  useEffect(() => {
    const initializeLanguage = async () => {
      if (user?.language) {
        setLanguageState(user.language);
        return;
      }
      try {
        const savedLang = await AsyncStorage.getItem(ASYNC_STORAGE_KEY) as Language;
        if (savedLang && ['en', 'vi'].includes(savedLang)) {
          setLanguageState(savedLang);
          return;
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
      setLanguageState('en');
    };
    initializeLanguage();
  }, [user?.language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setIsLoading(true);
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, lang);
      if (user) {
        const updatedUser = await userService.updateLanguage(lang);
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update language:', error);
      const fallbackLang = user?.language || await AsyncStorage.getItem(ASYNC_STORAGE_KEY) as Language || 'en';
      setLanguageState(fallbackLang);
    } finally {
      setIsLoading(false);
    }
  }, [user, setUser]);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const langTranslations = translations[language] as Record<string, string>;
    const enTranslations = translations['en'] as Record<string, string>;
    let text: string = langTranslations?.[key] || enTranslations?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Giữ export default để an toàn
export default LanguageProvider;

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
export type { TranslationKey };