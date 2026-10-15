
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Header,
  Input,
  Screen,
  Text,
  useToast,
} from '../../src/components/ui';
import { useDataSource, useIsLive } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';

export default function SignIn() {
  const router = useRouter();
  const { t } = useLocale();
  const source = useDataSource();
  const signIn = useSession((s) => s.signIn);
  const isLive = useIsLive();
  const toast = useToast();

  const [email, setEmail] = useState('you@athr.app');
  const [password, setPassword] = useState('athr-demo');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error('Enter a valid email.');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      await signIn(source, email.trim(), password);
      toast.show(`${t('common.signin')} ✓`);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        title={t('common.signin')}
        onBack={() => router.back()}
      />

      <Input
        label={t('common.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Input
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

        <View style={{ marginTop: spacing.sm }}>
          <Text
            variant="small"
            muted
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            Forgot password? / نسيت كلمة المرور؟
          </Text>
        </View>

      {error ? (
        <Text
          variant="small"
          style={{ color: '#D9544D', marginBottom: spacing.md }}
        >
          {error}
        </Text>
      ) : null}

      {!isLive ? (
        <Text
          variant="caption"
          faint
          style={{ marginBottom: spacing.md }}
        >
          {t('common.demoNote')}
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <Button
          label={t('common.signin')}
          full
          loading={busy}
          onPress={submit}
        />
      </View>

      <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <Text
          variant="small"
          muted
          onPress={() => router.push('/(auth)/sign-up')}
        >
          {t('common.signup')} →
        </Text>
      </View>
    </Screen>
  );
}
