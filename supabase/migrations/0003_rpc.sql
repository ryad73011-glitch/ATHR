-- ATHR · 0003_rpc.sql
-- Security-definer RPCs used by the client so atomic writes never bypass RLS.

create or replace function public.battle_result(battle_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'battle', to_jsonb(b),
    'left', to_jsonb(l),
    'right', to_jsonb(r),
    'left_pct', case when (b.votes_left + b.votes_right) = 0 then 50
               else round((b.votes_left::numeric / (b.votes_left + b.votes_right)) * 100) end,
    'right_pct', case when (b.votes_left + b.votes_right) = 0 then 50
               else 100 - round((b.votes_left::numeric / (b.votes_left + b.votes_right)) * 100) end,
    'total_votes', b.votes_left + b.votes_right,
    'my_vote', (select v.side from public.votes v where v.battle_id = b.id and v.user_id = auth.uid())
  )
  from public.battles b
  join public.looks l on l.id = b.left_look_id
  join public.looks r on r.id = b.right_look_id
  where b.id = battle_id;
$$;

create or replace function public.vote_in_battle(battle_id uuid, side text, user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  existing text;
begin
  if side not in ('left','right') then
    raise exception 'invalid side';
  end if;
  if user_id is distinct from auth.uid() then
    raise exception 'cannot vote for another user';
  end if;

  select v.side into existing from public.votes v where v.battle_id = vote_in_battle.battle_id and v.user_id = user_id;

  if existing is null then
    insert into public.votes (battle_id, user_id, side) values (battle_id, user_id, side);
    update public.battles set
      votes_left = votes_left + (case when side = 'left' then 1 else 0 end),
      votes_right = votes_right + (case when side = 'right' then 1 else 0 end)
    where id = battle_id;
  elsif existing <> side then
    update public.votes set side = vote_in_battle.side where battle_id = vote_in_battle.battle_id and user_id = vote_in_battle.user_id;
    update public.battles set
      votes_left = votes_left + (case when side = 'left' then 1 else 0 end) - (case when existing = 'left' then 1 else 0 end),
      votes_right = votes_right + (case when side = 'right' then 1 else 0 end) - (case when existing = 'right' then 1 else 0 end)
    where id = battle_id;
  end if;

  return public.battle_result(battle_id);
end;
$$;

create or replace function public.toggle_save(look_id uuid, user_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  now_saved boolean;
begin
  if user_id is distinct from auth.uid() then raise exception 'not allowed'; end if;
  if exists (select 1 from public.saved_looks where user_id = user_id and look_id = toggle_save.look_id) then
    delete from public.saved_looks where user_id = user_id and look_id = toggle_save.look_id;
    update public.looks set saves = greatest(saves - 1, 0) where id = look_id;
    now_saved := false;
  else
    insert into public.saved_looks (user_id, look_id) values (user_id, look_id);
    update public.looks set saves = saves + 1 where id = look_id;
    now_saved := true;
  end if;
  return now_saved;
end;
$$;

create or replace function public.set_like(look_id uuid, liked boolean, user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if user_id is distinct from auth.uid() then raise exception 'not allowed'; end if;
  if liked then
    insert into public.likes (user_id, look_id, liked) values (user_id, look_id, true)
    on conflict (user_id, look_id) do update set liked = true;
    update public.looks set likes = likes + 1 where id = look_id;
  else
    if exists (select 1 from public.likes where user_id = user_id and look_id = look_id and liked) then
      update public.looks set likes = greatest(likes - 1, 0) where id = look_id;
    end if;
    delete from public.likes where user_id = user_id and look_id = look_id;
  end if;
end;
$$;

create or replace function public.toggle_follow(target_id uuid, user_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare now_following boolean;
begin
  if user_id is distinct from auth.uid() then raise exception 'not allowed'; end if;
  if exists (select 1 from public.follows where user_id = user_id and target_id = toggle_follow.target_id) then
    delete from public.follows where user_id = user_id and target_id = toggle_follow.target_id;
    update public.profiles set followers = greatest(followers - 1, 0) where id = target_id;
    now_following := false;
  else
    insert into public.follows (user_id, target_id) values (user_id, target_id);
    update public.profiles set followers = followers + 1 where id = target_id;
    now_following := true;
  end if;
  return now_following;
end;
$$;

create or replace function public.toggle_look_in_collection(collection_id uuid, look_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare added boolean;
begin
  if not exists (select 1 from public.collections where id = collection_id and owner_id = auth.uid()) then
    raise exception 'not your collection';
  end if;
  if look_id::text = any (select co.look_ids from public.collections co where co.id = collection_id) then
    update public.collections set look_ids = array_remove(look_ids, look_id::text) where id = collection_id;
    added := false;
  else
    update public.collections set look_ids = array_append(look_ids, look_id::text) where id = collection_id;
    added := true;
  end if;
  return added;
end;
$$;

create or replace function public.similar_looks(look_id uuid, row_limit integer default 4)
returns setof public.looks
language sql stable security definer set search_path = public as $$
  select l.*
  from public.looks l, public.looks base
  where base.id = look_id and l.id <> look_id
  order by
    (l.universe = base.universe)::int * 2 +
    (l.occasion = base.occasion)::int desc,
    l.created_at desc
  limit row_limit;
$$;

create or replace function public.merchant_stats(merchant_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  clicks integer;
  impressions integer;
begin
  if not (public.is_merchant_owner(merchant_id) or public.is_admin()) then
    raise exception 'not allowed';
  end if;
  select count(*) into clicks from public.affiliate_clicks where merchant_id = merchant_stats.merchant_id;
  impressions := greatest(clicks * 14, 320);
  return jsonb_build_object(
    'impressions', impressions,
    'clicks', clicks,
    'ctr', round((clicks::numeric / greatest(impressions,1)) * 100, 1),
    'est_commission', round(clicks * 90 * 0.08),
    'orders', round(clicks * 0.06),
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'clicks', c)), '[]'::jsonb)
      from (
        select to_char(generate_series(current_date - 6, current_date, interval '1 day'), 'YYYY-MM-DD') as d,
               (select count(*) from public.affiliate_clicks ac where ac.merchant_id = merchant_stats.merchant_id and ac.created_at::date = generate_series(current_date - 6, current_date, interval '1 day')::date) as c
      ) s
    )
  );
end;
$$;

create or replace function public.admin_overview()
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'merchants', (select count(*) from public.merchants where approved),
    'pending_merchants', (select count(*) from public.merchants where not approved),
    'products', (select count(*) from public.products),
    'looks', (select count(*) from public.looks),
    'battles_live', (select count(*) from public.battles where status = 'live'),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'votes_total', (select coalesce(sum(votes_left + votes_right),0) from public.battles),
    'ai_calls', (select count(*) from public.ai_usage),
    'premium_users', (select count(*) from public.profiles where premium)
  ) else jsonb_build_object() end;
$$;

-- Auto-create a profile row when a user signs up (trigger on auth.users).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, handle, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  insert into public.style_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
