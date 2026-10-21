# ATHR Development Status

Last updated: 2026-10-21 (UTC)
Development branch: `feat/merchant-ratings`
Production/main: unchanged; do not merge PR #9 without explicit approval.

## Current state
- Repository: https://github.com/ryad73011-glitch/ATHR
- Merchant Space and merchant review UI are present on the development branch.
- Merchant product dashboard includes loading, empty, and product-fetch error states with retry.
- Product image selection currently validates MIME type and base64 payload size before calling the image-classification data source.
- Supabase migrations through `0007_merchant_product_counts.sql` were previously reported as applied to the linked project; verify against the live database before relying on that report.
- `0008_merchant_review_identity_guard.sql` prevents changing a review's merchant_id or user_id after creation. Applied to Supabase project `deoeixdwjexmtjsxsoku` via Primary; the live trigger was verified.
- `0009_merchant_review_user_index.sql` adds an index on `merchant_reviews.user_id` for user-scoped lookups and profile-delete cascade performance. Applied via Primary; the live index was verified.

## Recent changes
- `907ca75e`: product loading/error/empty states in Merchant Space.
- `69104a3d`: migration guard preventing review identity transfer.
- `9a78185b`: retry image classification without re-selecting the image, plus positive whole-number DZD price and product-title validation.
- `1232228f`, `af596fec`, `36f202b6`, `6dcf18a1`: added product-image cleanup to the DataSource contract and live source; if product insert fails after upload, the dashboard attempts to remove the newly uploaded object while preserving the original save error.
- `1903fb2d`: added the merchant review user foreign-key index.
- `0bb33dcd`, `e5e5c328`: added English, Arabic, and French disclosure text explaining that impressions, CTR, commission, and order metrics are estimates until real event/order tracking is implemented.
- `29a30295`: CI now cancels obsolete builds on the same branch so rapid pushes don't consume runners with redundant APK builds.
- `da016ed8`, `93d51bb6`: product creation now asks for stock quantity in EN/AR/FR, validates it, and sets availability from the entered quantity instead of inventing a default stock count of five.
- This status document records the current state for future sessions.

## Verification
- CI workflow now uses per-branch concurrency cancellation. The newest commit at last update is `29a30295094b96903639d9ec581f3747b02389fc`; confirm its Actions run before claiming build success.
- Earlier runs passed install, TypeScript typecheck, unit tests, Expo Android export, and Android prebuild, but the Release APK step had not completed at the last observed poll. No successful APK build or artifact upload is yet confirmed for the latest branch head.
- Live Supabase read-only checks confirmed merchant review RLS policies and rating/product-count triggers. The review identity guard trigger was applied and verified on the live project.

## Remaining priorities
1. Confirm GitHub Actions and APK artifact for latest branch head `93d51bb6`.
2. Verify product image upload/classification/save and cleanup flow end to end with a real authenticated session.
3. Inspect WASM chat/image logs and validate OpenRouter calls and JWT enforcement.
4. Review Supabase Security Advisor findings involving SECURITY DEFINER RPC functions; determine intended caller roles before changing grants.
5. Prioritize remaining missing foreign-key indexes after inspecting existing indexes and expected table sizes.
6. Run the full test/build pipeline for the latest branch head.

## Safety rules
- Never force-push.
- Never merge PR #9 or modify `main` without explicit user approval.
- Keep Supabase JWT verification enabled.
- Do not expose API keys or service-role secrets.
- Do not deploy schema/function changes to production without reviewing SQL, impact, and verification steps.
