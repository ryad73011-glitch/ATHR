import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Header, Screen, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { SubscriptionPlan } from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const BENEFITS = ['Unlimited Style Studio generations', 'Advanced colour & fit analysis', 'Priority face-off placement', 'Offline wardrobe sync'];

export default function Subscription() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const session = useSession((s) => s.session);
  const userId = session?.user_id ?? 'guest';

  const sub = useQuery({ queryKey: ['sub', userId], queryFn: () => source.getSubscription(userId) });

  const checkout = useMutation({
    mutationFn: (plan: SubscriptionPlan) => source.requestCheckout(plan),
    onSuccess: (res) => toast.show(res.message),
  });

  return (
    <Screen scroll insetBottom>
      <Header title={t('premium.title')} onBack={() => router.back()} />
      <Card style={{ padding: spacing.xl, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Text variant="title">{t('premium.title')}</Text>
          <Badge label={sub.data?.plan ?? 'free'} color={tokens.accent} />
        </View>
        {BENEFITS.map((b) => (
          <Text key={b} variant="small" muted style={{ marginBottom: spacing.xs }}>
            ✓ {b}
          </Text>
        ))}
      </Card>

      <Button label={`${t('premium.monthly')} · 900 DZD`} full onPress={() => checkout.mutate('premium_monthly')} />
      <View style={{ height: spacing.sm }} />
      <Button label={`${t('premium.annual')} · 9,000 DZD`} full variant="outline" onPress={() => checkout.mutate('premium_annual')} />
      <View style={{ alignItems: 'center', marginTop: spacing.md }}>
        <Text variant="caption" faint style={{ textAlign: 'center' }}>
          {t('premium.notConfigured')} — Stripe / Apple / Google billing activates once credentials are added (docs/MONETIZATION.md).
        </Text>
      </View>
    </Screen>
  );
}
