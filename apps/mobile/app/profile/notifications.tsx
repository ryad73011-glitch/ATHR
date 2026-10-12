import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Header, Screen, Text } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { timeAgo } from '../../src/lib/format';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function Notifications() {
  const source = useDataSource();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { tokens } = useTheme();
  const qc = useQueryClient();
  const session = useSession((s) => s.session);
  const userId = session?.user_id ?? 'usr_demo_self';

  const notifs = useQuery({ queryKey: ['notifs', userId], queryFn: () => source.listNotifications(userId) });
  const markAll = useMutation({
    mutationFn: () => source.markAllNotificationsRead(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifs', userId] }),
  });

  return (
    <Screen scroll insetBottom>
      <Header title={t('profile.notifications')} onBack={() => router.back()} right={<Button label="Mark all read" small variant="outline" loading={markAll.isPending} onPress={() => markAll.mutate()} />} />
      {(notifs.data?.length ?? 0) === 0 ? (
        <EmptyState icon="notifications-outline" title={t('common.empty')} />
      ) : (
        (notifs.data ?? []).map((n) => (
          <Pressable
            key={n.id}
            onPress={async () => {
              await source.markNotificationRead(n.id);
              qc.invalidateQueries({ queryKey: ['notifs', userId] });
              if (n.deep_link) router.push(n.deep_link as never);
            }}
          >
            <Card style={{ padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', gap: spacing.md, alignItems: 'center', opacity: n.read ? 0.6 : 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.read ? tokens.textFaint : tokens.accent }} />
              <View style={{ flex: 1 }}>
                <Text variant="small" numberOfLines={1}>
                  {n.title}
                </Text>
                <Text variant="caption" faint numberOfLines={2}>
                  {n.body} · {timeAgo(n.created_at, locale)}
                </Text>
              </View>
              <Badge label={n.kind} color={tokens.info} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
