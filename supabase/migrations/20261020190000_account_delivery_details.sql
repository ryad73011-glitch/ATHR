-- ATHR: private account contact details and saved delivery addresses.
-- Contact details are deliberately separate from public profiles.

create table if not exists public.account_contact_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null default '',
  wilaya text not null default '',
  commune text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.account_contact_details enable row level security;

drop policy if exists account_contact_details_select_own on public.account_contact_details;
create policy account_contact_details_select_own
  on public.account_contact_details for select
  using (user_id = auth.uid());

drop policy if exists account_contact_details_insert_own on public.account_contact_details;
create policy account_contact_details_insert_own
  on public.account_contact_details for insert
  with check (user_id = auth.uid());

drop policy if exists account_contact_details_update_own on public.account_contact_details;
create policy account_contact_details_update_own
  on public.account_contact_details for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.account_contact_details to authenticated;

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

-- Extend the existing auth trigger so sign-up metadata is saved privately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, handle, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.account_contact_details (user_id, phone, wilaya, commune)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'phone'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'wilaya'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'commune'), ''), '')
  )
  on conflict (user_id) do update set
    phone = excluded.phone,
    wilaya = excluded.wilaya,
    commune = excluded.commune,
    updated_at = now();

  insert into public.style_preferences (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;
