# ATHR — أثر

> **“What remains, becomes ATHR.”** · **“ما يبقى، يصبح أثرًا.”** · *“Wear the meaning.”*

ATHR is a cross-platform fashion & lifestyle platform (Android, iOS, web) for discovering,
creating, comparing and expressing personal style across two universes — **CALM**
(old money, quiet luxury, minimalism, smart casual) and **CHAOS** (streetwear,
experimental, urban culture).

Built with **React Native + Expo (SDK 57) + TypeScript + Expo Router** and **Supabase**
(PostgreSQL, Auth, Storage, Edge Functions). A deterministic **demo mode** makes the whole
product runnable and testable **before any credentials exist**; supplying Supabase env vars
switches it to live.

---

## Repository layout

```
ATHR/
├── apps/mobile/            # Expo SDK 57 app (Android/iOS/web)
│   ├── app/                # Expo Router screens (tabs + stacks)
│   ├── src/
│   │   ├── components/     # design system + cards + generative covers
│   │   ├── data/           # DataSource interface, demo + Supabase impls
│   │   ├── i18n/           # en / ar (RTL) / fr
│   │   ├── lib/            # studio engine, formatting, hooks
│   │   ├── store/          # session store (zustand)
│   │   └── theme/          # dark charcoal / cream design tokens
│   ├── supabase not here — see /supabase below
│   ├── eas.json            # EAS build profiles (preview=APK, production=AAB)
│   └── .env.example
├── supabase/
│   ├── migrations/         # 0001 schema · 0002 RLS · 0003 RPC/triggers
│   ├── functions/          # ai-stylist · create-checkout (Deno)
│   ├── seed.sql
│   └── config.toml
├── .github/workflows/      # ci · android-build · ios-build
└── docs/                   # SETUP · DEPLOYMENT · DATABASE · AI · MONETIZATION · TESTING · STATUS
```

## Quick start (demo, no credentials)

```bash
cd apps/mobile
npm install
npx expo start            # then press w for web, or run on a device
```

With no `EXPO_PUBLIC_SUPABASE_URL`, the app boots in **demo mode**: full catalogue,
looks, face-off voting, wardrobe, studio, merchant dashboard and admin console all work
against a seeded in-memory dataset persisted to AsyncStorage.

## Live mode

```bash
cp apps/mobile/.env.example apps/mobile/.env   # fill Supabase URL + anon key
supabase link && supabase db push              # apply migrations
supabase db seed -- ...                        # or run supabase/seed.sql
npx expo start
```

## Build & release

* **Android APK/AAB & iOS**: `eas build --profile preview|production` (see `eas.json`).
  CI workflows under `.github/workflows` run EAS builds on Expo servers (no local Mac/JDK needed).
* **Companion web**: `npx expo export --platform web` (single-file SPA).

## Verified in this workspace

`npx tsc --noEmit` (clean) · `npx jest` (25 tests pass) · `npx expo export --platform web`
(3.2 MB bundle builds) · static web preview served. See **docs/STATUS.md** for the full
completed / demo / awaiting-credentials matrix.

---

ATHR never presents a fabricated price, stock count or purchase link as real — demo data is
clearly labelled, and live commerce/checkout only activates once payment credentials exist.
