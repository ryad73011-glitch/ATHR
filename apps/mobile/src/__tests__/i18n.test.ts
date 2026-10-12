import { LOCALES, translations } from '../i18n/resources';

describe('i18n resources', () => {
  const enKeys = Object.keys(translations.en).sort();

  it('declares en, ar, fr', () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual(['ar', 'en', 'fr']);
  });

  it('marks Arabic as RTL and others LTR', () => {
    expect(LOCALES.find((l) => l.code === 'ar')?.rtl).toBe(true);
    expect(LOCALES.find((l) => l.code === 'en')?.rtl).toBe(false);
    expect(LOCALES.find((l) => l.code === 'fr')?.rtl).toBe(false);
  });

  it.each(['ar', 'fr'])('%s has full key parity with en', (loc) => {
    const keys = Object.keys(translations[loc as 'ar' | 'fr']).sort();
    expect(keys).toEqual(enKeys);
  });

  it('has no empty strings', () => {
    for (const loc of ['en', 'ar', 'fr'] as const) {
      for (const [, v] of Object.entries(translations[loc])) {
        expect(v.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
