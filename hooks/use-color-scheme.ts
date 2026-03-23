/**
 * useColorScheme – reads the theme from ThemeProvider, falls back to system.
 */
import { useTheme } from '@/lib/theme-provider';

export function useColorScheme(): 'dark' | 'light' {
  try {
    const { colorScheme } = useTheme();
    return colorScheme;
  } catch {
    return 'dark';
  }
}
