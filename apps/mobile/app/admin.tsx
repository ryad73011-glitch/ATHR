import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, Button, Card, Header, Screen, Segmented, Text, useToast } from '../src/components/ui';
import { useDataSource } from '../src/data';
import { useLocale } from '../src/i18n';
import { useSession } from '../src/store/session';
import { spacing } from '../src/theme/tokens';
import { useTheme } from '../src/theme/ThemeProvider';

type Tab = 'overview' | 'reports' | 'merchants' | 'audit';

function Stat({ label, value }: { label: string; value: string | number }) {
  const { tokens } = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: 100, padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm }}>
      <Text variant="title" accent>
        {value}
      </Text>
      <Text variant="caption" faint>
        {label}
      </Text>
    </Card>
  );
}

export default function Admin() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const profile = useSession((s) => s.profile);

  const overview = useQuery({ queryKey: ['adminOverview'], queryFn: () => source.adminOverview() });
  const reports = useQuery({ queryKey: ['adminReports'], queryFn: () => source.adminListReports() });
  const merchants = useQuery({ queryKey: ['merchants'], queryFn: () => source.listMerchants() });
  const audit = useQuery({ queryKey: ['adminAudit'], queryFn: () => source.adminListAudit() });
  const users = useQuery({ queryKey: ['adminUsers'], queryFn: () => source.adminListUsers() });

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'actioned' | 'dismissed' }) => source.adminResolveReport(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminReports'] });
      qc.invalidateQueries({ queryKey: ['adminOverview'] });
      toast.show('Report resolved');
    },
  });
  const approve = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => source.adminSetMerchantApproval(id, approved),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchants'] });
      qc.invalidateQueries({ queryKey: ['adminOverview'] });
      toast.show('Merchant updated');
    },
  });

  const o = overview.data;

  return (
    <Screen insetBottom>
      <Header title={t('admin.title')} subtitle={profile?.role ?? 'admin'} onBack={() => router.back()} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Stats' },
          { value: 'reports', label: `Reports${o ? ` (${o.open_reports})` : ''}` },
          { value: 'merchants', label: 'Merchants' },
          { value: 'audit', label: 'Audit' },
        ]}
      />
      <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: spacing.xxxl }}>
        {tab === 'overview' && o ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Stat label={t('admin.users')} value={o.users} />
            <Stat label="Premium" value={o.premium_users} />
            <Stat label={t('admin.merchants')} value={o.merchants} />
            <Stat label="Pending" value={o.pending_merchants} />
            <Stat label="Products" value={o.products} />
            <Stat label="Looks" value={o.looks} />
            <Stat label="Live battles" value={o.battles_live} />
            <Stat label="Votes" value={o.votes_total.toLocaleString()} />
            <Stat label="AI calls" value={o.ai_calls} />
            <Stat label="Open reports" value={o.open_reports} />
          </View>
        ) : null}

        {tab === 'reports' &&
          (reports.data ?? []).map((r) => (
            <Card key={r.id} style={{ padding: spacing.md, marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="small">
                  {r.target_kind} · {r.reason}
                </Text>
                <Badge label={r.status} color={r.status === 'open' ? tokens.warning : r.status === 'actioned' ? tokens.danger : tokens.textFaint} />
              </View>
              {r.detail ? (
                <Text variant="caption" faint style={{ marginVertical: spacing.xs }}>
                  {r.detail}
                </Text>
              ) : null}
              {r.status === 'open' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <Button label={t('admin.action')} small onPress={() => resolve.mutate({ id: r.id, action: 'actioned' })} />
                  <Button label={t('admin.dismiss')} small variant="outline" onPress={() => resolve.mutate({ id: r.id, action: 'dismissed' })} />
                </View>
              ) : null}
            </Card>
          ))}

        {tab === 'merchants' &&
          (merchants.data ?? []).map((m) => (
            <Card key={m.id} style={{ padding: spacing.md, marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body">{m.name}</Text>
                <Badge label={m.approved ? 'approved' : 'pending'} color={m.approved ? tokens.success : tokens.warning} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                {!m.approved ? <Button label={t('admin.approve')} small onPress={() => approve.mutate({ id: m.id, approved: true })} /> : null}
                {m.approved ? <Button label={t('admin.reject')} small variant="outline" onPress={() => approve.mutate({ id: m.id, approved: false })} /> : null}
              </View>
            </Card>
          ))}

        {tab === 'audit' &&
          (audit.data ?? []).map((a) => (
            <Card key={a.id} style={{ padding: spacing.md, marginBottom: spacing.sm }}>
              <Text variant="small">
                {a.action} <Text variant="caption" faint>· {a.entity}</Text>
              </Text>
              <Text variant="caption" faint>
                by {a.actor_id} · {new Date(a.created_at).toLocaleString()}
              </Text>
            </Card>
          ))}

        {tab === 'overview' && users.data ? (
          <View style={{ marginTop: spacing.lg }}>
            <Text variant="title" style={{ marginBottom: spacing.sm }}>
              {t('admin.users')}
            </Text>
            {users.data.map((u) => (
              <Card key={u.id} style={{ padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="small">{u.display_name}</Text>
                <Badge label={u.role} color={u.role === 'admin' ? tokens.danger : tokens.info} />
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
