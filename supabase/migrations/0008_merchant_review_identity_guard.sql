-- Keep a review bound to the merchant and author that originally created it.
-- RLS still controls who may edit/delete a review; this trigger prevents identity transfer.
create or replace function public.guard_merchant_review_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.merchant_id is distinct from old.merchant_id then
    raise exception 'A merchant review cannot be transferred to another merchant'
      using errcode = '23514';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'A merchant review author cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_merchant_review_identity_before_update on public.merchant_reviews;
create trigger guard_merchant_review_identity_before_update
before update of merchant_id, user_id on public.merchant_reviews
for each row execute function public.guard_merchant_review_identity();
