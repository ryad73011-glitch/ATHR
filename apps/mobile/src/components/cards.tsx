import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import type { Battle, Look, Merchant, Product } from '../data/types';
import { formatMoney, pct } from '../lib/format';
import { spacing, radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useLocale } from '../i18n';
import { Avatar, Badge, Card, Text, VoteBar } from './ui';
import { LookHero } from './Cover';

export function UniverseBadge({ universe }: { universe: 'CALM' | 'CHAOS' }) {
  const { tokens } = useTheme();
  const { t } = useLocale();
  const color = universe === 'CALM' ? tokens.calm : tokens.chaos;
  return <Badge label={t(universe === 'CALM' ? 'calm' : 'chaos')} color={color} />;
}

export function LookCard({ look, width = 220, height = 260 }: { look: Look; width?: number; height?: number }) {
  const router = useRouter();
  const { tokens } = useTheme();
  return (
    <Card style={{ width }} onPress={() => router.push(`/look/${look.id}`)}>
      <LookHero heroImage={look.hero_image} seed={look.id} paletteHex={look.palette} universe={look.universe} width={width} height={height} borderRadius={0} />
      <View style={{ padding: spacing.md, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="lead" numberOfLines={1}>
            {look.title}
          </Text>
          <UniverseBadge universe={look.universe} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="caption" faint>
            @{look.author_handle}
          </Text>
          <Text variant="small" accent>
            {formatMoney(look.total_cost, look.currency)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function BattleCard({ battle, left, right, leftPct, rightPct }: { battle: Battle; left: Look; right: Look; leftPct: number; rightPct: number }) {
  const router = useRouter();
  const { tokens } = useTheme();
  return (
    <Card onPress={() => router.push(`/battle/${battle.id}`)} style={{ marginBottom: spacing.lg }}>
      <View style={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <Text variant="title" numberOfLines={1}>
            {battle.title}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <LookHero heroImage={left.hero_image} seed={left.id} paletteHex={left.palette} universe={left.universe} width={140} height={160} borderRadius={radius.md} />
            <Text variant="small" muted numberOfLines={1} style={{ marginTop: spacing.xs }}>
              {left.title}
            </Text>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <Text variant="headline" faint>
              vs
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <LookHero heroImage={right.hero_image} seed={right.id} paletteHex={right.palette} universe={right.universe} width={140} height={160} borderRadius={radius.md} />
            <Text variant="small" muted numberOfLines={1} style={{ marginTop: spacing.xs }}>
              {right.title}
            </Text>
          </View>
        </View>
        <VoteBar leftPct={leftPct} leftColor={tokens.calm} rightColor={tokens.chaos} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
          <Text variant="caption" style={{ color: tokens.calm }}>
            {leftPct}%
          </Text>
          <Text variant="caption" faint>
            {(battle.votes_left + battle.votes_right).toLocaleString()} votes
          </Text>
          <Text variant="caption" style={{ color: tokens.chaos }}>
            {rightPct}%
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function ProductRow({ product, onOpen }: { product: Product; onOpen?: () => void }) {
  const router = useRouter();
  const { tokens } = useTheme();
  const open = onOpen ?? (() => router.push(`/product/${product.id}`));
  return (
    <Card onPress={open} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md }}>
      <View style={{ width: 14, height: 44, borderRadius: 4, backgroundColor: product.colors[0] ?? tokens.surface }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="body" numberOfLines={1}>
            {product.title}
          </Text>
          <Text variant="small" accent>
            {formatMoney(product.price, product.currency)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text variant="caption" faint>
            {product.brand} · {product.category}
          </Text>
          {!product.in_stock ? (
            <Text variant="caption" style={{ color: tokens.danger }}>
              out of stock
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function MerchantCard({ merchant }: { merchant: Merchant }) {
  const router = useRouter();
  const { tokens } = useTheme();
  return (
    <Card onPress={() => router.push(`/merchants/reviews?merchantId=${merchant.id}`)} style={{ padding: spacing.lg, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={merchant.name} size={44} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant="lead" numberOfLines={1}>
              {merchant.name}
            </Text>
            {merchant.verified ? <Ionicons name="shield-checkmark" size={15} color={tokens.success} /> : null}
          </View>
          <Text variant="caption" faint numberOfLines={1}>
            {merchant.city} · {merchant.product_count} products · ★ {merchant.rating.toFixed(1)}
          </Text>
        </View>
        <UniverseBadge universe={merchant.plan === 'flagship' ? 'CALM' : 'CHAOS'} />
      </View>
    </Card>
  );
}

export function StoryCard({ story }: { story: { slug: string; kicker: string; title: string; excerpt: string; read_minutes: number } }) {
  const router = useRouter();
  const { tokens } = useTheme();
  return (
    <Card onPress={() => router.push(`/story/${story.slug}`)} style={{ width: 260, padding: spacing.lg }}>
      <Text variant="caption" accent>
        {story.kicker}
      </Text>
      <Text variant="lead" numberOfLines={2} style={{ marginVertical: spacing.xs }}>
        {story.title}
      </Text>
      <Text variant="small" muted numberOfLines={3}>
        {story.excerpt}
      </Text>
      <Text variant="caption" faint style={{ marginTop: spacing.sm }}>
        {story.read_minutes} min read
      </Text>
    </Card>
  );
}
