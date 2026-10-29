# ATHR — KILN Readiness Plan

**Status:** active improvement plan; not a claim of selection, production readiness, or a 100/100 score.  
**Branch:** `kiln-readiness-2026-10`  
**Last reviewed:** 2026-10-21

## Operating rule

ATHR only earns a readiness score when the evidence exists and can be shown to a reviewer. A feature in source code, a successful bundle, or a demo screenshot is not proof that a production integration works. Never describe demo data as real users, real inventory, or commercial traction.

## Current evidence-based baseline

| Dimension | Previous estimate | Evidence currently available | What prevents 100/100 |
| --- | ---: | --- | --- |
| Technical maturity | 60/100 | Expo/React Native + TypeScript app; Supabase data-source implementation; schema/RLS migrations; CI and build workflows; unit-test suite documented in `docs/STATUS.md` | Fresh CI result, deployed backend verification, auth/RLS/security tests, release APK smoke test, crash/error monitoring |
| Product value | 30/100 | Product concept and working prototype for style discovery and outfit creation | Interviews, repeated usage, a validated problem, measured outcome, retention, and evidence that users prefer ATHR to alternatives |
| AI readiness | 30/100 | Local deterministic stylist; Supabase Edge Function; OpenRouter free-model integration; server-side product-ID and budget validation; multimodal work exists in separate WASM chat path | Confirm endpoint routing in app, real-key end-to-end test, representative evaluation set, quality/latency/cost metrics, abuse limits, graceful fallback tests, documented image-data handling |
| KILN fit | 25/100 | Consumer fashion/style product with AI features | Confirm eligibility and track. Fashion is not automatically HealthTech, Biotech, AgriTech, or FinTech; Open Category requires a clear match to a sponsor's operational challenge |
| Commercial readiness | 25/100 | Merchant and product data model; affiliate/checkout foundations; a two-person team with product/development and marketing/retailer-outreach responsibilities | Real retailer pilots, validated pricing, lawful product feeds, measurable conversion or merchant value, repeatable acquisition, and a credible unit-economics model |

These are working estimates based on repository documentation and prior project context, not independent audit scores.

## Definition of 100/100 by dimension

A 100/100 is an evidence threshold, not a promise. Do not mark a dimension complete until every gate below has evidence linked from this repository or an approved private evidence folder.

### 1. Technical maturity

- [ ] Latest CI is green for typecheck, unit tests, and platform bundle/export.
- [ ] Fresh Android preview build installs and completes a documented smoke test on a physical device.
- [ ] Staging and production Supabase environments are separated; migrations apply cleanly from an empty database.
- [ ] Auth, password recovery, session expiry, ownership rules, RLS, merchant approval, and admin boundaries have positive and negative tests.
- [ ] No service-role/provider secrets are shipped in the mobile bundle or committed to git.
- [ ] Loading, empty, offline, timeout, and provider-error paths are tested.
- [ ] Dependency/security scan and release checklist are recorded.
- [ ] A release tag, rollback plan, and incident owner are documented.

### 2. Product value

- [ ] At least 15 target-user interviews are documented with consent and anonymized notes.
- [ ] The primary user segment and the expensive/frequent problem are stated in one sentence.
- [ ] A baseline and success metric are defined before the pilot.
- [ ] At least 10 target users complete a guided usability test; critical task completion is at least 80%.
- [ ] At least 5 users return and use the core feature again during a 2-week pilot.
- [ ] At least 3 users or businesses provide permissioned, attributable testimonials or case-study evidence.
- [ ] The team records negative feedback and what changed because of it.

### 3. AI readiness

- [ ] The app's active AI route is verified from UI to the intended deployed endpoint.
- [ ] A controlled test set of at least 100 diverse requests is evaluated, including Arabic/Darija, French, English, budgets, empty catalogues, invalid inputs, and provider failures.
- [ ] Product recommendations are grounded in the current catalogue; IDs, currency, availability, and total budget are revalidated server-side.
- [ ] The model never claims to inspect images unless image bytes or a valid accessible image URL are actually passed to a vision-capable model.
- [ ] Quality is scored against a written rubric; target at least 90% policy/catalogue/budget correctness on the test set, with all critical safety/data-integrity failures fixed.
- [ ] Median and p95 latency, error rate, fallback rate, and cost per successful request are measured.
- [ ] Authentication, per-user rate limits, request-size limits, and abuse handling are tested.
- [ ] User data retention, image consent, deletion, and provider data handling are documented.
- [ ] A regression set runs on each change to the AI endpoint or prompt.

### 4. KILN fit

- [ ] Confirm current eligibility, dates, judging rubric, and application status from official KILN communication.
- [ ] Identify the exact track or sponsor challenge; do not relabel fashion as a sector it does not serve.
- [ ] If applying to Open Category, map each product capability to a named sponsor's operational problem and measurable outcome.
- [ ] Prepare a 90-second demo that works live, plus a recorded backup.
- [ ] Submit a one-page problem statement, architecture diagram, evidence-backed differentiation, pilot results, and 12-month execution plan.
- [ ] Every claim in the pitch has a source, test, pilot result, or is explicitly labelled as a hypothesis.
- [ ] Both team members can explain their responsibilities, customer evidence, technical trade-offs, and next milestones.

### 5. Commercial readiness

- [ ] Choose one initial paying customer: consumer, retailer, or brand. Avoid trying to sell all sides at once.
- [ ] Interview at least 10 retailers or the equivalent target buyers and record objections.
- [ ] Run at least 3 retailer/product-feed pilots, with permission and verified inventory/prices.
- [ ] Test a concrete pricing hypothesis with buyers; do not treat verbal interest as revenue.
- [ ] Measure funnel: eligible visitors, completed styling sessions, product clicks, outbound purchase intent, and confirmed purchases where available.
- [ ] Calculate contribution margin and cost per acquired active user using observed values.
- [ ] Document product-data permissions, affiliate terms, privacy notice, customer support, and refund/checkout ownership.
- [ ] Show repeatable evidence of value for at least one customer segment before broad expansion.

## Priority execution sequence

1. **Integrity first:** run CI and inspect the current app route, Supabase mode, auth/RLS policies, and AI endpoint wiring. Record pass/fail without guessing.
2. **Make AI measurable:** establish a 100-case evaluation set, route tests, budget/catalogue invariants, latency and fallback telemetry.
3. **Prove one use case:** choose a narrow user segment and test whether AI-assisted outfit discovery improves a defined outcome.
4. **Prove market fit:** validate the appropriate KILN track/challenge and run retailer/customer pilots.
5. **Package evidence:** demo, architecture, test results, pilot metrics, team roles, and honest limitations.

## Evidence log

Add dated evidence below. Link test runs, sanitized reports, screenshots, and pilot summaries; never include credentials, private user data, or raw customer records.

| Date | Gate | Result | Evidence link | Owner |
| --- | --- | --- | --- | --- |
| 2026-10-21 | Repository review | Current main branch inspected; new readiness branch opened | [ATHR repository](https://github.com/ryad73011-glitch/ATHR) | Product/engineering |
| Pending | Fresh CI + release smoke test | Not yet verified in this pass | — | Product/engineering |
| Pending | User/retailer pilot | No qualifying evidence recorded here | — | Marketing/retailer outreach |
| Pending | Official KILN track confirmation | Must be checked against official communication | [KILN official site](https://kiln.africa/) | Both |

## Score update policy

Do not increase a score just because a checklist or feature was added. Re-score only after the linked evidence is reviewed. A score of 100 requires all dimension gates above to pass; external outcomes such as KILN selection or customer adoption cannot be guaranteed by engineering work alone.
