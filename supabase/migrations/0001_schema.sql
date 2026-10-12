-- ATHR · 0001_schema.sql
-- Core PostgreSQL schema. Mirrors apps/mobile/src/data/types.ts.

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  handle text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  role text not null default 'user' check (role in ('user','merchant','editor','moderator','admin')),
  universe_pref text check (universe_pref in ('CALM','CHAOS')),
  preferred_locale text not null default 'en' check (preferred_locale in ('en','ar','fr')),
  followers integer not null default 0,
  following integer not null default 0,
  verified boolean not null default false,
  premium boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.style_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  universes text[] not null default '{CALM,CHAOS}',
  categories text[] not null default '{}',
  occasions text[] not null default '{}',
  palette text[] not null default '{}',
  budget_min integer not null default 10000,
  budget_max integer not null default 120000,
  currency text not null default 'DZD',
  avoid text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- merchants & products
-- ----------------------------------------------------------------------------
create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  slug text not null unique,
  name text not null,
  logo_url text,
  cover_url text,
  description text,
  city text not null,
  country text not null default 'DZ',
  verified boolean not null default false,
  approved boolean not null default false,
  plan text not null default 'free' check (plan in ('free','starter','growth','flagship')),
  rating numeric not null default 0,
  review_count integer not null default 0,
  affiliate_network text,
  commission_rate numeric not null default 0.05,
  product_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  merchant_name text not null,
  title text not null,
  brand text not null,
  category text not null,
  universe text not null check (universe in ('CALM','CHAOS')),
  price integer not null check (price >= 0),
  compare_at_price integer,
  currency text not null default 'DZD',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  images text[] not null default '{}',
  affiliate_url text,
  checkout_type text not null default 'external' check (checkout_type in ('external','in_app','contact')),
  in_stock boolean not null default true,
  stock_count integer,
  occasions text[] not null default '{everyday}',
  sponsored boolean not null default false,
  rating numeric not null default 0,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists products_universe_idx on public.products (universe);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_merchant_idx on public.products (merchant_id);

-- ----------------------------------------------------------------------------
-- looks (items stored as jsonb snapshot; see types.LookItem[])
-- ----------------------------------------------------------------------------
create table if not exists public.looks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  universe text not null check (universe in ('CALM','CHAOS')),
  occasion text not null,
  hero_image text,
  palette text[] not null default '{}',
  items jsonb not null default '[]'::jsonb,
  total_cost integer not null default 0,
  currency text not null default 'DZD',
  author_id uuid references public.profiles (id) on delete set null,
  author_handle text not null,
  author_avatar text,
  likes integer not null default 0,
  saves integer not null default 0,
  comment_count integer not null default 0,
  tags text[] not null default '{}',
  editorial_note text,
  created_at timestamptz not null default now()
);
create index if not exists looks_universe_idx on public.looks (universe);
create index if not exists looks_author_idx on public.looks (author_id);

-- ----------------------------------------------------------------------------
-- battles & votes
-- ----------------------------------------------------------------------------
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind text not null check (kind in ('DAILY','CALM_VS_CHAOS','COMMUNITY','EDITORIAL')),
  left_look_id uuid not null references public.looks (id) on delete cascade,
  right_look_id uuid not null references public.looks (id) on delete cascade,
  left_total integer not null default 0,
  right_total integer not null default 0,
  currency text not null default 'DZD',
  votes_left integer not null default 0,
  votes_right integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','closed')),
  created_by uuid references public.profiles (id) on delete set null
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  side text not null check (side in ('left','right')),
  created_at timestamptz not null default now(),
  unique (battle_id, user_id)
);
create index if not exists votes_battle_idx on public.votes (battle_id);

-- ----------------------------------------------------------------------------
-- engagement
-- ----------------------------------------------------------------------------
create table if not exists public.saved_looks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  look_id uuid not null references public.looks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, look_id)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  look_id uuid not null references public.looks (id) on delete cascade,
  liked boolean not null default true,
  primary key (user_id, look_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  look_id uuid not null references public.looks (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_handle text not null,
  author_avatar text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_look_idx on public.comments (look_id);

create table if not exists public.follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  look_ids text[] not null default '{}',
  cover_image text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- wardrobe
-- ----------------------------------------------------------------------------
create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  category text not null,
  brand text,
  color text not null default '#2C2E33',
  season text not null default 'all',
  occasions text[] not null default '{everyday}',
  image_uri text,
  note text,
  worn_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists wardrobe_owner_idx on public.wardrobe_items (owner_id);

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  item_ids text[] not null default '{}',
  cover_uri text,
  occasion text not null default 'everyday',
  universe text not null default 'CALM',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- editorial
-- ----------------------------------------------------------------------------
create table if not exists public.editorial_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kicker text not null,
  title text not null,
  excerpt text not null,
  body text[] not null default '{}',
  cover_image text,
  universe text not null default 'CALM',
  author text not null,
  read_minutes integer not null default 3,
  look_ids text[] not null default '{}',
  published_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- notifications / moderation / audit / ai / affiliate / subscriptions
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'system',
  title text not null,
  body text not null,
  deep_link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null check (target_kind in ('look','comment','profile','product','battle')),
  target_id text not null,
  reason text not null check (reason in ('spam','harassment','inappropriate','counterfeit','other')),
  detail text,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model text not null,
  provider text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  latency_ms integer not null default 0,
  status text not null default 'ok' check (status in ('ok','error','fallback')),
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  look_id uuid,
  user_id uuid,
  ref_code text,
  created_at timestamptz not null default now()
);
create index if not exists affiliate_merchant_idx on public.affiliate_clicks (merchant_id);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium_monthly','premium_annual')),
  status text not null default 'active',
  provider text not null default 'none',
  current_period_end timestamptz
);
