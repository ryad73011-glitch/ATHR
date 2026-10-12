/**
 * ATHR design tokens — the single source of truth for colour, type and space.
 *
 * Philosophy: dark charcoal canvas, cream typography, one metallic accent.
 * Two style universes are represented by their own accents:
 *   CALM  → warm sand   (old money, quiet luxury, minimalism, smart casual)
 *   CHAOS → vermilion   (streetwear, experimental, urban culture)
 */

export const palette = {
  ink900: '#0B0B0C',
  ink800: '#101012',
  ink700: '#16161A',
  ink600: '#1D1D22',
  ink500: '#26262C',
  hairline: '#2E2E35',

  cream100: '#F6F2EA',
  cream200: '#EFE9DE',
  cream300: '#DCD4C6',
  cream400: '#B4AC9E',
  cream500: '#8C857A',
  cream600: '#5F5A52',

  gold: '#C8A96A',
  goldSoft: '#8E7944',

  calm: '#C8B79B',
  calmDeep: '#8A7B62',
  chaos: '#E2503F',
  chaosDeep: '#96301F',

  success: '#6FA98A',
  warning: '#D9A441',
  danger: '#D9544D',
  info: '#7FA7C4',

  overlay: 'rgba(11,11,12,0.72)',
  scrim: 'rgba(0,0,0,0.55)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type Palette = typeof palette;

export interface ThemeTokens {
  dark: boolean;
  bg: string;
  bgElevated: string;
  bgSunken: string;
  surface: string;
  surfacePressed: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textOnAccent: string;
  accent: string;
  accentSoft: string;
  calm: string;
  chaos: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  skeleton: string;
  overlay: string;
}

export const darkTokens: ThemeTokens = {
  dark: true,
  bg: palette.ink900,
  bgElevated: palette.ink700,
  bgSunken: palette.ink800,
  surface: palette.ink700,
  surfacePressed: palette.ink600,
  border: palette.hairline,
  borderStrong: palette.ink500,
  text: palette.cream100,
  textMuted: palette.cream400,
  textFaint: palette.cream500,
  textOnAccent: palette.ink900,
  accent: palette.gold,
  accentSoft: palette.goldSoft,
  calm: palette.calm,
  chaos: palette.chaos,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
  skeleton: palette.ink600,
  overlay: palette.overlay,
};

/**
 * ATHR is a cinematic dark product. A light theme exists so the design system
 * is genuinely tokenised rather than hard-coded, and so high-contrast /
 * accessibility overrides have something to build on.
 */
export const lightTokens: ThemeTokens = {
  dark: false,
  bg: '#F7F4EE',
  bgElevated: '#FFFFFF',
  bgSunken: '#EFEAE1',
  surface: '#FFFFFF',
  surfacePressed: '#EDE8DF',
  border: '#DED7CA',
  borderStrong: '#C9C1B2',
  text: '#121214',
  textMuted: '#5C564D',
  textFaint: '#8A8378',
  textOnAccent: '#121214',
  accent: '#8E7944',
  accentSoft: '#C8A96A',
  calm: '#7C6E55',
  chaos: '#B33A2B',
  success: '#3F7A5A',
  warning: '#9A6F17',
  danger: '#A93832',
  info: '#3E6480',
  skeleton: '#E4DED3',
  overlay: 'rgba(247,244,238,0.8)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export interface FontFamilies {
  display: string;
  displayBold: string;
  sans: string;
  sansMedium: string;
  sansBold: string;
  arabic: string;
  arabicBold: string;
}

export const fontFamilies: FontFamilies = {
  display: 'PlayfairDisplay_600SemiBold',
  displayBold: 'PlayfairDisplay_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  arabic: 'Cairo_400Regular',
  arabicBold: 'Cairo_700Bold',
};

export const fontSize = {
  caption: 11,
  small: 13,
  body: 15,
  lead: 17,
  title: 20,
  headline: 26,
  display: 34,
  hero: 44,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  header: 20,
  tabbar: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

export const duration = {
  instant: 90,
  fast: 160,
  base: 260,
  slow: 460,
  cinematic: 780,
} as const;

export const easing = {
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
  emphasize: [0.2, 0, 0.2, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
};

/** Universes drive discovery, battle framing and studio tone. */
export const universes = {
  CALM: {
    key: 'CALM' as const,
    accent: palette.calm,
    deep: palette.calmDeep,
  },
  CHAOS: {
    key: 'CHAOS' as const,
    accent: palette.chaos,
    deep: palette.chaosDeep,
  },
};
