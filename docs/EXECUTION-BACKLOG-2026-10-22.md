# ATHR Execution Backlog — 2026-10-22

Status key: `DONE` = completed with recorded evidence; `IN PROGRESS` = changes underway; `BLOCKED` = needs access/authorization/dependency; `NOT VERIFIED` = no sufficient evidence yet.

## Track A — Security and data integrity (P0)

- [x] A1. Inspected live effective table grants for profiles and merchants. Confirmed authenticated has table-level INSERT/UPDATE/DELETE on profiles and INSERT/UPDATE/DELETE on merchants; anon and authenticated have SELECT. Column-level privileges include sensitive fields. (Read-only query; no changes to live DB.)
  - Acceptance: grants for anon/authenticated/PUBLIC are documented; no assumption based on RLS alone.
- [ ] A2. (EXISTING LIVE TRIGGER + BRANCH LEAST-PRIVILEGE GRANTS; VALIDATION PENDING) Prevent users from changing their own privilege-bearing profile columns (`role`, `premium`, `verified`).
  - Acceptance: authenticated users can edit only ordinary profile fields; privileged columns cannot be updated through direct PostgREST writes.
- [ ] A3. (EXISTING LIVE TRIGGER + BRANCH LEAST-PRIVILEGE GRANTS; VALIDATION PENDING) Prevent merchant owners from self-approving or self-assigning paid plans.
  - Acceptance: merchant owners can edit storefront fields only; `approved`, `verified`, `plan`, `rating`, `review_count`, `commission_rate`, and `product_count` are server/admin controlled.
- [ ] A4. Reviewed current SECURITY DEFINER functions and grants read-only. Public/authenticated mutation RPCs reviewed so far include identity checks; `similar_looks` had an unbounded row limit, now capped to 12 in branch migration 0006. Remaining acceptance is tests and exact caller-role verification.
  - Acceptance: each RPC has documented intended caller roles, identity checks, bounded arguments, and least-privilege EXECUTE grants; public behavior is preserved where intended.
- [ ] A5. (MITIGATION IMPLEMENTED IN BRANCH; VALIDATION PENDING) Confirmed anonymous SELECT privilege includes the profiles table and `profiles.email`. Added migration `0005_public_profile_email_isolation.sql` and switched community discovery to the safe `public_profiles` projection.
  - Acceptance: run isolated DB tests for anonymous public projection, authenticated self-profile reads, admin user listing, and community discovery.
- [ ] A6. Enable leaked-password protection after confirming intended Auth settings.
  - Acceptance: setting enabled in the correct Supabase project and sign-in/reset flows verified. Requires authorized project setting change if not supported safely through code.
- [ ] A7. (TESTS WRITTEN; NOT RUN) Three pgTAP files now contain 23 assertions covering privilege-field grants, public email isolation, and the bounded similar-looks RPC. Cross-user mutation behavior and full trigger semantics still need executable regression tests.
  - Acceptance: tests fail against the vulnerable behavior and pass against the fix.

## Track B — Reproducible build and code health (P1)

- [ ] B1. Inspect open pull requests, branch diffs, and current GitHub Actions runs.
- [ ] B2. Run TypeScript, unit tests, Expo Android export, and release APK build on a dedicated branch.
- [ ] B3. Inspect existing feature branches before porting fixes; avoid duplicate or conflicting work.
- [ ] B4. Add/update a project status report with exact commands, links, results, and unresolved failures.
  - Acceptance: current run IDs/statuses and logs are recorded; historical README claims are not treated as current proof.

## Track C — AI styling reliability (P1)

- [ ] C1. Reconcile the AI provider implementation with documentation and existing provider-related branches.
- [ ] C2. Test schema validation, malformed output, timeout, quota, provider failure, and fallback.
- [ ] C3. Decide and implement the real image path (upload/storage, MIME/size validation, authorized access, model input, cleanup/retention).
- [ ] C4. Measure relevance, constraint satisfaction, latency, failure rate, and cost per successful request.
  - Acceptance: no fabricated product prices/availability; image styling is described as unsupported until end-to-end tests pass.

