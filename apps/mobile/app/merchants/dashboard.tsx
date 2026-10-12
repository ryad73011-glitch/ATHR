import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { ProductRow } from '../../src/components/cards';
import { Badge, Button, Card, Header, Input, Screen, Skeleton, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { Category } from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { formatMoney } from '../../src/lib/format';
import { spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const MERCHANT_ID = 'mch_maison_sable';

function Stat({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <Card style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
      <Text variant="title" accent>
        {value}
      </Text>
      <Text variant="caption" faint>
        {label}
      </Text>
    </Card>
  );
}

export default function MerchantDashboard() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Category>('tops');

  const stats = useQuery({ queryKey: ['mstats', MERCHANT_ID], queryFn: () => source.merchantStats(MERCHANT_ID) });
  const products = useQuery({ queryKey: ['mproducts', MERCHANT_ID], queryFn: () => source.listProducts({ merchant_id: MERCHANT_ID, limit: 50 }) });

  const add = useMutation({
    mutationFn: () =>
      source.upsertProduct(
        { title, price: Number(price) || 0, category, universe: 'CALM', currency: 'DZD', colors: ['#2C2E33'], in_stock: true, stock_count: 5 },
        MERCHANT_ID,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mproducts', MERCHANT_ID] });
      toast.show(`${t('merchants.addProduct')} ✓`);
      setAdding(false);
      setTitle('');
      setPrice('');
    },
  });

  const max = Math.max(...(stats.data?.by_day.map((d) => d.clicks) ?? [1]), 1);

  return (
    <Screen scroll insetBottom>
      <Header title={t('merchants.dashboard')} subtitle="Maison Sable" onBack={() => router.back()} right={<Button label={t('merchants.addProduct')} small onPress={() => setAdding((a) => !a)} />} />

      {adding ? (
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
          <Input label="Title" value={title} onChangeText={setTitle} />
          <Input label="Price (DZD)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
          <Button label={t('common.save')} full loading={add.isPending} disabled={!title.trim() || !Number(price)} onPress={() => add.mutate()} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Stat label={t('merchants.impressions')} value={String(stats.data?.impressions ?? 0)} />
        <Stat label={t('merchants.clicks')} value={String(stats.data?.clicks ?? 0)} />
        <Stat label={t('merchants.ctr')} value={`${stats.data?.ctr ?? 0}%`} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Stat label={t('merchants.commission')} value={formatMoney(stats.data?.est_commission ?? 0)} />
        <Stat label="Orders" value={String(stats.data?.orders ?? 0)} />
      </View>

      <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>
        {t('merchants.clicks')} · 7d
      </Text>
      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        {stats.isLoading ? (
          <Skeleton width={'100%' as never} height={120} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 120 }}>
            {(stats.data?.by_day ?? []).map((d) => (
              <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: '100%', height: (d.clicks / max) * 100, borderRadius: radius.xs, backgroundColor: tokens.accent }} />
                <Text variant="caption" faint>
                  {d.day.slice(8)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Text variant="title" style={{ marginBottom: spacing.sm }}>
        {t('merchants.products')} ({products.data?.total ?? 0})
      </Text>
      {(products.data?.items ?? []).map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}
    </Screen>
  );
}
