# ATHR · Database

Real PostgreSQL schema in `supabase/migrations/`. Mirrors `apps/mobile/src/data/types.ts`.

## Migrations

**Important:** the connected production project has timestamped migration versions that do not match the repository's legacy `0001`–`0003` filenames. Treat this list as repository history, not proof of production schema state. Reconcile migration history and schema on staging before applying changes to production.
* `0001_schema.sql` — tables: profiles, style_preferences, merchants, products, looks (items as
  jsonb snapshot), battles, votes, saved_looks, likes, comments, follows, collections,
  wardrobe_items, outfits, editorial_stories, notifications, reports, audit_logs, ai_usage,
  affiliate_clicks, subscriptions. Indexes on hot paths.
* `0002_rls.sql` — default-deny Row Level Security on every table + privilege helpers
  (`current_role`, `is_admin`, `is_merchant_owner`). Public read for catalogue/looks/battles;
  owners manage their own rows; admins/moderators get write where appropriate.
* `0003_rpc.sql` — security-definer RPCs the client calls so atomic writes never bypass RLS:
  `vote_in_battle`, `battle_result`, `toggle_save`, `set_like`, `toggle_follow`,
  `toggle_look_in_collection`, `similar_looks`, `merchant_stats`, `admin_overview`,
  plus the `on_auth_user_created` trigger that provisions profile + preferences on signup.
* `20261025170000_ai_usage_guardrails.sql` — atomic AI usage reservations, per-user/project rolling 24-hour caps, usage telemetry fields, and removal of direct client writes to `ai_usage`. Apply this migration before deploying the updated `ai-stylist`, `wasm-chat`, or `classify-product-image` Edge Functions.

## Design notes
* `looks.items` is a jsonb snapshot so a look never lies if a product is edited later; the
  catalogue remains normalised in `products`.
* Voting is idempotent per `(battle_id, user_id)`; changing a vote moves the tally, never doubles it.
* Counters (`likes`, `saves`, `votes_*`) are maintained in RPCs to stay consistent with RLS.
* `affiliate_clicks` allows insert from the edge/service context and read only by the owning
  merchant or admins.

## Seed
`supabase/seed.sql` inserts stable sample rows (fixed UUIDs) for auth users, merchants,
products, looks, a live battle and an editorial story. Replace with licensed content in prod.
