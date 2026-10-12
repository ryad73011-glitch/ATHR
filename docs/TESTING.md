# ATHR · Testing

## Run
```bash
cd apps/mobile
npx tsc --noEmit     # typecheck (strict)
npx jest --ci        # unit tests
npx expo export --platform web   # proves the full route tree bundles
```

## What the suite covers (25 tests)
* **studioEngine** — budget never exceeded, only catalogue products, in-stock primaries,
  universe respect, tiny-budget behaviour, colour science (hex/HSL, neutrals, harmony).
* **format** — currency conversion/formatting (DZD/USD), percentages, initials, relative time.
* **i18n** — en/ar/fr key parity, RTL flag for Arabic, no empty strings.
* **demoSource** — battles return sane percentages; voting adds then *moves* (not doubles) a vote;
  save toggle; comment add; studio fallback engine.

## Manual checklist (see brief §8)
Auth, outfit creation (wardrobe add/outfit), AI recommendations (cloud + fallback), voting,
merchant approval + affiliate tracking, RTL layouts (switch to العربية), subscription
(not-configured path), admin moderation. All reachable in demo mode.

## CI
`.github/workflows/ci.yml` runs typecheck + jest + web/android JS export on every push/PR.
Build workflows (`android-build.yml`, `ios-build.yml`) are manual dispatch, EAS on Expo servers.
