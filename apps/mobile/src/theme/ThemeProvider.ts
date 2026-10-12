import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { darkTokens, fontFamilies, lightTokens, type ThemeTokens } from './tokens';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  tokens: ThemeTokens;
  mode: ThemeMode;
  resolved: 'dark' | 'light';
  setMode: (mode: ThemeMode) => void;
  fonts: typeof fontFamilies;
  isRTL: boolean;
  setRTL: (rtl: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  initialMode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
  children: React.ReactNode;
}

/**
 * Provides colour tokens + typography. Typography resolves to the Arabic
 * families automatically when RTL is on, which keeps every text component
 * free of per-screen font branching.
 */
export function ThemeProvider({ initialMode = 'dark', onModeChange, children }: ThemeProviderProps) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  // ATHR ships dark-first; RTL follows the active locale (set by the i18n layer).
  const [isRTL, setIsRTL] = useState<boolean>(false);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      onModeChange?.(next);
    },
    [onModeChange],
  );

  const resolved: 'dark' | 'light' = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const tokens = resolved === 'dark' ? darkTokens : lightTokens;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = tokens.bg;
      document.documentElement.style.colorScheme = resolved;
    }
  }, [tokens.bg, resolved]);

  const fonts = useMemo<typeof fontFamilies>(
    () =>
      isRTL
        ? ({
            display: fontFamilies.arabicBold,
            displayBold: fontFamilies.arabicBold,
            sans: fontFamilies.arabic,
            sansMedium: fontFamilies.arabicBold,
            sansBold: fontFamilies.arabicBold,
            arabic: fontFamilies.arabic,
            arabicBold: fontFamilies.arabicBold,
          } as typeof fontFamilies)
        : fontFamilies,
    [isRTL],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ tokens, mode, resolved, setMode, fonts, isRTL, setRTL: setIsRTL }),
    [tokens, mode, resolved, setMode, fonts, isRTL],
  );

  // createElement keeps this file .ts (no JSX) so it can be imported from tests.
  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so isolated component tests do not crash.
    return {
      tokens: darkTokens,
      mode: 'dark',
      resolved: 'dark',
      setMode: () => undefined,
      fonts: fontFamilies,
      isRTL: false,
      setRTL: () => undefined,
    };
  }
  return ctx;
}

export function useTokens(): ThemeTokens {
  return useTheme().tokens;
}
