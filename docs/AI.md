# ATHR · AI Architecture and Verification

## Two distinct AI paths

ATHR has a product-grounded outfit recommendation path and a general-purpose WASM chat path. They are separate endpoints and must not be described as one fully verified multimodal pipeline.

### STYLE STUDIO — outfit recommendations

- Mobile data source: `apps/mobile/src/data/supabaseSource.ts`.
- Edge function: `supabase/functions/ai-stylist/index.ts`.
- Provider: OpenRouter's `openrouter/free` router, configured with the server-side `OPENROUTER_API_KEY` secret.
- The function authenticates the bearer token with Supabase before using service-role access.
- It fetches in-stock products in the requested currency, optionally narrows by universe, and sends catalogue records to the model.
- Returned product IDs are checked against the fetched catalogue. Duplicate/unknown IDs are rejected, no more than six products are returned, and selected product totals are checked against the requested budget.
- If the provider key is absent, the function returns `configured: false` so the client can use the local deterministic engine.
- The local engine is a rule-based fallback, not a generative model. The UI must label which engine returned the result.

**Important limitation:** `ai-stylist` explicitly rejects non-empty `image_uris`. Do not claim that STYLE STUDIO image analysis works through this endpoint until image content is passed to a vision-capable model and the end-to-end path is tested.

### WASM — general-purpose assistant and multimodal chat

The repository has a separate WASM chat route and recent work to validate image payloads and forward them to a multimodal provider. This is not evidence that STYLE STUDIO consumes images. Verify the actual deployed function, client request shape, image-size/type limits, consent, and a real end-to-end response before advertising image analysis as generally available.

## Security and privacy invariants

- Provider keys and Supabase service-role credentials remain in server-side secrets; never place them in Expo public environment variables or mobile source.
- The database is the source of truth for product IDs, prices, currency, and stock. Never trust model-generated commerce facts.
- Do not log access tokens, raw images, prompts containing sensitive personal information, or provider secrets.
- Validate request types and lengths before provider calls. Add and test per-user rate limits and request-size limits before public production use.
- User-facing text must not claim image analysis unless the model actually received the image content.
- Document image retention and provider data handling before collecting real user photos.

## Required verification before claiming production readiness

- [ ] Confirm the mobile UI invokes the intended deployed function in live mode.
- [ ] Test valid session, expired session, missing provider key, provider timeout, malformed model output, empty catalogue, and over-budget recommendations.
- [ ] Verify the displayed engine badge matches the returned engine.
- [ ] Evaluate a representative request set in Arabic/Darija, French, and English.
- [ ] Record catalogue/budget correctness, latency, error/fallback rate, and cost per successful request.
- [ ] Test rate limits, oversized requests, and image input rejection/acceptance as appropriate to the endpoint.
- [ ] Run the release smoke test against a staging Supabase project before shipping.

A successful build or the presence of an Edge Function is not, by itself, proof that the deployed AI integration works.
