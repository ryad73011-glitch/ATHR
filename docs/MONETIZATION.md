# ATHR · Monetization and ad-free policy

ATHR uses transparent subscriptions and affiliate referrals, not advertising placements. Payment is not considered live until provider credentials, checkout, webhook reconciliation, and staging tests are complete.

## Proposed launch pricing (DZD)

| Audience | Plan | Price | Billing |
| --- | --- | ---: | --- |
| AI / personal | Free | 0 | Ongoing |
| AI / personal | ATHR Premium | 900 DZD | Monthly |
| AI / personal | ATHR Premium Annual | 9,000 DZD | Annual |
| Shops | Free | 0 | Ongoing |
| Shops | Starter | 1,500 DZD | Monthly |
| Shops | Growth | 4,500 DZD | Monthly |
| Shops | Flagship | 10,000 DZD | Monthly |

These are initial proposed prices for product validation, not an activated billing offer. Review unit economics, provider costs, taxes, and local payment availability before enabling collection.

## AI plans

- Free: local rule-based stylist and basic wardrobe features.
- Premium: access to cloud AI features only when the provider key and backend are configured; existing checkout is not configured by default.
- Never expose AI provider secrets to the mobile client. Before charging per usage, enforce quotas and log usage server-side; UI plan labels alone do not enforce entitlements.

## Shop plans

Merchant plan identifiers remain `free`, `starter`, `growth`, and `flagship`. The pricing screen displays proposed fees. Merchant checkout, renewals, cancellations, invoice handling, and server-side entitlement enforcement still require implementation and payment-provider credentials.

## Permanent ad-free product policy

- No banner ads, pop-ups, or paid sponsored product placements.
- Catalogue results rank by relevance, rating, or requested sort—not advertising spend.
- The mobile data layer forces the legacy `sponsored` flag off in demo and live product responses.
- The migration clears existing sponsored flags and adds a database constraint that rejects future sponsored products.
- Affiliate links, when configured, are disclosed and must not affect product ranking.

## Existing payment architecture

- ATHR Premium uses the existing subscriptions table and `create-checkout` function.
- Stripe configuration reads `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, and `STRIPE_PRICE_ANNUAL`.
- Do not mark a subscription active from a client callback alone; verify provider webhooks before granting paid entitlements.
