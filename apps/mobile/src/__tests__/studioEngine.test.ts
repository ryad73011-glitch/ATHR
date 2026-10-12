import { buildOutfit, harmony, hexToHsl, hexToRgb, isNeutral } from '../lib/studioEngine';
import { demoProducts } from '../data/demo/seed';
import type { StudioRequest } from '../data/types';

const req: StudioRequest = {
  occasion: 'work',
  budget: 150000,
  currency: 'DZD',
  universes: ['CALM'],
  palette: ['#E6DFD2', '#2C2E33'],
  note: '',
};

describe('colour science', () => {
  it('parses hex to rgb', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('classifies neutrals', () => {
    expect(isNeutral('#17181B')).toBe(true);
    expect(isNeutral('#E6DFD2')).toBe(true);
    expect(isNeutral('#C4402F')).toBe(false);
  });

  it('rates neutral pairing and complement highly', () => {
    expect(harmony('#17181B', '#C4402F')).toBeGreaterThanOrEqual(0.85);
    expect(hexToHsl('#C4402F').h).toBeGreaterThan(0);
  });
});

describe('buildOutfit', () => {
  const result = buildOutfit(demoProducts, req);

  it('only recommends real catalogue products', () => {
    const ids = new Set(demoProducts.map((p) => p.id));
    for (const id of result.product_ids) expect(ids.has(id)).toBe(true);
  });

  it('never exceeds the budget', () => {
    expect(result.total_cost).toBeLessThanOrEqual(req.budget);
  });

  it('recommends in-stock items as primary picks', () => {
    const chosen = demoProducts.filter((p) => result.product_ids.includes(p.id));
    for (const p of chosen) expect(p.in_stock).toBe(true);
  });

  it('stays within requested universe and provides reasoning', () => {
    const chosen = demoProducts.filter((p) => result.product_ids.includes(p.id));
    for (const p of chosen) expect(p.universe).toBe('CALM');
    expect(result.reasoning.length).toBeGreaterThan(0);
    expect(result.engine).toBe('local-engine');
  });

  it('respects a tiny budget by returning fewer items, not fake ones', () => {
    const poor = buildOutfit(demoProducts, { ...req, budget: 20000 });
    expect(poor.total_cost).toBeLessThanOrEqual(20000);
    for (const id of poor.product_ids) expect(demoProducts.some((p) => p.id === id)).toBe(true);
  });
});
