# ATHR · Monetization

Four streams, all wired as infrastructure; none claimed live until credentials exist.

1. **Affiliate commissions & referral tracking**
   * Every product tap records an `affiliate_click` (product, merchant, look, user, ref_code) — works
     in demo too. `merchant_stats` RPC aggregates clicks/CTR/est. commission.
   * Live purchase links (`products.affiliate_url`) open via `expo-web-browser`; external merchant
     checkout for MVP (no in-app payment for goods).

2. **Merchant subscription plans**
   * `merchants.plan` = free/starter/growth/flagship; approval queue in the admin console
     (`adminSetMerchantApproval`). Billing for plans plugs into the same checkout architecture.

3. **Sponsored placements**
   * `products.sponsored` flag + `Badge "Sponsored"` in UI; ranking intentionally *penalises*
     sponsorship in the stylist so paid never outranks fit.

4. **ATHR Premium**
   * `subscriptions` table + `profile/subscription` screen. Checkout via `create-checkout` edge
     function (Stripe subscriptions) or Apple/Google billing (client-side, reconciled to
     `subscriptions`). Returns `not_configured` with an honest message until keys are added.

## Payment-provider architecture
`create-checkout` reads `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`.
Add Algerian/international providers by extending that one function; the client only consumes
`{status:'url'|'not_configured', url?, message}`. Sandbox-test with Stripe test keys before going live.
