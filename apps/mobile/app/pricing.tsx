import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Card, Header, Screen, Text } from '../src/components/ui';
import { spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/ThemeProvider';

const AI_PLANS = [
  { name: 'AI Free', price: '0 DZD', period: 'always', features: ['Local style recommendations', 'Basic wardrobe tools', 'No advertisements'] },
  { name: 'ATHR Premium', price: '900 DZD', period: 'per month', features: ['Cloud AI stylist when provider is configured', 'Advanced style tools', 'No advertisements'] },
  { name: 'ATHR Premium Annual', price: '9,000 DZD', period: 'per year', features: ['Premium features', 'Annual discount compared with monthly billing', 'No advertisements'] },
];

const MERCHANT_PLANS = [
  { name: 'Free', price: '0 DZD', features: ['Basic shop profile', 'Basic catalogue presence'] },
  { name: 'Starter', price: '1,500 DZD / month', features: ['Expanded shop profile', 'Basic catalogue analytics'] },
  { name: 'Growth', price: '4,500 DZD / month', features: ['Expanded catalogue tools', 'Growth analytics'] },
  { name: 'Flagship', price: '10,000 DZD / month', features: ['Premium shop profile', 'Advanced analytics'] },
];

function PlanCard({ name, price, period, features, accent }: { name: string; price: string; period?: string; features: string[]; accent?: string }) {
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
    </Card>
  );
}

export default function Pricing() {
  const router = useRouter();
  const { tokens } = useTheme();

  return (
    <Screen scroll insetBottom>
      <Header title="Plans & pricing" onBack={() => router.back()} />
      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg, borderColor: tokens.accent }}>
        <Text variant="title">ATHR stays ad-free</Text>
        <Text variant="body" muted style={{ marginTop: spacing.xs }}>
          No banner ads, pop-ups, or paid sponsored product placements. Product discovery is ranked by relevance, rating, and price — not advertising spend.
        </Text>
      </Card>

      <Text variant="title" style={{ marginBottom: spacing.sm }}>AI and personal features</Text>
      {AI_PLANS.map((plan, index) => (
        <PlanCard key={plan.name} {...plan} accent={index === 1 ? 'Popular' : undefined} />
      ))}

      <Text variant="title" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Shop subscriptions</Text>
      {MERCHANT_PLANS.map((plan) => (
        <PlanCard key={plan.name} {...plan} period={plan.price === '0 DZD' ? 'free' : undefined} />
      ))}

      <Text variant="caption" faint style={{ marginTop: spacing.md, textAlign: 'center' }}>
        Prices are proposed launch prices in DZD. Checkout is not active until a payment provider is configured and tested. Cloud AI availability depends on server-side provider configuration.
      </Text>
    </Screen>
  );
}
