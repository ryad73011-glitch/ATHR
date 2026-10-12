import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { LookCard } from '../../src/components/cards';
import { ErrorState, Screen, Skeleton, Text } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function Story() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const source = useDataSource();
  const router = useRouter();
  const { tokens } = useTheme();

  const story = useQuery({ queryKey: ['story', slug], queryFn: () => source.getStory(slug!) });
  const looks = useQuery({
    queryKey: ['looks', 'story', slug],
    queryFn: async () => {
      const ids = story.data?.look_ids ?? [];
      const all = await Promise.all(ids.map((id) => source.getLook(id)));
      return all.filter(Boolean);
    },
    enabled: !!story.data,
  });

  if (story.isLoading) {
    return (
      <Screen>
        <Skeleton width={200} height={28} />
        <Skeleton width={'100%' as never} height={16} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }
  if (story.isError || !story.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => story.refetch()} />
      </Screen>
    );
  }
  const s = story.data;

  return (
    <Screen scroll insetBottom>
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: spacing.md }}>
        <Ionicons name="arrow-back" size={24} color={tokens.text} />
      </Pressable>
      <Text variant="caption" accent style={{ letterSpacing: 3 }}>
        {s.kicker}
      </Text>
      <Text variant="display" style={{ marginVertical: spacing.sm }}>
        {s.title}
      </Text>
      <Text variant="caption" faint>
        {s.author} · {s.read_minutes} min
      </Text>
      <View style={{ marginTop: spacing.lg }}>
        {s.body.map((para, i) => (
          <Text key={i} variant="lead" muted style={{ marginBottom: spacing.lg, lineHeight: 28 }}>
            {para}
          </Text>
        ))}
      </View>
      {looks.data?.length ? (
        <>
          <Text variant="title" style={{ marginVertical: spacing.md }}>
            Shop the story
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
            {looks.data.map((l) => (
              <LookCard key={l!.id} look={l!} width={160} height={190} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
