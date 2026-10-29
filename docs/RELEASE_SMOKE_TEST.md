# ATHR release smoke-test checklist

Run this checklist against a staging Supabase project and a release APK before calling ATHR production-ready. Do not use production customer data for test accounts.

## Android installation and launch
- [ ] Download the APK artifact from the successful GitHub Actions run and verify the artifact belongs to the intended commit.
- [ ] Install on a clean Android device or emulator; confirm there is no signature-conflict or package-install error.
- [ ] Launch, background, resume, and force-close/reopen the app.
- [ ] Confirm Arabic, French, and English navigation; check Arabic right-to-left layout.

## Authentication and account privacy
- [ ] Sign up with a test email; verify the email-confirmation flow and deep link `athr://auth/callback`.
- [ ] Sign in, restart the app, and verify session persistence.
- [ ] Sign out and verify protected screens/actions require a new session.
- [ ] Verify user A cannot read or modify user B's private preferences, addresses, wardrobe, saved looks, or notifications.
- [ ] Verify a normal user cannot grant themselves moderator/admin/merchant privileges.

## Supabase data paths
- [ ] Apply migrations to staging in order and confirm no migration errors.
- [ ] Create/read/update a profile and style preferences with a signed-in test account.
- [ ] Confirm product catalogue filters, stock, currency, and pagination.
- [ ] Verify RLS rejects unauthenticated or cross-user writes.
- [ ] Confirm demo mode is visibly distinguished from live Supabase data.

## AI and image handling
- [ ] Verify missing/expired bearer tokens return 401.
- [ ] Verify malformed JSON and invalid fields return 400.
- [ ] Verify oversized `ai-stylist` and `wasm-chat` request bodies return 413 without reaching the model provider.
- [ ] Verify provider timeout/failure returns a controlled error and never switches to a paid model.
- [ ] Test Arabic/Darija, French, and English prompts.
- [ ] For image chat, test JPEG/PNG/WebP, invalid MIME types, too many images, and the aggregate image-size limit.
- [ ] Confirm responses only reference catalogue product IDs and do not exceed the requested budget where budget enforcement applies.
- [ ] Confirm UI labels accurately distinguish cloud AI from local fallback.

## Commerce and release gates
- [ ] Verify checkout is clearly marked unconfigured until real payment credentials and webhook validation exist.
- [ ] Verify no demo merchant/product is presented as a live seller or purchasable item.
- [ ] Check crash/error logs for secrets, bearer tokens, raw photos, or sensitive prompt content; none should be present.
- [ ] Record APK commit SHA, device/Android version, test date, failures, and retest results.

## Release decision

Do not release if authentication, RLS isolation, AI input limits, payment configuration, or the installation smoke test fails. A green mobile build alone does not prove the deployed Supabase functions or live AI provider work.
