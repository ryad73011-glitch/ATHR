
import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Button,
  Header,
  Input,
  Screen,
  Text,
  useToast,
} from '../../src/components/ui';
import { useDataSource, useIsLive } from '../../src/data';
import { useSession } from '../../src/store/session';
import { spacing } from '../../src/theme/tokens';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const source = useDataSource();
  const isLive = useIsLive();
  const init = useSession((s) => s.init);
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);

    if (!isLive) {
      setError('تغيير كلمة المرور يتطلب الاتصال الحقيقي بـ Supabase.');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setBusy(true);

    try {
      await source.updatePassword(password);
      await init(source);

      if (useSession.getState().status !== 'authed') {
        throw new Error(
          'تم تحديث كلمة المرور، لكن تعذر تحميل الحساب. سجّل الدخول مجددًا.',
        );
      }

      toast.show('تم تحديث كلمة المرور بنجاح.');
      router.replace('/(tabs)');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'تعذر تحديث كلمة المرور.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        title="كلمة مرور جديدة"
        onBack={() => router.back()}
      />

      <Text variant="small" muted>
        أدخل كلمة المرور الجديدة وأعد كتابتها للتأكيد.
      </Text>

      <View style={{ marginTop: spacing.lg }}>
        <Input
          label="كلمة المرور الجديدة"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <Input
          label="تأكيد كلمة المرور"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

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
          label="حفظ كلمة المرور الجديدة"
          full
          loading={busy}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}
