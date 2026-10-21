-- Server-enforced subscription entitlements for ATHR.
-- No payment provider is activated by this migration. Subscription state is
-- only changed by trusted server/webhook code using service_role.
create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'utc')::date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
alter table public.ai_daily_usage enable row level security;
revoke all on public.ai_daily_usage from anon, authenticated;
grant select, insert, update, delete on public.ai_daily_usage to service_role;

create table if not exists public.merchant_subscriptions (
  merchant_id uuid primary key references public.merchants(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','starter','growth','flagship')),
  status text not null default 'inactive' check (status in ('active','inactive','past_due','canceled')),
  provider text not null default 'none',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.merchant_subscriptions enable row level security;
revoke all on public.merchant_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.merchant_subscriptions to service_role;

-- Atomic quota reservation prevents concurrent requests bypassing limits.
create or replace function public.consume_ai_request(p_user_id uuid)
returns table(allowed boolean, plan text, used integer, daily_limit integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text := 'free';
  v_limit integer := 5;
  v_used integer;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  select s.plan into v_plan
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status = 'active'
    and (s.current_period_end is null or s.current_period_end > now())
    and s.plan in ('premium_monthly','premium_annual')
  limit 1;

  if v_plan is null then
    v_plan := 'free';
  else
    v_limit := 50;
  end if;

  insert into public.ai_daily_usage(user_id, usage_date, request_count)
  values (p_user_id, (now() at time zone 'utc')::date, 0)
  on conflict (user_id, usage_date) do nothing;

  update public.ai_daily_usage
  set request_count = request_count + 1, updated_at = now()
  where user_id = p_user_id
    and usage_date = (now() at time zone 'utc')::date
    and request_count < v_limit
  returning request_count into v_used;

  if v_used is not null then
    return query select true, v_plan, v_used, v_limit;
    return;
  end if;

  select u.request_count into v_used
  from public.ai_daily_usage u
  where u.user_id = p_user_id and u.usage_date = (now() at time zone 'utc')::date;

  return query select false, v_plan, coalesce(v_used, v_limit), v_limit;
end;
$$;

revoke all on function public.consume_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid) to service_role;

-- Feature access is resolved server-side; client plan labels are never authority.
create or replace function public.merchant_plan_entitlements(p_merchant_id uuid)
returns table(plan text, status text, max_products integer, bulk_tools boolean, advanced_analytics boolean, ai_catalogue_tools boolean, team_seats integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case when ms.status = 'active'
          and (ms.current_period_end is null or ms.current_period_end > now())
         then ms.plan else 'free' end as plan,
    case when ms.status = 'active'
          and (ms.current_period_end is null or ms.current_period_end > now())
         then ms.status else 'inactive' end as status,
    case when ms.status = 'active' and (ms.current_period_end is null or ms.current_period_end > now())
      then case ms.plan when 'starter' then 200 when 'growth' then 1000 when 'flagship' then 5000 else 50 end
      else 50 end as max_products,
    (ms.status = 'active' and (ms.current_period_end is null or ms.current_period_end > now()) and ms.plan in ('growth','flagship')) as bulk_tools,
    (ms.status = 'active' and (ms.current_period_end is null or ms.current_period_end > now()) and ms.plan in ('growth','flagship')) as advanced_analytics,
    (ms.status = 'active' and (ms.current_period_end is null or ms.current_period_end > now()) and ms.plan in ('growth','flagship')) as ai_catalogue_tools,
    case when ms.status = 'active' and (ms.current_period_end is null or ms.current_period_end > now())
      then case ms.plan when 'flagship' then 10 when 'growth' then 3 else 1 end
      else 1 end as team_seats
  from (select 1) seed
  left join public.merchant_subscriptions ms on ms.merchant_id = p_merchant_id;
$$;

revoke all on function public.merchant_plan_entitlements(uuid) from public, anon, authenticated;
grant execute on function public.merchant_plan_entitlements(uuid) to service_role;
