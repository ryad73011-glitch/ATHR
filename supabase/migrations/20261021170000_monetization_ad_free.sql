-- ATHR monetization catalogue and ad-free product policy.
-- Prices are initial proposals in DZD; checkout remains disabled until payment providers are configured.

create table if not exists public.monetization_plans (
  id text primary key,
  audience text not null check (audience in ('ai', 'merchant')),
  name text not null,
  price_dzd integer not null check (price_dzd >= 0),
  billing_interval text not null check (billing_interval in ('month', 'year', 'none')),
  features text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.monetization_plans enable row level security;
drop policy if exists monetization_plans_public_read on public.monetization_plans;
create policy monetization_plans_public_read
  on public.monetization_plans for select to anon, authenticated
  using (active = true);

revoke insert, update, delete on public.monetization_plans from anon, authenticated;

insert into public.monetization_plans
  (id, audience, name, price_dzd, billing_interval, features, active)
values
  ('ai_free', 'ai', 'AI Free', 0, 'month',
   array['Local style recommendations', 'Ad-free app', 'Basic wardrobe tools'], true),
  ('ai_premium_monthly', 'ai', 'ATHR Premium Monthly', 900, 'month',
   array['Cloud AI stylist when configured', 'Advanced style tools', 'Ad-free app'], true),
  ('ai_premium_annual', 'ai', 'ATHR Premium Annual', 9000, 'year',
   array['Cloud AI stylist when configured', 'Advanced style tools', 'Ad-free app'], true),
  ('merchant_free', 'merchant', 'Merchant Free', 0, 'month',
   array['Basic shop profile', 'Basic catalogue presence'], true),
  ('merchant_starter', 'merchant', 'Merchant Starter', 1500, 'month',
   array['Expanded shop profile', 'Basic catalogue analytics'], true),
  ('merchant_growth', 'merchant', 'Merchant Growth', 4500, 'month',
   array['Expanded catalogue tools', 'Growth analytics'], true),
  ('merchant_flagship', 'merchant', 'Merchant Flagship', 10000, 'month',
   array['Premium shop profile', 'Advanced analytics'], true)
on conflict (id) do update set
  audience = excluded.audience,
  name = excluded.name,
  price_dzd = excluded.price_dzd,
  billing_interval = excluded.billing_interval,
  features = excluded.features,
  active = excluded.active;

-- Permanent ad-free policy: existing sponsored products become ordinary catalogue entries,
-- and future writes cannot turn sponsorship back on.
update public.products set sponsored = false where sponsored is distinct from false;
alter table public.products drop constraint if exists products_sponsored_disabled;
alter table public.products add constraint products_sponsored_disabled check (sponsored = false);
