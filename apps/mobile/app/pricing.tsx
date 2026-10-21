import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Badge, Button, Card, Header, Screen, Text, useToast } from '../src/components/ui';
import { useDataSource } from '../src/data';
import type { MerchantSubscriptionPlan } from '../src/data/types';
import { useSession } from '../src/store/session';
import { spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/ThemeProvider';

const AI_PLANS = [
  {
    name: 'AI Free',
    price: '0 DZD',
    period: 'Always free',
    features: [
      'Basic local outfit suggestions',
      'Limited daily cloud AI requests when enabled',
      'Basic digital wardrobe',
      'Save favourite looks',
      'No advertisements',
    ],
  },
  {
    name: 'ATHR Premium',
    price: '900 DZD',
    period: 'per month',
    accent: 'Best for individuals',
    features: [
      'Higher daily AI stylist allowance',
      'Personalised outfit recommendations for occasions and budget',
      'AI wardrobe assistant and outfit planning',
      'Wardrobe cost-per-wear and outfit history tools',
      'More saved outfits, collections and style profiles',
      'Priority access to configured cloud AI models',
      'Early access to new personal styling tools',
      'No advertisements',
    ],
  },
  {
    name: 'ATHR Premium Annual',
    price: '9,000 DZD',
    period: 'per year',
    features: [
      'All ATHR Premium benefits',
      'Two months cheaper than monthly billing at the proposed price',
      'No advertisements',
    ],
  },
];

const MERCHANT_PLANS = [
  {
    name: 'Free',
    price: '0 DZD',
    period: 'Always free',
    features: [
      'Basic public shop profile',
      'Small product catalogue allowance',
      'Manual product and stock updates',
      'Basic shop contact and catalogue link',
    ],
  },
  {
    name: 'Starter',
    price: '1,500 DZD',
    period: 'per month',
    features: [
      'Everything in Free',
      'Larger product catalogue allowance',
      'Product variants and stock management',
      'Basic product and shop performance analytics',
      'Shop logo, cover and richer profile sections',
      'No advertisements or paid ranking',
    ],
  },
  {
    name: 'Growth',
    price: '4,500 DZD',
    period: 'per month',
    accent: 'For growing shops',
    features: [
      'Everything in Starter',
      'Higher catalogue and image upload limits',
      'Advanced sales-intent, clicks and product analytics',
      'Bulk product import and catalogue editing',
      'AI-assisted product descriptions and image categorisation when configured',
      'Promotions and discount-code management',
      'Exportable performance reports',
      'No advertisements or paid ranking',
    ],
  },
  {
    name: 'Flagship',
    price: '10,000 DZD',
    period: 'per month',
    features: [
      'Everything in Growth',
      'Highest catalogue and team-seat allowance',
      'Advanced trend and product-performance reports',
      'Priority merchant support',
      'Early access to merchant tools and integrations',
      'Enhanced shop customisation',
      'No advertisements or paid ranking',
    ],
  },
];

function PlanCard({
  name,
  price,
  period,
  features,
  accent,
  onAction,
  actionLabel,
  actionLoading = false,
}: {
  name: string;
  price: string;
  period?: string;
  features: string[];
  accent?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
}) {
  return (
    <Card style={{ padding: spacing.lg, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text variant="title">{name}</Text>
        {accent ? <Badge label={accent} color="#8D78D8" /> : null}
      </View>
      <Text variant="title" style={{ marginTop: spacing.sm }}>{price}</Text>
      {period ? <Text variant="caption" faint>{period}</Text> : null}
      <View style={{ height: spacing.sm }} />
      {features.map((feature) => (
        <Text key={feature} variant="small" muted style={{ marginBottom: spacing.xs }}>• {feature}</Text>
      ))}
      {onAction && actionLabel ? (
        <Button label={actionLabel} full loading={actionLoading} disabled={actionLoading} onPress={onAction} />
      ) : null}
    </Card>
  );
}

export default function Pricing() {
  const router = useRouter();
  const source = useDataSource();
  const session = useSession((state) => state.session);
  const toast = useToast();
  const { tokens } = useTheme();

  const merchantCheckout = useMutation({
    mutationFn: async (plan: MerchantSubscriptionPlan) => {
      if (!session?.user_id) {
        return { status: 'not_configured' as const, message: 'Sign in with the account that owns the shop before subscribing.' };
      }
      const merchants = await source.listMerchants();
      const ownedMerchants = merchants.filter((item) => item.owner_id === session.user_id);
      if (ownedMerchants.length === 0) {
        return { status: 'not_configured' as const, message: 'No shop is linked to this account. Create or link a merchant profile first.' };
      }
      if (ownedMerchants.length > 1) {
        return { status: 'not_configured' as const, message: 'This account owns multiple shops. Choose the shop to upgrade from its merchant dashboard so the subscription is applied to the correct shop.' };
      }
      return source.requestMerchantCheckout(plan, ownedMerchants[0].id);
    },
    onSuccess: async (result) => {
      toast.show(result.message);
      if (result.status === 'url' && result.url) {
        try {
          await WebBrowser.openBrowserAsync(result.url);
        } catch {
          toast.show('Checkout is ready, but this device could not open it.');
        }
      }
    },
    onError: () => toast.show('Could not prepare merchant checkout. No payment was taken.'),
  });

  return (
    <Screen scroll insetBottom>
      <Header title="Plans & pricing" onBack={() => router.back()} />
      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg, borderColor: tokens.accent }}>
        <Text variant="title">Pay for useful tools, not visibility</Text>
        <Text variant="body" muted style={{ marginTop: spacing.xs }}>
          Paid plans unlock extra AI, shop-management and analytics capabilities. Paying never buys a sponsored placement or changes organic product ranking. ATHR has no banner ads, pop-ups or paid product placements.
        </Text>
      </Card>

      <Text variant="title" style={{ marginBottom: spacing.sm }}>For people and AI styling</Text>
      <Text variant="caption" faint style={{ marginBottom: spacing.md }}>
        Premium raises feature allowances; exact cloud-AI limits will be enforced server-side and shown before purchase.
      </Text>
      {AI_PLANS.map((plan) => (
        <PlanCard
          key={plan.name}
          {...plan}
          onAction={plan.name === 'ATHR Premium' || plan.name === 'ATHR Premium Annual' ? () => router.push('/profile/subscription') : undefined}
          actionLabel={plan.name.includes('Premium') ? 'View subscription options' : undefined}
        />
      ))}

      <Text variant="title" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>For shops and merchants</Text>
      <Text variant="caption" faint style={{ marginBottom: spacing.md }}>
        Each paid tier includes the tier below it, plus the additional tools listed. Paid tiers improve shop operations, not ranking in customer discovery.
      </Text>
      {MERCHANT_PLANS.map((plan) => (
        <PlanCard
          key={plan.name}
          {...plan}
          actionLoading={merchantCheckout.isPending}
          actionLabel={plan.name === 'Starter' || plan.name === 'Growth' || plan.name === 'Flagship' ? 'Subscribe for this shop' : undefined}
          onAction={plan.name === 'Starter'
            ? () => merchantCheckout.mutate('merchant_starter')
            : plan.name === 'Growth'
              ? () => merchantCheckout.mutate('merchant_growth')
              : plan.name === 'Flagship'
                ? () => merchantCheckout.mutate('merchant_flagship')
                : undefined}
        />
      ))}

      <Text variant="caption" faint style={{ marginTop: spacing.md, textAlign: 'center' }}>
        Prices and benefits are proposed launch terms. Checkout, tier entitlements and usage limits are not live until provider configuration, server-side enforcement and staging tests are complete. Features that depend on cloud AI or integrations require those services to be configured.
      </Text>
    </Screen>
  );
}
