import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { Button, Chip, Header, Input, Screen, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { Category, Occasion, Season } from '../../src/data/types';
import { demoSwatches } from '../../src/data/demo/seed';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const CATS: Category[] = ['outerwear', 'tops', 'bottoms', 'knitwear', 'tailoring', 'shoes', 'bags', 'accessories', 'headwear'];
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter', 'all'];

export default function AddItem() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const session = useSession((s) => s.session);
  const ownerId = session?.user_id ?? 'guest';

  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<Category>('tops');
  const [color, setColor] = useState(demoSwatches[0].hex);
  const [season, setSeason] = useState<Season>('all');
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled && res.assets[0]?.uri) setUri(res.assets[0].uri);
  };

  const save = useMutation({
    mutationFn: () =>
      source.addWardrobeItem({
        owner_id: ownerId,
        label: label || 'Untitled piece',
        category,
        brand: null,
        color,
        season,
        occasions: ['everyday'],
        image_uri: uri,
        note: null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wardrobe', ownerId] });
      toast.show(`${t('common.saved')} ✓`);
      router.back();
    },
    onError: () => setErr(t('common.error')),
  });

  return (
    <Screen scroll insetBottom>
      <Header title={t('wardrobe.add')} onBack={() => router.back()} />
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: 160, height: 160, borderRadius: radius.lg }} contentFit="cover" />
        ) : (
          <View style={{ width: 160, height: 160, borderRadius: radius.lg, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="display" style={{ color: tokens.bg }}>
              ✚
            </Text>
          </View>
        )}
        <Button label={t('studio.upload')} variant="outline" small icon="camera-outline" onPress={pick} />
      </View>

      <Input label={t('wardrobe.label')} value={label} onChangeText={setLabel} placeholder="e.g. Camel overcoat" />

      <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
        {t('wardrobe.category')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
        {CATS.map((c) => (
          <Chip key={c} label={t(`cat.${c}`)} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
        {t('wardrobe.color')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
        {demoSwatches.map((s) => (
          <View key={s.name} style={{ borderRadius: 999, borderWidth: color === s.hex ? 2 : 1, borderColor: color === s.hex ? tokens.accent : tokens.border }}>
            <Chip label={s.name} selected={color === s.hex} color={s.hex} onPress={() => setColor(s.hex)} />
          </View>
        ))}
      </View>

      <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
        {t('wardrobe.season')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.lg }}>
        {SEASONS.map((s) => (
          <Chip key={s} label={s} selected={season === s} onPress={() => setSeason(s)} />
        ))}
      </View>

      {err ? (
        <Text variant="small" style={{ color: tokens.danger, marginBottom: spacing.md }}>
          {err}
        </Text>
      ) : null}
      <Button label={t('common.save')} full loading={save.isPending} onPress={() => save.mutate()} />
    </Screen>
  );
}
