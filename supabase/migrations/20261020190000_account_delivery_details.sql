-- ATHR: account contact details and saved delivery addresses.
-- Existing profiles remain valid; new fields are nullable for backward compatibility.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists wilaya text,
  add column if not exists commune text;

-- Private delivery addresses. A user can save more than one (home/work).
create table if not exists public.delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  wilaya text not null,
  commune text not null,
  street_address text not null,
  delivery_note text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_addresses_user_idx
  on public.delivery_addresses(user_id);

alter table public.delivery_addresses enable row level security;

drop policy if exists delivery_addresses_select_own on public.delivery_addresses;
create policy delivery_addresses_select_own
  on public.delivery_addresses for select
  using (user_id = auth.uid());

drop policy if exists delivery_addresses_insert_own on public.delivery_addresses;
create policy delivery_addresses_insert_own
  on public.delivery_addresses for insert
  with check (user_id = auth.uid());

drop policy if exists delivery_addresses_update_own on public.delivery_addresses;
create policy delivery_addresses_update_own
  on public.delivery_addresses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists delivery_addresses_delete_own on public.delivery_addresses;
create policy delivery_addresses_delete_own
  on public.delivery_addresses for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.delivery_addresses to authenticated;

-- Extend the existing auth trigger so sign-up metadata is saved to the profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, handle, display_name, phone, wilaya, commune, city
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    nullif(trim(new.raw_user_meta_data->>'wilaya'), ''),
    nullif(trim(new.raw_user_meta_data->>'commune'), ''),
    nullif(trim(new.raw_user_meta_data->>'commune'), '')
  )
  on conflict (id) do update set
    phone = excluded.phone,
    wilaya = excluded.wilaya,
    commune = excluded.commune,
    city = coalesce(excluded.city, public.profiles.city);

  insert into public.style_preferences (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;
