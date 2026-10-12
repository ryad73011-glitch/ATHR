import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { LookCard } from '../../src/components/cards';
import { EmptyState, ErrorState, Header, Screen, Skeleton } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';

export default function Saved() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const session = useSession((s) => s.session);
  const userId = session?.user_id ?? 'guest';

  const saved = useQuery({ queryKey: ['saved', userId], queryFn: () => source.listSavedLooks(userId) });

  return (
    <Screen scroll insetBottom>
      <Header title={t('profile.saved')} onBack={() => router.back()} />
      {saved.isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} width={168} height={260} />
          ))}
        </View>
      ) : saved.isError ? (
        <ErrorState onRetry={() => saved.refetch()} />
      ) : (saved.data?.length ?? 0) === 0 ? (
        <EmptyState icon="bookmark-outline" title={t('common.empty')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
          {(saved.data ?? []).map((l) => (
            <LookCard key={l.id} look={l} width={168} height={210} />
          ))}
        </View>
      )}
    </Screen>
  );
}
