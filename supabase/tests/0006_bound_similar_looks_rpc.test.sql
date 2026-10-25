-- Regression check for the public similar_looks RPC result bound.
begin;
select plan(1);

select ok(
  position('least' in lower(pg_get_functiondef('public.similar_looks(uuid,integer)'::regprocedure))) > 0
  and position('12' in pg_get_functiondef('public.similar_looks(uuid,integer)'::regprocedure)) > 0,
  'similar_looks clamps client-supplied row_limit to a maximum of 12'
);

select * from finish();
rollback;
