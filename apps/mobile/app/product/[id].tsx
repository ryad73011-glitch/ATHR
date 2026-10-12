import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { UniverseBadge } from '../../src/components/cards';
import { Badge, Button, Card, ErrorState, Screen, Skeleton, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { formatMoney } from '../../src/lib/format';
import { useSession } from '../../src/store/session';
import { spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const session = useSession((s) => s.session);

  const product = useQuery({ queryKey: ['product', id], queryFn: () => source.getProduct(id!) });

  const buy = async () => {
    const p = product.data;
    if (!p) return;
    // Affiliate click is always tracked (works in demo too).
    await source.recordAffiliateClick({ product_id: p.id, merchant_id: p.merchant_id, look_id: null, user_id: session?.user_id ?? null, ref_code: p.affiliate_url ? 'athr-demo' : null });
    if (p.affiliate_url) {
      await WebBrowser.openBrowserAsync(p.affiliate_url);
    } else {
      toast.show(t('common.demoNote'));
    }
  };

  if (product.isLoading) {
    return (
      <Screen>
        <Skeleton width={'100%' as never} height={280} />
      </Screen>
    );
  }
  if (product.isError || !product.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => product.refetch()} />
      </Screen>
    );
  }

  const p = product.data;

  return (
    <Screen scroll insetBottom>
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: spacing.md }}>
        <Ionicons name="arrow-back" size={24} color={tokens.text} />
      </Pressable>

      <View style={{ width: '100%', height: 240, borderRadius: radius.xl, backgroundColor: p.colors[0] ?? tokens.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="display" style={{ color: tokens.bg, fontFamily: undefined }}>
          {p.brand.slice(0, 1)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg }}>
        <Text variant="headline" numberOfLines={1}>
          {p.title}
        </Text>
        <UniverseBadge universe={p.universe} />
      </View>
      <Text variant="small" muted style={{ marginTop: 2 }}>
        {p.brand} · {t(`cat.${p.category}`)} · ★ {p.rating.toFixed(1)}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginVertical: spacing.md }}>
        <Text variant="display" accent>
          {formatMoney(p.price, p.currency)}
        </Text>
        {p.compare_at_price ? (
          <Text variant="small" faint style={{ textDecorationLine: 'line-through' }}>
            {formatMoney(p.compare_at_price, p.currency)}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {p.in_stock ? <Badge label="In stock" color={tokens.success} /> : <Badge label="Out of stock" color={tokens.danger} />}
        {p.sponsored ? <Badge label="Sponsored" color={tokens.warning} /> : null}
      </View>

      {p.description ? (
        <Text variant="body" muted style={{ marginBottom: spacing.lg }}>
          {p.description}
        </Text>
      ) : null}

      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>
          {t('discover.color')} & sizes
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {p.colors.map((c) => (
            <View key={c} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: 1, borderColor: tokens.border }} />
          ))}
          {p.sizes.map((s) => (
            <View key={s} style={{ paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }}>
              <Text variant="caption">{s}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Button label={p.affiliate_url ? 'View at merchant →' : 'Checkout via merchant'} full onPress={buy} icon="bag-handle-outline" />
      <View style={{ alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg }}>
        <Text variant="caption" faint>
          {p.affiliate_url ? 'Affiliate link · tracked' : t('common.demoNote')}
        </Text>
      </View>
    </Screen>
  );
}
