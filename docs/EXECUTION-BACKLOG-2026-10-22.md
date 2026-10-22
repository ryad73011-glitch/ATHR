# ATHR Execution Backlog — 2026-10-22

Status key: `DONE` = completed with recorded evidence; `IN PROGRESS` = changes underway; `BLOCKED` = needs access/authorization/dependency; `NOT VERIFIED` = no sufficient evidence yet.

## Track A — Security and data integrity (P0)

- [ ] A1. Inspect effective table grants and policies for profiles and merchants; record exact current access.
  - Acceptance: grants for anon/authenticated/PUBLIC are documented; no assumption based on RLS alone.
- [ ] A2. Prevent users from changing their own privilege-bearing profile columns (`role`, `premium`, `verified`).
  - Acceptance: authenticated users can edit only ordinary profile fields; privileged columns cannot be updated through direct PostgREST writes.
- [ ] A3. Prevent merchant owners from self-approving or self-assigning paid plans.
  - Acceptance: merchant owners can edit storefront fields only; `approved`, `verified`, `plan`, `rating`, `review_count`, `commission_rate`, and `product_count` are server/admin controlled.
- [ ] A4. Review SECURITY DEFINER RPC grants and function bodies individually.
  - Acceptance: each RPC has documented intended caller roles, identity checks, bounded arguments, and least-privilege EXECUTE grants; public behavior is preserved where intended.
- [ ] A5. Assess public profile reads for email exposure.
  - Acceptance: prove effective anonymous/API visibility; implement a safe public profile projection without breaking existing clients.
- [ ] A6. Enable leaked-password protection after confirming intended Auth settings.
  - Acceptance: setting enabled in the correct Supabase project and sign-in/reset flows verified. Requires authorized project setting change if not supported safely through code.
- [ ] A7. Add security regression tests for profile role escalation, merchant self-approval, cross-user writes, and RPC authorization.
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
- NOT VERIFIED: Actual effective grants and live deployed function parity have not yet been inspected.
- NOT VERIFIED: Current CI status, release APK, and real Android device flows have not yet been rerun.
- NOT VERIFIED: Real user retention, merchant participation, revenue, and willingness to pay.

## Next three actions

1. Verify effective grants and inspect existing feature branches before changing access.
2. Add a narrow, reviewable SQL migration on the audit branch for privilege-field protection.
3. Add regression coverage and run relevant checks; do not deploy the migration to production until validated.
