import type { Currency } from '../data/types';

/**
 * Demo conversion table (1 unit of currency = X DZD). In live mode these come
 * from a configured provider; here they are fixed sample rates so totals are
 * consistent. All amounts in the catalogue are stored in DZD.
 */
export const RATES_TO_DZD: Record<Currency, number> = {
  DZD: 1,
  USD: 134,
  EUR: 145,
  GBP: 170,
};

export function toDZD(amount: number, from: Currency): number {
  return amount * (RATES_TO_DZD[from] ?? 1);
}

export function convert(amountDZD: number, to: Currency): number {
  const rate = RATES_TO_DZD[to] ?? 1;
  return amountDZD / rate;
}

const SYMBOLS: Record<Currency, string> = {
  DZD: 'د.ج',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function currencySymbol(c: Currency): string {
  return SYMBOLS[c];
}

/**
 * Format an amount that is stored in DZD into the viewer's preferred currency.
 * Keeps thousands separators and avoids fake precision (no decimals for DZD).
 */
export function formatMoney(amountDZD: number, to: Currency = 'DZD'): string {
  const value = convert(amountDZD, to);
  const rounded = to === 'DZD' ? Math.round(value) : Math.round(value * 100) / 100;
  const num = rounded.toLocaleString('en-US', { maximumFractionDigits: to === 'DZD' ? 0 : 2 });
  return `${num} ${SYMBOLS[to]}`;
}

export function formatCompact(amountDZD: number, to: Currency = 'DZD'): string {
  const value = convert(amountDZD, to);
  if (to === 'DZD' && value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

export function formatDate(iso: string, locale = 'en'): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(iso: string, locale = 'en'): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string, locale = 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const t = (n: number, en: string, fr: string, ar: string) => (locale === 'fr' ? fr.replace('%d', String(n)) : locale === 'ar' ? ar.replace('%d', String(n)) : en.replace('%d', String(n)));
  if (mins < 1) return t(0, 'now', 'maintenant', 'الآن');
  if (mins < 60) return t(mins, '%dm ago', 'il y a %d min', 'منذ %d د');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t(hours, '%dh ago', 'il y a %d h', 'منذ %d س');
  const days = Math.floor(hours / 24);
  if (days < 7) return t(days, '%dd ago', 'il y a %d j', 'منذ %d ي');
  return formatDate(iso, locale);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
