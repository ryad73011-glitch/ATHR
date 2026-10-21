# ATHR · Monetization, paid benefits and ad-free policy

ATHR monetizes through transparent subscriptions and, if later configured, disclosed affiliate referrals. There are no banner ads, pop-ups, or paid sponsored product placements. Paying for a subscription does not buy organic ranking.

## Proposed launch pricing (DZD)

| Audience | Plan | Price | Billing |
| --- | --- | ---: | --- |
| Personal / AI | Free | 0 | Ongoing |
| Personal / AI | ATHR Premium | 900 DZD | Monthly |
| Personal / AI | ATHR Premium Annual | 9,000 DZD | Annual |
| Merchant | Free | 0 | Ongoing |
| Merchant | Starter | 1,500 DZD | Monthly |
| Merchant | Growth | 4,500 DZD | Monthly |
| Merchant | Flagship | 10,000 DZD | Monthly |

These are proposed launch prices, not an activated billing offer. Validate provider costs, willingness to pay, taxes and local payment availability before collecting money.

## Personal / AI tiers

### Free
- Basic local outfit recommendations and wardrobe tools.
- A limited cloud AI allowance only if the cloud provider is configured.
- Saved favourite looks and an ad-free experience.

### ATHR Premium — 900 DZD/month
- Higher daily AI stylist allowance.
- Personalised outfit recommendations by occasion, style and budget.
- AI wardrobe assistant and outfit planning.
- Wardrobe cost-per-wear and outfit history tools.
- Larger saved-outfit, collection and style-profile allowances.
- Priority access to configured cloud AI models and early access to personal styling features.
- Ad-free experience.

### ATHR Premium Annual — 9,000 DZD/year
- All Premium benefits.
- Proposed annual saving equivalent to two months at the monthly list price.

## Merchant tiers

### Free
- Basic public shop profile, small catalogue allowance, manual product/stock updates and contact/catalogue link.

### Starter — 1,500 DZD/month
- Free benefits, larger catalogue, product variants and stock management, basic product/shop analytics, richer shop profile and cover/logo customisation.

### Growth — 4,500 DZD/month
- Starter benefits, higher catalogue/image limits, clicks and product-performance analytics, bulk catalogue import/editing, AI-assisted product descriptions and image categorisation when configured, promotions/discount codes and exportable reports.

### Flagship — 10,000 DZD/month
- Growth benefits, highest catalogue/team-seat allowance, advanced trend reports, priority merchant support, enhanced shop customisation and early access to merchant integrations.

The feature list is the intended tier design. Do not advertise a feature as available until it is implemented and tested. The pricing screen currently communicates these planned benefits; it does not by itself deliver or enforce them.

## Required implementation before charging

1. Add a server-verified subscription/entitlement record for each account and merchant. Never trust a client-supplied plan name.
2. Validate provider webhooks before activating, renewing, cancelling or expiring a paid subscription.
3. Enforce AI request quotas, model access, catalogue limits, analytics access, team seats and premium tools in Edge Functions/database policies—not only in UI.
4. Add usage tracking, rate limits, failed-payment handling, cancellation and expiry behaviour.
5. Test all plan transitions in staging before enabling real checkout.

## Permanent ad-free and fair-ranking policy

- No banner ads, pop-ups or paid sponsored product placements.
- Product discovery ranks by relevance, rating, price or the user's chosen sort, never subscription spend.
- The mobile data layer forces the legacy `sponsored` flag off in demo and live product responses.
- The migration clears existing sponsored flags and adds a database constraint rejecting future sponsored products.
- Affiliate links, if configured, must be disclosed and must not change organic ranking.

## Existing payment architecture

- ATHR Premium uses the existing subscriptions table and `create-checkout` function.
- Stripe configuration reads `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, and `STRIPE_PRICE_ANNUAL`.
- Provider secrets remain server-side. Do not grant paid entitlements based on a client callback alone.
