import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ProductRow } from '../src/components/cards';
import { Chip, EmptyState, ErrorState, Header, Input, Screen, Segmented, Text } from '../src/components/ui';
import { useDataSource } from '../src/data';
import type { Category, Occasion, Universe } from '../src/data/types';
import { useLocale } from '../src/i18n';
import { demoSwatches } from '../src/data/demo/seed';
import { useDebounce } from '../src/hooks/useDebounce';
import { spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/ThemeProvider';

const CATS: Category[] = ['outerwear', 'tops', 'bottoms', 'knitwear', 'tailoring', 'shoes', 'bags', 'accessories', 'headwear'];
const OCCS: Occasion[] = ['everyday', 'work', 'evening', 'wedding', 'travel', 'sport', 'street', 'cafe'];

export default function Discover() {
  const source = useDataSource();
  const { t } = useLocale();
  const router = useRouter();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{ universe?: string; category?: string }>();

  const [q, setQ] = useState('');
  const dq = useDebounce(q, 250);
  const [universes, setUniverses] = useState<Universe[]>(params.universe ? [params.universe as Universe] : []);
  const [cats, setCats] = useState<Category[]>(params.category ? [params.category as Category] : []);
  const [occs, setOccs] = useState<Occasion[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [inStock, setInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<'relevance' | 'price_asc' | 'price_desc' | 'rating'>('relevance');

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const results = useQuery({
    queryKey: ['products', dq, universes, cats, occs, colors, inStock, maxPrice, sort],
    queryFn: () =>
      source.listProducts({
        q: dq || undefined,
        universes: universes.length ? universes : undefined,
        categories: cats.length ? cats : undefined,
        occasions: occs.length ? occs : undefined,
        colors: colors.length ? colors : undefined,
        in_stock_only: inStock,
        max_price: maxPrice ?? undefined,
        sort,
        limit: 60,
      }),
  });

  const swatches = useMemo(() => demoSwatches, []);

  return (
    <Screen insetBottom>
      <Header title={t('discover.title')} onBack={() => router.back()} />
      <Input placeholder={t('discover.searchPh')} value={q} onChangeText={setQ} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <Segmented value={sort} onChange={setSort} options={[{ value: 'relevance', label: 'Top' }, { value: 'price_asc', label: '↑ Price' }, { value: 'price_desc', label: '↓ Price' }, { value: 'rating', label: '★' }]} />

        <Text variant="caption" muted style={{ marginVertical: spacing.sm }}>
          {t('common.universe')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Chip label={t('calm')} selected={universes.includes('CALM')} color={tokens.calm} onPress={() => toggle(universes, 'CALM', setUniverses)} />
          <Chip label={t('chaos')} selected={universes.includes('CHAOS')} color={tokens.chaos} onPress={() => toggle(universes, 'CHAOS', setUniverses)} />
          <Chip label={t('discover.inStock')} selected={inStock} onPress={() => setInStock((s) => !s)} />
        </View>

        <Text variant="caption" muted style={{ marginVertical: spacing.sm }}>
          {t('discover.category')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {CATS.map((c) => (
            <Chip key={c} label={t(`cat.${c}`)} selected={cats.includes(c)} onPress={() => toggle(cats, c, setCats)} />
          ))}
        </View>

        <Text variant="caption" muted style={{ marginVertical: spacing.sm }}>
          {t('discover.occasion')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {OCCS.map((o) => (
            <Chip key={o} label={t(`occ.${o}`)} selected={occs.includes(o)} onPress={() => toggle(occs, o, setOccs)} />
          ))}
        </View>

        <Text variant="caption" muted style={{ marginVertical: spacing.sm }}>
          {t('discover.color')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
          {swatches.map((s) => (
            <View key={s.name} style={{ borderRadius: 999, borderWidth: colors.includes(s.hex) ? 2 : 1, borderColor: colors.includes(s.hex) ? tokens.accent : tokens.border }}>
              <Chip label={s.name} selected={colors.includes(s.hex)} color={s.hex} onPress={() => toggle(colors, s.hex, setColors)} />
            </View>
          ))}
        </View>

        <Text variant="caption" muted>
          {t('discover.budget')}: {maxPrice ? `${maxPrice.toLocaleString()} DZD` : 'any'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[null, 20000, 40000, 60000, 100000].map((v, i) => (
              <Chip key={i} label={v == null ? 'Any' : `${v / 1000}k`} selected={maxPrice === v} onPress={() => setMaxPrice(v)} />
            ))}
          </View>
        </ScrollView>

        <Text variant="small" muted style={{ marginVertical: spacing.sm }}>
          {t('discover.results', { count: results.data?.total ?? 0 })}
        </Text>
        {results.isLoading ? (
          <Text variant="small" faint>
            {t('common.loading')}…
          </Text>
        ) : results.isError ? (
          <ErrorState onRetry={() => results.refetch()} />
        ) : (results.data?.items.length ?? 0) === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          (results.data?.items ?? []).map((p) => <ProductRow key={p.id} product={p} />)
        )}
      </ScrollView>
    </Screen>
  );
}
