-- ATHR · 0003_product_image_classification.sql
-- Store machine-generated image classification separately from merchant-provided copy.
alter table public.products
  add column if not exists target_audience text not null default 'unknown'
    check (target_audience in ('women','men','unisex','unknown')),
  add column if not exists classification_status text not null default 'pending'
    check (classification_status in ('pending','classified','review')),
  add column if not exists classification_confidence numeric(4,3)
    check (classification_confidence is null or (classification_confidence >= 0 and classification_confidence <= 1)),
  add column if not exists image_analysis jsonb not null default '{}'::jsonb;

create index if not exists products_audience_stock_idx
  on public.products (target_audience, in_stock, created_at desc);

-- Public product images; writes are restricted to authenticated users.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update product images" on storage.objects;
create policy "Owners can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete product images" on storage.objects;
create policy "Owners can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
