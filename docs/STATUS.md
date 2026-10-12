# ATHR · Delivery Status

Honest matrix of what is **completed & tested**, what is **demo**, and what is
**awaiting credentials / not runnable in this workspace**. Verified 2026-10-12.

## ✅ Completed & tested here

| Area | Evidence |
| --- | --- |
| Type safety | `npx tsc --noEmit` passes with `strict` |
| Unit tests | `npx jest` — 25 tests pass (studio engine, colour science, currency, i18n parity, demo battles/saves/comments) |
| Web bundle | `npx expo export --platform web` builds a 3.2 MB single-file SPA; served as a live preview |
| All 9 sections present & navigable | Home, Discover, ATHR LOOKS, ATHR FACE-OFF, STYLE STUDIO, MY WARDROBE, COMMUNITY, MERCHANTS, PROFILE (+ ADMIN) |
| i18n EN/AR/FR + RTL | key-parity test; Arabic switches fonts + `dir=rtl` (native RTL needs app relaunch, standard RN) |
| Design system | dark charcoal/cream tokens, CALM/CHAOS accents, accessible components, skeletons/empty/error states |
| Deterministic demo data | seeded catalogue, looks, battles, merchants, stories; persisted to AsyncStorage |
| On-device AI stylist | rule engine with explainable reasoning, budget/universe/palette aware, never invents products |
| Voting/likes/saves | atomic in demo; RPC-backed in SQL (`vote_in_battle`, `set_like`, `toggle_save`) |
| PostgreSQL schema + RLS | `supabase/migrations/0001..0003` (schema, RLS, RPC + signup trigger) |
| Edge functions | `ai-stylist`, `create-checkout` (Deno), server-side keys only |
| Build/release config | `eas.json` (APK/AAB/TestFlight), CI + android/ios workflows |

## 🟡 Demo (works now, clearly labelled in-app)

* Demo catalogue & merchants (fictional brands, **no live affiliate URLs** — checkout shows "sample data").
* Generative SVG cover art instead of licensed photography.
* Merchant analytics & admin stats computed from demo clicks.
* Payments screen shows "not configured" until credentials added.

## ⏳ Awaiting credentials / external accounts

* **Supabase project** — set `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`, run migrations/seed.
* **AI provider keys** — `AI_API_KEY` (+`AI_PROVIDER`,`AI_MODEL`) as edge-function secrets; falls back to on-device engine meanwhile.
* **Payments** — Stripe keys (or Apple/Google billing) for real checkout; subscriptions table ready.
* **Push notifications** — in-app notification center works; APNs/FCM push needs EAS project + certificates.
* **Real product imagery & affiliate links** — replace demo art/URLs with licensed assets.

##  Not runnable in this workspace (reported, not faked)

* **Local APK/AAB build** — no JDK / Android SDK / Gradle / Maven access here. Use `eas build` or the CI workflow (Expo servers).
* **iOS build/TestFlight** — requires macOS / Expo servers + Apple credentials.
* **Running migrations** — no Postgres in this sandbox; SQL is provided and reviewed but not executed here.