## Track D — Core product and commerce (P2)

- [ ] D1. Verify the end-to-end occasion/style/color/budget to useful outfit flow.
- [ ] D2. Verify save/revisit persistence across sessions.
- [ ] D3. Distinguish verified merchant/catalog data from demo/AI-generated content.
- [ ] D4. Verify merchant onboarding, catalog edits, stock/size/price accuracy, storefront approval, and customer-to-merchant contact.
- [ ] D5. Verify consumer and merchant entitlement enforcement before advertising paid capabilities.

## Track E — Real-world validation and growth (P2)

- [ ] E1. Recruit a small cohort of real users and collect observed task-completion evidence.
- [ ] E2. Recruit and onboard a small number of real merchants; no invented participation.
- [ ] E3. Establish baselines for activation, time-to-first-useful-outfit, retention, saves, click-through, merchant activation, AI cost, and willingness to pay.
- [ ] E4. Prepare Arabic/French/English product copy, landing page, privacy/terms review, and a merchant pitch based on operational features only.
- [ ] E5. Verify current KILN eligibility and deadlines from official sources before submission.

## Current evidence-backed status

- DONE: Created branch `audit/security-2026-10-22` and committed `docs/AUDIT-2026-10-22.md`.
- DONE: Read `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_rpc.sql`, and the current `ai-stylist` function.
- DONE: Supabase Security Advisor reported SECURITY DEFINER execution warnings and leaked-password protection disabled on 2026-10-22.
- DONE: Added proposed migration `supabase/migrations/0004_privilege_field_protection.sql` on the audit branch; it limits profile and merchant writes to ordinary fields and leaves privileged fields to trusted workflows. Live DB already has trigger guards, but broad table-level client grants remain.
- DONE: Added 16 pgTAP grant regression assertions in `supabase/tests/0004_privilege_field_protection.test.sql`; not yet executed against a database.
- DONE: Added `0005_public_profile_email_isolation.sql`, safe public profile projection, and client API changes so community discovery no longer reads the private base table.
- DONE: Added `0006_bound_similar_looks_rpc.sql` to clamp public RPC result size to 12 rows; its regression assertion is written but not run.
- DONE: Removed the `approved: false` client insert field from merchant applications so the least-privilege insert grants can work; client now sends storefront content fields only.
- DONE: Read-only live grant query confirmed the existing privilege exposure: authenticated has table-level INSERT/UPDATE/DELETE on `profiles` and `merchants`; anonymous and authenticated roles have SELECT, including `profiles.email`.
- DONE: Updated proposed migration to revoke direct profile insert/delete and merchant delete, and explicitly revoke sensitive/immutable column writes.
- NOT VERIFIED: Migrations 0004–0006 have not been applied to any database; pgTAP, typecheck, and app compatibility are unverified. No production DB was changed.
- PARTIAL: Read-only review of deployed SECURITY DEFINER function bodies and ACLs found intended public read/helper RPCs and identity checks on mutation RPCs; `similar_looks` row-limit hardening is staged. Leaked-password protection remains disabled.
- PARTIAL: GitHub Actions run `39805420808` passed Typecheck, Unit tests, Export Android bundle, and Generate Android native project on a prior branch revision; Release APK build was still in progress at last check. The latest merchant insert payload and migration 0006 were added after that run, so current-head CI is not yet verified.
- NOT VERIFIED: Release APK completion and real Android device flows.
- NOT VERIFIED: Real user retention, merchant participation, revenue, and willingness to pay.

## Next three actions

1. Check the in-progress Android workflow and run type/unit tests; repair any failures.
2. Validate migrations 0004–0006 and all three pgTAP files on an isolated database, then test signup/profile/community/merchant/admin flows.
3. Resolve leaked-password protection and continue AI image/provider reliability work; do not apply migrations to production before test evidence.
