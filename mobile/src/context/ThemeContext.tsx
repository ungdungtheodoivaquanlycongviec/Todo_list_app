import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  currentTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'auto',
  setTheme: () => {},
  isDark: false,
  currentTheme: 'light'
});

// 👇 1. SỬA QUAN TRỌNG: Thêm chữ 'export' vào đây để AppNavigator import được { ThemeProvider }
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('auto');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setTheme(savedTheme as Theme);
      } else {
        setTheme('auto');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      setTheme('auto');
    } finally {
      setIsReady(true);
    }
  };

  const handleSetTheme = async (newTheme: Theme) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const currentTheme = theme === 'auto' ? (systemColorScheme || 'light') : theme;
  const isDark = currentTheme === 'dark';

  useEffect(() => {
    if (isReady) {
      console.log('Current theme:', currentTheme);
    }
  }, [currentTheme, isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme: handleSetTheme, 
      isDark, 
      currentTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 2. Giữ export default để an toàn (nếu có file nào lỡ import kiểu default)
export default ThemeProvider;

export const useTheme = () => useContext(ThemeContext);