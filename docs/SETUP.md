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
```bash
supabase secrets set AI_PROVIDER=openai AI_API_KEY=sk-... AI_MODEL=gpt-4o-mini
supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_PRICE_MONTHLY=price_... STRIPE_PRICE_ANNUAL=price_...
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
