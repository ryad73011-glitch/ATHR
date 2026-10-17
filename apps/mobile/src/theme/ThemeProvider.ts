
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import {
  darkTokens,
  fontFamilies,
  lightTokens,
  type ThemeTokens,
} from './tokens';

export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = '@athr/theme-mode';

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

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function ThemeProvider({
  initialMode = 'dark',
  onModeChange,
  children,
}: ThemeProviderProps) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (active && isThemeMode(savedMode)) {
          setModeState(savedMode);
        }
      })
      .catch(() => {
        // Keep the default mode if local storage is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      onModeChange?.(next);

      void AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
        // The theme still changes for the current session.
      });
    },
    [onModeChange],
  );

  const resolved: 'dark' | 'light' =
    mode === 'system'
      ? system === 'light'
        ? 'light'
        : 'dark'
      : mode;

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
    () => ({
      tokens,
      mode,
      resolved,
      setMode,
      fonts,
      isRTL,
      setRTL: setIsRTL,
    }),
    [tokens, mode, resolved, setMode, fonts, isRTL],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
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
