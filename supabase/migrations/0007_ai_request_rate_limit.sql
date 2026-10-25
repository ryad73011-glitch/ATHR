-- ATHR: atomic server-side rate limiting for AI requests.
-- Apply only through the reviewed PR after isolated-database tests pass.
begin;

create table if not exists public.ai_request_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);

create index if not exists ai_request_events_user_time_idx
  on public.ai_request_events (user_id, requested_at desc);

alter table public.ai_request_events enable row level security;
revoke all on table public.ai_request_events from public, anon, authenticated;

create or replace function public.consume_ai_request(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  recent_minute integer;
  recent_day integer;
begin
  if p_user_id is null then
    return false;
  end if;

  -- Serialize concurrent requests per user to prevent a race through the limit.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  delete from public.ai_request_events
  where requested_at < pg_catalog.now() - interval '2 days';

  select count(*)::integer into recent_minute
  from public.ai_request_events
  where user_id = p_user_id
    and requested_at >= pg_catalog.now() - interval '1 minute';

  select count(*)::integer into recent_day
  from public.ai_request_events
  where user_id = p_user_id
    and requested_at >= pg_catalog.now() - interval '1 day';

  if recent_minute >= 10 or recent_day >= 100 then
    return false;
  end if;

  insert into public.ai_request_events(user_id) values (p_user_id);
  return true;
end;
$function$;

revoke all on function public.consume_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid) to service_role;

commit;
