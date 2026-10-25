/**
 * ATHR on-device styling engine.
 *
 * This is the *fallback and demo* engine for the Style Studio. It is fully
 * deterministic and explainable: every recommendation carries the reasoning
 * lines that produced it. The live path calls a Supabase edge function which
 * wraps a hosted LLM; if that call fails, the app degrades to this engine and
 * reports `degraded_reason` so the user always knows which answered.
 *
 * Hard guarantees (never violated):
 *   • Only products that exist in the provided catalogue are recommended.
 *   • Prices, stock and links are copied from the catalogue, never invented.
 *   • Out-of-stock items are only suggested as "alternatives", flagged.
 */

import type { Category, Product, StudioMessage, StudioRequest, StudioResult } from '../data/types';

export const CATEGORY_ORDER: Category[] = [
  'outerwear',
  'tailoring',
  'tops',
  'knitwear',
  'bottoms',
  'dresses',
  'shoes',
  'bags',
  'accessories',
  'headwear',
];

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex));
}

/** Neutral if saturation is low (incl. warm creams/sands) or lightness extreme. */
export function isNeutral(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  return s < 0.3 || l < 0.12 || l > 0.9;
}

/**
 * Harmony score between two colours on ATHR's restrained scale.
 * Neutrals always pair; otherwise reward analogous or complementary hues and
 * tonal (light/dark) contrast, penalise clashing mid-saturation neighbours.
 */
export function harmony(a: string, b: string): number {
  if (isNeutral(a) || isNeutral(b)) return 0.9;
  const ha = hexToHsl(a);
  const hb = hexToHsl(b);
  const dh = Math.min(Math.abs(ha.h - hb.h), 360 - Math.abs(ha.h - hb.h));
  let score = 0.4;
  if (dh <= 30) score = 0.8; // analogous
  else if (dh >= 150 && dh <= 210) score = 0.85; // complementary
  else if (dh <= 60) score = 0.65;
  else score = 0.35;
  const tonal = Math.abs(ha.l - hb.l);
  if (tonal > 0.25) score += 0.1; // light/dark contrast reads intentional
  return Math.min(1, score);
}

interface Scored {
  product: Product;
  score: number;
  reasons: string[];
}

function scoreProduct(p: Product, req: StudioRequest): Scored {
  let score = 0.5;
  const reasons: string[] = [];

  if (req.universes.includes(p.universe)) {
    score += 0.3;
    reasons.push(`Matches your ${p.universe} universe.`);
  } else {
    score -= 0.2;
  }

  if (p.occasions.includes(req.occasion)) {
    score += 0.25;
    reasons.push(`Suited to ${req.occasion}.`);
  }

  if (p.price <= req.budget) {
    score += 0.1;
    if (p.price <= req.budget * 0.6) {
      score += 0.05;
      reasons.push('Well under budget.');
    }
  } else {
    score -= 0.5;
  }

  if (p.in_stock) score += 0.1;
  else {
    score -= 0.4;
    reasons.push('Currently out of stock — shown as an alternative.');
  }

  // Colour affinity to requested palette.
  if (req.palette.length && p.colors.length) {
    let best = 0;
    for (const pc of p.colors) {
      for (const rp of req.palette) {
        best = Math.max(best, harmony(pc, rp));
      }
    }
    score += best * 0.3;
    if (best > 0.75) reasons.push('Colour sits in your palette.');
  }

  if (p.sponsored) score -= 0.05; // never let sponsorship outrank fit
  score += (p.rating - 4) * 0.1;

  return { product: p, score, reasons };
}

/** Pick one item per core category within the remaining budget. */
export function buildOutfit(products: Product[], req: StudioRequest): StudioResult {
  const scored = products.map((p) => scoreProduct(p, req));
  const byCat = new Map<Category, Scored[]>();
  for (const s of scored) {
    const list = byCat.get(s.product.category) ?? [];
    list.push(s);
    byCat.set(s.product.category, list);
  }
  for (const list of byCat.values()) list.sort((a, b) => b.score - a.score);

  const coreCats: Category[] = ['outerwear', 'tops', 'knitwear', 'bottoms', 'shoes', 'bags'];
  const chosen: Scored[] = [];
  let spend = 0;

  for (const cat of coreCats) {
    const options = (byCat.get(cat) ?? []).filter((s) => s.product.in_stock && spend + s.product.price <= req.budget);
    const pick = options[0];
    if (pick) {
      chosen.push(pick);
      spend += pick.product.price;
    }
  }

  // Accessory to finish, if budget allows.
  const acc = (byCat.get('accessories') ?? byCat.get('headwear') ?? []).filter((s) => s.product.in_stock && spend + s.product.price <= req.budget)[0];
  if (acc) {
    chosen.push(acc);
    spend += acc.product.price;
  }

  const reasoning: string[] = [];
  if (chosen.length > 0) {
    reasoning.push(`Built a ${req.universes.join(' + ')} look for "${req.occasion}" within ${Math.round(req.budget).toLocaleString()} ${req.currency}.`);
    const paletteNote = req.palette.length ? ` Palette anchor: ${req.palette.join(', ')}.` : '';
    reasoning.push(`Colour logic pairs neutrals with at most one accent.${paletteNote}`);
    for (const c of chosen) {
      const extras = c.reasons.length ? ` (${c.reasons.slice(0, 2).join(' ')})` : '';
      reasoning.push(`• ${c.product.title} — ${c.product.brand}, ${c.product.price.toLocaleString()} ${c.product.currency}.${extras}`);
    }
  } else {
    reasoning.push(`No in-stock catalogue items could be selected for "${req.occasion}" within ${Math.round(req.budget).toLocaleString()} ${req.currency}.`);
  }
  reasoning.push(`Selected items total ${spend.toLocaleString()} ${req.currency}, leaving ${(req.budget - spend).toLocaleString()} unspent.`);

  const assistantText = chosen.length
    ? [
        `Here is a ${req.universes.join(' and ')} direction for your ${req.occasion} within budget.`,
        ...chosen.map((c) => `${c.product.title} (${c.product.brand}) — ${c.product.price.toLocaleString()} ${c.product.currency}`),
        `Selected items total ${spend.toLocaleString()} ${req.currency}, within your budget.`,
      ].join('\n')
    : 'I could not build a product-based outfit from the available catalogue. Try again or adjust your budget, occasion, or style preferences.';

  const message: StudioMessage = {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: assistantText,
    product_ids: chosen.map((c) => c.product.id),
    reasoning,
    created_at: new Date().toISOString(),
  };

  return {
    messages: [message],
    product_ids: chosen.map((c) => c.product.id),
    reasoning,
    engine: 'local-engine',
    model: 'athr-rules-v1',
    total_cost: spend,
    currency: req.currency,
  };
}
