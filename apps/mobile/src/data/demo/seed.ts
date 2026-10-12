/**
 * Deterministic demo catalogue.
 *
 * WHY THIS EXISTS
 * ---------------
 * ATHR runs in two modes:
 *   • LIVE  — reads/writes Supabase (see `supabase/migrations`)
 *   • DEMO  — reads this seeded, in-memory catalogue
 *
 * Demo mode is what lets the whole app be exercised (search, filters, looks,
 * battles, voting, wardrobe, studio, merchant dashboard, admin) before any
 * credentials exist. Everything sourced from here is labelled in the UI as
 * sample data, and demo products intentionally carry **no** affiliate URLs:
 * ATHR never presents a fabricated price, stock count or purchase link as real.
 *
 * Brand names below are fictional ATHR sample merchants, not real companies.
 */

import type {
  AppNotification,
  AuditLog,
  Battle,
  Category,
  Comment,
  Currency,
  EditorialStory,
  Look,
  LookItem,
  Merchant,
  Occasion,
  Product,
  Profile,
  Report,
  Universe,
} from '../types';

/** Tiny deterministic PRNG (mulberry32) so every launch shows the same data. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_CURRENCY: Currency = 'DZD';

export const demoUsers: Profile[] = [
  {
    id: 'usr_demo_self',
    email: 'you@athr.app',
    handle: 'you',
    display_name: 'You',
    avatar_url: null,
    bio: 'Building a wardrobe that outlives the season.',
    city: 'Algiers',
    role: 'user',
    universe_pref: null,
    preferred_locale: 'en',
    followers: 12,
    following: 34,
    verified: false,
    premium: false,
    created_at: '2026-01-08T09:00:00.000Z',
  },
  {
    id: 'usr_editor_1',
    email: 'lina@athr.app',
    handle: 'lina.k',
    display_name: 'Lina Kaddour',
    avatar_url: null,
    bio: 'Style editor. Old money, quietly.',
    city: 'Oran',
    role: 'editor',
    universe_pref: 'CALM',
    preferred_locale: 'fr',
    followers: 18400,
    following: 210,
    verified: true,
    premium: true,
    created_at: '2025-09-02T09:00:00.000Z',
  },
  {
    id: 'usr_editor_2',
    email: 'sofiane@athr.app',
    handle: 'sofiane',
    display_name: 'Sofiane B.',
    avatar_url: null,
    bio: 'Streetwear archivist. Chaos, documented.',
    city: 'Constantine',
    role: 'editor',
    universe_pref: 'CHAOS',
    preferred_locale: 'ar',
    followers: 24120,
    following: 388,
    verified: true,
    premium: true,
    created_at: '2025-10-11T09:00:00.000Z',
  },
  {
    id: 'usr_creator_3',
    email: 'amira@athr.app',
    handle: 'amira.wears',
    display_name: 'Amira S.',
    avatar_url: null,
    bio: 'Tailoring, travel, and too much beige.',
    city: 'Annaba',
    role: 'user',
    universe_pref: 'CALM',
    preferred_locale: 'en',
    followers: 4310,
    following: 502,
    verified: false,
    premium: false,
    created_at: '2025-12-19T09:00:00.000Z',
  },
  {
    id: 'usr_creator_4',
    email: 'yanis@athr.app',
    handle: 'yanis',
    display_name: 'Yanis R.',
    avatar_url: null,
    bio: 'Layering is a personality.',
    city: 'Algiers',
    role: 'user',
    universe_pref: 'CHAOS',
    preferred_locale: 'fr',
    followers: 2870,
    following: 640,
    verified: false,
    premium: true,
    created_at: '2026-02-01T09:00:00.000Z',
  },
];

export const demoMerchants: Merchant[] = [
  {
    id: 'mch_maison_sable',
    slug: 'maison-sable',
    name: 'Maison Sable',
    logo_url: null,
    cover_url: null,
    description: 'Quiet luxury tailoring cut in Algiers. Undyed wool, horn buttons, no logos.',
    city: 'Algiers',
    country: 'DZ',
    verified: true,
    approved: true,
    plan: 'flagship',
    rating: 4.8,
    review_count: 312,
    affiliate_network: null,
    commission_rate: 0.08,
    product_count: 9,
    created_at: '2025-08-14T09:00:00.000Z',
  },
  {
    id: 'mch_nord_loom',
    slug: 'nord-loom',
    name: 'Nord Loom',
    logo_url: null,
    cover_url: null,
    description: 'Merino and heavy cotton knitwear. Built for ten winters, not one season.',
    city: 'Béjaïa',
    country: 'DZ',
    verified: true,
    approved: true,
    plan: 'growth',
    rating: 4.6,
    review_count: 188,
    affiliate_network: null,
    commission_rate: 0.07,
    product_count: 8,
    created_at: '2025-09-30T09:00:00.000Z',
  },
  {
    id: 'mch_atlas_denim',
    slug: 'atlas-denim',
    name: 'Atlas Denim Co.',
    logo_url: null,
    cover_url: null,
    description: 'Raw selvedge denim and workwear, washed by hand in Oran.',
    city: 'Oran',
    country: 'DZ',
    verified: true,
    approved: true,
    plan: 'growth',
    rating: 4.7,
    review_count: 245,
    affiliate_network: null,
    commission_rate: 0.09,
    product_count: 8,
    created_at: '2025-11-02T09:00:00.000Z',
  },
  {
    id: 'mch_kasbah_studio',
    slug: 'kasbah-studio',
    name: 'Kasbah Studio',
    logo_url: null,
    cover_url: null,
    description: 'Experimental cuts, deconstructed outerwear, one-off runs of forty pieces.',
    city: 'Algiers',
    country: 'DZ',
    verified: true,
    approved: true,
    plan: 'starter',
    rating: 4.4,
    review_count: 96,
    affiliate_network: null,
    commission_rate: 0.1,
    product_count: 8,
    created_at: '2026-01-18T09:00:00.000Z',
  },
  {
    id: 'mch_cote_seize',
    slug: 'cote-seize',
    name: 'Côte 16',
    logo_url: null,
    cover_url: null,
    description: 'Coastal smart casual. Linen shirts and unstructured blazers for heat.',
    city: 'Tipaza',
    country: 'DZ',
    verified: false,
    approved: true,
    plan: 'starter',
    rating: 4.3,
    review_count: 61,
    affiliate_network: null,
    commission_rate: 0.06,
    product_count: 8,
    created_at: '2026-03-05T09:00:00.000Z',
  },
  {
    id: 'mch_sahel_thread',
    slug: 'sahel-thread',
    name: 'Sahel Thread',
    logo_url: null,
    cover_url: null,
    description: 'Leather goods and footwear, vegetable-tanned and resoleable.',
    city: 'Sétif',
    country: 'DZ',
    verified: false,
    approved: true,
    plan: 'free',
    rating: 4.5,
    review_count: 133,
    affiliate_network: null,
    commission_rate: 0.05,
    product_count: 9,
    created_at: '2026-04-22T09:00:00.000Z',
  },
  {
    id: 'mch_pending_review',
    slug: 'atelier-nord',
    name: 'Atelier Nord',
    logo_url: null,
    cover_url: null,
    description: 'Pending merchant application — used to exercise the approval queue.',
    city: 'Tlemcen',
    country: 'DZ',
    verified: false,
    approved: false,
    plan: 'free',
    rating: 0,
    review_count: 0,
    affiliate_network: null,
    commission_rate: 0.05,
    product_count: 0,
    created_at: '2026-09-28T09:00:00.000Z',
  },
];

/** Colour vocabulary used by the palette filters and the SVG cover renderer. */
export const demoSwatches = [
  { name: 'Bone', hex: '#E6DFD2' },
  { name: 'Camel', hex: '#C08E52' },
  { name: 'Sand', hex: '#D6C6A8' },
  { name: 'Olive', hex: '#6B7050' },
  { name: 'Slate', hex: '#5A6270' },
  { name: 'Charcoal', hex: '#2C2E33' },
  { name: 'Ink', hex: '#17181B' },
  { name: 'Vermilion', hex: '#C4402F' },
  { name: 'Ecru', hex: '#EDE6D6' },
  { name: 'Chocolate', hex: '#4A3527' },
  { name: 'Fog', hex: '#B7BCC1' },
  { name: 'Rust', hex: '#8E4A2A' },
];

