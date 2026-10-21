-- Index the user foreign key so profile deletes and user-scoped review lookups avoid full scans.
create index if not exists merchant_reviews_user_id_idx
  on public.merchant_reviews (user_id);
