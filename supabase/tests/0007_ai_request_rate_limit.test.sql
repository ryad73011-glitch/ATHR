-- Regression checks for AI rate-limit isolation and privileges.
-- Run against an isolated Supabase database after applying migration 0007.
begin;
select plan(5);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.ai_request_events'::regclass),
  'AI request event ledger has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.ai_request_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ai_request_events', 'SELECT'),
  'client roles cannot read the AI request event ledger'
);

select ok(
  has_function_privilege('service_role', 'public.consume_ai_request(uuid)', 'EXECUTE'),
  'service_role can invoke the quota function'
);

select ok(
  not has_function_privilege('anon', 'public.consume_ai_request(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.consume_ai_request(uuid)', 'EXECUTE'),
  'client roles cannot invoke the quota function directly'
);

select ok(
  position('recent_minute >= 10' in pg_get_functiondef('public.consume_ai_request(uuid)'::regprocedure)) > 0
  and position('recent_day >= 100' in pg_get_functiondef('public.consume_ai_request(uuid)'::regprocedure)) > 0,
  'quota function enforces minute and daily caps'
);

select * from finish();
rollback;
