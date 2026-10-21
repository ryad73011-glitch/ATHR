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
- `0008_merchant_review_identity_guard.sql` was added to the development branch to prevent changing a review's merchant_id or user_id after creation. It has NOT been applied to production Supabase.

## Recent changes
- `907ca75e`: product loading/error/empty states in Merchant Space.
- `69104a3d`: migration guard preventing review identity transfer.
- `9a78185b`: retry image classification without re-selecting the image, plus positive whole-number DZD price and product-title validation.
- This status document records the current state for future sessions.

## Verification
- GitHub Actions run https://github.com/ryad73011-glitch/ATHR/actions/runs/39527543841 was queued for latest code commit `9a78185b098b58c964291b81f7964961901636c3` at last check.
- Run https://github.com/ryad73011-glitch/ATHR/actions/runs/39526156280 for `907ca75e678f56dc502b92e0785752dde2387c3a` had successful install, TypeScript typecheck, unit tests, Expo Android export, and Android prebuild; the Release APK Gradle step was still running at the latest poll.
- No successful APK build or artifact upload is yet confirmed for the latest branch head.
- Live Supabase read-only checks confirmed existing review RLS policies and rating/product-count triggers. The new migration `0008_merchant_review_identity_guard.sql` has not been deployed to Supabase.

## Remaining priorities
1. Confirm the GitHub Actions result and APK artifact for latest branch head `9a78185b`.
2. Review and test the review identity guard migration in a safe environment before any production application.
3. Verify product image upload/classification/save flow end to end with a real authenticated session.
4. Inspect WASM chat/image logs and validate OpenRouter calls and JWT enforcement.
5. Review the 15 Supabase Security Advisor findings involving SECURITY DEFINER RPC functions; determine intended caller roles before changing grants.
6. Run the full test/build pipeline for the latest branch head.

## Safety rules
- Never force-push.
- Never merge PR #9 or modify `main` without explicit user approval.
- Keep Supabase JWT verification enabled.
- Do not expose API keys or service-role secrets.
- Do not deploy schema/function changes to production without reviewing SQL, impact, and verification steps.
