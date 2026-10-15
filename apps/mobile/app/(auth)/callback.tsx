
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getDataSource } from '../../src/data';
import { useSession } from '../../src/store/session';

export default function AuthCallbackScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    code?: string | string[];
    flow?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();

  const init = useSession((s) => s.init);
  const started = useRef(false);

  const [message, setMessage] = useState(
    'جاري معالجة رابط المصادقة...',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const completeAuth = async () => {
      const code = Array.isArray(params.code)
        ? params.code[0]
        : params.code;

      const flow = Array.isArray(params.flow)
        ? params.flow[0]
        : params.flow;

      const rawError = Array.isArray(params.error_description)
        ? params.error_description[0]
        : Array.isArray(params.error)
          ? params.error[0]
          : params.error_description ?? params.error;

      if (rawError) {
        setErrorMessage(
          decodeURIComponent(String(rawError).replace(/\+/g, ' ')),
        );
        return;
      }

      if (!code) {
        setErrorMessage(
          'الرابط غير مكتمل أو انتهت صلاحيته. اطلب رابطًا جديدًا.',
        );
        return;
      }

      try {
        const source = getDataSource();

        if (!source.completeAuthCallback) {
          throw new Error(
            'وظيفة المصادقة غير متاحة في مصدر البيانات الحالي.',
          );
        }

        await source.completeAuthCallback(code);

        if (flow === 'recovery') {
          setMessage('تم التحقق من الرابط. افتح شاشة كلمة المرور الجديدة...');
          router.replace('/(auth)/reset-password');
          return;
        }

        setMessage('تم تأكيد البريد. جاري تحميل حسابك...');

        await init(source);

        if (useSession.getState().status !== 'authed') {
          throw new Error(
            'تمت معالجة الرابط، لكن تعذر تحميل الحساب. تحقق من إعدادات Supabase.',
          );
        }

        router.replace('/(tabs)');
      } catch (e) {
        setErrorMessage(
          e instanceof Error
            ? e.message
            : 'تعذرت معالجة الرابط. حاول مجددًا.',
        );
      }
    };

    void completeAuth();
  }, [
    params.code,
    params.flow,
    params.error,
    params.error_description,
    init,
    router,
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ATHR — أثر</Text>

      {errorMessage ? (
        <>
          <Text style={styles.error}>{errorMessage}</Text>

          <Pressable
            style={styles.button}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.buttonText}>
              العودة إلى تسجيل الدخول
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#E8DDC8" />
          <Text style={styles.message}>{message}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#E8DDC8',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 32,
  },
  message: {
    color: '#E8DDC8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 25,
  },
  error: {
    color: '#F0A39D',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#E8DDC8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#0B0B0C',
    fontSize: 15,
    fontWeight: '600',
  },
});
