-- ATHR · 0004_privilege_field_protection.sql
-- Prevent direct client writes to privilege, approval, billing, and derived fields.
-- This migration is intentionally additive and must be validated on a non-production
-- Supabase branch before deployment. Admin/server-side service_role workflows are
-- not granted these client-facing privileges by this migration.

-- Profiles: clients may edit ordinary profile fields, never role/entitlement/verification.
revoke update on table public.profiles from public, anon, authenticated;
grant update (
  handle,
  display_name,
  avatar_url,
  bio,
  city,
  universe_pref,
  preferred_locale
) on table public.profiles to authenticated;

-- Merchant records: allow owners to maintain storefront content only.
-- Approval, verification, plan, ratings, commission, and product_count remain controlled
-- by trusted server/admin workflows. Revoke broad insert so sensitive fields cannot be
-- set during merchant creation; RLS still verifies owner_id = auth.uid().
revoke insert, update on table public.merchants from public, anon, authenticated;
grant insert (
  owner_id,
  slug,
  name,
  logo_url,
  cover_url,
  description,
  city,
  country
) on table public.merchants to authenticated;
grant update (
  slug,
  name,
  logo_url,
  cover_url,
  description,
  city,
  country
) on table public.merchants to authenticated;

-- Explicit WITH CHECK conditions protect merchant creation defaults even if a future
-- migration broadens column grants. The column grants above are the primary control.
drop policy if exists merchants_insert on public.merchants;
create policy merchants_insert on public.merchants
  for insert
  with check (
    owner_id = auth.uid()
    and approved = false
    and verified = false
    and plan = 'free'
    and rating = 0
    and review_count = 0
    and commission_rate = 0.05
    and product_count = 0
  );

-- Note: no table-wide SELECT grants are changed here. Public profile email exposure
-- requires a separate compatibility review because existing clients may select profiles
-- using wildcard projections. No SECURITY DEFINER EXECUTE grants are changed here:
-- each function must be reviewed against its intended public/authenticated behavior.
