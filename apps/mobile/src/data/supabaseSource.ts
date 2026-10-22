/**
 * Live DataSource backed by Supabase.
 *
 * Email confirmation uses the ATHR deep link:
 * athr://auth/callback
 */

import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { buildOutfit } from '../lib/studioEngine';
import type { DataSource } from './repo';
import type {
  Battle,
  BattleResult,
  AccountContactDetails,
  DeliveryAddress,
  Look,
  LookFilter,
  Paged,
  Product,
  ProductFilter,
  StudioRequest,
  StudioResult,
  WasmChatRequest,
} from './types';
import { demoProducts } from './demo/seed';

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

const AUTH_CALLBACK_URL = 'athr://auth/callback';

function makeClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}

export function createSupabaseSource(env: SupabaseEnv): DataSource {
  const sb = makeClient(env);

  const authed = async () => {
    const { data, error } = await sb.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  };

  return {
    mode: 'live',

    async getSession() {
      const s = await authed();
      if (!s) return null;

      return {
        user_id: s.user.id,
        email: s.user.email ?? '',
        access_token: s.access_token,
        mode: 'live',
      };
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        throw new Error(error?.message ?? 'Sign-in failed');
      }

      return {
        user_id: data.user.id,
        email: data.user.email ?? email,
        access_token: data.session.access_token,
        mode: 'live',
      };
    },

    async resetPasswordForEmail(email) {
      const { error } = await sb.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${AUTH_CALLBACK_URL}?flow=recovery`,
        },
      );

      if (error) throw new Error(error.message);
},

async updatePassword(password) {
  const { error } = await sb.auth.updateUser({ password });

  if (error) throw new Error(error.message);
},

    async signUp(input) {
      const { data, error } = await sb.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            handle: input.handle,
            display_name: input.display_name,
            phone: input.phone,
            wilaya: input.wilaya,
            commune: input.commune,
          },
          emailRedirectTo: AUTH_CALLBACK_URL,
        },
      });

      if (error) throw new Error(error.message);

      if (!data.session || !data.user) {
        throw new Error('Confirm your email to continue.');
      }

      return {
        user_id: data.user.id,
        email: input.email,
        access_token: data.session.access_token,
        mode: 'live',
      };
    },

    async completeAuthCallback(code: string) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw new Error(error.message);
    },

    async signOut() {
      const { error } = await sb.auth.signOut();
      if (error) throw new Error(error.message);
    },

    async getProfile(id) {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async updateProfile(id, patch) {
      const { data, error } = await sb
        .from('profiles')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async getAccountContactDetails(userId) {
      const { data, error } = await sb
        .from('account_contact_details')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return (data ?? {
        user_id: userId,
        phone: '',
        wilaya: '',
        commune: '',
        updated_at: new Date().toISOString(),
      }) as AccountContactDetails;
    },

    async updateAccountContactDetails(userId, patch) {
      const { data, error } = await sb
        .from('account_contact_details')
        .upsert({
          ...patch,
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as AccountContactDetails;
    },

    async listDeliveryAddresses(userId) {
      const { data, error } = await sb
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as DeliveryAddress[];
    },

    async saveDeliveryAddress(address) {
      const { data, error } = await sb
        .from('delivery_addresses')
        .upsert({
          ...address,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as DeliveryAddress;
    },

    async deleteDeliveryAddress(id) {
      const { error } = await sb
        .from('delivery_addresses')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async getPreferences(userId) {
      const { data, error } = await sb
        .from('style_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) return data;

      const { data: created, error: cerr } = await sb
        .from('style_preferences')
        .insert({
          user_id: userId,
          universes: ['CALM', 'CHAOS'],
          categories: [],
          occasions: [],
          palette: [],
          budget_min: 10000,
          budget_max: 120000,
          currency: 'DZD',
          avoid: [],
        })
        .select()
        .single();

      if (cerr) throw new Error(cerr.message);
      return created;
    },

    async updatePreferences(userId, patch) {
      const { data, error } = await sb
        .from('style_preferences')
        .upsert({
          ...patch,
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async listProducts(filter) {
      let q = sb.from('products').select('*', { count: 'exact' });

      if (filter.q) q = q.ilike('title', `%${filter.q}%`);
      if (filter.universes?.length) q = q.in('universe', filter.universes);
      if (filter.categories?.length) q = q.in('category', filter.categories);
      if (filter.occasions?.length) q = q.overlaps('occasions', filter.occasions);
      if (filter.merchant_id) q = q.eq('merchant_id', filter.merchant_id);
      if (filter.min_price != null) q = q.gte('price', filter.min_price);
      if (filter.max_price != null) q = q.lte('price', filter.max_price);
      if (filter.in_stock_only) q = q.eq('in_stock', true);

      const limit = filter.limit ?? 30;
      const offset = filter.offset ?? 0;

      q = q.range(offset, offset + limit - 1);

      switch (filter.sort) {
        case 'price_asc':
          q = q.order('price', { ascending: true });
          break;
        case 'price_desc':
          q = q.order('price', { ascending: false });
          break;
        case 'newest':
          q = q.order('created_at', { ascending: false });
          break;
        case 'rating':
          q = q.order('rating', { ascending: false });
          break;
        default:
          q = q.order('created_at', { ascending: false });
      }

      const { data, count, error } = await q;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as Product[],
        total: count ?? 0,
        has_more:
          offset + (data?.length ?? 0) < (count ?? 0),
      };
    },

    async getProduct(id) {
      const { data, error } = await sb
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },

    async listLooks(filter) {
      let q = sb.from('looks').select('*', { count: 'exact' });

      if (filter.universes?.length) q = q.in('universe', filter.universes);
      if (filter.occasions?.length) q = q.in('occasion', filter.occasions);
      if (filter.max_total != null) q = q.lte('total_cost', filter.max_total);
      if (filter.author_id) q = q.eq('author_id', filter.author_id);

      const limit = filter.limit ?? 20;
      const offset = filter.offset ?? 0;

      q = q
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      const { data, count, error } = await q;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as Look[],
        total: count ?? 0,
        has_more:
          offset + (data?.length ?? 0) < (count ?? 0),
      };
    },

    async getLook(id) {
      const { data, error } = await sb
        .from('looks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },

    async similarLooks(lookId, limit = 4) {
      const { data, error } = await sb.rpc('similar_looks', {
        look_id: lookId,
        row_limit: limit,
      });

      if (error) throw new Error(error.message);
      return (data ?? []) as Look[];
    },

    async listMerchants(opts) {
      let q = sb
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });

      if (opts?.approvedOnly) q = q.eq('approved', true);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async getMerchant(id) {
      const { data, error } = await sb
        .from('merchants')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },

    async applyMerchant(input) {
      const { data, error } = await sb
        .from('merchants')
        .insert({ ...input, approved: false })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async upsertProduct(input, merchantId) {
      const { data, error } = await sb
        .from('products')
        .insert({ ...input, merchant_id: merchantId })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async merchantStats(merchantId) {
      const { data, error } = await sb.rpc('merchant_stats', {
        merchant_id: merchantId,
      });

      if (error) throw new Error(error.message);
      return data;
    },

    async likeLook(lookId, on) {
      const session = await authed();
      if (!session) throw new Error('Sign in required');

      const { error } = await sb.rpc('set_like', {
        look_id: lookId,
        liked: on,
        user_id: session.user.id,
      });

      if (error) throw new Error(error.message);
    },

    async toggleSaveLook(lookId) {
      const session = await authed();
      if (!session) throw new Error('Sign in required');

      const { data, error } = await sb.rpc('toggle_save', {
        look_id: lookId,
        user_id: session.user.id,
      });

      if (error) throw new Error(error.message);
      return Boolean(data);
    },

    async isSaved(lookId) {
      const session = await authed();
      if (!session) return false;

      const { data } = await sb
        .from('saved_looks')
        .select('look_id')
        .eq('user_id', session.user.id)
        .eq('look_id', lookId)
        .maybeSingle();

      return Boolean(data);
    },

    async listSavedLooks(userId) {
      const { data, error } = await sb
        .from('saved_looks')
        .select('looks(*)')
        .eq('user_id', userId);

      if (error) throw new Error(error.message);

      return (data ?? []).map(
        (row: { looks: unknown }) => row.looks,
      ) as Look[];
    },

    async listComments(lookId) {
      const { data, error } = await sb
        .from('comments')
        .select('*')
        .eq('look_id', lookId)
        .order('created_at');

      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async addComment(lookId, body) {
      const session = await authed();
      if (!session) throw new Error('Sign in required');

      const { data, error } = await sb
        .from('comments')
        .insert({
          look_id: lookId,
          author_id: session.user.id,
          body,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async listBattles(opts) {
      let q = sb
        .from('battles')
        .select('*')
        .order('starts_at', { ascending: false });

      if (opts?.status) q = q.eq('status', opts.status);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Battle[];
    },

    async getBattleResult(id) {
      const { data, error } = await sb.rpc('battle_result', {
        battle_id: id,
      });

      if (error) throw new Error(error.message);
      return (data as BattleResult) ?? null;
    },

    async vote(battleId, side) {
      const session = await authed();
      if (!session) throw new Error('Sign in required');

      const { data, error } = await sb.rpc('vote_in_battle', {
        battle_id: battleId,
        side,
        user_id: session.user.id,
      });

      if (error) throw new Error(error.message);
      return data as BattleResult;
    },

    async listStories() {
      const { data, error } = await sb
        .from('editorial_stories')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async getStory(slug) {
      const { data, error } = await sb
        .from('editorial_stories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },

    async listWardrobe(ownerId) {
      const { data, error } = await sb
        .from('wardrobe_items')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async addWardrobeItem(item) {
      const { data, error } = await sb
        .from('wardrobe_items')
        .insert(item)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async deleteWardrobeItem(id) {
      const { error } = await sb
        .from('wardrobe_items')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async listOutfits(ownerId) {
      const { data, error } = await sb
        .from('outfits')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async saveOutfit(outfit) {
      const { data, error } = await sb
        .from('outfits')
        .insert(outfit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async deleteOutfit(id) {
      const { error } = await sb
        .from('outfits')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async listCollections(ownerId) {
      const { data, error } = await sb
        .from('collections')
        .select('*')
        .eq('owner_id', ownerId);

      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async createCollection(name, ownerId) {
      const { data, error } = await sb
        .from('collections')
        .insert({
          name,
          owner_id: ownerId,
          look_ids: [],
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async toggleLookInCollection(collectionId, lookId) {
      const { data, error } = await sb.rpc(
        'toggle_look_in_collection',
        {
          collection_id: collectionId,
          look_id: lookId,
        },
      );

      if (error) throw new Error(error.message);
      return Boolean(data);
    },

    async listFeed(limit = 20) {
      const { data, error } = await sb
        .from('looks')
        .select('*')
        .order('likes', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return (data ?? []) as Look[];
    },

    async listPublicProfiles() {
      const { data, error } = await sb
        .from('public_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);
      return (data ?? []) as import('./types').PublicProfile[];
    },

    async getProfileByHandle(handle) {
      const { data, error } = await sb
        .from('public_profiles')
        .select('*')
        .eq('handle', handle)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },

    async toggleFollow(userId) {
      const session = await authed();
      if (!session) throw new Error('Sign in required');

      const { data, error } = await sb.rpc('toggle_follow', {
        target_id: userId,
        user_id: session.user.id,
      });

      if (error) throw new Error(error.message);
      return Boolean(data);
    },

    async listFollows() {
      const session = await authed();
      if (!session) return [];

      const { data, error } = await sb
        .from('follows')
        .select('target_id')
        .eq('user_id', session.user.id);

      if (error) throw new Error(error.message);
      return (data ?? []).map(
        (r: { target_id: string }) => r.target_id,
      );
    },

    async submitReport(report) {
      const { data, error } = await sb
        .from('reports')
        .insert(report)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async listNotifications(userId) {
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async markNotificationRead(id) {
      const { error } = await sb
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },

    async markAllNotificationsRead(userId) {
      const { error } = await sb
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
    },

    async recordAffiliateClick(click) {
      const { data, error } = await sb
        .from('affiliate_clicks')
        .insert(click)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async getSubscription(userId) {
      const { data } = await sb
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return (
        data ?? {
          user_id: userId,
          plan: 'free',
          status: 'active',
          provider: 'none',
          current_period_end: null,
        }
      );
    },

    async requestCheckout(plan) {
      try {
        const { data, error } = await sb.functions.invoke(
          'create-checkout',
          { body: { plan } },
        );

        if (error) throw new Error(error.message);

        const body = data as { url?: string };

        if (body?.url) {
          return {
            status: 'url',
            url: body.url,
            message: 'Redirecting to secure checkout.',
          };
        }

        return {
          status: 'not_configured',
          message:
            'Checkout is not configured. Add payment credentials to enable it.',
        };
      } catch {
        return {
          status: 'not_configured',
          message:
            'Checkout is not configured. Add payment credentials to enable it.',
        };
      }
    },

    async runStudio(req) {
      try {
        const { data, error } = await sb.functions.invoke(
          'ai-stylist',
          { body: req },
        );

        if (error) throw new Error(error.message);

        const body = data as {
          result?: ReturnType<typeof buildOutfit>;
        };

        if (body?.result) {
          return { ...body.result, engine: 'cloud-ai' };
        }

        throw new Error('Empty AI response');
      } catch (e) {
        const fallback = buildOutfit(demoProducts, req);

        return {
          ...fallback,
          engine: 'local-engine',
          degraded_reason:
            e instanceof Error ? e.message : 'AI unavailable',
        };
      }
    },
    
        async runWasmChat(
      req: WasmChatRequest,
    ): Promise<StudioResult> {
      const { data, error } = await sb.functions.invoke(
        'wasm-chat',
        {
          body: {
            message: req.message,
            history: req.history,
            universe: req.universe,
            images: req.images ?? [],
          },
        },
      );

      if (error) {
        throw new Error(
          'WASM chat request failed. Check Supabase deployment and configuration.',
        );
      }

      const body = data as {
        result?: StudioResult;
        error?: string;
      };

      if (!body?.result) {
        throw new Error(
          body?.error ?? 'WASM returned an empty response',
        );
      }

      return body.result;
    },
    
    async adminOverview() {
      const { data, error } = await sb.rpc('admin_overview');
      if (error) throw new Error(error.message);
      return data;
    },

    async adminListReports() {
      const { data, error } = await sb
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async adminResolveReport(id, action) {
      const { data, error } = await sb
        .from('reports')
        .update({ status: action })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async adminSetMerchantApproval(id, approved) {
      const { data, error } = await sb
        .from('merchants')
        .update({ approved, verified: approved })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },

    async adminListAudit() {
      const { data, error } = await sb
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },

    async adminListUsers() {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  };
}

export type { Paged, ProductFilter, LookFilter, StudioRequest };
    
