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

  const session = useQuery({ queryKey: ['session'], queryFn: () => source.getSession() });

  const apply = useMutation({
    mutationFn: () => source.applyMerchant({ name, city, description: desc }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['merchants'] }),
        qc.invalidateQueries({ queryKey: ['owned-merchant'] }),
      ]);
      toast.show('Application submitted for review');
      setApplying(false);
      setName('');
      setCity('');
      setDesc('');
      router.push('/merchants/dashboard');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Could not submit the store application.'),
  });

  const approved = (merchants.data ?? []).filter((m) => m.approved);
  const pending = (merchants.data ?? []).filter((m) => !m.approved);

  return (
    <Screen scroll insetBottom>
      <Header title={t('merchants.title')} onBack={() => router.back()} right={<Button label={t('merchants.apply')} small variant="outline" onPress={() => setApplying((a) => !a)} />} />

      {applying ? (
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
          {!session.data ? (
            <Text variant="body" muted style={{ marginBottom: spacing.md }}>
              Sign in first to register a store. Store applications are linked to your ATHR account.
            </Text>
          ) : null}
          <Input label="Store name" value={name} onChangeText={setName} maxLength={100} />
          <Input label="City" value={city} onChangeText={setCity} maxLength={80} />
          <Input label="Description" value={desc} onChangeText={setDesc} multiline numberOfLines={3} maxLength={1000} />
          <Button
            label="Submit application"
            full
            loading={apply.isPending}
            disabled={!session.data || !name.trim() || !city.trim() || apply.isPending}
            onPress={() => apply.mutate()}
          />
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
