/**
 * Demo DataSource. Runs the entire app offline from the seeded catalogue.
 *
 * Mutations (votes, likes, saves, wardrobe, follows, reports, clicks) live in
 * module memory and are mirrored to AsyncStorage so the app feels stateful
 * across launches. Nothing here touches the network.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildOutfit } from '../lib/studioEngine';
import {
  demoAuditLogs,
  demoBattles,
  demoComments,
  demoLooks,
  demoMerchants,
  demoNotifications,
  demoProducts,
  demoReports,
  demoStories,
  demoUsers,
} from './demo/seed';
import type { DataSource, AuthSession } from './repo';
import type {
  AffiliateClick,
  AppNotification,
  AuditLog,
  Battle,
  BattleResult,
  Collection,
  Comment,
  AccountContactDetails,
  DeliveryAddress,
  EditorialStory,
  Look,
  LookFilter,
  Merchant,
  Outfit,
  Product,
  ProductFilter,
  Profile,
  Report,
  StudioResult,
  WasmChatRequest,
  StylePreferences,
  Subscription,
  SubscriptionPlan,
  WardrobeItem,
} from './types';

const NS = 'athr_demo_v1';

const delay = (ms = 120) => new Promise<void>((res) => setTimeout(res, ms));
let idCounter = 1000;
const uid = (prefix: string) => `${prefix}_${(idCounter++).toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

interface DemoState {
  session: AuthSession | null;
  votes: Record<string, 'left' | 'right'>; // battleId -> my vote
  battleVotes: Record<string, { left: number; right: number }>;
  likes: Record<string, boolean>;
  saves: string[];
  follows: string[];
  wardrobe: WardrobeItem[];
  outfits: Outfit[];
  collections: Collection[];
  comments: Comment[];
  notifications: AppNotification[];
  reports: Report[];
  clicks: AffiliateClick[];
  customProducts: Product[];
  customLooks: Look[];
  merchants: Merchant[];
  prefs: Record<string, StylePreferences>;
  deliveryAddresses: DeliveryAddress[];
  accountContacts: Record<string, AccountContactDetails>;
}

const defaultState = (): DemoState => ({
  session: null,
  votes: {},
  battleVotes: {},
  likes: {},
  saves: [],
  follows: ['usr_editor_2'],
  wardrobe: [],
  outfits: [],
  collections: [],
  comments: [...demoComments],
  notifications: [...demoNotifications],
  reports: [...demoReports],
  clicks: [],
  customProducts: [],
  customLooks: [],
  merchants: [...demoMerchants],
  prefs: {},
  deliveryAddresses: [],
  accountContacts: {},
});

let state: DemoState = defaultState();
let loaded = false;

async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(NS);
    if (raw) {
      state = { ...defaultState(), ...(JSON.parse(raw) as Partial<DemoState>) };
    }
  } catch {
    /* ignore storage failures in demo */
  }
}

function persist(): void {
  AsyncStorage.setItem(NS, JSON.stringify(state)).catch(() => undefined);
}

function allProducts(): Product[] {
  return [...demoProducts, ...state.customProducts];
}
function allLooks(): Look[] {
  return [...demoLooks, ...state.customLooks];
}

function matchesProduct(p: Product, f: ProductFilter): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    if (![p.title, p.brand, p.category, p.merchant_name].some((s) => s.toLowerCase().includes(q))) return false;
  }
  if (f.universes?.length && !f.universes.includes(p.universe)) return false;
  if (f.categories?.length && !f.categories.includes(p.category)) return false;
  if (f.occasions?.length && !f.occasions.some((o) => p.occasions.includes(o))) return false;
  if (f.colors?.length && !f.colors.some((c) => p.colors.includes(c))) return false;
  if (f.brands?.length && !f.brands.includes(p.brand)) return false;
  if (f.merchant_id && p.merchant_id !== f.merchant_id) return false;
  if (f.min_price != null && p.price < f.min_price) return false;
  if (f.max_price != null && p.price > f.max_price) return false;
  if (f.in_stock_only && !p.in_stock) return false;
  return true;
}

function sortProducts(list: Product[], sort: ProductFilter['sort']): Product[] {
  const copy = [...list];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'newest':
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating);
    default:
      return copy.sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || b.rating - a.rating);
  }
}

function matchesLook(l: Look, f: LookFilter): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    if (![l.title, ...l.tags, l.author_handle].some((s) => s.toLowerCase().includes(q))) return false;
  }
  if (f.universes?.length && !f.universes.includes(l.universe)) return false;
  if (f.occasions?.length && !f.occasions.includes(l.occasion)) return false;
  if (f.max_total != null && l.total_cost > f.max_total) return false;
  if (f.author_id && l.author_id !== f.author_id) return false;
  if (f.tag && !l.tags.includes(f.tag)) return false;
  return true;
}

