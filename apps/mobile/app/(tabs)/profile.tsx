import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Avatar, Badge, Button, Card, Header, Text } from '../../src/components/ui';
import { useDataSource, useIsLive } from '../../src/data';
import { LOCALES, useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

function Row({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
      <Ionicons name={icon} size={20} color={danger ? tokens.danger : tokens.textMuted} />
      <Text variant="body" style={{ color: danger ? tokens.danger : tokens.text, flex: 1 }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={tokens.textFaint} />
    </Pressable>
  );
}

export default function Profile() {
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const { tokens } = useTheme();
  const source = useDataSource();
  const isLive = useIsLive();
  const { profile, status, signOut } = useSession();

  const doSignOut = async () => {
    await signOut(source);
    router.replace('/(auth)/welcome');
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Header title={t('nav.profile')} />
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
          {status === 'authed' && profile ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={profile.display_name} size={56} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text variant="title">{profile.display_name}</Text>
                  {profile.premium ? <Badge label="PREMIUM" color={tokens.accent} /> : null}
                </View>
                <Text variant="caption" faint>
                  @{profile.handle} · {profile.city ?? '—'}
                </Text>
                <Text variant="caption" muted style={{ marginTop: 2 }}>
                  {profile.followers} {t('community.followers')} · {profile.following} {t('community.following')}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Text variant="lead">{t('common.signin')}</Text>
              <Button label={t('common.signin')} full onPress={() => router.push('/(auth)/sign-in')} />
            </View>
          )}
        </Card>

        <Text variant="caption" muted style={{ marginBottom: spacing.xs }}>
          {t('profile.language')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {LOCALES.map((l) => (
            <Pressable key={l.code} onPress={() => setLocale(l.code)} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: locale === l.code ? tokens.accent : tokens.border, backgroundColor: locale === l.code ? tokens.accent + '22' : 'transparent' }}>
              <Text variant="small" style={{ color: locale === l.code ? tokens.accent : tokens.textMuted }}>
                {l.native}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card style={{ padding: spacing.lg }}>
          <Row icon="shirt-outline" label={t('wardrobe.title')} onPress={() => router.push('/wardrobe')} />
          <Row icon="people-outline" label={t('community.title')} onPress={() => router.push('/community')} />
          <Row icon="storefront-outline" label={t('merchants.title')} onPress={() => router.push('/merchants')} />
          <Row icon="bookmark-outline" label={t('profile.saved')} onPress={() => router.push('/profile/saved')} />
          <Row icon="notifications-outline" label={t('profile.notifications')} onPress={() => router.push('/profile/notifications')} />
          <Row icon="color-palette-outline" label={t('profile.preferences')} onPress={() => router.push('/profile/settings')} />
          <Row icon="card-outline" label={t('profile.subscription')} onPress={() => router.push('/profile/subscription')} />
          <Row icon="pricetag-outline" label="Plans & pricing · Ad-free" onPress={() => router.push('/pricing')} />
          {profile?.role === 'admin' || profile?.role === 'moderator' || !isLive ? (
            <Row icon="shield-checkmark-outline" label={t('profile.admin')} onPress={() => router.push('/admin')} />
          ) : null}
          {status === 'authed' ? <Row icon="log-out-outline" label={t('common.signout')} onPress={doSignOut} danger /> : null}
        </Card>

        <Text variant="caption" faint style={{ textAlign: 'center', marginTop: spacing.xl }}>
          {t('brand.tagline')}
        </Text>
      </View>
    </ScrollView>
  );
}
