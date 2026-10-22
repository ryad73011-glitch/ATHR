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
- `fa9c6712`: after a product row is successfully deleted, the merchant dashboard best-effort removes its referenced product images. Storage cleanup failures do not misreport the database deletion; the live source only permits removal of images in the authenticated user's own `product-images` folder.
- This status document records the current state for future sessions.

## Verification
- GitHub Actions run `39528242758` for commit `4e4128256e03bde7422a04da067b896718466166` completed successfully: dependency install, TypeScript typecheck, unit tests, Expo Android export, Android prebuild, Release APK build, and artifact upload all passed.
- APK artifact `ATHR-standalone-APK` was created on 2026-10-21 and expires 2026-10-28. Run: https://github.com/ryad73011-glitch/ATHR/actions/runs/39528242758
- The product-image cleanup-after-delete change (`fa9c6712`) was committed after that successful run, so it still needs a fresh CI run before its verification can be claimed.
- Live Supabase checks confirmed the merchant review identity guard trigger and `merchant_reviews.user_id` index on project `deoeixdwjexmtjsxsoku` via Primary.

## Remaining priorities
1. Verify CI and APK build for the latest code commit `fa9c6712`.
2. Verify product image upload/classification/save and cleanup flows end to end with a real authenticated merchant session; no live authenticated test has been performed in this session.
3. Inspect WASM chat/image logs and validate OpenRouter calls and JWT enforcement.
4. Review Supabase Security Advisor findings involving SECURITY DEFINER RPC functions; determine intended caller roles before changing grants.
5. Prioritize remaining missing foreign-key indexes after inspecting existing indexes and expected table sizes.

## Safety rules
- Never force-push.
- Never merge PR #9 or modify `main` without explicit user approval.
- Keep Supabase JWT verification enabled.
- Do not expose API keys or service-role secrets.
- Do not deploy schema/function changes to production without reviewing SQL, impact, and verification steps.
