import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Header, Screen, Text } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function Wardrobe() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const session = useSession((s) => s.session);
  const ownerId = session?.user_id ?? 'guest';

  const items = useQuery({ queryKey: ['wardrobe', ownerId], queryFn: () => source.listWardrobe(ownerId) });
  const outfits = useQuery({ queryKey: ['outfits', ownerId], queryFn: () => source.listOutfits(ownerId) });

  return (
    <Screen scroll insetBottom>
      <Header
        title={t('wardrobe.title')}
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => router.push('/wardrobe/add')} hitSlop={10} style={{ padding: spacing.sm }}>
            <Ionicons name="add-circle-outline" size={26} color={tokens.accent} />
          </Pressable>
        }
      />

      <Text variant="title" style={{ marginBottom: spacing.sm }}>
        {t('wardrobe.items')} ({items.data?.length ?? 0})
      </Text>
      {(items.data?.length ?? 0) === 0 ? (
        <EmptyState icon="shirt-outline" title={t('wardrobe.empty')} action={<Button label={t('wardrobe.add')} onPress={() => router.push('/wardrobe/add')} />} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
          {(items.data ?? []).map((w) => (
            <Card key={w.id} style={{ width: 160, marginBottom: spacing.sm }}>
              <View style={{ width: 160, height: 160, backgroundColor: w.color, alignItems: 'center', justifyContent: 'center' }}>
                {w.image_uri ? null : <Ionicons name="shirt-outline" size={40} color={tokens.bg} />}
              </View>
              <View style={{ padding: spacing.sm }}>
                <Text variant="small" numberOfLines={1}>
                  {w.label}
                </Text>
                <Text variant="caption" faint>
                  {t(`cat.${w.category}`)} · {w.season}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text variant="title" style={{ marginVertical: spacing.md }}>
        {t('wardrobe.outfits')} ({outfits.data?.length ?? 0})
      </Text>
      {(outfits.data ?? []).map((o) => (
        <Card key={o.id} style={{ padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: tokens.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="grid-outline" size={22} color={tokens.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" numberOfLines={1}>
              {o.name}
            </Text>
            <Text variant="caption" faint>
              {o.item_ids.length} {t('common.items')} · {t(`occ.${o.occasion}`)}
            </Text>
          </View>
          <Badge label={o.universe} color={o.universe === 'CALM' ? tokens.calm : tokens.chaos} />
        </Card>
      ))}
    </Screen>
  );
}
