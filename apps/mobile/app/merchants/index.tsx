import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { MerchantCard } from '../../src/components/cards';
import { Button, Card, Header, Input, Screen, Skeleton, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function Merchants() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [applying, setApplying] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [desc, setDesc] = useState('');

  const merchants = useQuery({ queryKey: ['merchants'], queryFn: () => source.listMerchants() });

  const apply = useMutation({
    mutationFn: () => source.applyMerchant({ name, city, description: desc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchants'] });
      toast.show('Application submitted for review');
      setApplying(false);
      setName('');
      setCity('');
      setDesc('');
    },
  });

  const approved = (merchants.data ?? []).filter((m) => m.approved);
  const pending = (merchants.data ?? []).filter((m) => !m.approved);

  return (
    <Screen scroll insetBottom>
      <Header title={t('merchants.title')} onBack={() => router.back()} right={<Button label={t('merchants.apply')} small variant="outline" onPress={() => setApplying((a) => !a)} />} />

      {applying ? (
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
          <Input label="Store name" value={name} onChangeText={setName} />
          <Input label="City" value={city} onChangeText={setCity} />
          <Input label="Description" value={desc} onChangeText={setDesc} multiline numberOfLines={3} />
          <Button label="Submit application" full loading={apply.isPending} disabled={!name.trim() || !city.trim()} onPress={() => apply.mutate()} />
        </Card>
      ) : null}

      <Button label={t('merchants.dashboard')} full variant="ghost" icon="stats-chart-outline" onPress={() => router.push('/merchants/dashboard')} />

      {merchants.isLoading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} width={'100%' as never} height={80} style={{ marginBottom: spacing.md }} />)
      ) : (
        <>
          {approved.map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
          {pending.length ? (
            <>
              <Text variant="caption" muted style={{ marginVertical: spacing.sm }}>
                Pending review
              </Text>
              {pending.map((m) => (
                <Card key={m.id} style={{ padding: spacing.md, marginBottom: spacing.md, opacity: 0.6 }}>
                  <Text variant="body">{m.name}</Text>
                  <Text variant="caption" faint>
                    {m.city} · awaiting approval
                  </Text>
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
