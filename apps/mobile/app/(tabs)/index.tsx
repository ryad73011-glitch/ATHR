import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { LookCard, MerchantCard, StoryCard } from '../../src/components/cards';
import { SectionHeader, Skeleton, Text } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { palette, spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

function UniverseTile({ universe }: { universe: 'CALM' | 'CHAOS' }) {
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const calm = universe === 'CALM';
  return (
    <Pressable
      onPress={() => router.push(`/discover?universe=${universe}`)}
      style={{
        flex: 1,
        borderRadius: radius.lg,
        padding: spacing.xl,
        backgroundColor: calm ? '#17150F' : '#1A0F0D',
        borderWidth: 1,
        borderColor: calm ? palette.calmDeep : palette.chaosDeep,
        minHeight: 130,
        justifyContent: 'space-between',
      }}
    >
      <Text variant="display" style={{ color: calm ? palette.calm : palette.chaos, fontFamily: undefined }}>
        {calm ? 'CALM' : 'CHAOS'}
      </Text>
      <Text variant="small" muted>
        {calm ? t('home.discoverCalm') : t('home.discoverChaos')}
      </Text>
    </Pressable>
  );
}

export default function Home() {
  const source = useDataSource();
  const { t, locale } = useLocale();
  const profile = useSession((s) => s.profile);
  const router = useRouter();
  const { tokens } = useTheme();

  const looks = useQuery({ queryKey: ['looks', 'trending'], queryFn: () => source.listLooks({ sort: 'trending', limit: 10 }) });
  const stories = useQuery({ queryKey: ['stories'], queryFn: () => source.listStories() });
  const merchants = useQuery({ queryKey: ['merchants'], queryFn: () => source.listMerchants({ approvedOnly: true }) });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : t('home.title');

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="caption" accent style={{ letterSpacing: 3 }}>
              ATHR · أثر
            </Text>
            <Text variant="headline">
              {greeting}
              {profile ? `, ${profile.display_name.split(' ')[0]}` : ''}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/discover')} hitSlop={10} style={{ padding: spacing.sm }}>
            <Ionicons name="search-outline" size={24} color={tokens.text} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
          <UniverseTile universe="CALM" />
          <UniverseTile universe="CHAOS" />
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <SectionHeader title={t('home.trending')} onAction={() => router.push('/(tabs)/looks')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {looks.isLoading
          ? [1, 2, 3].map((i) => <Skeleton key={i} width={220} height={320} />)
          : (looks.data?.items ?? []).map((l) => <LookCard key={l.id} look={l} />)}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <SectionHeader title={t('home.editorial')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {stories.isLoading ? [1, 2].map((i) => <Skeleton key={i} width={260} height={150} />) : (stories.data ?? []).map((s) => <StoryCard key={s.id} story={s} />)}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <SectionHeader title={t('home.boutiques')} onAction={() => router.push('/merchants')} />
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        {merchants.isLoading
          ? [1, 2].map((i) => <Skeleton key={i} width={'100%' as never} height={80} style={{ marginBottom: spacing.md }} />)
          : (merchants.data ?? []).slice(0, 4).map((m) => <MerchantCard key={m.id} merchant={m} />)}
      </View>
      <View style={{ alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.lg }}>
        <Text variant="caption" faint>
          {t('brand.tagline')}
        </Text>
      </View>
    </ScrollView>
  );
}
