import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Header, Input, Screen, Skeleton, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { Occasion, StylePreferences, Universe } from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const OCCS: Occasion[] = ['everyday', 'work', 'evening', 'wedding', 'travel', 'sport', 'street', 'cafe'];

/** Inner form initialises local draft state from loaded prefs via useState initialisers. */
function SettingsForm({ prefs, onSave, saving }: { prefs: StylePreferences; onSave: (p: Partial<StylePreferences>) => void; saving: boolean }) {
  const { t } = useLocale();
  const { tokens } = useTheme();
  const [universes, setUniverses] = useState<Universe[]>(prefs.universes);
  const [occs, setOccs] = useState<Occasion[]>(prefs.occasions);
  const [min, setMin] = useState(String(prefs.budget_min));
  const [max, setMax] = useState(String(prefs.budget_max));

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <>
      <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
        {t('common.universe')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Chip label={t('calm')} selected={universes.includes('CALM')} color={tokens.calm} onPress={() => toggle(universes, 'CALM', setUniverses)} />
        <Chip label={t('chaos')} selected={universes.includes('CHAOS')} color={tokens.chaos} onPress={() => toggle(universes, 'CHAOS', setUniverses)} />
      </View>

      <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
        {t('discover.occasion')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
        {OCCS.map((o) => (
          <Chip key={o} label={t(`occ.${o}`)} selected={occs.includes(o)} onPress={() => toggle(occs, o, setOccs)} />
        ))}
      </View>

      <Input label={`${t('discover.budget')} min (DZD)`} value={min} onChangeText={setMin} keyboardType="number-pad" />
      <Input label={`${t('discover.budget')} max (DZD)`} value={max} onChangeText={setMax} keyboardType="number-pad" />

      <Button label={t('common.save')} full loading={saving} onPress={() => onSave({ universes, occasions: occs, budget_min: Number(min) || 0, budget_max: Number(max) || 0 })} />
    </>
  );
}

export default function Settings() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const session = useSession((s) => s.session);
  const userId = session?.user_id ?? 'guest';

  const prefs = useQuery({ queryKey: ['prefs', userId], queryFn: () => source.getPreferences(userId) });

  const save = useMutation({
    mutationFn: (patch: Partial<StylePreferences>) => source.updatePreferences(userId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prefs', userId] });
      toast.show(`${t('common.saved')} ✓`);
    },
  });

  return (
    <Screen scroll insetBottom>
      <Header title={t('profile.preferences')} onBack={() => router.back()} />
      {prefs.isLoading ? (
        <Skeleton width={'100%' as never} height={200} />
      ) : prefs.data ? (
        <SettingsForm key={prefs.data.updated_at} prefs={prefs.data} saving={save.isPending} onSave={(p) => save.mutate(p)} />
      ) : null}
    </Screen>
  );
}
