# ATHR · AI Stylist

Two engines behind one UI (`STYLE STUDIO`), with graceful, clearly-labelled degradation.

## Cloud AI (edge function `supabase/functions/ai-stylist`)
* Configurable provider via secrets: `AI_PROVIDER` (`openai` | `anthropic`), `AI_API_KEY`, `AI_MODEL`.
* **Grounded**: fetches only real, in-stock products from Postgres and instructs the model to
  return ids from that set, so it can never invent prices/stock/links. Returned ids are re-validated
  server-side before responding.
* Logs every call to `ai_usage` (model, provider, latency, status) for cost/abuse tracking.
* Keys live only in function secrets — never in client code.

## On-device engine (`apps/mobile/src/lib/studioEngine.ts`)
* Deterministic, explainable rule engine (universe/occasion/budget/palette scoring + colour
  harmony). Used for demo mode and as the fallback whenever the cloud call fails or is unconfigured.
* Guarantees: only catalogue products, never over budget, out-of-stock only as flagged alternatives.

## Degradation contract
The client (`supabaseSource.runStudio`) returns `engine: 'cloud-ai' | 'local-engine'` and a
`degraded_reason` when it fell back, and the UI badges which engine answered. A missing AI key
never breaks the feature — it just answers on-device.

## Inputs
Text (occasion, budget, palette, note) today; image uploads are accepted and passed through as
`image_uris`/`image_uris` for vision-capable providers to consume when configured.
