-- ATHR: atomic AI usage reservations and cost telemetry.
-- Apply this migration before deploying Edge Functions that call reserve_ai_usage.

alter table public.ai_usage
  add column if not exists feature text not null default 'ai-stylist';

alter table public.ai_usage
  add column if not exists provider_cost numeric(12,8);

-- Existing rows may have been inserted by clients before this migration.
-- Only reservations created by the trusted RPC count against future quotas.
alter table public.ai_usage
  add column if not exists server_reserved boolean not null default false;

alter table public.ai_usage
  drop constraint if exists ai_usage_status_check;

alter table public.ai_usage
  add constraint ai_usage_status_check
  check (status in ('pending', 'ok', 'error', 'fallback'));

alter table public.ai_usage
  drop constraint if exists ai_usage_feature_check;

alter table public.ai_usage
  add constraint ai_usage_feature_check
  check (feature in ('ai-stylist', 'wasm-chat'));

alter table public.ai_usage
  drop constraint if exists ai_usage_provider_cost_nonnegative;

alter table public.ai_usage
  add constraint ai_usage_provider_cost_nonnegative
  check (provider_cost is null or provider_cost >= 0);

create index if not exists ai_usage_user_created_at_idx
  on public.ai_usage (user_id, created_at desc);

create index if not exists ai_usage_created_at_idx
  on public.ai_usage (created_at desc);

-- Clients must not forge usage records or mutate quota accounting.
drop policy if exists ai_insert on public.ai_usage;
revoke insert, update, delete on public.ai_usage from anon, authenticated;

-- Reserves quota before calling an external AI provider. The transaction-scoped
-- advisory locks make both the per-user and project-wide checks atomic.
-- Safe defaults: 20 requests per user and 200 requests per project per rolling
-- 24 hours, shared across both AI endpoints. Tune only after observing real usage.
create or replace function public.reserve_ai_usage(
  p_user_id uuid,
  p_feature text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_count integer;
  v_project_count integer;
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_feature is null or p_feature not in ('ai-stylist', 'wasm-chat') then
    raise exception 'unsupported AI feature';
  end if;

  -- Acquire locks in a consistent order for all callers.
  perform pg_advisory_xact_lock(8675309, 1);
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select count(*)::integer
    into v_user_count
    from public.ai_usage
    where user_id = p_user_id
      and server_reserved
      and created_at >= now() - interval '24 hours';

  if v_user_count >= 20 then
    return null;
  end if;

  select count(*)::integer
    into v_project_count
    from public.ai_usage
    where server_reserved
      and created_at >= now() - interval '24 hours';

  if v_project_count >= 200 then
    return null;
  end if;

  insert into public.ai_usage (
    user_id,
    model,
    provider,
    latency_ms,
    status,
    feature,
    server_reserved
  )
  values (
    p_user_id,
    'openrouter/free',
    'openrouter',
    0,
    'pending',
    p_feature,
    true
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.reserve_ai_usage(uuid, text)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_usage(uuid, text)
  to service_role;
