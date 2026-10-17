
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  type ColorValue,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../src/i18n';
import { useTheme } from '../../src/theme/ThemeProvider';

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  focused: boolean;
  center?: boolean;
  accent: string;
  textOnAccent: string;
};

function TabIcon({
  name,
  color,
  focused,
  center = false,
  accent,
  textOnAccent,
}: TabIconProps) {
  const scale = useRef(
    new Animated.Value(focused ? 1.12 : 1),
  ).current;

  useEffect(() => {
    const animation = Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      tension: 170,
      friction: 11,
    });

    animation.start();

    return () => animation.stop();
  }, [focused, scale]);

  const iconSize = center ? 29 : focused ? 25 : 22;

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: center ? 50 : 34,
        height: center ? 50 : 32,
        borderRadius: center ? 25 : 12,
        backgroundColor: center ? accent : 'transparent',
        transform: [
          { scale: center ? Animated.multiply(scale, 1.02) : scale },
          { translateY: center ? -5 : 0 },
        ],
      }}
    >
      <Ionicons
        name={name}
        size={iconSize}
        color={center ? textOnAccent : color as string}
      />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { t } = useLocale();
  const { tokens } = useTheme();

  const makeIcon = (
    name: keyof typeof Ionicons.glyphMap,
    center = false,
  ) =>
    ({ focused, color }: { focused: boolean; color: ColorValue }) => (
      <TabIcon
        name={name}
        color={color}
        focused={focused}
        center={center}
        accent={tokens.accent}
        textOnAccent={tokens.textOnAccent}
      />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textFaint,
        tabBarStyle: {
          backgroundColor: tokens.bgSunken,
          borderTopColor: tokens.border,
          borderTopWidth: 1,
          height: 78,
          paddingBottom: 7,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#000000',
          shadowOpacity: 0.16,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarItemStyle: {
          marginHorizontal: 2,
          marginVertical: 2,
          borderRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: makeIcon('home-outline'),
        }}
      />

      <Tabs.Screen
        name="looks"
        options={{
          title: t('nav.looks'),
          tabBarIcon: makeIcon('grid-outline'),
        }}
      />

      <Tabs.Screen
        name="studio"
        options={{
          title: 'وَسْم',
          tabBarIcon: makeIcon('finger-print-outline', true),
          tabBarItemStyle: {
            marginHorizontal: 2,
            marginTop: 0,
            marginBottom: 2,
            borderRadius: 12,
          },
          tabBarLabel: ({ focused, color }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -2,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color,
                  fontSize: 11,
                  fontWeight: '700',
                  lineHeight: 14,
                }}
              >
                وَسْم
              </Text>
              <Text
                style={{
                  color: focused ? tokens.accent : tokens.textFaint,
                  fontSize: 8,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  lineHeight: 10,
                }}
              >
                WASM
              </Text>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="faceoff"
        options={{
          title: t('nav.faceoff'),
          tabBarIcon: makeIcon('flash-outline'),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: makeIcon('person-outline'),
        }}
      />
    </Tabs>
  );
          }
