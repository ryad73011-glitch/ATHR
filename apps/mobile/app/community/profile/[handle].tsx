import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { LookCard } from '../../../src/components/cards';
import { Avatar, Badge, Button, ErrorState, Header, Screen, Skeleton, Text, useToast } from '../../../src/components/ui';
import { useDataSource } from '../../../src/data';
import { useLocale } from '../../../src/i18n';
import { useSession } from '../../../src/store/session';
import { spacing } from '../../../src/theme/tokens';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function CommunityProfile() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const session = useSession((s) => s.session);

  const profile = useQuery({ queryKey: ['profile', handle], queryFn: () => source.getProfileByHandle(handle!) });
  const looks = useQuery({
    queryKey: ['looks', 'author', handle],
    queryFn: async () => {
      const p = await source.getProfileByHandle(handle!);
      if (!p) return [];
      return (await source.listLooks({ author_id: p.id, limit: 20 })).items;
    },
  });
  const follows = useQuery({ queryKey: ['follows'], queryFn: () => source.listFollows() });

  const follow = useMutation({
    mutationFn: () => source.toggleFollow(profile.data!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follows'] }),
  });

  const report = async () => {
    if (!profile.data || !session) return;
    await source.submitReport({ reporter_id: session.user_id, target_kind: 'profile', target_id: profile.data.id, reason: 'other', detail: null });
    toast.show(`${t('community.report')} ✓`);
  };

  if (profile.isLoading) {
    return (
      <Screen>
        <Skeleton width={200} height={28} />
      </Screen>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => profile.refetch()} />
      </Screen>
    );
  }
  const p = profile.data;
  const following = follows.data?.includes(p.id) ?? false;

  return (
    <Screen scroll insetBottom>
      <Header title={`@${p.handle}`} onBack={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
        <Avatar name={p.display_name} size={64} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="title">{p.display_name}</Text>
            {p.verified ? <Badge label="✓" color={tokens.success} /> : null}
          </View>
          <Text variant="caption" faint>
            {p.city ?? '—'} · {p.followers.toLocaleString()} {t('community.followers')}
          </Text>
        </View>
      </View>
      {p.bio ? (
        <Text variant="body" muted style={{ marginBottom: spacing.md }}>
          {p.bio}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Button label={following ? t('community.following') : t('community.follow')} variant={following ? 'outline' : 'primary'} loading={follow.isPending} onPress={() => follow.mutate()} />
        <Button label={t('community.report')} variant="ghost" onPress={report} />
      </View>

      <Text variant="title" style={{ marginBottom: spacing.sm }}>
        {t('nav.looks')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
        {(looks.data ?? []).map((l) => (
          <LookCard key={l.id} look={l} width={168} height={200} />
        ))}
      </View>
    </Screen>
  );
}
