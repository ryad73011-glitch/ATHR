import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { BattleCard } from '../../src/components/cards';
import { Badge, EmptyState, ErrorState, Header, SectionHeader, Skeleton, Text } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { pct } from '../../src/lib/format';
import { spacing } from '../../src/theme/tokens';

export default function FaceOff() {
  const source = useDataSource();
  const { t } = useLocale();

  const battles = useQuery({ queryKey: ['battles'], queryFn: () => source.listBattles() });
  const looks = useQuery({ queryKey: ['looks', 'all'], queryFn: () => source.listLooks({ limit: 60 }) });

  const lookById = new Map((looks.data?.items ?? []).map((l) => [l.id, l]));
  const live = (battles.data ?? []).filter((b) => b.status === 'live');
  const scheduled = (battles.data ?? []).filter((b) => b.status === 'scheduled');
  const closed = (battles.data ?? []).filter((b) => b.status === 'closed');

  const render = (id: string) => {
    const b = (battles.data ?? []).find((x) => x.id === id);
    if (!b) return null;
    const left = lookById.get(b.left_look_id);
    const right = lookById.get(b.right_look_id);
    if (!left || !right) return null;
    const total = b.votes_left + b.votes_right;
    const leftPct = pct(b.votes_left, total) || 50;
    return <BattleCard key={b.id} battle={b} left={left} right={right} leftPct={leftPct} rightPct={100 - leftPct} />;
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Header title={t('faceoff.title')} subtitle={t('faceoff.daily')} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Badge label="DAILY" color="#C8A96A" />
          <Badge label="CALM vs CHAOS" color="#E2503F" />
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {battles.isLoading ? (
          [1, 2].map((i) => <Skeleton key={i} width={'100%' as never} height={300} style={{ marginBottom: spacing.lg }} />)
        ) : battles.isError ? (
          <ErrorState onRetry={() => battles.refetch()} />
        ) : live.length === 0 ? (
          <EmptyState title={t('common.empty')} />
        ) : (
          live.map((b) => render(b.id))
        )}

        {scheduled.length ? (
          <>
            <SectionHeader title={t('faceoff.scheduled')} />
            {scheduled.map((b) => render(b.id))}
          </>
        ) : null}

        {closed.length ? (
          <>
            <SectionHeader title={t('faceoff.closed')} />
            {closed.map((b) => render(b.id))}
          </>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <Text variant="caption" faint>
          {t('common.demoNote')}
        </Text>
      </View>
    </ScrollView>
  );
}
