-- Permit trusted database/service roles and authenticated ATHR admins
-- to approve stores while preventing store owners from changing approval fields.
create or replace function public.guard_merchant_owner_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.is_admin() then
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
