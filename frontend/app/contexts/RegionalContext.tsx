'use client';

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { RegionalPreferences } from '../services/types/auth.types';
import { monthNamesShort } from '../i18n/dateLocales';

interface RegionalContextType {
  preferences: RegionalPreferences;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatRelativeDate: (date: Date | string) => string;
  getWeekStartDay: () => 0 | 1; // 0 = Sunday, 1 = Monday
  convertToUserTimezone: (date: Date | string) => Date;
  convertFromUserTimezone: (date: Date) => Date;
  getTimezoneOffset: (tzString?: string) => number;
}

const defaultPreferences: RegionalPreferences = {
  timeZone: 'UTC+00:00',
  dateFormat: 'DD MMM YYYY',
  timeFormat: '24h',
  weekStart: 'monday'
};

const RegionalContext = createContext<RegionalContextType | undefined>(undefined);

export function RegionalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { language } = useLanguage();

  const preferences = useMemo<RegionalPreferences>(() => ({
    ...defaultPreferences,
    ...user?.regionalPreferences
  }), [user?.regionalPreferences]);

  // Parse timezone offset from string like "UTC+07:00" or "UTC-05:00"
  const getTimezoneOffset = useCallback((tzString?: string): number => {
    const tz = tzString || preferences.timeZone;
    const match = tz.match(/UTC([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    return sign * (hours * 60 + minutes);
  }, [preferences.timeZone]);

  const convertToUserTimezone = useCallback((date: Date | string): Date => {
    const d = new Date(date);
    const userOffset = getTimezoneOffset();
    const localOffset = d.getTimezoneOffset();
    const diff = userOffset + localOffset;
    return new Date(d.getTime() + diff * 60 * 1000);
  }, [getTimezoneOffset]);

  const convertFromUserTimezone = useCallback((date: Date): Date => {
    const userOffset = getTimezoneOffset();
    const localOffset = date.getTimezoneOffset();
    const diff = userOffset + localOffset;
    return new Date(date.getTime() - diff * 60 * 1000);
  }, [getTimezoneOffset]);

  const formatDate = useCallback((date: Date | string): string => {
    const d = convertToUserTimezone(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.getMonth();
    const year = d.getFullYear();
    
    const monthNum = (month + 1).toString().padStart(2, '0');
    // Use localized month names based on current language
    const monthName = monthNamesShort[language][month];
    
    switch (preferences.dateFormat) {
      case 'DD MMM YYYY':
        return `${day} ${monthName} ${year}`;
      case 'MMM DD, YYYY':
        return `${monthName} ${day}, ${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${monthNum}/${year}`;
      case 'MM/DD/YYYY':
        return `${monthNum}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${monthNum}-${day}`;
      default:
        return `${day} ${monthName} ${year}`;
    }
  }, [convertToUserTimezone, preferences.dateFormat, language]);

  const formatTime = useCallback((date: Date | string): string => {
    const d = convertToUserTimezone(date);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    if (preferences.timeFormat === '24h') {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
  }, [convertToUserTimezone, preferences.timeFormat]);

  const formatDateTime = useCallback((date: Date | string): string => {
    return `${formatDate(date)} ${formatTime(date)}`;
  }, [formatDate, formatTime]);

  const formatRelativeDate = useCallback((date: Date | string): string => {
    const d = convertToUserTimezone(date);
    const now = convertToUserTimezone(new Date());
    
    // Reset time to compare dates only
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = dateOnly.getTime() - todayOnly.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    const labels = {
      en: { today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow' },
      vi: { today: 'Hôm nay', yesterday: 'Hôm qua', tomorrow: 'Ngày mai' }
    };
    
    const lang = labels[language] || labels.en;
    
    if (diffDays === 0) return lang.today;
    if (diffDays === -1) return lang.yesterday;
    if (diffDays === 1) return lang.tomorrow;
    
    return formatDate(date);
  }, [convertToUserTimezone, formatDate, language]);

  const getWeekStartDay = useCallback((): 0 | 1 => {
    return preferences.weekStart === 'sunday' ? 0 : 1;
  }, [preferences.weekStart]);

  const value = useMemo(() => ({
    preferences,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeDate,
    getWeekStartDay,
    convertToUserTimezone,
    convertFromUserTimezone,
    getTimezoneOffset
  }), [
    preferences,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeDate,
    getWeekStartDay,
    convertToUserTimezone,
    convertFromUserTimezone,
    getTimezoneOffset
  ]);

  return (
    <RegionalContext.Provider value={value}>
      {children}
    </RegionalContext.Provider>
  );
}

export function useRegional() {
  const context = useContext(RegionalContext);
  if (context === undefined) {
    throw new Error('useRegional must be used within a RegionalProvider');
  }
  return context;
}
