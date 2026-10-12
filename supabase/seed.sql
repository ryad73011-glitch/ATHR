-- ATHR · seed.sql
-- Sample content for a fresh environment. Run with the Supabase CLI after migrations.
-- Ids are fixed so demo data is stable across environments.

-- Auth users (password: change-me-in-prod)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lina@athr.app', crypt('change-me-in-prod', gen_salt('bf')), now(), '{"handle":"lina.k","display_name":"Lina Kaddour"}'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@athr.app', crypt('change-me-in-prod', gen_salt('bf')), now(), '{"handle":"athr.admin","display_name":"ATHR Admin"}')
on conflict (id) do nothing;

insert into public.profiles (id, email, handle, display_name, role, verified, premium, followers)
values
  ('00000000-0000-0000-0000-000000000001', 'lina@athr.app', 'lina.k', 'Lina Kaddour', 'editor', true, true, 18400),
  ('00000000-0000-0000-0000-000000000002', 'admin@athr.app', 'athr.admin', 'ATHR Admin', 'admin', true, true, 0)
on conflict (id) do nothing;

insert into public.merchants (id, owner_id, slug, name, city, country, verified, approved, plan, rating, review_count, commission_rate)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', null, 'maison-sable', 'Maison Sable', 'Algiers', 'DZ', true, true, 'flagship', 4.8, 312, 0.08),
  ('aaaaaaaa-0000-0000-0000-000000000002', null, 'atlas-denim', 'Atlas Denim Co.', 'Oran', 'DZ', true, true, 'growth', 4.7, 245, 0.09),
  ('aaaaaaaa-0000-0000-0000-000000000003', null, 'atelier-nord', 'Atelier Nord', 'Tlemcen', 'DZ', false, false, 'free', 0, 0, 0.05)
on conflict (id) do nothing;

insert into public.products (id, merchant_id, merchant_name, title, brand, category, universe, price, compare_at_price, colors, sizes, checkout_type, in_stock, stock_count, occasions, rating, description)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Maison Sable', 'Unstructured Wool Blazer', 'Maison Sable', 'tailoring', 'CALM', 32000, null, '{#2C2E33}', '{S,M,L,XL}', 'external', true, 12, '{work,evening}', 4.8, 'Half-lined, patch pockets, soft shoulder.'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Maison Sable', 'Pleated Wide-Leg Trouser', 'Maison Sable', 'bottoms', 'CALM', 18500, null, '{#E6DFD2}', '{S,M,L}', 'external', true, 20, '{work,everyday}', 4.7, 'Single pleat, side adjusters.'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'Atlas Denim Co.', 'Raw Selvedge Jean', 'Atlas Denim Co.', 'bottoms', 'CHAOS', 19800, null, '{#17181B}', '{S,M,L,XL}', 'external', true, 15, '{street,everyday}', 4.7, '14.5oz, straight through the thigh.'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', 'Atlas Denim Co.', 'Boxy Heavyweight Hoodie', 'Atlas Denim Co.', 'tops', 'CHAOS', 13500, null, '{#17181B}', '{S,M,L}', 'external', true, 30, '{street,everyday}', 4.6, '420gsm, dropped shoulder.')
on conflict (id) do nothing;

insert into public.looks (id, slug, title, universe, occasion, palette, items, total_cost, author_id, author_handle, likes, saves, tags, editorial_note)
values
  ('cccccccc-0000-0000-0000-000000000001', 'quiet-monday', 'Quiet Monday', 'CALM', 'work', '{#E6DFD2,#2C2E33,#4A3527}',
   '[{"product_id":"bbbbbbbb-0000-0000-0000-000000000001","role":"Outerwear","title":"Unstructured Wool Blazer","brand":"Maison Sable","price":32000,"currency":"DZD","color":"#2C2E33","category":"tailoring","image":null,"affiliate_url":null,"in_stock":true},
     {"product_id":"bbbbbbbb-0000-0000-0000-000000000002","role":"Trouser","title":"Pleated Wide-Leg Trouser","brand":"Maison Sable","price":18500,"currency":"DZD","color":"#E6DFD2","category":"bottoms","image":null,"affiliate_url":null,"in_stock":true}]'::jsonb,
   50500, '00000000-0000-0000-0000-000000000001', 'lina.k', 940, 310, '{office,tailoring}', 'Three neutrals, one texture contrast.'),
  ('cccccccc-0000-0000-0000-000000000002', 'archive-walk', 'Archive Walk', 'CHAOS', 'street', '{#17181B,#5A6270,#B7BCC1}',
   '[{"product_id":"bbbbbbbb-0000-0000-0000-000000000003","role":"Jean","title":"Raw Selvedge Jean","brand":"Atlas Denim Co.","price":19800,"currency":"DZD","color":"#17181B","category":"bottoms","image":null,"affiliate_url":null,"in_stock":true},
     {"product_id":"bbbbbbbb-0000-0000-0000-000000000004","role":"Top","title":"Boxy Heavyweight Hoodie","brand":"Atlas Denim Co.","price":13500,"currency":"DZD","color":"#17181B","category":"tops","image":null,"affiliate_url":null,"in_stock":true}]'::jsonb,
   33300, '00000000-0000-0000-0000-000000000001', 'lina.k', 1100, 400, '{denim,streetwear}', 'Proportion is the only statement here.')
on conflict (id) do nothing;

insert into public.battles (id, slug, title, kind, left_look_id, right_look_id, left_total, right_total, votes_left, votes_right, starts_at, ends_at, status)
values
  ('dddddddd-0000-0000-0000-000000000001', 'daily-quiet-vs-archive', 'Daily Face-Off · Quiet Monday vs Archive Walk', 'DAILY',
   'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 50500, 33300, 1284, 1147, now() - interval '6 hours', now() + interval '18 hours', 'live')
on conflict (id) do nothing;

insert into public.editorial_stories (id, slug, kicker, title, excerpt, body, universe, author, read_minutes, look_ids)
values
  ('eeeeeeee-0000-0000-0000-000000000001', 'the-three-neutrals-rule', 'CALM', 'The Three-Neutrals Rule', 'Why a restrained palette beats a loud one.',
   ARRAY['Quiet luxury is restraint applied consistently.', 'Start with a base, add a mid-tone, close with a dark.', 'What remains, becomes ATHR.'],
   'CALM', 'Lina Kaddour', 4, '{cccccccc-0000-0000-0000-000000000001}')
on conflict (id) do nothing;
