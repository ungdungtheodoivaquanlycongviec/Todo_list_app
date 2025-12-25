// File: src/i18n/dateLocales.ts (Dành cho Mobile - React Native)

import { Language } from '../types/auth.types'; // Giả định đường dẫn import này đúng

// --- HẰNG SỐ CỤC BỘ HÓA TÊN THÁNG ---

export const monthNames: Record<Language, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June',
       'July', 'August', 'September', 'October', 'November', 'December'],
  vi: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
       'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
};

export const monthNamesShort: Record<Language, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  vi: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6',
       'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']
};

// --- HẰNG SỐ CỤC BỘ HÓA TÊN NGÀY ---

export const dayNames: Record<Language, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  vi: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
};

export const dayNamesShort: Record<Language, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
};

// --- HÀM TIỆN ÍCH (Giữ nguyên logic) ---

export const getMonthName = (monthIndex: number, language: Language, short = false): string => {
  const names = short ? monthNamesShort : monthNames;
  return names[language][monthIndex] || names['en'][monthIndex];
};

export const getDayName = (dayIndex: number, language: Language, short = false): string => {
  const names = short ? dayNamesShort : dayNames;
  return names[language][dayIndex] || names['en'][dayIndex];
};

// Hàm này rất quan trọng cho các component lịch (Calendar/DatePicker)
export const getOrderedDayNames = (
  language: Language, 
  weekStart: 'sunday' | 'monday',
  short = false
): string[] => {
  const names = short ? dayNamesShort[language] : dayNames[language];
  if (weekStart === 'sunday') {
    return names;
  }
  // Rotate array to start from Monday
  return [...names.slice(1), names[0]];
};