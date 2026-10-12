import { convert, currencySymbol, formatMoney, initials, pct, timeAgo } from '../lib/format';

describe('currency', () => {
  it('converts DZD to USD using fixed demo rate', () => {
    expect(Math.round(convert(13400, 'USD'))).toBe(100);
  });

  it('formats DZD without decimals and with symbol', () => {
    expect(formatMoney(46000, 'DZD')).toContain('د.ج');
    expect(formatMoney(46000, 'DZD')).toContain('46,000');
  });

  it('formats USD with symbol', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(formatMoney(13400, 'USD')).toContain('$');
  });

  it('computes percentages', () => {
    expect(pct(50, 100)).toBe(50);
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 0)).toBe(0);
  });

  it('derives initials', () => {
    expect(initials('Lina Kaddour')).toBe('LK');
    expect(initials('sofiane')).toBe('S');
  });

  it('formats relative time', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 36e5).toISOString();
    expect(timeAgo(twoHoursAgo)).toContain('2h');
  });
});
