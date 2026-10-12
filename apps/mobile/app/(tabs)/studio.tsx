import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ProductRow } from '../../src/components/cards';
import { Badge, Button, Chip, Header, Input, Screen, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { Occasion, StudioMessage, StudioResult, Universe } from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const OCCASIONS: Occasion[] = ['everyday', 'work', 'evening', 'wedding', 'travel', 'sport', 'street', 'cafe'];
const PALETTE = ['#E6DFD2', '#C08E52', '#6B7050', '#5A6270', '#2C2E33', '#C4402F', '#8E4A2A', '#B7BCC1'];

export default function Studio() {
  const source = useDataSource();
  const { t, locale } = useLocale();
  const { tokens } = useTheme();
  const prefs = useSession((s) => s.prefs);
  const toast = useToast();
  const scroll = useRef<ScrollView>(null);

  const [occasion, setOccasion] = useState<Occasion>('evening');
  const [budget, setBudget] = useState(String(prefs?.budget_max ?? 100000));
  const [universes, setUniverses] = useState<Universe[]>(['CALM']);
  const [paletteSel, setPaletteSel] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [last, setLast] = useState<StudioResult | null>(null);

  const run = useMutation({
    mutationFn: () =>
      source.runStudio({
        occasion,
        budget: Number(budget) || 50000,
        currency: 'DZD',
        universes: universes.length ? universes : ['CALM', 'CHAOS'],
        palette: paletteSel,
        note,
        image_uris: images,
      }),
    onSuccess: (res) => {
      setMessages((m) => [
        ...m,
        { id: `u_${Date.now()}`, role: 'user', content: `${t('studio.occasion')}: ${occasion} · ${t('studio.budget')}: ${budget}`, created_at: new Date().toISOString() },
        ...res.messages,
      ]);
      setLast(res);
      if (res.degraded_reason) toast.show(t('studio.degraded'));
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    },
    onError: () => toast.show(t('common.error')),
  });

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: false });
    if (!res.canceled && res.assets[0]?.uri) setImages((i) => [...i, res.assets[0].uri]);
  };

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <Screen insetBottom>
      <Header title={t('studio.title')} subtitle={t('studio.subtitle')} />
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
          {t('studio.occasion')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {OCCASIONS.map((o) => (
              <Chip key={o} label={t(`occ.${o}`)} selected={occasion === o} onPress={() => setOccasion(o)} />
            ))}
          </View>
        </ScrollView>

        <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
          {t('common.universe')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Chip label={t('calm')} selected={universes.includes('CALM')} color={tokens.calm} onPress={() => toggle(universes, 'CALM', setUniverses)} />
          <Chip label={t('chaos')} selected={universes.includes('CHAOS')} color={tokens.chaos} onPress={() => toggle(universes, 'CHAOS', setUniverses)} />
        </View>

        <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
          {t('studio.palette')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
          {PALETTE.map((c) => (
            <View key={c} style={{ borderRadius: 999, borderWidth: paletteSel.includes(c) ? 2 : 1, borderColor: paletteSel.includes(c) ? tokens.accent : tokens.border }}>
              <Chip label="  " onPress={() => toggle(paletteSel, c, setPaletteSel)} color={c} selected={paletteSel.includes(c)} />
            </View>
          ))}
        </View>

        <Input label={`${t('studio.budget')} (DZD)`} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
        <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. I already own a camel coat" />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Button label={t('studio.upload')} variant="outline" icon="camera-outline" onPress={pick} small />
          {images.length ? <Badge label={`${images.length}`} color={tokens.info} /> : null}
        </View>

        <Button label={t('studio.generate')} full loading={run.isPending} onPress={() => run.mutate()} icon="sparkles-outline" />

        {messages.map((m) => (
          <View key={m.id} style={{ marginTop: spacing.lg, alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
            <View style={{ backgroundColor: m.role === 'user' ? tokens.bgElevated : tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 14, padding: spacing.md }}>
              <Text variant="small" style={{ color: m.role === 'user' ? tokens.textMuted : tokens.text }}>
                {m.content}
              </Text>
            </View>
          </View>
        ))}

        {last ? (
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Badge label={last.engine === 'cloud-ai' ? t('studio.cloud') : t('studio.local')} color={last.engine === 'cloud-ai' ? tokens.info : tokens.warning} />
              {last.model ? <Badge label={last.model} color={tokens.textFaint} /> : null}
            </View>
            {(last.product_ids ?? []).slice(0, 6).map((id) => (
              <ProductRowFromId key={id} id={id} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ProductRowFromId({ id }: { id: string }) {
  const source = useDataSource();
  const [product, setProduct] = React.useState<import('../../src/data/types').Product | null>(null);
  React.useEffect(() => {
    source.getProduct(id).then(setProduct);
  }, [id, source]);
  if (!product) return null;
  return <ProductRow product={product} />;
}