function sortLooks(list: Look[], sort: LookFilter['sort']): Look[] {
  const copy = [...list];
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'cheapest':
      return copy.sort((a, b) => a.total_cost - b.total_cost);
    case 'priciest':
      return copy.sort((a, b) => b.total_cost - a.total_cost);
    default:
      return copy.sort((a, b) => b.likes + b.saves - (a.likes + a.saves));
  }
}

function battleResult(b: Battle): BattleResult {
  const extra = state.battleVotes[b.id] ?? { left: 0, right: 0 };
  const left = b.votes_left + extra.left;
  const right = b.votes_right + extra.right;
  const total = left + right;
  const leftPct = total ? Math.round((left / total) * 100) : 50;
  return {
    battle: b,
    left: allLooks().find((l) => l.id === b.left_look_id)!,
    right: allLooks().find((l) => l.id === b.right_look_id)!,
    left_pct: leftPct,
    right_pct: 100 - leftPct,
    total_votes: total,
    my_vote: state.votes[b.id] ?? null,
  };
}

export const demoSource: DataSource = {
  mode: 'demo',

  async getSession() {
    await load();
    return state.session;
  },

  async signIn(email, _password) {
    await load();
    await delay(300);
    const existing = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? demoUsers[0];
    const session: AuthSession = { user_id: existing.id, email: existing.email, access_token: 'demo-token', mode: 'demo' };
    state.session = session;
    persist();
    return session;
  },

  async resetPasswordForEmail(_email) {
    throw new Error(
      'Password reset is available only in live mode.',
    );
  },

  async updatePassword(_password) {
    throw new Error('Password update is available only in live mode.');
  },

  async signUp(input) {
    await load();
    await delay(300);
    const profile: Profile = {
      id: uid('usr'),
      email: input.email,
      handle: input.handle || input.email.split('@')[0],
      display_name: input.display_name || input.handle,
      avatar_url: null,
      bio: null,
      city: null,
      role: 'user',
      universe_pref: null,
      preferred_locale: 'en',
      followers: 0,
      following: 0,
      verified: false,
      premium: false,
      created_at: new Date().toISOString(),
    };
    demoUsers.push(profile);
    state.accountContacts[profile.id] = { user_id: profile.id, phone: input.phone, wilaya: input.wilaya, commune: input.commune, updated_at: new Date().toISOString() };
    const session: AuthSession = { user_id: profile.id, email: profile.email, access_token: 'demo-token', mode: 'demo' };
    state.session = session;
    persist();
    return session;
  },

  async signOut() {
    state.session = null;
    persist();
  },

  async getProfile(id) {
    await load();
    return demoUsers.find((u) => u.id === id) ?? demoUsers[0];
  },

  async updateProfile(id, patch) {
    const p = demoUsers.find((u) => u.id === id);
    if (!p) throw new Error('Profile not found');
    Object.assign(p, patch);
    persist();
    return p;
  },

  async getAccountContactDetails(userId) {
    await load();
    return state.accountContacts[userId] ?? {
      user_id: userId,
      phone: '',
      wilaya: '',
      commune: '',
      updated_at: new Date().toISOString(),
    };
  },

  async updateAccountContactDetails(userId, patch) {
    await load();
    const current = await this.getAccountContactDetails(userId);
    const next = { ...current, ...patch, user_id: userId, updated_at: new Date().toISOString() };
    state.accountContacts[userId] = next;
    persist();
    return next;
  },

  async listDeliveryAddresses(userId) {
    await load();
    return state.deliveryAddresses
      .filter((address) => address.user_id === userId)
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || b.created_at.localeCompare(a.created_at));
  },

  async saveDeliveryAddress(input) {
    await load();
    const now = new Date().toISOString();
    const existing = input.id ? state.deliveryAddresses.find((address) => address.id === input.id) : undefined;
    if (existing && existing.user_id !== input.user_id) throw new Error('Address not found');
    const saved: DeliveryAddress = {
      ...input,
      id: existing?.id ?? uid('addr'),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    if (existing) Object.assign(existing, saved);
    else state.deliveryAddresses.push(saved);
    persist();
    return saved;
  },

  async deleteDeliveryAddress(id) {
    await load();
    const me = state.session?.user_id;
    state.deliveryAddresses = state.deliveryAddresses.filter((address) => address.id !== id || address.user_id !== me);
    persist();
  },

  async getPreferences(userId) {
    await load();
    return (
      state.prefs[userId] ?? {
        user_id: userId,
        universes: ['CALM', 'CHAOS'],
        categories: [],
        occasions: [],
        palette: [],
        budget_min: 10000,
        budget_max: 120000,
        currency: 'DZD',
        avoid: [],
        updated_at: new Date().toISOString(),
      }
    );
  },

  async updatePreferences(userId, patch) {
    const current = await this.getPreferences(userId);
    const next = { ...current, ...patch, updated_at: new Date().toISOString() };
    state.prefs[userId] = next;
    persist();
    return next;
  },

  async listProducts(filter) {
    await load();
    await delay();
    const filtered = sortProducts(allProducts().filter((p) => matchesProduct(p, filter)), filter.sort);
    const limit = filter.limit ?? 30;
    const offset = filter.offset ?? 0;
    const items = filtered.slice(offset, offset + limit);
    return { items, total: filtered.length, has_more: offset + limit < filtered.length };
  },

  async getProduct(id) {
    await load();
    return allProducts().find((p) => p.id === id) ?? null;
  },

  async listLooks(filter) {
    await load();
    await delay();
    const filtered = sortLooks(allLooks().filter((l) => matchesLook(l, filter)), filter.sort);
    const limit = filter.limit ?? 20;
    const offset = filter.offset ?? 0;
    return { items: filtered.slice(offset, offset + limit), total: filtered.length, has_more: offset + limit < filtered.length };
  },

  async getLook(id) {
    await load();
    return allLooks().find((l) => l.id === id) ?? null;
  },

  async similarLooks(lookId, limit = 4) {
    const base = allLooks().find((l) => l.id === lookId);
    if (!base) return [];
    return allLooks()
      .filter((l) => l.id !== lookId)
      .map((l) => ({
        l,
        score:
          (l.universe === base.universe ? 2 : 0) +
          (l.occasion === base.occasion ? 2 : 0) +
          l.items.filter((i) => base.items.some((b) => b.category === i.category)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.l);
  },

  async listMerchants(opts) {
    await load();
    return state.merchants.filter((m) => (opts?.approvedOnly ? m.approved : true));
  },

  async getMerchant(id) {
    await load();
    return state.merchants.find((m) => m.id === id) ?? null;
  },

  async applyMerchant(input) {
    await load();
    const m: Merchant = {
      id: uid('mch'),
      slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: input.name,
      logo_url: null,
      cover_url: null,
      description: input.description ?? null,
      city: input.city,
      country: input.country ?? 'DZ',
      verified: false,
      approved: false,
      plan: 'free',
      rating: 0,
      review_count: 0,
      affiliate_network: null,
      commission_rate: 0.05,
      product_count: 0,
      created_at: new Date().toISOString(),
    };
    state.merchants.push(m);
    persist();
    return m;
  },

  async upsertProduct(input, merchantId) {
    await load();
    const merchant = state.merchants.find((m) => m.id === merchantId);
    const product: Product = {
      id: uid('prd'),
      merchant_id: merchantId,
      merchant_name: merchant?.name ?? 'Demo Merchant',
      title: input.title,
      brand: input.brand ?? merchant?.name ?? 'Demo',
      category: input.category,
      universe: input.universe ?? 'CALM',
      price: input.price,
      compare_at_price: input.compare_at_price ?? null,
      currency: input.currency ?? 'DZD',
      colors: input.colors ?? ['#2C2E33'],
      sizes: input.sizes ?? ['M'],
      images: input.images ?? [],
      affiliate_url: input.affiliate_url ?? null,
      checkout_type: input.checkout_type ?? 'contact',
      in_stock: input.in_stock ?? true,
      stock_count: input.stock_count ?? 5,
      occasions: input.occasions ?? ['everyday'],
      sponsored: false,
      rating: 0,
      created_at: new Date().toISOString(),
      description: input.description ?? null,
    };
    state.customProducts.push(product);
    if (merchant) merchant.product_count += 1;
    persist();
    return product;
  },

  async merchantStats(merchantId) {
    await load();
    const clicks = state.clicks.filter((c) => c.merchant_id === merchantId);
    const impressions = Math.max(clicks.length * 14, 320);
    const byDay = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      byDay.set(d, 0);
    }
    for (const c of clicks) {
      const d = c.created_at.slice(0, 10);
      if (byDay.has(d)) byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    const base = [12, 18, 9, 22, 16, 26, 19];
    const days = [...byDay.entries()].map(([day, extra], i) => ({ day, clicks: base[i % base.length] + extra }));
    const totalClicks = days.reduce((s, d) => s + d.clicks, 0);
    return {
      impressions,
      clicks: totalClicks,
      ctr: impressions ? Math.round((totalClicks / impressions) * 1000) / 10 : 0,
      est_commission: Math.round(totalClicks * 90 * 0.08),
      orders: Math.round(totalClicks * 0.06),
      by_day: days,
    };
  },

  async likeLook(lookId, on) {
    await load();
    state.likes[lookId] = on;
    const look = allLooks().find((l) => l.id === lookId);
    if (look) look.likes += on ? 1 : -1;
    persist();
  },

  async toggleSaveLook(lookId) {
    await load();
    const idx = state.saves.indexOf(lookId);
    const nowSaved = idx === -1;
    if (nowSaved) state.saves.push(lookId);
    else state.saves.splice(idx, 1);
    const look = allLooks().find((l) => l.id === lookId);
    if (look) look.saves += nowSaved ? 1 : -1;
    persist();
    return nowSaved;
  },

  async isSaved(lookId) {
    await load();
    return state.saves.includes(lookId);
  },

  async listSavedLooks(userId) {
    await load();
    void userId;
    return state.saves.map((id) => allLooks().find((l) => l.id === id)).filter(Boolean) as Look[];
  },

  async listComments(lookId) {
    await load();
    return state.comments.filter((c) => c.look_id === lookId);
  },

  async addComment(lookId, body) {
    await load();
    const me = state.session ? await this.getProfile(state.session.user_id) : demoUsers[0];
    const c: Comment = {
      id: uid('cmt'),
      look_id: lookId,
      author_id: me.id,
      author_handle: me.handle,
      author_avatar: me.avatar_url,
      body,
      created_at: new Date().toISOString(),
    };
    state.comments.push(c);
    persist();
    return c;
  },

  async listBattles(opts) {
    await load();
    return demoBattles.filter((b) => (opts?.status ? b.status === opts.status : true));
  },

  async getBattleResult(id) {
    await load();
    const b = demoBattles.find((x) => x.id === id);
    return b ? battleResult(b) : null;
  },

  async vote(battleId, side) {
    await load();
    const b = demoBattles.find((x) => x.id === battleId);
    if (!b) throw new Error('Battle not found');
    const prev = state.votes[battleId];
    const extra = state.battleVotes[battleId] ?? { left: 0, right: 0 };
    if (prev === side) return battleResult(b);
    if (prev) extra[prev] -= 1;
    extra[side] += 1;
    state.battleVotes[battleId] = extra;
    state.votes[battleId] = side;
    persist();
    return battleResult(b);
  },

  async listStories() {
    await load();
    return demoStories;
  },

  async getStory(slug) {
    await load();
    return demoStories.find((s) => s.slug === slug) ?? null;
  },

  async listWardrobe(ownerId) {
    await load();
    return state.wardrobe.filter((w) => w.owner_id === ownerId);
  },

  async addWardrobeItem(item) {
    await load();
    const w: WardrobeItem = { ...item, id: uid('wd'), worn_count: 0, created_at: new Date().toISOString() };
    state.wardrobe.push(w);
    persist();
    return w;
  },

  async deleteWardrobeItem(id) {
    state.wardrobe = state.wardrobe.filter((w) => w.id !== id);
    persist();
  },

  async listOutfits(ownerId) {
    await load();
    return state.outfits.filter((o) => o.owner_id === ownerId);
  },

  async saveOutfit(outfit) {
    await load();
    const o: Outfit = { ...outfit, id: uid('out'), created_at: new Date().toISOString() };
    state.outfits.push(o);
    persist();
    return o;
  },

  async deleteOutfit(id) {
    state.outfits = state.outfits.filter((o) => o.id !== id);
    persist();
  },

  async listCollections(ownerId) {
    await load();
    return state.collections.filter((c) => c.owner_id === ownerId);
  },

  async createCollection(name, ownerId) {
    await load();
    const c: Collection = { id: uid('col'), owner_id: ownerId, name, look_ids: [], cover_image: null, created_at: new Date().toISOString() };
    state.collections.push(c);
    persist();
    return c;
  },

  async toggleLookInCollection(collectionId, lookId) {
    const c = state.collections.find((x) => x.id === collectionId);
    if (!c) return false;
    const idx = c.look_ids.indexOf(lookId);
    const added = idx === -1;
    if (added) c.look_ids.push(lookId);
    else c.look_ids.splice(idx, 1);
    persist();
    return added;
  },

  async listFeed(limit = 20) {
    await load();
    return sortLooks(allLooks(), 'trending').slice(0, limit);
  },

  async getProfileByHandle(handle) {
    await load();
    return demoUsers.find((u) => u.handle === handle) ?? null;
  },

  async toggleFollow(userId) {
    await load();
    const idx = state.follows.indexOf(userId);
    const now = idx === -1;
    if (now) state.follows.push(userId);
    else state.follows.splice(idx, 1);
    persist();
    return now;
  },

  async listFollows() {
    await load();
    return state.follows;
  },

  async submitReport(input) {
    await load();
    const r: Report = { ...input, id: uid('rep'), status: 'open', created_at: new Date().toISOString() };
    state.reports.push(r);
    persist();
    return r;
  },

  async listNotifications(userId) {
    await load();
    return state.notifications.filter((n) => n.user_id === userId);
  },

  async markNotificationRead(id) {
    const n = state.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    persist();
  },

  async markAllNotificationsRead(userId) {
    for (const n of state.notifications) if (n.user_id === userId) n.read = true;
    persist();
  },

  async recordAffiliateClick(input) {
    await load();
    const c: AffiliateClick = { ...input, id: uid('clk'), created_at: new Date().toISOString() };
    state.clicks.push(c);
    persist();
    return c;
  },

  async getSubscription(userId) {
    await load();
    const p = demoUsers.find((u) => u.id === userId);
    return {
      user_id: userId,
      plan: p?.premium ? 'premium_monthly' : 'free',
      status: p?.premium ? 'active' : 'active',
      provider: 'none',
      current_period_end: p?.premium ? new Date(Date.now() + 30 * 864e5).toISOString() : null,
    };
  },

  async requestCheckout(plan) {
    return {
      status: 'not_configured',
      message: `Payments are not configured in demo mode. To enable ${plan}, add Stripe / Apple / Google credentials (see docs/MONETIZATION.md).`,
    };
  },

   async runWasmChat(_req: WasmChatRequest) {
     await delay(350);

     return {
       messages: [
         {
           id: `wasm_demo_${Date.now()}`,
           role: 'assistant' as const,
           content:
             'WASM chat is not connected in demo mode yet. Connect the live Supabase AI endpoint to enable general conversation.',
            created_at: new Date().toISOString(),
          },
        ],
        product_ids: [],
        reasoning: [],
        engine: 'local-engine' as const,
        model: null,
        total_cost: 0,
        currency: 'DZD' as const,
        degraded_reason: 'Demo mode does not call OpenRouter.',
      };
    },

  async runStudio(req) {
    await load();
    await delay(500);
    const result: StudioResult = buildOutfit(allProducts(), req);
    return result;
  },

  async adminOverview() {
    await load();
    const votes = demoBattles.reduce((s, b) => {
      const extra = state.battleVotes[b.id] ?? { left: 0, right: 0 };
      return s + b.votes_left + b.votes_right + extra.left + extra.right;
    }, 0);
    return {
      users: demoUsers.length,
      merchants: state.merchants.filter((m) => m.approved).length,
      pending_merchants: state.merchants.filter((m) => !m.approved).length,
      products: allProducts().length,
      looks: allLooks().length,
      battles_live: demoBattles.filter((b) => b.status === 'live').length,
      open_reports: state.reports.filter((r) => r.status === 'open').length,
      votes_total: votes,
      ai_calls: 412,
      premium_users: demoUsers.filter((u) => u.premium).length,
    };
  },

  async adminListReports() {
    await load();
    return state.reports;
  },

  async adminResolveReport(id, action) {
    const r = state.reports.find((x) => x.id === id);
    if (!r) throw new Error('Report not found');
    r.status = action;
    demoAuditLogs.push({
      id: uid('aud'),
      actor_id: state.session?.user_id ?? 'usr_admin',
      action: `report.${action}`,
      entity: 'report',
      entity_id: id,
      metadata: null,
      created_at: new Date().toISOString(),
    });
    persist();
    return r;
  },

  async adminSetMerchantApproval(id, approved) {
    const m = state.merchants.find((x) => x.id === id);
    if (!m) throw new Error('Merchant not found');
    m.approved = approved;
    if (approved) m.verified = true;
    demoAuditLogs.push({
      id: uid('aud'),
      actor_id: state.session?.user_id ?? 'usr_admin',
      action: approved ? 'merchant.approve' : 'merchant.reject',
      entity: 'merchant',
      entity_id: id,
      metadata: null,
      created_at: new Date().toISOString(),
    });
    persist();
    return m;
  },

  async adminListAudit() {
    await load();
    return [...demoAuditLogs].reverse();
  },

  async adminListUsers() {
    await load();
    return demoUsers;
  },
};

export type { Subscription, SubscriptionPlan, EditorialStory, AuditLog };
