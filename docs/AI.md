# ATHR · AI features

ATHR has two server-side AI routes and a deterministic local outfit engine.

## Cloud providers and spend safety

* Both Edge Functions use the OpenRouter `openrouter/free` route only.
* The functions do not automatically switch to a paid model.
* The OpenRouter API key is read only from the server-side `OPENROUTER_API_KEY` secret. Never place it in mobile app configuration or logs.
* Migration `0004_ai_usage_guardrails.sql` adds an atomic reservation RPC. It limits valid AI requests to 20 per user and 200 per project in a rolling 24-hour window, shared by `ai-stylist` and `wasm-chat`.
* The reservation is created before the external model request. Only reservations marked as server-created count toward quotas; legacy rows are ignored because older client-side inserts could not be trusted. Quota accounting starts with reservations created after the migration. If the quota service is unavailable, the Edge Function fails closed instead of calling the provider without a reservation.
* The migration removes direct client insert/update/delete permissions on `ai_usage`. Edge Functions use the service role only after validating the user's JWT.
* Usage records track feature, model, provider, status, latency, and token counts returned by the provider. The raw provider-reported cost value is stored only when present and valid; otherwise it remains null and is not converted to USD or DZD. Do not treat product totals as AI cost.

**Deployment order:** apply the database migration before deploying the updated Edge Functions. Do not deploy these function changes without the reservation RPC being present.

## `ai-stylist`

* Accepts structured occasion, budget, currency, style-universe, palette, and note fields.
* Rejects image URIs; image analysis is not implemented on this route.
* Fetches in-stock products and includes their colors and occasions in the model context.
* Revalidates all selected product IDs and checks prices against the requested budget on the server.
* Never trusts model-generated prices or product links.

## `wasm-chat`

* Supports general conversation, fashion advice, and image input for JPEG, PNG, and WebP, subject to request-size limits.
* Includes only in-stock catalogue products and their color/occasion metadata in context.
* Revalidates suggested product IDs against the live catalogue.
* Image understanding depends on the model selected by the free router; the function must not claim visual analysis if the provider/model did not process the image.

## Local outfit engine

`apps/mobile/src/lib/studioEngine.ts` provides deterministic catalogue-based recommendations when cloud styling fails. In live mode, the fallback must use live catalogue products only. If no real products are available, it should return an explicit no-product result rather than substitute demo catalogue entries.

## Limits and measurement

The quotas are safety defaults, not a guarantee of provider availability or zero operating cost. Review actual usage before changing them. The free model router can be unavailable or change its routing; ATHR does not automatically fall back to a paid model.

Measure style quality separately with a labelled evaluation set. Successful TypeScript checks or unit tests do not prove that recommendations are fashionable, contextually appropriate, or accurate for every language.
