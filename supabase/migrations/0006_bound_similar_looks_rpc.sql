-- ATHR 0006: bound the public similar_looks RPC to a small result set.
-- The RPC intentionally remains public because it returns public catalogue looks.
create or replace function public.similar_looks(look_id uuid, row_limit integer default 4)
returns setof public.looks
language sql
stable
security definer
set search_path = ''
as $function$
  select l.*
  from public.looks l
  join public.looks base on base.id = $1
  where l.id <> base.id
  order by
    ((l.universe = base.universe)::int * 2 + (l.occasion = base.occasion)::int) desc,
    l.created_at desc
  limit greatest(1, least(coalesce($2, 4), 12));
$function$;
