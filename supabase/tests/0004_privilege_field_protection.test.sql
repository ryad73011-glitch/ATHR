-- pgTAP regression checks for 0004_privilege_field_protection.sql.
-- Run only against an isolated Supabase test database after applying migrations.
begin;
select plan(15);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'authenticated users cannot directly insert profile rows'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'authenticated users cannot directly delete profile rows'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT'),
  'authenticated users cannot set profiles.role on insert'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'authenticated users cannot update profiles.role'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'premium', 'UPDATE'),
  'authenticated users cannot update profiles.premium'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'verified', 'UPDATE'),
  'authenticated users cannot update profiles.verified'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'),
  'authenticated users can update profiles.display_name'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'preferred_locale', 'UPDATE'),
  'authenticated users can update profiles.preferred_locale'
);
select ok(
  not has_table_privilege('authenticated', 'public.merchants', 'DELETE'),
  'authenticated users cannot directly delete merchant rows'
);
select ok(
  not has_column_privilege('authenticated', 'public.merchants', 'approved', 'INSERT'),
  'authenticated users cannot set merchants.approved on insert'
);
select ok(
  not has_column_privilege('authenticated', 'public.merchants', 'verified', 'INSERT'),
  'authenticated users cannot set merchants.verified on insert'
);
select ok(
  not has_column_privilege('authenticated', 'public.merchants', 'plan', 'INSERT'),
  'authenticated users cannot set merchants.plan on insert'
);
select ok(
  not has_column_privilege('authenticated', 'public.merchants', 'approved', 'UPDATE'),
  'authenticated users cannot update merchants.approved'
);
select ok(
  not has_column_privilege('authenticated', 'public.merchants', 'plan', 'UPDATE'),
  'authenticated users cannot update merchants.plan'
);
select ok(
  has_column_privilege('authenticated', 'public.merchants', 'name', 'INSERT'),
  'authenticated users can create a merchant storefront name'
);
select ok(
  has_column_privilege('authenticated', 'public.merchants', 'description', 'UPDATE'),
  'authenticated users can update storefront descriptions'
);

select * from finish();
rollback;
