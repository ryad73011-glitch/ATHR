import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { LookCard } from '../../src/components/cards';
import { EmptyState, ErrorState, Header, Segmented, Skeleton } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import type { Universe } from '../../src/data/types';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

type Filter = 'ALL' | Universe;

export default function Looks() {
  const source = useDataSource();
  const { t } = useLocale();
  const router = useRouter();
  const { tokens } = useTheme();
  const [filter, setFilter] = useState<Filter>('ALL');

  const looks = useQuery({
    queryKey: ['looks', filter],
    queryFn: () => source.listLooks({ universes: filter === 'ALL' ? undefined : [filter], sort: 'trending', limit: 40 }),
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Header title={t('looks.title')} />
          <Pressable onPress={() => router.push('/discover')} hitSlop={10} style={{ padding: spacing.sm, marginTop: -20 }}>
            <Ionicons name="search-outline" size={22} color={tokens.text} />
          </Pressable>
        </View>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'ALL' },
            { value: 'CALM', label: t('calm'), color: tokens.calm },
            { value: 'CHAOS', label: t('chaos'), color: tokens.chaos },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        {looks.isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width={168} height={300} />
            ))}
          </View>
        ) : looks.isError ? (
          <ErrorState onRetry={() => looks.refetch()} />
        ) : (looks.data?.items.length ?? 0) === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
            {(looks.data?.items ?? []).map((l) => (
              <LookCard key={l.id} look={l} width={168} height={210} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
