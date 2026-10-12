import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, Platform } from 'react-native';

import { LOCALES, translations, type Locale } from './resources';

export type { Locale };
export { LOCALES };

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

interface LocaleContextValue {
  locale: Locale;
  isRTL: boolean;
  setLocale: (l: Locale) => void;
  t: TFunc;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const NS = 'athr_locale';

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export interface LocaleProviderProps {
  initialLocale?: Locale;
  onLocaleChange?: (locale: Locale, isRTL: boolean) => void;
  children: React.ReactNode;
}

export function LocaleProvider({ initialLocale = 'en', onLocaleChange, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const isRTL = LOCALES.find((l) => l.code === locale)?.rtl ?? false;
  const mounted = useRef(false);

  const applySideEffects = useCallback(
    (l: Locale, rtl: boolean) => {
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          document.documentElement.dir = rtl ? 'rtl' : 'ltr';
          document.documentElement.lang = l;
        }
      } else {
        // Native RTL requires a reload to fully apply layout mirroring.
        try {
          I18nManager.allowRTL(rtl);
          I18nManager.forceRTL(rtl);
        } catch {
          /* noop */
        }
      }
      AsyncStorage.setItem(NS, l).catch(() => undefined);
      onLocaleChange?.(l, rtl);
    },
    [onLocaleChange],
  );

  useEffect(() => {
    AsyncStorage.getItem(NS)
      .then((stored) => {
        if (stored && (stored === 'en' || stored === 'ar' || stored === 'fr')) {
          setLocaleState(stored as Locale);
          applySideEffects(stored as Locale, stored === 'ar');
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    applySideEffects(locale, isRTL);
  }, [locale, isRTL, applySideEffects]);

  const setLocale = useCallback(
    (l: Locale) => {
      const rtl = LOCALES.find((x) => x.code === l)?.rtl ?? false;
      setLocaleState(l);
      applySideEffects(l, rtl);
    },
    [applySideEffects],
  );

  const t = useCallback<TFunc>(
    (key, vars) => {
      const dict = translations[locale] ?? translations.en;
      const template = dict[key] ?? translations.en[key] ?? key;
      return interpolate(template, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, isRTL, setLocale, t }), [locale, isRTL, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: 'en',
      isRTL: false,
      setLocale: () => undefined,
      t: (key, vars) => interpolate(translations.en[key] ?? key, vars),
    };
  }
  return ctx;
}
