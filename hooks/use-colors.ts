/**
 * useColors – returns the full design-system color palette for the active theme.
 */
import { useColorScheme } from './use-color-scheme';

const DARK = {
  background:  '#0d1117',
  surface:     '#161b22',
  surfaceHigh: '#1c2128',
  border:      '#30363d',
  primary:     '#00D4FF',
  primaryDark: '#0099bb',
  secondary:   '#7C3AED',
  foreground:  '#e6edf3',
  muted:       '#8b949e',
  success:     '#3fb950',
  warning:     '#d29922',
  error:       '#f85149',
  overlay:     'rgba(0,0,0,0.6)',
};

const LIGHT = {
  background:  '#ffffff',
  surface:     '#f6f8fa',
  surfaceHigh: '#eaeef2',
  border:      '#d0d7de',
  primary:     '#0969da',
  primaryDark: '#0550ae',
  secondary:   '#7C3AED',
  foreground:  '#1f2328',
  muted:       '#656d76',
  success:     '#1a7f37',
  warning:     '#9a6700',
  error:       '#cf222e',
  overlay:     'rgba(0,0,0,0.4)',
};

export type AppColors = typeof DARK;

export function useColors(): AppColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK : LIGHT;
}
