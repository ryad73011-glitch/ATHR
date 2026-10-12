import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, Header, Input, Screen, Text, useToast } from '../../src/components/ui';
import { useDataSource, useIsLive } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';

export default function SignUp() {
  const router = useRouter();
  const { t } = useLocale();
  const source = useDataSource();
  const signUp = useSession((s) => s.signUp);
  const isLive = useIsLive();
  const toast = useToast();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error('Enter your name.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      await signUp(source, { email, password, handle: handle || name.toLowerCase().replace(/\s+/g, '.'), display_name: name });
      toast.show(`${t('common.signup')} ✓`);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Header title={t('common.signup')} onBack={() => router.back()} />
      <Input label="Name" value={name} onChangeText={setName} />
      <Input label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="@you" />
      <Input label={t('common.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Input label={t('common.password')} value={password} onChangeText={setPassword} secureTextEntry />
      {error ? (
        <Text variant="small" style={{ color: '#D9544D', marginBottom: spacing.md }}>
          {error}
        </Text>
      ) : null}
      {!isLive ? (
        <Text variant="caption" faint style={{ marginBottom: spacing.md }}>
          {t('common.demoNote')}
        </Text>
      ) : null}
      <Button label={t('common.signup')} full loading={busy} onPress={submit} />
    </Screen>
  );
}
