/**
 * ATHR domain model.
 *
 * These types mirror the PostgreSQL schema in `supabase/migrations/`. Keeping
 * them in one place means the demo data source, the Supabase data source and
 * the UI all agree on shape.
 */

export type ID = string;
export type ISODate = string;
export type Currency = 'DZD' | 'USD' | 'EUR' | 'GBP';

export type Universe = 'CALM' | 'CHAOS';

export type Category =
  | 'outerwear'
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'knitwear'
  | 'tailoring'
  | 'shoes'
  | 'bags'
  | 'accessories'
  | 'headwear';

export type Occasion =
  | 'everyday'
  | 'work'
  | 'evening'
  | 'wedding'
  | 'travel'
  | 'sport'
  | 'street'
  | 'cafe';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

export type Role = 'user' | 'merchant' | 'editor' | 'moderator' | 'admin';

export interface Profile {
  id: ID;
  email: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  role: Role;
  universe_pref: Universe | null;
  preferred_locale: 'en' | 'ar' | 'fr';
  followers: number;
  following: number;
  verified: boolean;
  premium: boolean;
  created_at: ISODate;
}

export interface StylePreferences {
  user_id: ID;
  universes: Universe[];
  categories: Category[];
  occasions: Occasion[];
  palette: string[];
  budget_min: number;
  budget_max: number;
  currency: Currency;
  avoid: string[];
  updated_at: ISODate;
}

export interface Merchant {
  id: ID;
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  city: string;
  country: string;
  verified: boolean;
  approved: boolean;
  plan: 'free' | 'starter' | 'growth' | 'flagship';
  rating: number;
  review_count: number;
  affiliate_network: string | null;
  commission_rate: number;
  product_count: number;
  created_at: ISODate;
}

export interface Product {
  id: ID;
  merchant_id: ID;
  merchant_name: string;
  title: string;
  brand: string;
  category: Category;
  universe: Universe;
  price: number;
  compare_at_price: number | null;
  currency: Currency;
  colors: string[];
  sizes: string[];
  images: string[];
  affiliate_url: string | null;
  checkout_type: 'external' | 'in_app' | 'contact';
  in_stock: boolean;
  stock_count: number | null;
  occasions: Occasion[];
  sponsored: boolean;
  rating: number;
  created_at: ISODate;
  description: string | null;
}

export interface LookItem {
  product_id: ID;
  role: string;
  /** Denormalised snapshot so a look never lies if a product is edited later. */
  title: string;
  brand: string;
  price: number;
  currency: Currency;
  color: string;
  category: Category;
  image: string | null;
  affiliate_url: string | null;
  in_stock: boolean;
  alternatives?: ID[];
}

export interface Look {
  id: ID;
  slug: string;
  title: string;
  universe: Universe;
  occasion: Occasion;
  hero_image: string | null;
  palette: string[];
  items: LookItem[];
  total_cost: number;
  currency: Currency;
  author_id: ID;
  author_handle: string;
  author_avatar: string | null;
  likes: number;
  saves: number;
  comment_count: number;
  tags: string[];
  editorial_note: string | null;
  created_at: ISODate;
}

export type BattleKind = 'DAILY' | 'CALM_VS_CHAOS' | 'COMMUNITY' | 'EDITORIAL';

export interface Battle {
  id: ID;
  slug: string;
  title: string;
  kind: BattleKind;
  left_look_id: ID;
  right_look_id: ID;
  left_total: number;
  right_total: number;
  currency: Currency;
  votes_left: number;
  votes_right: number;
  starts_at: ISODate;
  ends_at: ISODate;
  status: 'scheduled' | 'live' | 'closed';
  created_by: ID | null;
}

export interface BattleResult {
  battle: Battle;
  left: Look;
  right: Look;
  left_pct: number;
  right_pct: number;
  total_votes: number;
  my_vote: 'left' | 'right' | null;
}

