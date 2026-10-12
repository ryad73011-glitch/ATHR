import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';

import { useLocale } from '../../src/i18n';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function TabsLayout() {
  const { t } = useLocale();
  const { tokens } = useTheme();

  const icon = (name: keyof typeof Ionicons.glyphMap, size = 22) =>
    function Icon({ color }: { color: ColorValue }) {
      return <Ionicons name={name} size={size} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textFaint,
        tabBarStyle: {
          backgroundColor: tokens.bgSunken,
          borderTopColor: tokens.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.home'), tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="looks" options={{ title: t('nav.looks'), tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="faceoff" options={{ title: t('nav.faceoff'), tabBarIcon: icon('flash-outline') }} />
      <Tabs.Screen name="studio" options={{ title: t('nav.studio'), tabBarIcon: icon('sparkles-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
