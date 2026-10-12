import { Cairo_400Regular, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import 'react-native-gesture-handler';

import { DataSourceContext, getDataSource } from '../src/data';
import { LocaleProvider, useLocale } from '../src/i18n';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { ToastProvider } from '../src/components/ui';
import { useSession } from '../src/store/session';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
LogBox.ignoreLogs(['Possible Unhandled Promise Rejection', 'Non-serializable values were found in the navigation state']);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

/** Bridges locale RTL into the theme so typography switches to Arabic faces. */
function RtlBridge() {
  const { isRTL } = useLocale();
  const { setRTL } = useTheme();
  useEffect(() => {
    setRTL(isRTL);
  }, [isRTL, setRTL]);
  return null;
}

function RootStack() {
  const { tokens, resolved } = useTheme();
  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="discover" />
        <Stack.Screen name="look/[id]" />
        <Stack.Screen name="battle/[id]" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="story/[slug]" />
        <Stack.Screen name="wardrobe" />
        <Stack.Screen name="wardrobe/add" />
        <Stack.Screen name="community" />
        <Stack.Screen name="community/profile/[handle]" />
        <Stack.Screen name="merchants" />
        <Stack.Screen name="merchants/dashboard" />
        <Stack.Screen name="profile/settings" />
        <Stack.Screen name="profile/saved" />
        <Stack.Screen name="profile/notifications" />
        <Stack.Screen name="profile/subscription" />
        <Stack.Screen name="admin" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Cairo_400Regular,
    Cairo_700Bold,
  });

  const source = getDataSource();
  const init = useSession((s) => s.init);

  useEffect(() => {
    init(source);
  }, [init, source]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <LocaleProvider>
      <ThemeProvider initialMode="dark">
        <RtlBridge />
        <DataSourceContext.Provider value={source}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <RootStack />
            </ToastProvider>
          </QueryClientProvider>
        </DataSourceContext.Provider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