export interface WardrobeItem {
  id: ID;
  owner_id: ID;
  label: string;
  category: Category;
  brand: string | null;
  color: string;
  season: Season;
  occasions: Occasion[];
  image_uri: string | null;
  note: string | null;
  worn_count: number;
  created_at: ISODate;
}

export interface Outfit {
  id: ID;
  owner_id: ID;
  name: string;
  item_ids: ID[];
  cover_uri: string | null;
  occasion: Occasion;
  universe: Universe;
  created_at: ISODate;
}

export interface Collection {
  id: ID;
  owner_id: ID;
  name: string;
  look_ids: ID[];
  cover_image: string | null;
  created_at: ISODate;
}

export interface Comment {
  id: ID;
  look_id: ID;
  author_id: ID;
  author_handle: string;
  author_avatar: string | null;
  body: string;
  created_at: ISODate;
}

export interface EditorialStory {
  id: ID;
  slug: string;
  kicker: string;
  title: string;
  excerpt: string;
  body: string[];
  cover_image: string | null;
  universe: Universe;
  author: string;
  read_minutes: number;
  look_ids: ID[];
  published_at: ISODate;
}

export type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_annual';

export interface Subscription {
  user_id: ID;
  plan: SubscriptionPlan;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'not_configured';
  provider: 'stripe' | 'apple' | 'google' | 'manual' | 'none';
  current_period_end: ISODate | null;
}

export interface AppNotification {
  id: ID;
  user_id: ID;
  kind: 'vote' | 'follow' | 'like' | 'comment' | 'battle' | 'merchant' | 'system';
  title: string;
  body: string;
  deep_link: string | null;
  read: boolean;
  created_at: ISODate;
}

export interface AffiliateClick {
  id: ID;
  product_id: ID;
  merchant_id: ID;
  look_id: ID | null;
  user_id: ID | null;
  ref_code: string | null;
  created_at: ISODate;
}

export interface Report {
  id: ID;
  reporter_id: ID;
  target_kind: 'look' | 'comment' | 'profile' | 'product' | 'battle';
  target_id: ID;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'counterfeit' | 'other';
  detail: string | null;
  status: 'open' | 'actioned' | 'dismissed';
  created_at: ISODate;
}

export interface AuditLog {
  id: ID;
  actor_id: ID;
  action: string;
  entity: string;
  entity_id: ID | null;
  metadata: Record<string, unknown> | null;
  created_at: ISODate;
}

export interface AIUsage {
  id: ID;
  user_id: ID;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  status: 'ok' | 'error' | 'fallback';
  created_at: ISODate;
}

/** A completed Style Studio conversation turn. */
export interface StudioMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  product_ids?: ID[];
  look_ids?: ID[];
  reasoning?: string[];
  created_at: ISODate;
}

export interface StudioRequest {
  occasion: Occasion;
  budget: number;
  currency: Currency;
  universes: Universe[];
  palette: string[];
  note: string;
  image_uris?: string[];
}

export interface StudioResult {
  messages: StudioMessage[];
  product_ids: ID[];
  reasoning: string[];
  /** Which engine answered: the hosted AI function or the on-device fallback. */
  engine: 'cloud-ai' | 'local-engine';
  model: string | null;
  total_cost: number;
  currency: Currency;
  degraded_reason?: string;
}

export interface ProductFilter {
  q?: string;
  universes?: Universe[];
  categories?: Category[];
  occasions?: Occasion[];
  colors?: string[];
  brands?: string[];
  merchant_id?: ID;
  min_price?: number;
  max_price?: number;
  currency?: Currency;
  in_stock_only?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  limit?: number;
  offset?: number;
}

export interface LookFilter {
  q?: string;
  universes?: Universe[];
  occasions?: Occasion[];
  max_total?: number;
  author_id?: ID;
  tag?: string;
  sort?: 'trending' | 'newest' | 'cheapest' | 'priciest';
  limit?: number;
  offset?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  has_more: boolean;
}
