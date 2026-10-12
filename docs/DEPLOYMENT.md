# ATHR · Deployment

## Backend (Supabase)
1. Create project; run `supabase db push` (migrations) and `supabase/seed.sql`.
2. Set edge-function secrets (AI + Stripe). Deploy: `supabase functions deploy ai-stylist create-checkout`.
3. Copy URL/anon key into `apps/mobile/.env`.

## Android
* **CI (no local toolchain)**: `.github/workflows/android-build.yml` runs EAS on Expo servers.
  `preview` → APK, `production` → AAB; artifact downloaded & attached to the run. Needs `EXPO_TOKEN` secret.
* **Local**: requires JDK 17 + Android SDK; `eas build --local` or `npx expo run:android`.
  *Not available in the authoring sandbox (no JDK/SDK) — see STATUS.md.*

### Supplying live env to EAS (optional)
`eas.json` intentionally carries **no** Supabase secrets so the APK can be built and the demo
launched with zero credentials. When you want a *live* build, create EAS secrets and expose them
per profile on the Expo dashboard (Project → Environments), or via CLI:
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-ref.supabase.co --type string
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_ANON_KEY --type string
```
Then set those variable names in the profile's `env` on the Expo dashboard (not committed here).
The app falls back to demo mode automatically whenever these are absent.

## iOS
* `.github/workflows/ios-build.yml` builds on Expo macOS servers; `eas submit` to TestFlight.
  Needs Apple credentials (stored securely by EAS). Not runnable without an Apple account.

## Web (companion site)
* `npx expo export --platform web` → static SPA (`dist/web`). Deploy to any static host
  (Netlify/Vercel/S3+CloudFront). `output: "single"` gives client-side routing.

## OTA updates
* Optional: `eas update` once `expo-updates` + project are configured. Not enabled by default.

## Environment separation
Keep dev/staging/prod Supabase projects; use EAS `development`/`preview`/`production` profiles
with per-profile env (`@supabase_url` secrets) as defined in `eas.json`.
