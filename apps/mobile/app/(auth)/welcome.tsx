import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '../../src/components/ui';
import { useLocale } from '../../src/i18n';
import { useIsLive } from '../../src/data';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function Welcome() {
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const isLive = useIsLive();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flex: 1 }}>
        <Image source={require('../../assets/brand-lockup.png')} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
        <LinearGradient colors={['transparent', 'rgba(11,11,12,0.88)', '#0B0B0C']} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.xl, gap: spacing.md }}>
          <Text variant="headline" style={{ textAlign: 'center' }}>
            {t('brand.tagline')}
          </Text>
          <Text variant="small" muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>
            {isLive ? t('common.live') : t('common.demoNote')}
          </Text>
          <Button label={t('common.signup')} full onPress={() => router.push('/(auth)/sign-up')} />
          <Button label={t('common.signin')} full variant="outline" onPress={() => router.push('/(auth)/sign-in')} />
          <Pressable onPress={() => router.replace('/(tabs)')} style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <Text variant="small" muted>
              {t('common.demo')} →
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
