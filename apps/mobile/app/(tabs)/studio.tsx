
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ProductRow } from '../../src/components/cards';
import { Badge, Screen, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type {
  Occasion,
  Product,
  StudioMessage,
  StudioResult,
  Universe,
} from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius } from '../../src/theme/tokens';

type ChatMessage = StudioMessage & {
  imageUris?: string[];
};

const OCCASIONS: Occasion[] = [
  'everyday',
  'work',
  'evening',
  'wedding',
  'travel',
  'sport',
  'street',
  'cafe',
];

const OCCASION_ICONS: Record<
  Occasion,
  keyof typeof Ionicons.glyphMap
> = {
  everyday: 'sunny-outline',
  work: 'briefcase-outline',
  evening: 'moon-outline',
  wedding: 'sparkles-outline',
  travel: 'airplane-outline',
  sport: 'fitness-outline',
  street: 'flash-outline',
  cafe: 'cafe-outline',
};

const PALETTE = [
  '#E6DFD2',
  '#C08E52',
  '#6B7050',
  '#5A6270',
  '#2C2E33',
  '#C4402F',
  '#8E4A2A',
  '#B7BCC1',
];

export default function Studio() {
  const source = useDataSource();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const prefs = useSession((s) => s.prefs);
  const toast = useToast();

  const chatScroll = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [draft, setDraft] = useState('');
  const [occasion, setOccasion] =
    useState<Occasion>('everyday');

  const [budget, setBudget] = useState(
    String(prefs?.budget_max ?? 100000),
  );

  const [universe, setUniverse] =
    useState<Universe>('CALM');

  const [paletteSel, setPaletteSel] =
    useState<string[]>([]);

  const [images, setImages] = useState<string[]>([]);
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);
  const [last, setLast] = useState<StudioResult | null>(
    null,
  );

  const [showSettings, setShowSettings] = useState(false);

  const run = useMutation({
    mutationFn: async (request: {
      text: string;
      images: string[];
      universe: Universe;
      occasion: Occasion;
      budget: string;
      palette: string[];
    }) => {
      return source.runStudio({
        occasion: request.occasion,
        budget: Number(request.budget) || 50000,
        currency: 'DZD',
        universes: [request.universe],
        palette: request.palette,
        note: request.text,
        image_uris: request.images,
      });
    },

    onSuccess: (result, request) => {
      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: request.text.trim() || 'Please analyze this image.',
        imageUris: request.images,
        created_at: now,
      };

      const assistantMessages = result.messages.filter(
        (message) => message.role !== 'user',
      );

      setMessages((current) => [
        ...current,
        userMessage,
        ...assistantMessages,
      ]);

      setLast(result);
      setDraft('');
      setImages([]);

      if (result.degraded_reason) {
        toast.show(t('studio.degraded'));
      }

      requestAnimationFrame(() => {
        chatScroll.current?.scrollToEnd({
          animated: true,
        });
      });
    },

    onError: () => {
      toast.show(t('common.error'));
    },
  });

  useEffect(() => {
    if (!run.isPending) return;

    const frame = requestAnimationFrame(() => {
      chatScroll.current?.scrollToEnd({
        animated: true,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [run.isPending, messages.length]);

  const sendMessage = () => {
    const text = draft.trim();

    if (run.isPending) return;

    if (!text && images.length === 0) return;

    run.mutate({
      text,
      images: [...images],
      universe,
      occasion,
      budget,
      palette: [...paletteSel],
    });
  };

  const pickImage = async () => {
    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: 4,
          quality: 0.7,
        });

      if (result.canceled) return;

      const selected = result.assets
        .map((asset) => asset.uri)
        .filter(Boolean);

      setImages((current) =>
        [...current, ...selected].slice(0, 4),
      );
    } catch {
      toast.show(t('common.error'));
    }
  };

  const removeImage = (uri: string) => {
    setImages((current) =>
      current.filter((item) => item !== uri),
    );
  };

  const toggleColor = (color: string) => {
    setPaletteSel((current) =>
      current.includes(color)
        ? current.filter((item) => item !== color)
        : [...current, color],
    );
  };

  const accent =
    universe === 'CALM' ? tokens.calm : tokens.chaos;

  return (
    <Screen
      insetTop
      insetBottom
      style={{
        paddingHorizontal: 0,
        paddingTop: 0,
        backgroundColor: tokens.bg,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: tokens.border,
              backgroundColor: tokens.bg,
            },
          ]}
        >
          <View style={styles.brand}>
            <View
              style={[
                styles.brandIcon,
                {
                  borderColor: accent,
                  backgroundColor: tokens.surface,
                },
              ]}
            >
              <Ionicons
                name="finger-print-outline"
                size={24}
                color={accent}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.brandTitle}>
                <Text
                  variant="title"
                  style={{ letterSpacing: 2 }}
                >
                  ATHR
                </Text>

                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: tokens.success },
                  ]}
                />
              </View>

              <Text variant="caption" muted>
                WASM · Personal AI Stylist
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Style settings"
              onPress={() =>
                setShowSettings((current) => !current)
              }
              hitSlop={10}
              style={[
                styles.settingsButton,
                {
                  borderColor: tokens.border,
                  backgroundColor: showSettings
                    ? tokens.surface
                    : 'transparent',
                },
              ]}
            >
              <Ionicons
                name="options-outline"
                size={21}
                color={tokens.text}
              />
            </Pressable>
          </View>

          {/* Compact CALM / CHAOS selector */}
          <View
            style={[
              styles.universeBar,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            {(['CALM', 'CHAOS'] as Universe[]).map(
              (item) => {
                const selected = universe === item;
                const color =
                  item === 'CALM'
                    ? tokens.calm
                    : tokens.chaos;

                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setUniverse(item)}
                    style={[
                      styles.universeOption,
                      {
                        backgroundColor: selected
                          ? color + '20'
                          : 'transparent',
                        borderColor: selected
                          ? color
                          : 'transparent',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.universeDot,
                        { backgroundColor: color },
                      ]}
                    />

                    <Text
                      variant="caption"
                      style={{
                        color: selected
                          ? color
                          : tokens.textMuted,
                        fontWeight: '800',
                        letterSpacing: 1,
                      }}
                    >
                      {item}
                    </Text>

                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={color}
                      />
                    ) : null}
                  </Pressable>
                );
              },
            )}
          </View>
        </View>

        {/* Optional settings */}
        {showSettings ? (
          <View
            style={[
              styles.settingsPanel,
              {
                backgroundColor: tokens.surface,
                borderBottomColor: tokens.border,
              },
            ]}
          >
            <Text
              variant="caption"
              muted
              style={{ marginBottom: spacing.sm }}
            >
              {t('studio.occasion')}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {OCCASIONS.map((item) => {
                const selected = occasion === item;

                return (
                  <Pressable
                    key={item}
                    onPress={() => setOccasion(item)}
                    style={[
                      styles.occasionChip,
                      {
                        borderColor: selected
                          ? accent
                          : tokens.border,
                        backgroundColor: selected
                          ? accent + '20'
                          : tokens.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={OCCASION_ICONS[item]}
                      size={15}
                      color={
                        selected ? accent : tokens.textMuted
                      }
                    />

                    <Text
                      variant="caption"
                      style={{
                        color: selected
                          ? tokens.text
                          : tokens.textMuted,
                      }}
                    >
                      {t(`occ.${item}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text
              variant="caption"
              muted
              style={{
                marginTop: spacing.md,
                marginBottom: spacing.xs,
              }}
            >
              {t('studio.budget')} · DZD
            </Text>

            <TextInput
              value={budget}
              onChangeText={(value) =>
                setBudget(value.replace(/[^0-9]/g, ''))
              }
              keyboardType="number-pad"
              placeholder="100000"
              placeholderTextColor={tokens.textFaint}
              selectionColor={accent}
              style={[
                styles.budgetInput,
                {
                  color: tokens.text,
                  borderColor: tokens.border,
                  backgroundColor: tokens.bg,
                },
              ]}
            />

            <Text
              variant="caption"
              muted
              style={{
                marginTop: spacing.md,
                marginBottom: spacing.sm,
              }}
            >
              {t('studio.palette')}
            </Text>

            <View style={styles.paletteRow}>
              {PALETTE.map((color) => {
                const selected = paletteSel.includes(color);

                return (
                  <Pressable
                    key={color}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Color ${color}`}
                    onPress={() => toggleColor(color)}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: color,
                        borderColor: selected
                          ? accent
                          : tokens.border,
                        borderWidth: selected ? 3 : 1,
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={
                          color === '#E6DFD2' ||
                          color === '#B7BCC1'
                            ? '#111111'
                            : '#FFFFFF'
                        }
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Chat */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Faint ATHR watermark */}
          <View
            pointerEvents="none"
            style={styles.watermark}
          >
            <Text
              variant="display"
              style={{
                fontSize: 58,
                letterSpacing: 8,
                color: tokens.text,
                opacity: 0.035,
                fontWeight: '900',
              }}
            >
              ATHR
            </Text>
            <View
              style={{
                width: 100,
                height: 1,
                backgroundColor: tokens.text,
                opacity: 0.06,
                marginTop: spacing.sm,
              }}
            />
          </View>

          <ScrollView
            ref={chatScroll}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xl,
              paddingBottom: spacing.xl,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              chatScroll.current?.scrollToEnd({
                animated: true,
              })
            }
          >
            {messages.length === 0 ? (
              <View style={styles.welcome}>
                <View
                  style={[
                    styles.welcomeIcon,
                    {
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={30}
                    color={accent}
                  />
                </View>

                <Text
                  variant="display"
                  style={{
                    fontSize: 29,
                    textAlign: 'center',
                    marginTop: spacing.lg,
                    marginBottom: spacing.sm,
                  }}
                >
                  What remains,
                  {'\n'}
                  becomes ATHR.
                </Text>

                <Text
                  variant="small"
                  muted
                  align="center"
                  style={{
                    lineHeight: 23,
                    maxWidth: 290,
                  }}
                >
                  {t('studio.subtitle')}
                </Text>

                <View
                  style={[
                    styles.welcomeHint,
                    {
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={17}
                    color={accent}
                  />
                  <Text
                    variant="small"
                    muted
                    style={{ flex: 1 }}
                  >
                    Ask for an outfit, share a clothing photo,
                    or tell WASM what you want to wear.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ gap: spacing.xl }}>
                {messages.map((message) => {
                  const isUser = message.role === 'user';

                  return (
                    <View
                      key={message.id}
                      style={{
                        alignSelf: isUser
                          ? 'flex-end'
                          : 'stretch',
                        maxWidth: isUser ? '90%' : '100%',
                        flexDirection: isUser ? 'row' : 'row',
                        justifyContent: isUser
                          ? 'flex-end'
                          : 'flex-start',
                        gap: spacing.sm,
                      }}
                    >
                      {!isUser ? (
                        <View
                          style={[
                            styles.assistantIcon,
                            {
                              backgroundColor: tokens.surface,
                              borderColor: tokens.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="finger-print-outline"
                            size={17}
                            color={accent}
                          />
                        </View>
                      ) : null}

                      <View
                        style={{
                          flexShrink: 1,
                          gap: spacing.xs,
                        }}
                      >
                        <Text
                          variant="caption"
                          style={{
                            color: isUser
                              ? tokens.textMuted
                              : accent,
                            fontWeight: '800',
                            letterSpacing: 1,
                            textAlign: isUser
                              ? 'right'
                              : 'left',
                          }}
                        >
                          {isUser ? 'YOU' : 'WASM'}
                        </Text>

                        <View
                          style={[
                            styles.messageBubble,
                 