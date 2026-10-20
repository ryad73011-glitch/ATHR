-- Keep merchant product_count in sync with the live catalogue.
create or replace function public.refresh_merchant_product_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_merchant_id uuid;
  new_merchant_id uuid;
begin
  if tg_op <> 'INSERT' then old_merchant_id := old.merchant_id; end if;
  if tg_op <> 'DELETE' then new_merchant_id := new.merchant_id; end if;

  if old_merchant_id is not null then
    update public.merchants m
    set product_count = (
      select count(*)::integer from public.products p where p.merchant_id = old_merchant_id
    )
    where m.id = old_merchant_id;
  end if;

  if new_merchant_id is not null and new_merchant_id is distinct from old_merchant_id then
    update public.merchants m
    set product_count = (
      select count(*)::integer from public.products p where p.merchant_id = new_merchant_id
    )
    where m.id = new_merchant_id;
  elsif new_merchant_id is not null and old_merchant_id is null then
    update public.merchants m
    set product_count = (
      select count(*)::integer from public.products p where p.merchant_id = new_merchant_id
    )
    where m.id = new_merchant_id;
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function public.refresh_merchant_product_count() from public, anon, authenticated;

drop trigger if exists refresh_merchant_product_count_after_change on public.products;
create trigger refresh_merchant_product_count_after_change
after insert or delete or update of merchant_id on public.products
for each row execute function public.refresh_merchant_product_count();

update public.merchants m
set product_count = (
  select count(*)::integer from public.products p where p.merchant_id = m.id
);