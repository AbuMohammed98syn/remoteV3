/**
 * RemoteCtrl – Theme Provider
 * Wraps the app with dark/light mode support via AsyncStorage.
 */
import React, {
  createContext, useContext, useState, useCallback,
  useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeColorScheme } from 'react-native';

type ColorScheme = 'dark' | 'light';

const THEME_KEY = 'rc_theme';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useNativeColorScheme() ?? 'dark';
  const [colorScheme, setScheme] = useState<ColorScheme>(systemScheme);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') setScheme(saved);
    });
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setScheme(scheme);
    AsyncStorage.setItem(THEME_KEY, scheme);
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme, setColorScheme]);

  return (
    <ThemeContext.Provider value={{ colorScheme, setColorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside <ThemeProvider>');
  return ctx;
}
