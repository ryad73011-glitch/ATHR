-- Enforce merchant product allowances in the database, not only in UI.
create or replace function public.enforce_merchant_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := 50;
  v_count integer := 0;
  v_status text := 'inactive';
  v_plan text := 'free';
begin
  -- Serialize product creation per merchant so concurrent requests cannot race past the cap.
  perform pg_advisory_xact_lock(hashtext(new.merchant_id::text));

  select ms.plan, ms.status
    into v_plan, v_status
  from public.merchant_subscriptions ms
  where ms.merchant_id = new.merchant_id
    and ms.status = 'active'
    and (ms.current_period_end is null or ms.current_period_end > now());

  if not found then
    v_plan := 'free';
    v_status := 'inactive';
  end if;

  v_limit := case v_plan
    when 'starter' then 200
    when 'growth' then 1000
    when 'flagship' then 5000
    else 50
  end;

  if tg_op = 'UPDATE' and old.merchant_id = new.merchant_id then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select count(*) into v_count
    from public.products p
    where p.merchant_id = new.merchant_id and p.id <> old.id;
  else
    select count(*) into v_count
    from public.products p
    where p.merchant_id = new.merchant_id;
  end if;

  if v_count >= v_limit then
    raise exception 'Merchant product limit reached for plan % (limit %)', v_plan, v_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists products_enforce_merchant_product_limit on public.products;
create trigger products_enforce_merchant_product_limit
before insert or update of merchant_id on public.products
for each row execute function public.enforce_merchant_product_limit();

revoke all on function public.enforce_merchant_product_limit() from public, anon, authenticated;
grant execute on function public.enforce_merchant_product_limit() to service_role;