interface Template {
  title: string;
  category: Category;
  base: number;
  universe: Universe;
  occasions: Occasion[];
  colors: string[];
  brand: string;
  note: string;
}

const templates: Template[] = [
  // --- CALM -----------------------------------------------------------------
  { title: 'Unstructured Wool Blazer', category: 'tailoring', base: 32000, universe: 'CALM', occasions: ['work', 'evening'], colors: ['Charcoal', 'Camel', 'Slate'], brand: 'Maison Sable', note: 'Half-lined, patch pockets, soft shoulder.' },
  { title: 'Pleated Wide-Leg Trouser', category: 'bottoms', base: 18500, universe: 'CALM', occasions: ['work', 'everyday'], colors: ['Bone', 'Ink', 'Olive'], brand: 'Maison Sable', note: 'Single pleat, side adjusters.' },
  { title: 'Silk-Cotton Camp Shirt', category: 'tops', base: 11200, universe: 'CALM', occasions: ['cafe', 'travel'], colors: ['Ecru', 'Sand', 'Fog'], brand: 'Côte 16', note: 'Open collar, falls unbuttoned over knitwear.' },
  { title: 'Cashmere Crewneck', category: 'knitwear', base: 27000, universe: 'CALM', occasions: ['everyday', 'work'], colors: ['Bone', 'Camel', 'Slate'], brand: 'Nord Loom', note: '12-gauge, fully fashioned.' },
  { title: 'Linen Overshirt', category: 'outerwear', base: 14800, universe: 'CALM', occasions: ['travel', 'cafe'], colors: ['Sand', 'Olive', 'Bone'], brand: 'Côte 16', note: 'Washes down beautifully.' },
  { title: 'Suede Chelsea Boot', category: 'shoes', base: 29500, universe: 'CALM', occasions: ['work', 'evening'], colors: ['Chocolate', 'Charcoal'], brand: 'Sahel Thread', note: 'Blake stitched, resoleable.' },
  { title: 'Structured Leather Tote', category: 'bags', base: 34000, universe: 'CALM', occasions: ['work', 'travel'], colors: ['Chocolate', 'Ink'], brand: 'Sahel Thread', note: 'Vegetable-tanned, brass hardware.' },
  { title: 'Merino Roll Neck', category: 'knitwear', base: 16500, universe: 'CALM', occasions: ['work', 'everyday'], colors: ['Ink', 'Bone', 'Olive'], brand: 'Nord Loom', note: 'Fine gauge, no bulk under a blazer.' },
  { title: 'Wool Overcoat', category: 'outerwear', base: 46000, universe: 'CALM', occasions: ['evening', 'work'], colors: ['Camel', 'Charcoal'], brand: 'Maison Sable', note: 'Single-breasted, knee length.' },
  { title: 'Cotton Poplin Shirt', category: 'tops', base: 8900, universe: 'CALM', occasions: ['work', 'wedding'], colors: ['Ecru', 'Fog'], brand: 'Côte 16', note: 'Mother-of-pearl buttons.' },
  { title: 'Leather Derby Shoe', category: 'shoes', base: 26000, universe: 'CALM', occasions: ['work', 'wedding'], colors: ['Chocolate', 'Ink'], brand: 'Sahel Thread', note: 'Goodyear welt.' },
  { title: 'Silk Pocket Square Set', category: 'accessories', base: 4200, universe: 'CALM', occasions: ['wedding', 'evening'], colors: ['Bone', 'Vermilion', 'Olive'], brand: 'Maison Sable', note: 'Hand-rolled edges.' },
  // --- CHAOS ----------------------------------------------------------------
  { title: 'Boxy Heavyweight Hoodie', category: 'tops', base: 13500, universe: 'CHAOS', occasions: ['street', 'everyday'], colors: ['Ink', 'Fog', 'Vermilion'], brand: 'Atlas Denim Co.', note: '420gsm, dropped shoulder.' },
  { title: 'Raw Selvedge Jean', category: 'bottoms', base: 19800, universe: 'CHAOS', occasions: ['street', 'everyday'], colors: ['Ink', 'Slate'], brand: 'Atlas Denim Co.', note: '14.5oz, straight through the thigh.' },
  { title: 'Deconstructed Shell Jacket', category: 'outerwear', base: 38500, universe: 'CHAOS', occasions: ['street', 'travel'], colors: ['Charcoal', 'Olive', 'Rust'], brand: 'Kasbah Studio', note: 'Exposed seams, asymmetric zip.' },
  { title: 'Cargo Pant, Tapered', category: 'bottoms', base: 17200, universe: 'CHAOS', occasions: ['street', 'travel'], colors: ['Olive', 'Ink', 'Sand'], brand: 'Kasbah Studio', note: 'Six pockets, drawcord hem.' },
  { title: 'Graphic Long Sleeve', category: 'tops', base: 8600, universe: 'CHAOS', occasions: ['street', 'cafe'], colors: ['Bone', 'Ink'], brand: 'Kasbah Studio', note: 'Screen-printed, runs small.' },
  { title: 'Chunky Trail Sneaker', category: 'shoes', base: 24500, universe: 'CHAOS', occasions: ['street', 'sport'], colors: ['Fog', 'Charcoal'], brand: 'Atlas Denim Co.', note: 'Lugged outsole.' },
  { title: 'Nylon Crossbody Bag', category: 'bags', base: 9800, universe: 'CHAOS', occasions: ['street', 'travel'], colors: ['Ink', 'Rust'], brand: 'Kasbah Studio', note: 'Water resistant, quick-release buckle.' },
  { title: 'Corduroy Trucker Jacket', category: 'outerwear', base: 21000, universe: 'CHAOS', occasions: ['street', 'everyday'], colors: ['Chocolate', 'Olive', 'Bone'], brand: 'Atlas Denim Co.', note: 'Wide wale, blanket lined.' },
  { title: 'Ribbed Beanie', category: 'headwear', base: 3400, universe: 'CHAOS', occasions: ['street', 'everyday'], colors: ['Vermilion', 'Ink', 'Fog'], brand: 'Atlas Denim Co.', note: 'Fisherman fold.' },
  { title: 'Padded Work Vest', category: 'outerwear', base: 15800, universe: 'CHAOS', occasions: ['street', 'everyday'], colors: ['Charcoal', 'Rust'], brand: 'Kasbah Studio', note: 'Quilted, layered over everything.' },
  { title: 'Utility Belt Bag', category: 'bags', base: 7200, universe: 'CHAOS', occasions: ['street', 'sport'], colors: ['Ink', 'Olive'], brand: 'Sahel Thread', note: 'Full-grain leather, webbing strap.' },
  { title: 'Oversized Knit Cardigan', category: 'knitwear', base: 18900, universe: 'CHAOS', occasions: ['street', 'cafe'], colors: ['Bone', 'Sand'], brand: 'Nord Loom', note: 'Hand-finished, intentionally slouchy.' },
  { title: 'Waxed Canvas Rucksack', category: 'bags', base: 22500, universe: 'CHAOS', occasions: ['travel', 'street'], colors: ['Olive', 'Chocolate'], brand: 'Sahel Thread', note: 'Roll-top, leather trims.' },
  { title: 'Silver Chain Necklace', category: 'accessories', base: 6800, universe: 'CHAOS', occasions: ['street', 'evening'], colors: ['Fog'], brand: 'Kasbah Studio', note: 'Solid, tarnish resistant.' },
  { title: 'Track Pant, Side Stripe', category: 'bottoms', base: 11400, universe: 'CHAOS', occasions: ['sport', 'street'], colors: ['Ink', 'Slate'], brand: 'Atlas Denim Co.', note: 'Tapered, zip ankle.' },
  { title: 'Structured Cap', category: 'headwear', base: 4600, universe: 'CHAOS', occasions: ['street', 'sport'], colors: ['Ink', 'Bone', 'Vermilion'], brand: 'Atlas Denim Co.', note: 'Six panel, brass clasp.' },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const merchantByBrand: Record<string, string> = {
  'Maison Sable': 'mch_maison_sable',
  'Nord Loom': 'mch_nord_loom',
  'Atlas Denim Co.': 'mch_atlas_denim',
  'Kasbah Studio': 'mch_kasbah_studio',
  'Côte 16': 'mch_cote_seize',
  'Sahel Thread': 'mch_sahel_thread',
};

/** Build the catalogue: one product per template × colourway, deterministic. */
export function buildDemoProducts(): Product[] {
  const rng = makeRng(20260101);
  const out: Product[] = [];
  let n = 0;
  for (const t of templates) {
    for (const colorName of t.colors) {
      n += 1;
      const swatch = demoSwatches.find((s) => s.name === colorName) ?? demoSwatches[0];
      const drift = 1 + (rng() - 0.5) * 0.06;
      const price = Math.round((t.base * drift) / 100) * 100;
      const discounted = rng() > 0.82;
      const inStock = rng() > 0.12;
      out.push({
        id: `prd_${slugify(t.title)}_${slugify(colorName)}`.replace(/[^a-z0-9_]/g, ''),
        merchant_id: merchantByBrand[t.brand] ?? 'mch_maison_sable',
        merchant_name: t.brand,
        title: t.title,
        brand: t.brand,
        category: t.category,
        universe: t.universe,
        price,
        compare_at_price: discounted ? Math.round((price * 1.28) / 100) * 100 : null,
        currency: DEMO_CURRENCY,
        colors: [swatch.hex],
        sizes: t.category === 'accessories' || t.category === 'bags' ? ['One size'] : ['XS', 'S', 'M', 'L', 'XL'],
        // Demo catalogue ships with no image URLs on purpose — covers are drawn
        // locally from the palette so nothing hotlinks to unlicensed photos.
        images: [],
        affiliate_url: null,
        checkout_type: 'contact',
        in_stock: inStock,
        stock_count: inStock ? Math.floor(rng() * 24) + 1 : 0,
        occasions: t.occasions,
        sponsored: n % 17 === 0,
        rating: Math.round((3.9 + rng() * 1.1) * 10) / 10,
        created_at: new Date(Date.UTC(2026, 0, 1) + n * 36e5 * 9).toISOString(),
        description: `${t.note} Sample catalogue entry from the ATHR demo dataset.`,
      });
    }
  }
  return out;
}

export const demoProducts: Product[] = buildDemoProducts();

function itemFrom(p: Product, role: string, rng: () => number): LookItem {
  return {
    product_id: p.id,
    role,
    title: p.title,
    brand: p.brand,
    price: p.price,
    currency: p.currency,
    color: p.colors[0] ?? '#888888',
    category: p.category,
    image: null,
    affiliate_url: null,
    in_stock: p.in_stock,
    alternatives: demoProducts
      .filter((x) => x.category === p.category && x.id !== p.id)
      .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
      .slice(0, Math.min(3, 2 + Math.floor(rng() * 2)))
      .map((x) => x.id),
  };
}

interface LookSpec {
  id: string;
  title: string;
  universe: Universe;
  occasion: Occasion;
  author: string;
  palette: string[];
  note: string;
  tags: string[];
  pick: { role: string; title: string; color: string }[];
}

const lookSpecs: LookSpec[] = [
  {
    id: 'look_quiet_monday',
    title: 'Quiet Monday',
    universe: 'CALM',
    occasion: 'work',
    author: 'usr_editor_1',
    palette: ['#E6DFD2', '#2C2E33', '#4A3527'],
    note: 'Three neutrals, one texture contrast. The blazer does the talking, so nothing else needs to.',
    tags: ['office', 'tailoring', 'neutral'],
    pick: [
      { role: 'Outerwear', title: 'Unstructured Wool Blazer', color: 'Charcoal' },
      { role: 'Knit', title: 'Merino Roll Neck', color: 'Bone' },
      { role: 'Trouser', title: 'Pleated Wide-Leg Trouser', color: 'Ink' },
      { role: 'Shoe', title: 'Leather Derby Shoe', color: 'Chocolate' },
      { role: 'Bag', title: 'Structured Leather Tote', color: 'Chocolate' },
    ],
  },
  {
    id: 'look_coast_off',
    title: 'Coast, Off Duty',
    universe: 'CALM',
    occasion: 'cafe',
    author: 'usr_creator_3',
    palette: ['#D6C6A8', '#EDE6D6', '#6B7050'],
    note: 'Linen over knitwear for the hour when the sea breeze arrives. Sand on sand, olive as the full stop.',
    tags: ['linen', 'weekend', 'summer'],
    pick: [
      { role: 'Shirt', title: 'Silk-Cotton Camp Shirt', color: 'Ecru' },
      { role: 'Knit', title: 'Cashmere Crewneck', color: 'Camel' },
      { role: 'Trouser', title: 'Pleated Wide-Leg Trouser', color: 'Bone' },
      { role: 'Shoe', title: 'Suede Chelsea Boot', color: 'Chocolate' },
    ],
  },
  {
    id: 'look_archive_walk',
    title: 'Archive Walk',
    universe: 'CHAOS',
    occasion: 'street',
    author: 'usr_editor_2',
    palette: ['#17181B', '#5A6270', '#B7BCC1'],
    note: 'Raw denim, heavyweight cotton, nothing soft. Proportion is the only statement here.',
    tags: ['denim', 'streetwear', 'layering'],
    pick: [
      { role: 'Top', title: 'Boxy Heavyweight Hoodie', color: 'Ink' },
      { role: 'Jacket', title: 'Corduroy Trucker Jacket', color: 'Chocolate' },
      { role: 'Jean', title: 'Raw Selvedge Jean', color: 'Ink' },
      { role: 'Shoe', title: 'Chunky Trail Sneaker', color: 'Fog' },
      { role: 'Bag', title: 'Nylon Crossbody Bag', color: 'Ink' },
    ],
  },
  {
    id: 'look_after_rain',
    title: 'After Rain',
    universe: 'CHAOS',
    occasion: 'travel',
    author: 'usr_creator_4',
    palette: ['#2C2E33', '#6B7050', '#8E4A2A'],
    note: 'Shell jacket over a padded vest — two layers that work harder than one warm one.',
    tags: ['utility', 'travel', 'layering'],
    pick: [
      { role: 'Shell', title: 'Deconstructed Shell Jacket', color: 'Charcoal' },
      { role: 'Vest', title: 'Padded Work Vest', color: 'Rust' },
      { role: 'Pant', title: 'Cargo Pant, Tapered', color: 'Olive' },
      { role: 'Shoe', title: 'Chunky Trail Sneaker', color: 'Charcoal' },
      { role: 'Bag', title: 'Waxed Canvas Rucksack', color: 'Olive' },
    ],
  },
  {
    id: 'look_second_wedding',
    title: 'Second Wedding',
    universe: 'CALM',
    occasion: 'wedding',
    author: 'usr_editor_1',
    palette: ['#E6DFD2', '#5A6270', '#C08E52'],
    note: 'Formal without a uniform. Camel coat over slate, pocket square as the only colour.',
    tags: ['formal', 'wedding', 'coat'],
    pick: [
      { role: 'Coat', title: 'Wool Overcoat', color: 'Camel' },
      { role: 'Shirt', title: 'Cotton Poplin Shirt', color: 'Ecru' },
      { role: 'Trouser', title: 'Pleated Wide-Leg Trouser', color: 'Bone' },
      { role: 'Shoe', title: 'Leather Derby Shoe', color: 'Ink' },
      { role: 'Detail', title: 'Silk Pocket Square Set', color: 'Vermilion' },
    ],
  },
  {
    id: 'look_rooftop_set',
    title: 'Rooftop Set',
    universe: 'CHAOS',
    occasion: 'evening',
    author: 'usr_editor_2',
    palette: ['#17181B', '#B7BCC1', '#C4402F'],
    note: 'All black until the beanie. One accent, worn at the top, so it reads across a room.',
    tags: ['evening', 'monochrome', 'accent'],
    pick: [
      { role: 'Top', title: 'Graphic Long Sleeve', color: 'Ink' },
      { role: 'Jacket', title: 'Deconstructed Shell Jacket', color: 'Charcoal' },
      { role: 'Pant', title: 'Track Pant, Side Stripe', color: 'Ink' },
      { role: 'Shoe', title: 'Chunky Trail Sneaker', color: 'Charcoal' },
      { role: 'Hat', title: 'Ribbed Beanie', color: 'Vermilion' },
      { role: 'Detail', title: 'Silver Chain Necklace', color: 'Fog' },
    ],
  },
  {
    id: 'look_studio_day',
    title: 'Studio Day',
    universe: 'CALM',
    occasion: 'everyday',
    author: 'usr_creator_3',
    palette: ['#D6C6A8', '#EDE6D6', '#B7BCC1'],
    note: 'The overshirt replaces the jacket. Same silhouette, half the weight.',
    tags: ['minimal', 'everyday', 'overshirt'],
    pick: [
      { role: 'Overshirt', title: 'Linen Overshirt', color: 'Sand' },
      { role: 'Knit', title: 'Cashmere Crewneck', color: 'Bone' },
      { role: 'Trouser', title: 'Pleated Wide-Leg Trouser', color: 'Bone' },
      { role: 'Shoe', title: 'Suede Chelsea Boot', color: 'Charcoal' },
    ],
  },
  {
    id: 'look_cold_transit',
    title: 'Cold Transit',
    universe: 'CHAOS',
    occasion: 'street',
    author: 'usr_creator_4',
    palette: ['#2C2E33', '#B7BCC1', '#4A3527'],
    note: 'Knitwear under workwear. Comfort first, silhouette second, and it still holds.',
    tags: ['winter', 'knitwear', 'workwear'],
    pick: [
      { role: 'Knit', title: 'Oversized Knit Cardigan', color: 'Bone' },
      { role: 'Jacket', title: 'Corduroy Trucker Jacket', color: 'Chocolate' },
      { role: 'Jean', title: 'Raw Selvedge Jean', color: 'Slate' },
      { role: 'Shoe', title: 'Chunky Trail Sneaker', color: 'Fog' },
      { role: 'Hat', title: 'Structured Cap', color: 'Ink' },
    ],
  },
  {
    id: 'look_gallery_open',
    title: 'Gallery Opening',
    universe: 'CALM',
    occasion: 'evening',
    author: 'usr_editor_1',
    palette: ['#2C2E33', '#E6DFD2', '#4A3527'],
    note: 'Dark tailoring, light knit. Nothing shiny — the room already is.',
    tags: ['evening', 'tailoring', 'dark'],
    pick: [
      { role: 'Blazer', title: 'Unstructured Wool Blazer', color: 'Charcoal' },
      { role: 'Knit', title: 'Merino Roll Neck', color: 'Bone' },
      { role: 'Trouser', title: 'Pleated Wide-Leg Trouser', color: 'Ink' },
      { role: 'Shoe', title: 'Suede Chelsea Boot', color: 'Chocolate' },
    ],
  },
  {
    id: 'look_market_run',
    title: 'Market Run',
    universe: 'CHAOS',
    occasion: 'everyday',
    author: 'usr_creator_4',
    palette: ['#6B7050', '#17181B', '#D6C6A8'],
    note: 'Hands-free and weatherproof. The belt bag earns its place.',
    tags: ['utility', 'everyday'],
    pick: [
      { role: 'Top', title: 'Graphic Long Sleeve', color: 'Bone' },
      { role: 'Vest', title: 'Padded Work Vest', color: 'Charcoal' },
      { role: 'Pant', title: 'Cargo Pant, Tapered', color: 'Sand' },
      { role: 'Shoe', title: 'Chunky Trail Sneaker', color: 'Fog' },
      { role: 'Bag', title: 'Utility Belt Bag', color: 'Olive' },
    ],
  },
  {
    id: 'look_long_lunch',
    title: 'The Long Lunch',
    universe: 'CALM',
    occasion: 'cafe',
    author: 'usr_creator_3',
    palette: ['#C08E52', '#EDE6D6', '#6B7050'],
    note: 'Camel and ecru, olive at the waist. Warm palette, cool fabric weights.',
    tags: ['summer', 'camel', 'lunch'],
    pick: [
      { role: 'Shirt', title: 'Silk-Cotton Camp Shirt', color: 'Sand' },
      { role: 'Trouser', title: 'Pleated Wide-Leg Trouser', color: 'Bone' },
      { role: 'Shoe', title: 'Suede Chelsea Boot', color: 'Chocolate' },
      { role: 'Bag', title: 'Structured Leather Tote', color: 'Ink' },
    ],
  },
  {
    id: 'look_night_shift',
    title: 'Night Shift',
    universe: 'CHAOS',
    occasion: 'sport',
    author: 'usr_editor_2',
    palette: ['#17181B', '#5A6270', '#8E4A2A'],
    note: 'Technical pieces styled as streetwear. Zip ankles, so the shoe stays visible.',
    tags: ['technical', 'night', 'sport'],
    pick: [
      { role: 'Shell', title: 'Deconstructed Shell Jacket', color: 'Rust' },
      { role: 'Top', title: 'Boxy Heavyweight Hoodie', color: 'Fog' },
      { role: 'Pant', title: 'Track Pant, Side Stripe', color: 'Slate' },
      { role: 'Shoe', title: 'Chunky Trail Sneaker', color: 'Charcoal' },
      { role: 'Bag', title: 'Nylon Crossbody Bag', color: 'Rust' },
    ],
  },
];

function findProduct(title: string, color: string): Product | undefined {
  return demoProducts.find((p) => p.title === title && p.colors.includes(colorToHex(color)));
}

export function colorToHex(name: string): string {
  return (demoSwatches.find((s) => s.name === name) ?? demoSwatches[0]).hex;
}

export function buildDemoLooks(): Look[] {
  const rng = makeRng(777);
  return lookSpecs.map((spec, index) => {
    const items: LookItem[] = [];
    for (const pick of spec.pick) {
      const product = findProduct(pick.title, pick.color);
      if (!product) continue;
      items.push(itemFrom(product, pick.role, rng));
    }
    const author = demoUsers.find((u) => u.id === spec.author) ?? demoUsers[0];
    const total = items.reduce((sum, i) => sum + i.price, 0);
    return {
      id: spec.id,
      slug: slugify(spec.title),
      title: spec.title,
      universe: spec.universe,
      occasion: spec.occasion,
      hero_image: null,
      palette: spec.palette,
      items,
      total_cost: total,
      currency: DEMO_CURRENCY,
      author_id: author.id,
      author_handle: author.handle,
      author_avatar: author.avatar_url,
      likes: 40 + Math.floor(rng() * 1800),
      saves: 10 + Math.floor(rng() * 900),
      comment_count: Math.floor(rng() * 42),
      tags: spec.tags,
      editorial_note: spec.note,
      created_at: new Date(Date.UTC(2026, 8, 1) + index * 36e5 * 21).toISOString(),
    };
  });
}

export const demoLooks: Look[] = buildDemoLooks();

const now = Date.UTC(2026, 9, 12, 12, 0, 0);

export const demoBattles: Battle[] = [
  {
    id: 'btl_daily_001',
    slug: 'daily-quiet-vs-archive',
    title: 'Daily Face-Off · Quiet Monday vs Archive Walk',
    kind: 'DAILY',
    left_look_id: 'look_quiet_monday',
    right_look_id: 'look_archive_walk',
    left_total: 0,
    right_total: 0,
    currency: DEMO_CURRENCY,
    votes_left: 1284,
    votes_right: 1147,
    starts_at: new Date(now - 36e5 * 6).toISOString(),
    ends_at: new Date(now + 36e5 * 18).toISOString(),
    status: 'live',
    created_by: null,
  },
  {
    id: 'btl_cv_001',
    slug: 'calm-vs-chaos-wedding',
    title: 'CALM vs CHAOS · Who wears it better after dark?',
    kind: 'CALM_VS_CHAOS',
    left_look_id: 'look_second_wedding',
    right_look_id: 'look_rooftop_set',
    left_total: 0,
    right_total: 0,
    currency: DEMO_CURRENCY,
    votes_left: 3410,
    votes_right: 3988,
    starts_at: new Date(now - 36e5 * 40).toISOString(),
    ends_at: new Date(now + 36e5 * 90).toISOString(),
    status: 'live',
    created_by: null,
  },
  {
    id: 'btl_ed_001',
    slug: 'editors-coat-against-shell',
    title: "Editors' Pick · The Coat Against The Shell",
    kind: 'EDITORIAL',
    left_look_id: 'look_gallery_open',
    right_look_id: 'look_after_rain',
    left_total: 0,
    right_total: 0,
    currency: DEMO_CURRENCY,
    votes_left: 902,
    votes_right: 1471,
    starts_at: new Date(now - 36e5 * 20).toISOString(),
    ends_at: new Date(now + 36e5 * 120).toISOString(),
    status: 'live',
    created_by: 'usr_editor_1',
  },
  {
    id: 'btl_com_001',
    slug: 'community-studio-versus-market',
    title: 'Community · Studio Day vs Market Run',
    kind: 'COMMUNITY',
    left_look_id: 'look_studio_day',
    right_look_id: 'look_market_run',
    left_total: 0,
    right_total: 0,
    currency: DEMO_CURRENCY,
    votes_left: 233,
    votes_right: 289,
    starts_at: new Date(now - 36e5 * 12).toISOString(),
    ends_at: new Date(now + 36e5 * 60).toISOString(),
    status: 'live',
    created_by: 'usr_creator_3',
  },
  {
    id: 'btl_closed_001',
    slug: 'closed-last-week-linen-vs-corduroy',
    title: 'Last Week · Linen Against Corduroy',
    kind: 'COMMUNITY',
    left_look_id: 'look_coast_off',
    right_look_id: 'look_cold_transit',
    left_total: 0,
    right_total: 0,
    currency: DEMO_CURRENCY,
    votes_left: 1560,
    votes_right: 940,
    starts_at: new Date(now - 36e5 * 200).toISOString(),
    ends_at: new Date(now - 36e5 * 24).toISOString(),
    status: 'closed',
    created_by: 'usr_creator_4',
  },
  {
    id: 'btl_next_001',
    slug: 'upcoming-long-lunch-vs-night-shift',
    title: 'Tomorrow · The Long Lunch vs Night Shift',
    kind: 'DAILY',
    left_look_id: 'look_long_lunch',
    right_look_id: 'look_night_shift',
    left_total: 0,
    right_total: 0,
    currency: DEMO_CURRENCY,
    votes_left: 0,
    votes_right: 0,
    starts_at: new Date(now + 36e5 * 30).toISOString(),
    ends_at: new Date(now + 36e5 * 54).toISOString(),
    status: 'scheduled',
    created_by: null,
  },
];

/** Fill battle totals from the looks they reference so nothing is invented. */
for (const b of demoBattles) {
  const l = demoLooks.find((x) => x.id === b.left_look_id);
  const r = demoLooks.find((x) => x.id === b.right_look_id);
  b.left_total = l?.total_cost ?? 0;
  b.right_total = r?.total_cost ?? 0;
}

export const demoStories: EditorialStory[] = [
  {
    id: 'sty_001',
    slug: 'the-three-neutrals-rule',
    kicker: 'CALM',
    title: 'The Three-Neutrals Rule',
    excerpt: 'Why a restrained palette beats a loud one — and the one texture contrast that saves it.',
    body: [
      'Quiet luxury is often mistaken for expense. It is not. It is restraint applied consistently: three neutrals, one texture contrast, and nothing that announces itself.',
      'Start with a base — bone, ecru, or sand. Add a mid-tone such as camel or olive to carry warmth. Close with a dark: charcoal, ink, or chocolate. That is the whole palette.',
      'Then break it once, on purpose. A merino roll neck under a wool blazer works because the knit is fine and the cloth is not. Contrast the weights, never the colours.',
      'What remains, becomes ATHR.',
    ],
    cover_image: null,
    universe: 'CALM',
    author: 'Lina Kaddour',
    read_minutes: 4,
    look_ids: ['look_quiet_monday', 'look_studio_day', 'look_gallery_open'],
    published_at: new Date(now - 36e5 * 72).toISOString(),
  },
  {
    id: 'sty_002',
    slug: 'layering-is-a-discipline',
    kicker: 'CHAOS',
    title: 'Layering Is a Discipline',
    excerpt: 'Streetwear fails when every layer competes. Here is how to stack without shouting.',
    body: [
      'Three layers is the ceiling. Base, insulator, shell. Add a fourth and the silhouette collapses.',
      'Weight goes inside to out, and length goes long to short — the hoodie peeks past the vest, the vest past the shell. Reverse it and you look like you got dressed in the dark.',
      'Keep one accent. Put it at the top, where a room sees it first: a beanie, a chain, a cap panel. Everything below stays neutral.',
      'What remains, becomes ATHR.',
    ],
    cover_image: null,
    universe: 'CHAOS',
    author: 'Sofiane B.',
    read_minutes: 5,
    look_ids: ['look_archive_walk', 'look_after_rain', 'look_rooftop_set'],
    published_at: new Date(now - 36e5 * 48).toISOString(),
  },
  {
    id: 'sty_003',
    slug: 'cost-per-wear',
    kicker: 'METHOD',
    title: 'Cost Per Wear, Honestly Calculated',
    excerpt: 'The only budget metric that survives contact with a real wardrobe.',
    body: [
      'Price is a number you see once. Cost per wear is a number you live with.',
      'A 46,000 DZD coat worn ninety times a winter for four winters costs 128 DZD a wear. A 9,000 DZD jacket worn six times before it pills costs 1,500.',
      'ATHR shows total outfit cost on every look for exactly this reason: not to rank people by spend, but to make the maths visible before the purchase.',
      'What remains, becomes ATHR.',
    ],
    cover_image: null,
    universe: 'CALM',
    author: 'ATHR Editorial',
    read_minutes: 3,
    look_ids: ['look_second_wedding', 'look_cold_transit'],
    published_at: new Date(now - 36e5 * 20).toISOString(),
  },
  {
    id: 'sty_004',
    slug: 'one-accent-theory',
    kicker: 'CHAOS',
    title: 'One Accent Theory',
    excerpt: 'Vermilion, rust, acid — how to carry a single colour across an entire outfit.',
    body: [
      'A monochrome outfit with one accent reads as intention. Two accents read as indecision.',
      'Choose a colour that does not already exist in the base layers. On charcoal and fog, that means vermilion or rust rather than another grey.',
      'Place it deliberately: hem, cuff, hat, or hardware. Then stop. The accent is a full stop, not a theme.',
      'What remains, becomes ATHR.',
    ],
    cover_image: null,
    universe: 'CHAOS',
    author: 'Sofiane B.',
    read_minutes: 4,
    look_ids: ['look_rooftop_set', 'look_night_shift', 'look_market_run'],
    published_at: new Date(now - 36e5 * 8).toISOString(),
  },
];

export const demoComments: Comment[] = [
  { id: 'cmt_1', look_id: 'look_quiet_monday', author_id: 'usr_creator_3', author_handle: 'amira.wears', author_avatar: null, body: 'The roll neck under the blazer is the whole look. Saving this.', created_at: new Date(now - 36e5 * 30).toISOString() },
  { id: 'cmt_2', look_id: 'look_quiet_monday', author_id: 'usr_editor_2', author_handle: 'sofiane', author_avatar: null, body: 'Even I have to admit the trouser break is correct.', created_at: new Date(now - 36e5 * 22).toISOString() },
  { id: 'cmt_3', look_id: 'look_archive_walk', author_id: 'usr_creator_4', author_handle: 'yanis', author_avatar: null, body: 'What weight is that denim? Trying to judge the stacking.', created_at: new Date(now - 36e5 * 18).toISOString() },
  { id: 'cmt_4', look_id: 'look_rooftop_set', author_id: 'usr_creator_3', author_handle: 'amira.wears', author_avatar: null, body: 'The beanie placement is doing all the work and I respect it.', created_at: new Date(now - 36e5 * 9).toISOString() },
  { id: 'cmt_5', look_id: 'look_after_rain', author_id: 'usr_editor_1', author_handle: 'lina.k', author_avatar: null, body: 'Two layers over one warm one — the correct answer every time.', created_at: new Date(now - 36e5 * 5).toISOString() },
];

export const demoNotifications: AppNotification[] = [
  { id: 'ntf_1', user_id: 'usr_demo_self', kind: 'battle' as const, title: 'Your vote counted', body: 'Quiet Monday is leading the daily face-off by 4 points.', deep_link: '/battle/btl_daily_001', read: false, created_at: new Date(now - 36e5 * 2).toISOString() },
  { id: 'ntf_2', user_id: 'usr_demo_self', kind: 'like' as const, title: 'Lina Kaddour liked your look', body: 'Quiet Monday', deep_link: '/look/look_quiet_monday', read: false, created_at: new Date(now - 36e5 * 7).toISOString() },
  { id: 'ntf_3', user_id: 'usr_demo_self', kind: 'follow' as const, title: 'Sofiane B. started following you', body: 'Streetwear archivist', deep_link: '/community/profile/sofiane', read: true, created_at: new Date(now - 36e5 * 26).toISOString() },
  { id: 'ntf_4', user_id: 'usr_demo_self', kind: 'system' as const, title: 'New CALM vs CHAOS battle is live', body: 'Who wears it better after dark?', deep_link: '/battle/btl_cv_001', read: true, created_at: new Date(now - 36e5 * 40).toISOString() },
];

export const demoAuditLogs: AuditLog[] = [
  { id: 'aud_1', actor_id: 'usr_admin', action: 'merchant.approve', entity: 'merchant', entity_id: 'mch_cote_seize', metadata: { plan: 'starter' }, created_at: new Date(now - 36e5 * 96).toISOString() },
  { id: 'aud_2', actor_id: 'usr_admin', action: 'battle.create', entity: 'battle', entity_id: 'btl_cv_001', metadata: { kind: 'CALM_VS_CHAOS' }, created_at: new Date(now - 36e5 * 40).toISOString() },
  { id: 'aud_3', actor_id: 'usr_mod', action: 'report.dismiss', entity: 'report', entity_id: 'rep_1', metadata: { reason: 'insufficient_evidence' }, created_at: new Date(now - 36e5 * 14).toISOString() },
];

export const demoReports: Report[] = [
  { id: 'rep_1', reporter_id: 'usr_creator_4', target_kind: 'comment' as const, target_id: 'cmt_2', reason: 'harassment' as const, detail: null, status: 'dismissed' as const, created_at: new Date(now - 36e5 * 20).toISOString() },
  { id: 'rep_2', reporter_id: 'usr_creator_3', target_kind: 'product' as const, target_id: demoProducts[3]?.id ?? 'prd_x', reason: 'counterfeit' as const, detail: 'Listing images look copied.', status: 'open' as const, created_at: new Date(now - 36e5 * 6).toISOString() },
];
