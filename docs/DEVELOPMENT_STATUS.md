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
- `0008_merchant_review_identity_guard.sql` prevents changing a review's merchant_id or user_id after creation. Applied to Supabase project `deoeixdwjexmtjsxsoku` via the authorized Primary connection; the live trigger was verified with a read-only catalog query.

## Recent changes
- `907ca75e`: product loading/error/empty states in Merchant Space.
- `69104a3d`: migration guard preventing review identity transfer.
- `9a78185b`: retry image classification without re-selecting the image, plus positive whole-number DZD price and product-title validation.
- `1232228f`, `af596fec`, `36f202b6`, `6dcf18a1`: added product-image cleanup to the DataSource contract and live source; if product insert fails after upload, the dashboard attempts to remove the newly uploaded object while preserving the original save error.
- This status document records the current state for future sessions.

## Verification
- GitHub Actions run https://github.com/ryad73011-glitch/ATHR/actions/runs/39527950591 was queued for commit `6dcf18a158fa4db8c0457a3e3d61da59d9afa904` at last check. The latest confirmed successful typecheck/tests/Android prebuild are on an earlier commit; no successful APK build or artifact upload is yet confirmed for the latest branch head.
- Live Supabase read-only checks confirmed merchant review RLS policies and rating/product-count triggers. The review identity guard trigger was applied and verified on the live project.

## Remaining priorities
1. Confirm GitHub Actions and APK artifact for latest branch head `6dcf18a1`.
2. Verify product image upload/classification/save and cleanup flow end to end with a real authenticated session.
3. Inspect WASM chat/image logs and validate OpenRouter calls and JWT enforcement.
4. Review Supabase Security Advisor findings involving SECURITY DEFINER RPC functions; determine intended caller roles before changing grants.
5. Prioritize missing foreign-key indexes after inspecting existing indexes and expected table sizes.
6. Run the full test/build pipeline for the latest branch head.

## Safety rules
- Never force-push.
- Never merge PR #9 or modify `main` without explicit user approval.
- Keep Supabase JWT verification enabled.
- Do not expose API keys or service-role secrets.
- Do not deploy schema/function changes to production without reviewing SQL, impact, and verification steps.
