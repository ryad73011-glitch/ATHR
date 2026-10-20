-- Merchant Space hardening:
-- 1) Store owners cannot self-approve or transfer ownership.
-- 2) Product writes require an approved store, unless performed by an admin.

create or replace function public.guard_merchant_owner_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    if old.owner_id is distinct from new.owner_id then
      raise exception 'Store ownership cannot be changed by the store owner';
    end if;
    if old.approved is distinct from new.approved
       or old.verified is distinct from new.verified then
      raise exception 'Only an ATHR administrator can approve or verify a store';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_merchant_owner_fields() from public, anon, authenticated;

drop trigger if exists guard_merchant_owner_fields_before_update on public.merchants;
create trigger guard_merchant_owner_fields_before_update
before update of owner_id, approved, verified on public.merchants
for each row execute function public.guard_merchant_owner_fields();

drop policy if exists products_write on public.products;
drop policy if exists products_insert_approved_store on public.products;
drop policy if exists products_update_approved_store on public.products;
drop policy if exists products_delete_approved_store on public.products;

create policy products_insert_approved_store
on public.products for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.is_merchant_owner(merchant_id)
    and exists (
      select 1 from public.merchants m
      where m.id = products.merchant_id and m.approved = true
    )
  )
);

create policy products_update_approved_store
on public.products for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_merchant_owner(merchant_id)
    and exists (
      select 1 from public.merchants m
      where m.id = products.merchant_id and m.approved = true
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_merchant_owner(merchant_id)
    and exists (
      select 1 from public.merchants m
      where m.id = products.merchant_id and m.approved = true
    )
  )
);

create policy products_delete_approved_store
on public.products for delete
to authenticated
using (
  public.is_admin()
  or (
    public.is_merchant_owner(merchant_id)
    and exists (
      select 1 from public.merchants m
      where m.id = products.merchant_id and m.approved = true
    )
  )
);
