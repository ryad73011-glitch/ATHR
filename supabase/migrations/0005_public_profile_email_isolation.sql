-- ATHR 0005: isolate private profile email from public profile discovery.
-- Public/community clients use public_profiles; authenticated account/admin flows
-- retain access to profiles under a narrower row policy.
begin;

-- Anon users must not query profiles directly. Authenticated users can query their
-- own row, and administrators can query rows for moderation/admin screens.
revoke select on table public.profiles from public, anon;
grant select on table public.profiles to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

-- This read-only projection intentionally excludes email and entitlement/role fields.
-- The view owner is the migration owner, so the view exposes only these selected
-- columns while the base table remains protected by RLS for direct authenticated reads.
create or replace view public.public_profiles
  with (security_barrier = true)
as
select
  id,
  handle,
  display_name,
  avatar_url,
  bio,
  city,
  universe_pref,
  preferred_locale,
  followers,
  following,
  verified,
  created_at
from public.profiles;

revoke all on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to anon, authenticated;

commit;
