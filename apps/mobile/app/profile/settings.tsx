
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Chip,
  Header,
  Input,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type {
  Occasion,
  StylePreferences,
  Universe,
} from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const OCCS: Occasion[] = [
  'everyday',
  'work',
  'evening',
  'wedding',
  'travel',
  'sport',
  'street',
  'cafe',
];

function SettingsForm({
  prefs,
  onSave,
  saving,
}: {
  prefs: StylePreferences;
  onSave: (p: Partial<StylePreferences>) => void;
  saving: boolean;
}) {
  const { t } = useLocale();
  const { tokens, mode, setMode } = useTheme();

  const [universes, setUniverses] = useState<Universe[]>(
    prefs.universes,
  );
  const [occs, setOccs] = useState<Occasion[]>(
    prefs.occasions,
  );
  const [min, setMin] = useState(String(prefs.budget_min));
  const [max, setMax] = useState(String(prefs.budget_max));

  const toggle = <T,>(
    arr: T[],
    value: T,
    set: (next: T[]) => void,
  ) => {
    set(
      arr.includes(value)
        ? arr.filter((item) => item !== value)
        : [...arr, value],
    );
  };

  return (
    <>
      <Text
        variant="caption"
        muted
        style={{ marginBottom: spacing.xs }}
      >
        المظهر / Appearance / Apparence
      </Text>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          flexWrap: 'wrap',
          marginBottom: spacing.lg,
        }}
      >
        <Chip
          label="داكن · Dark"
          selected={mode === 'dark'}
          onPress={() => setMode('dark')}
        />

        <Chip
          label="فاتح · Light"
          selected={mode === 'light'}
          onPress={() => setMode('light')}
        />

        <Chip
          label="النظام · System"
          selected={mode === 'system'}
          onPress={() => setMode('system')}
        />
      </View>

      <Text
        variant="caption"
        muted
        style={{ marginBottom: spacing.xs }}
      >
        {t('common.universe')}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        <Chip
          label={t('calm')}
          selected={universes.includes('CALM')}
          color={tokens.calm}
          onPress={() =>
            toggle(universes, 'CALM', setUniverses)
          }
        />

        <Chip
          label={t('chaos')}
          selected={universes.includes('CHAOS')}
          color={tokens.chaos}
          onPress={() =>
            toggle(universes, 'CHAOS', setUniverses)
          }
        />
      </View>

      <Text
        variant="caption"
        muted
        style={{ marginBottom: spacing.xs }}
      >
        {t('discover.occasion')}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          flexWrap: 'wrap',
          marginBottom: spacing.md,
        }}
      >
        {OCCS.map((occasion) => (
          <Chip
            key={occasion}
            label={t(`occ.${occasion}`)}
            selected={occs.includes(occasion)}
            onPress={() =>
              toggle(occs, occasion, setOccs)
            }
          />
        ))}
      </View>

      <Input
        label={`${t('discover.budget')} min (DZD)`}
        value={min}
        onChangeText={setMin}
        keyboardType="number-pad"
      />

      <Input
        label={`${t('discover.budget')} max (DZD)`}
        value={max}
        onChangeText={setMax}
        keyboardType="number-pad"
      />

      <Button
        label={t('common.save')}
        full
        loading={saving}
        onPress={() =>
          onSave({
            universes,
            occasions: occs,
            budget_min: Number(min) || 0,
            budget_max: Number(max) || 0,
          })
        }
      />
    </>
  );
}

export default function Settings() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const session = useSession((state) => state.session);
  const userId = session?.user_id ?? 'guest';

  const prefs = useQuery({
    queryKey: ['prefs', userId],
    queryFn: () => source.getPreferences(userId),
  });

  const save = useMutation({
    mutationFn: (patch: Partial<StylePreferences>) =>
      source.updatePreferences(userId, patch),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['prefs', userId],
      });
      toast.show(`${t('common.saved')} ✓`);
    },
  });

  return (
    <Screen scroll insetBottom>
      <Header
        title={t('profile.preferences')}
        onBack={() => router.back()}
      />

      {prefs.isLoading ? (
        <Skeleton width={'100%' as never} height={200} />
      ) : prefs.data ? (
        <SettingsForm
          key={prefs.data.updated_at}
          prefs={prefs.data}
          saving={save.isPending}
          onSave={(patch) => save.mutate(patch)}
        />
      ) : null}
    </Screen>
  );
}
