import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Share, View, useWindowDimensions } from 'react-native';

import { UniverseBadge } from '../../src/components/cards';
import { LookHero } from '../../src/components/Cover';
import { Badge, Button, Card, ErrorState, Screen, Skeleton, Text, VoteBar, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { Look } from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { formatMoney } from '../../src/lib/format';
import { spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

function remaining(endsAt: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return t('faceoff.closed');
  const h = Math.floor(ms / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

interface SideProps {
  look: Look;
  side: 'left' | 'right';
  voted: boolean;
  live: boolean;
  heroW: number;
  pending: boolean;
  onVote: () => void;
}

function BattleSide({ look, side, voted, live, heroW, pending, onVote }: SideProps) {
  const { tokens } = useTheme();
  const { t } = useLocale();
  const accent = side === 'left' ? tokens.calm : tokens.chaos;
  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <Pressable
        onPress={() => live && onVote()}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, borderRadius: radius.lg, borderWidth: voted ? 2 : 1, borderColor: voted ? accent : tokens.border })}
      >
        <LookHero heroImage={look.hero_image} seed={look.id} paletteHex={look.palette} universe={look.universe} width={heroW} height={200} borderRadius={radius.lg} />
      </Pressable>
      <Text variant="lead" numberOfLines={1}>
        {look.title}
      </Text>
      <UniverseBadge universe={look.universe} />
      <Text variant="small" accent>
        {formatMoney(look.total_cost, look.currency)}
      </Text>
      <Button label={voted ? `✓ ${t('faceoff.voted')}` : t('faceoff.vote')} small full variant={voted ? 'primary' : 'outline'} disabled={!live} loading={pending} onPress={onVote} />
    </View>
  );
}

export default function BattleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const heroW = Math.floor((width - spacing.lg * 2 - spacing.md) / 2);

  const result = useQuery({ queryKey: ['battle', id], queryFn: () => source.getBattleResult(id!) });

  const vote = useMutation({
    mutationFn: (side: 'left' | 'right') => source.vote(id!, side),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['battle', id] });
      qc.invalidateQueries({ queryKey: ['battles'] });
      toast.show(t('faceoff.voted'));
    },
    onError: (e) => toast.show(e instanceof Error ? e.message : t('common.error')),
  });

  const share = async () => {
    if (!result.data) return;
    const r = result.data;
    await Share.share({ message: `${r.battle.title} — ${r.left.title} ${r.left_pct}% vs ${r.right.title} ${r.right_pct}% · ATHR أثر` });
  };

  if (result.isLoading) {
    return (
      <Screen>
        <Skeleton width={'100%' as never} height={300} />
      </Screen>
    );
  }
  if (result.isError || !result.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => result.refetch()} />
      </Screen>
    );
  }

  const r = result.data;
  const live = r.battle.status === 'live';

  return (
    <Screen scroll insetBottom>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={tokens.text} />
        </Pressable>
        <Pressable onPress={share} hitSlop={10}>
          <Ionicons name="share-outline" size={22} color={tokens.text} />
        </Pressable>
      </View>

      <Text variant="headline">{r.battle.title}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm }}>
        <Badge label={r.battle.kind} color={tokens.accent} />
        {r.battle.status === 'live' ? <Badge label={t('faceoff.endsIn', { time: remaining(r.battle.ends_at, t) })} color={tokens.success} /> : <Badge label={r.battle.status} color={tokens.textFaint} />}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginVertical: spacing.lg }}>
        <BattleSide look={r.left} side="left" voted={r.my_vote === 'left'} live={live} heroW={heroW} pending={vote.isPending} onVote={() => vote.mutate('left')} />
        <BattleSide look={r.right} side="right" voted={r.my_vote === 'right'} live={live} heroW={heroW} pending={vote.isPending} onVote={() => vote.mutate('right')} />
      </View>

      <VoteBar leftPct={r.left_pct} leftColor={tokens.calm} rightColor={tokens.chaos} animated />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <Text variant="title" style={{ color: tokens.calm }}>
          {r.left_pct}%
        </Text>
        <Text variant="caption" faint>
          {t('faceoff.votes', { count: r.total_votes.toLocaleString() })}
        </Text>
        <Text variant="title" style={{ color: tokens.chaos }}>
          {r.right_pct}%
        </Text>
      </View>

      <Card style={{ padding: spacing.lg, marginTop: spacing.xl }}>
        <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>
          {t('faceoff.compare')}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="small" muted numberOfLines={1}>
            {r.left.title}
          </Text>
          <Text variant="small" accent>
            {formatMoney(r.left.total_cost, r.left.currency)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
          <Text variant="small" muted numberOfLines={1}>
            {r.right.title}
          </Text>
          <Text variant="small" accent>
            {formatMoney(r.right.total_cost, r.right.currency)}
          </Text>
        </View>
        <Text variant="caption" faint style={{ marginTop: spacing.sm }}>
          {r.left.total_cost === r.right.total_cost
            ? '='
            : r.left.total_cost < r.right.total_cost
              ? `${r.left.title} is ${formatMoney(r.right.total_cost - r.left.total_cost, r.left.currency)} cheaper`
              : `${r.right.title} is ${formatMoney(r.left.total_cost - r.right.total_cost, r.right.currency)} cheaper`}
        </Text>
      </Card>
    </Screen>
  );
}
