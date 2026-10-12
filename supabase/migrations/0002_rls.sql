-- ATHR · 0002_rls.sql
-- Row Level Security. Default-deny; explicit grants only.

-- Privilege helpers (security definer so policies can read profiles safely).
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('admin','moderator'), false);
$$;

create or replace function public.is_merchant_owner(m uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select owner_id from public.merchants where id = m) = auth.uid(), false);
$$;

-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true); -- public profiles are readable
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());

alter table public.style_preferences enable row level security;
drop policy if exists prefs_all on public.style_preferences;
create policy prefs_all on public.style_preferences for all using (user_id = auth.uid());

alter table public.merchants enable row level security;
drop policy if exists merchants_select on public.merchants;
create policy merchants_select on public.merchants for select using (approved or owner_id = auth.uid() or public.is_admin());
drop policy if exists merchants_insert on public.merchants;
create policy merchants_insert on public.merchants for insert with check (owner_id = auth.uid());
drop policy if exists merchants_update on public.merchants;
create policy merchants_update on public.merchants for update using (owner_id = auth.uid() or public.is_admin());

alter table public.products enable row level security;
drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (true); -- catalogue is public; merchants flagged separately
drop policy if exists products_write on public.products;
create policy products_write on public.products for all using (public.is_merchant_owner(merchant_id) or public.is_admin());

alter table public.looks enable row level security;
drop policy if exists looks_select on public.looks;
create policy looks_select on public.looks for select using (true);
drop policy if exists looks_insert on public.looks;
create policy looks_insert on public.looks for insert with check (author_id = auth.uid() or public.is_admin());
drop policy if exists looks_update on public.looks;
create policy looks_update on public.looks for update using (author_id = auth.uid() or public.is_admin());

alter table public.battles enable row level security;
drop policy if exists battles_select on public.battles;
create policy battles_select on public.battles for select using (true);
drop policy if exists battles_write on public.battles;
create policy battles_write on public.battles for all using (public.is_admin());

alter table public.votes enable row level security;
drop policy if exists votes_select on public.votes;
create policy votes_select on public.votes for select using (true);
drop policy if exists votes_insert on public.votes;
create policy votes_insert on public.votes for insert with check (user_id = auth.uid());
drop policy if exists votes_update on public.votes;
create policy votes_update on public.votes for update using (user_id = auth.uid());

alter table public.saved_looks enable row level security;
drop policy if exists saved_all on public.saved_looks;
create policy saved_all on public.saved_looks for all using (user_id = auth.uid());

alter table public.likes enable row level security;
drop policy if exists likes_all on public.likes;
create policy likes_all on public.likes for all using (user_id = auth.uid());

alter table public.comments enable row level security;
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (author_id = auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (author_id = auth.uid() or public.is_admin());

alter table public.follows enable row level security;
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select using (true);
drop policy if exists follows_write on public.follows;
create policy follows_write on public.follows for all using (user_id = auth.uid());

alter table public.collections enable row level security;
drop policy if exists collections_all on public.collections;
create policy collections_all on public.collections for all using (owner_id = auth.uid());

alter table public.wardrobe_items enable row level security;
drop policy if exists wardrobe_all on public.wardrobe_items;
create policy wardrobe_all on public.wardrobe_items for all using (owner_id = auth.uid());

alter table public.outfits enable row level security;
drop policy if exists outfits_all on public.outfits;
create policy outfits_all on public.outfits for all using (owner_id = auth.uid());

alter table public.editorial_stories enable row level security;
drop policy if exists stories_select on public.editorial_stories;
create policy stories_select on public.editorial_stories for select using (true);
drop policy if exists stories_write on public.editorial_stories;
create policy stories_write on public.editorial_stories for all using (public.is_admin());

alter table public.notifications enable row level security;
drop policy if exists notif_all on public.notifications;
create policy notif_all on public.notifications for all using (user_id = auth.uid());

alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update using (public.is_admin());

alter table public.audit_logs enable row level security;
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select using (public.is_admin());
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert with check (public.is_admin());

alter table public.ai_usage enable row level security;
drop policy if exists ai_select on public.ai_usage;
create policy ai_select on public.ai_usage for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists ai_insert on public.ai_usage;
create policy ai_insert on public.ai_usage for insert with check (user_id = auth.uid());

alter table public.affiliate_clicks enable row level security;
drop policy if exists aff_insert on public.affiliate_clicks;
create policy aff_insert on public.affiliate_clicks for insert with check (true); -- clicks recorded from edge fn/service too
drop policy if exists aff_select on public.affiliate_clicks;
create policy aff_select on public.affiliate_clicks for select using (public.is_merchant_owner(merchant_id) or public.is_admin());

alter table public.subscriptions enable row level security;
drop policy if exists sub_select on public.subscriptions;
create policy sub_select on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists sub_write on public.subscriptions;
create policy sub_write on public.subscriptions for all using (public.is_admin());
