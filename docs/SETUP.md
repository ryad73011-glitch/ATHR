# ATHR · Setup

## Prerequisites
* Node 22+, npm 10+
* (optional) EAS CLI for builds: `npm i -g eas-cli`
* (optional) Supabase CLI for local backend: `npm i -g supabase` (or use a hosted project)

## 1. Install & run (demo)
```bash
cd apps/mobile
npm install
npx expo start          # w = web, a = Android, i = iOS (device/simulator)
```
No env vars → demo mode. Everything works offline.

## 2. Configure live backend
```bash
cp .env.example .env
# fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
supabase login && supabase link --project-ref YOUR_REF
supabase db push                 # apply migrations
supabase seed ... # or paste supabase/seed.sql into the SQL editor
```

## 3. Edge function secrets

ATHR currently routes AI requests through OpenRouter's free router only; it does not automatically fall back to a paid model. Configure the key as a server-side Supabase secret (never as an `EXPO_PUBLIC_*` variable):

```bash
supabase secrets set OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
```

Apply database migrations before deploying the updated AI functions. Migration `0004_ai_usage_guardrails.sql` is required for the atomic AI quota reservation used by both `ai-stylist` and `wasm-chat`.

Payment-provider secrets are separate and are only needed if checkout is being configured:
```bash
supabase secrets set STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY STRIPE_PRICE_MONTHLY=YOUR_MONTHLY_PRICE_ID STRIPE_PRICE_ANNUAL=YOUR_ANNUAL_PRICE_ID
```

## 4. Native builds
```bash
eas login && eas init
eas build --platform android --profile preview     # APK
eas build --platform android --profile production  # AAB
eas build --platform ios --profile production      # iOS
eas submit --platform ios --profile production     # TestFlight
```
iOS signing + store credentials are prompted / stored by EAS. See DEPLOYMENT.md.
