
import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  Header,
  Input,
  Screen,
  Text,
} from '../../src/components/ui';
import { useDataSource, useIsLive } from '../../src/data';
import { spacing } from '../../src/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const source = useDataSource();
  const isLive = useIsLive();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      if (!isLive) {
        throw new Error(
          'Password recovery requires live Supabase mode.',
        );
      }

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
        throw new Error('Enter a valid email address.');
      }

      await source.resetPasswordForEmail(email.trim());

      setMessage(
        'إذا كان البريد مسجلاً، تحقق من صندوق البريد ورابط الاسترجاع.',
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'تعذر إرسال رابط الاسترجاع.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        title="استرجاع كلمة المرور"
        onBack={() => router.back()}
      />

      <Text variant="small" muted>
        أدخل البريد الإلكتروني المرتبط بحساب ATHR لإرسال رابط تعيين
        كلمة مرور جديدة.
      </Text>

      <View style={{ marginTop: spacing.lg }}>
        <Input
          label="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {message ? (
        <Text
          variant="small"
          style={{ color: '#A9D6B0', marginTop: spacing.md }}
        >
          {message}
        </Text>
      ) : null}

      {error ? (
        <Text
          variant="small"
          style={{ color: '#D9544D', marginTop: spacing.md }}
        >
          {error}
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          label="إرسال رابط الاسترجاع"
          full
          loading={busy}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}
