-- ATHR merchant ratings: one review per signed-in user per merchant.
create table if not exists public.merchant_reviews (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_reviews_one_per_user unique (merchant_id, user_id)
);

create index if not exists merchant_reviews_merchant_created_idx
  on public.merchant_reviews (merchant_id, created_at desc);

alter table public.merchant_reviews enable row level security;

drop policy if exists "Anyone can read reviews of approved merchants" on public.merchant_reviews;
create policy "Anyone can read reviews of approved merchants"
  on public.merchant_reviews for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.merchants m
      where m.id = merchant_reviews.merchant_id and m.approved = true
    )
    or user_id = (select auth.uid())
  );

drop policy if exists "Signed-in users can review approved merchants" on public.merchant_reviews;
create policy "Signed-in users can review approved merchants"
  on public.merchant_reviews for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.merchants m
      where m.id = merchant_reviews.merchant_id
        and m.approved = true
        and m.owner_id is distinct from (select auth.uid())
    )
  );

drop policy if exists "Users can update their own merchant review" on public.merchant_reviews;
create policy "Users can update their own merchant review"
  on public.merchant_reviews for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.merchants m
      where m.id = merchant_reviews.merchant_id
        and m.approved = true
        and m.owner_id is distinct from (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own merchant review" on public.merchant_reviews;
create policy "Users can delete their own merchant review"
  on public.merchant_reviews for delete
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.refresh_merchant_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_merchant_id uuid;
begin
  target_merchant_id := coalesce(new.merchant_id, old.merchant_id);
  update public.merchants m
  set rating = coalesce((
        select round(avg(r.rating)::numeric, 2)
        from public.merchant_reviews r
        where r.merchant_id = target_merchant_id
      ), 0),
      review_count = (
        select count(*)::integer
        from public.merchant_reviews r
        where r.merchant_id = target_merchant_id
      )
  where m.id = target_merchant_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke execute on function public.refresh_merchant_rating() from public, anon, authenticated;

drop trigger if exists refresh_merchant_rating_after_change on public.merchant_reviews;
create trigger refresh_merchant_rating_after_change
after insert or update or delete on public.merchant_reviews
for each row execute function public.refresh_merchant_rating();

grant select on public.merchant_reviews to anon, authenticated;
grant insert, update, delete on public.merchant_reviews to authenticated;
