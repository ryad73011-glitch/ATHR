import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { LookCard } from '../../src/components/cards';
import { Avatar, Button, Card, ErrorState, Header, Screen, Skeleton, Text } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function Community() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const session = useSession((s) => s.session);

  const feed = useQuery({ queryKey: ['feed'], queryFn: () => source.listFeed(20) });
  const users = useQuery({ queryKey: ['users'], queryFn: () => source.adminListUsers() });
  const follows = useQuery({ queryKey: ['follows'], queryFn: () => source.listFollows() });

  const suggested = (users.data ?? []).filter((u) => u.id !== session?.user_id).slice(0, 5);

  return (
    <Screen insetBottom>
      <Header title={t('community.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>
          {t('community.following')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {suggested.map((u) => {
              const following = follows.data?.includes(u.id);
              return (
                <Card key={u.id} style={{ width: 150, padding: spacing.md, alignItems: 'center', gap: spacing.xs }}>
                  <Avatar name={u.display_name} size={52} />
                  <Text variant="small" numberOfLines={1}>
                    {u.display_name}
                  </Text>
                  <Text variant="caption" faint>
                    {u.followers.toLocaleString()} {t('community.followers')}
                  </Text>
                  <Button label={following ? t('community.following') : t('community.follow')} small variant={following ? 'outline' : 'primary'} onPress={() => router.push(`/community/profile/${u.handle}`)} />
                </Card>
              );
            })}
          </View>
        </ScrollView>

        <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>
          {t('home.feed')}
        </Text>
        {feed.isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {[1, 2].map((i) => (
              <Skeleton key={i} width={168} height={280} />
            ))}
          </View>
        ) : feed.isError ? (
          <ErrorState onRetry={() => feed.refetch()} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
            {(feed.data ?? []).map((l) => (
              <LookCard key={l.id} look={l} width={168} height={200} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
