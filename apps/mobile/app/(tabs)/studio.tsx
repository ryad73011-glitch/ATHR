import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { ProductRow } from '../../src/components/cards';
import { Badge, Button, Header, Input, Screen, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { Occasion, StudioMessage, StudioResult, Universe } from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const OCCASIONS: Occasion[] = ['everyday', 'work', 'evening', 'wedding', 'travel', 'sport', 'street', 'cafe'];
const PALETTE = ['#E6DFD2', '#C08E52', '#6B7050', '#5A6270', '#2C2E33', '#C4402F', '#8E4A2A', '#B7BCC1'];

const OCCASION_ICON: Record<Occasion, keyof typeof Ionicons.glyphMap> = {
  everyday: 'sunny-outline',
  work: 'briefcase-outline',
  evening: 'moon-outline',
  wedding: 'sparkles-outline',
  travel: 'airplane-outline',
  sport: 'fitness-outline',
  street: 'flash-outline',
  cafe: 'cafe-outline',
};

export default function Studio() {
  const source = useDataSource();
  const { t } = useLocale();
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
      setMessages((current) => [
        ...current,
        {
          id: `u_${Date.now()}`,
          role: 'user',
          content: `${t('studio.occasion')}: ${t(`occ.${occasion}`)} · ${t('studio.budget')}: ${budget} DZD`,
          created_at: new Date().toISOString(),
        },
        ...res.messages,
      ]);
      setLast(res);
      if (res.degraded_reason) toast.show(t('studio.degraded'));
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    },
    onError: () => toast.show(t('common.error')),
  });

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImages((current) => [...current, result.assets[0].uri]);
    }
  };

  const toggle = <T,>(values: T[], value: T, setValues: (next: T[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <Screen insetBottom>
      <Header title="WASM" subtitle={t('studio.subtitle')} />
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* WASM identity / welcome panel */}
        <View
          style={{
            borderRadius: 24,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            backgroundColor: tokens.bgElevated,
            borderWidth: 1,
            borderColor: tokens.border,
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', width: 154, height: 154, borderRadius: 77, borderWidth: 1, borderColor: tokens.border, right: -58, top: -62 }} />
          <View style={{ position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 1, borderColor: tokens.border, right: -32, top: -35 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.accent }} />
              <Text variant="caption" style={{ color: tokens.accent, letterSpacing: 1.5, fontWeight: '800' }}>ATHR INTELLIGENCE</Text>
            </View>
            <Badge label="WASM AI" color={tokens.accent} />
          </View>
          <Text variant="small" style={{ fontSize: 28, lineHeight: 35, fontWeight: '800', marginBottom: spacing.sm, maxWidth: 300, color: tokens.text }}>
            {t('studio.title')}
          </Text>
          <Text variant="small" muted style={{ lineHeight: 21, maxWidth: 310, marginBottom: spacing.lg }}>
            {t('studio.subtitle')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {['PERSONAL STYLE', 'CALM / CHAOS', 'DZD'].map((label) => (
              <View key={label} style={{ borderRadius: 999, borderWidth: 1, borderColor: tokens.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: tokens.surface }}>
                <Text variant="caption" style={{ color: tokens.textMuted, fontWeight: '700', letterSpacing: 0.4 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Assistant welcome bubble */}
        {messages.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.xl }}>
            <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sparkles-outline" size={21} color={tokens.accent} />
            </View>
            <View style={{ flex: 1, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 18, borderTopLeftRadius: 5, padding: spacing.md }}>
              <Text variant="caption" style={{ color: tokens.accent, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.xs }}>WASM</Text>
              <Text variant="small" style={{ lineHeight: 21 }}>{t('studio.subtitle')}</Text>
              <Text variant="caption" muted style={{ marginTop: spacing.sm }}>
                {t('studio.occasion')} · {t('studio.budget')} · {t('studio.palette')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Occasion cards */}
        <View style={{ marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>{t('studio.occasion')}</Text>
            <Text variant="caption" muted>01 / 03</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs }}>
              {OCCASIONS.map((item) => {
                const selected = occasion === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setOccasion(item)}
                    style={{
                      width: 104,
                      minHeight: 88,
                      padding: spacing.md,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: selected ? tokens.accent : tokens.border,
                      backgroundColor: selected ? tokens.bgElevated : tokens.surface,
                    }}
                  >
                    <Ionicons name={OCCASION_ICON[item]} size={20} color={selected ? tokens.accent : tokens.textMuted} />
                    <Text variant="small" style={{ fontWeight: '700', marginTop: spacing.sm, color: selected ? tokens.text : tokens.textMuted }}>
                      {t(`occ.${item}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* CALM / CHAOS */}
        <View style={{ marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>{t('common.universe')}</Text>
            <Text variant="caption" muted>02 / 03</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: universes.includes('CALM') }}
              onPress={() => toggle(universes, 'CALM', setUniverses)}
              style={{ flex: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: universes.includes('CALM') ? tokens.calm : tokens.border, backgroundColor: tokens.surface }}
            >
              <View style={{ width: 9, height: 38, borderRadius: 5, backgroundColor: tokens.calm }} />
              <View style={{ flex: 1 }}>
                <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>{t('calm')}</Text>
                <Text variant="caption" muted>Quiet · Classic</Text>
              </View>
              {universes.includes('CALM') ? <Ionicons name="checkmark-circle" size={18} color={tokens.calm} /> : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: universes.includes('CHAOS') }}
              onPress={() => toggle(universes, 'CHAOS', setUniverses)}
              style={{ flex: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: universes.includes('CHAOS') ? tokens.chaos : tokens.border, backgroundColor: tokens.surface }}
            >
              <View style={{ width: 9, height: 38, borderRadius: 5, backgroundColor: tokens.chaos }} />
              <View style={{ flex: 1 }}>
                <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>{t('chaos')}</Text>
                <Text variant="caption" muted>Street · Bold</Text>
              </View>
              {universes.includes('CHAOS') ? <Ionicons name="checkmark-circle" size={18} color={tokens.chaos} /> : null}
            </Pressable>
          </View>
        </View>

        {/* Budget, palette and chat prompt */}
        <View style={{ padding: spacing.lg, borderRadius: 20, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Ionicons name="options-outline" size={19} color={tokens.accent} />
            <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>Fine-tune your look</Text>
          </View>
          <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>{t('studio.palette')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {PALETTE.map((color) => {
              const selected = paletteSel.includes(color);
              const darkSwatch = color === '#E6DFD2' || color === '#B7BCC1';
              return (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel={`Palette ${color}`}
                  accessibilityState={{ selected }}
                  onPress={() => toggle(paletteSel, color, setPaletteSel)}
                  style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: color, borderWidth: selected ? 3 : 1, borderColor: selected ? tokens.accent : tokens.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  {selected ? <Ionicons name="checkmark" size={15} color={darkSwatch ? '#111111' : '#FFFFFF'} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Input label={`${t('studio.budget')} (DZD)`} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
          <Input label="Tell WASM what you need" value={note} onChangeText={setNote} placeholder="e.g. a smart-casual outfit for a cool evening" />
        </View>

        {/* Image context */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>Add a visual reference</Text>
            <Text variant="caption" muted>03 / 03</Text>
          </View>
          <View style={{ padding: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, borderStyle: 'dashed', backgroundColor: tokens.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="image-outline" size={22} color={tokens.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="small" style={{ fontWeight: '700', color: tokens.text }}>{t('studio.upload')}</Text>
                <Text variant="caption" muted>Use a clothing photo to guide your styling</Text>
              </View>
              <Button label="Add" variant="outline" icon="add-outline" onPress={pick} small />
            </View>
            {images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {images.map((uri, index) => (
                    <View key={`${uri}_${index}`} style={{ position: 'relative' }}>
                      <Image source={{ uri }} style={{ width: 74, height: 88, borderRadius: 12, backgroundColor: tokens.bgElevated }} />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove image"
                        onPress={() => setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                        style={{ position: 'absolute', right: 4, top: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: tokens.bgElevated, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="close" size={15} color={tokens.text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>

        <Button label={run.isPending ? 'WASM is thinking…' : t('studio.generate')} full loading={run.isPending} onPress={() => run.mutate()} icon="sparkles-outline" />
        <Text variant="caption" muted style={{ textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl }}>
          ATHR · Your style, your preferences, your budget
        </Text>

        {/* Conversation and recommended products */}
        {messages.map((message) => (
          <View key={message.id} style={{ marginTop: spacing.md, alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%', flexDirection: 'row', gap: spacing.sm }}>
            {message.role !== 'user' ? (
              <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="sparkles-outline" size={15} color={tokens.accent} />
              </View>
            ) : null}
            <View style={{ flexShrink: 1, backgroundColor: message.role === 'user' ? tokens.bgElevated : tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: spacing.md }}>
              <Text variant="caption" style={{ color: message.role === 'user' ? tokens.textMuted : tokens.accent, fontWeight: '800', marginBottom: spacing.xs }}>
                {message.role === 'user' ? 'YOU' : 'WASM'}
              </Text>
              <Text variant="small" style={{ lineHeight: 21, color: tokens.text }}>{message.content}</Text>
            </View>
          </View>
        ))}

        {last ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Badge label={last.engine === 'cloud-ai' ? t('studio.cloud') : t('studio.local')} color={last.engine === 'cloud-ai' ? tokens.info : tokens.warning} />
              {last.model ? <Badge label={last.model} color={tokens.textFaint} /> : null}
            </View>
            {(last.product_ids ?? []).slice(0, 6).map((id) => <ProductRowFromId key={id} id={id} />)}
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
    source.getProduct(id).then(setProduct).catch(() => setProduct(null));
  }, [id, source]);

  if (!product) return null;
  return <ProductRow product={product} />;
}
