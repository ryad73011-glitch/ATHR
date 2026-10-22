-- Regression checks for public profile projection and email isolation.
-- Run only against an isolated database after applying migrations.
begin;
select plan(6);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous clients cannot query the profiles base table'
);
select ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated clients retain base-table access subject to RLS'
);
select ok(
  has_table_privilege('anon', 'public.public_profiles', 'SELECT'),
  'anonymous clients can read the public profile projection'
);
select ok(
  not has_column_privilege('anon', 'public.profiles', 'email', 'SELECT'),
  'anonymous clients cannot select profiles.email'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_profiles'
      and column_name in ('email', 'role', 'premium')
  ),
  'public profile projection excludes email, role, and premium'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select'
      and roles = array['authenticated']::name[]
      and qual like '%auth.uid%'
      and qual like '%is_admin%'
  ),
  'base profile SELECT policy is restricted to self or administrator'
);

select * from finish();
rollback;
