
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ProductRow } from '../../src/components/cards';
import {
  Badge,
  Header,
  Screen,
  Text,
  useToast,
} from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type {
  Occasion,
  StudioMessage,
  StudioResult,
  Universe,
  WasmChatImage,
} from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing } from '../../src/theme/tokens';

type ChatMessage = StudioMessage & {
  imageUris?: string[];
};

type ChatRequest = {
  text: string;
  images: string[];
  imagePayloads: WasmChatImage[];
  occasion: Occasion;
  budget: string;
  universe: Universe;
  palette: string[];
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
  const prefs = useSession((state) => state.prefs);
  const toast = useToast();

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  React.useEffect(() => {
  const subscription = Keyboard.addListener(
    'keyboardDidShow',
    () => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({
          animated: true,
        });
      });
    },
  );

  return () => {
    subscription.remove();
  };
}, []);

  const [draft, setDraft] = useState('');
  const [occasion, setOccasion] =
    useState<Occasion>('everyday');
  const [budget, setBudget] = useState(
    String(prefs?.budget_max ?? 100000),
  );
  const [universe, setUniverse] =
    useState<Universe>('CALM');
  const [palette, setPalette] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [imagePayloads, setImagePayloads] = useState<WasmChatImage[]>([]);
  
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [messagesLoadedFor, setMessagesLoadedFor] = useState<string | null>(null);
const [last, setLast] = useState<StudioResult | null>(null);
const [showSettings, setShowSettings] = useState(false);

const sessionUserId = useSession(
  (state) => state.session?.user_id ?? 'guest',
);
const storageKey = `@athr/wasm-chat/v1/${sessionUserId}`;

React.useEffect(() => {
  let active = true;

  setMessagesLoadedFor(null);
  setMessages([]);

  AsyncStorage.getItem(storageKey)
    .then((stored) => {
      if (!active) return;

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          const restored = parsed.filter(
            (item): item is ChatMessage => {
              if (!item || typeof item !== 'object') return false;

              const message = item as Partial<ChatMessage>;

              return (
                typeof message.id === 'string' &&
                (message.role === 'user' ||
                  message.role === 'assistant') &&
                typeof message.content === 'string' &&
                typeof message.created_at === 'string'
              );
            },
          );

          setMessages(restored.slice(-200));
        }
      }

      setMessagesLoadedFor(storageKey);
    })
    .catch(() => {
      // Do not overwrite saved data if loading fails.
    });

  return () => {
    active = false;
  };
}, [storageKey]);

React.useEffect(() => {
  if (messagesLoadedFor !== storageKey) return;

  AsyncStorage.setItem(
    storageKey,
    JSON.stringify(messages.slice(-200)),
  ).catch(() => {
    // A storage error must not interrupt the chat.
  });
}, [messages, messagesLoadedFor, storageKey]);

  const run = useMutation({
    mutationFn: async (request: ChatRequest) => {

      const history = messages
        .filter(
          (item) =>
            item.role === 'user' ||
            item.role === 'assistant',
        )
        .slice(-12)
        .map((item) => ({
          role: item.role as 'user' | 'assistant',
          content: item.content,
        }));

      return source.runWasmChat({
        message: request.text,
        history,
        universe: request.universe,
        images: request.imagePayloads,
      });
    },

    onSuccess: (result, request) => {
      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: request.text,
        imageUris: request.images,
        created_at: now,
      };

      const assistantMessages = result.messages.filter(
        (message) => message.role !== 'user',
      );

     setMessages((current) =>
  [
    ...current,
    userMessage,
    ...assistantMessages,
  ].slice(-200),
);

      setLast(result);
      setDraft('');
      setImages([]);
      setImagePayloads([]);

      if (result.degraded_reason) {
        toast.show(t('studio.degraded'));
      }

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },

    onError: (error) => {
      toast.show(
        error instanceof Error
          ? error.message
          : t('common.error'),
      );
    },
  });

  const sendMessage = () => {
    const text = draft.trim();

    if (run.isPending) return;
    if (!text && images.length === 0) return;

    run.mutate({
      text,
      images: [...images],
      imagePayloads: [...imagePayloads],
      occasion,
      budget,
      universe,
      palette: [...palette],
    });
  };

  const pickImage = async () => {
    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: false,
          quality: 0.3,
          base64: true,
        });

      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset?.uri;
      if (uri && asset.base64) {
        const mimeType = asset.mimeType?.toLowerCase();
        const supportedMime: WasmChatImage['mimeType'] =
          mimeType === 'image/png' || mimeType === 'image/webp'
            ? mimeType
            : 'image/jpeg';
        const payload = {
          mimeType: supportedMime,
          base64: asset.base64,
        };
        const maxImageCharacters = 1_500_000;
        const currentCharacters = imagePayloads.reduce(
          (total, image) => total + image.base64.length,
          0,
        );

        // Keep the JSON request comfortably below common edge-function body
        // limits. The picker also compresses images before base64 encoding.
        if (
          payload.base64.length > maxImageCharacters ||
          currentCharacters + payload.base64.length > maxImageCharacters
        ) {
          toast.show(
            'This photo is too large to send. Choose a smaller image and try again.',
          );
          return;
        }

        setImages((current) => [...current, uri].slice(-4));
        setImagePayloads((current) => [
          ...current,
          payload,
        ].slice(-4));
      } else {
        toast.show('Could not read this image. Please choose another photo.');
      }
    } catch {
      toast.show(t('common.error'));
    }
  };

  const toggleColor = (color: string) => {
    setPalette((current) =>
      current.includes(color)
        ? current.filter((item) => item !== color)
        : [...current, color],
    );
  };

  const accent =
    universe === 'CALM' ? tokens.calm : tokens.chaos;

  return (
    <Screen insetBottom>
      <View style={styles.root}>
        <Header
          title="WASM"
          subtitle={t('studio.subtitle')}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.conversation,
              { paddingHorizontal: spacing.lg },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* WASM identity */}
            <View
              style={[
                styles.identity,
                {
                  backgroundColor: tokens.bgElevated,
                  borderColor: tokens.border,
                },
              ]}
            >
              <View style={styles.identityTop}>
                <View style={styles.brandLine}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: tokens.accent },
                    ]}
                  />
                  <Text
                    variant="caption"
                    style={{
                      color: tokens.accent,
                      fontWeight: '800',
                      letterSpacing: 1.5,
                    }}
                  >
                    ATHR INTELLIGENCE
                  </Text>
                </View>

                <Badge label="WASM AI" color={tokens.accent} />
              </View>

              <Text
                variant="small"
                style={[
                  styles.heroTitle,
                  { color: tokens.text },
                ]}
              >
                Your style.
                {'\n'}
                Your identity.
              </Text>

              <Text
                variant="small"
                muted
                style={styles.heroDescription}
              >
                Talk to WASM about your clothes, your budget,
                and the look you want to create.
              </Text>

              <View style={styles.identityFooter}>
                <Text variant="caption" muted>
                  CALM / CHAOS
                </Text>
                <Text variant="caption" muted>
                  PRICES IN DZD
                </Text>
              </View>
            </View>

            {/* Welcome message */}
            {messages.length === 0 && (
              <View style={styles.welcomeRow}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={20}
                    color={tokens.accent}
                  />
                </View>

                <View
                  style={[
                    styles.welcomeBubble,
                    {
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: tokens.accent,
                      fontWeight: '800',
                      marginBottom: spacing.xs,
                    }}
                  >
                    WASM
                  </Text>

                  <Text
                    variant="small"
                    style={{
                      color: tokens.text,
                      lineHeight: 22,
                    }}
                  >
                    Tell me what you want to wear, describe
                    your style, or attach a clothing photo.
                    I will use your selected preferences to
                    help create a look.
                  </Text>

                  <View style={styles.suggestions}>
                    {[
                      'Build me a casual outfit',
                      'Help me style black trousers',
                      'Suggest a look on a budget',
                    ].map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        onPress={() => setDraft(suggestion)}
                        style={[
                          styles.suggestion,
                          { borderColor: tokens.border },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={{ color: tokens.text }}
                        >
                          {suggestion}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Conversation */}
            {messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    {
                      justifyContent: isUser
                        ? 'flex-end'
                        : 'flex-start',
                    },
                  ]}
                >
                  {!isUser && (
                    <View
                      style={[
                        styles.smallAvatar,
                        {
                          backgroundColor: tokens.surface,
                          borderColor: tokens.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={15}
                        color={tokens.accent}
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      {
                        backgroundColor: isUser
                          ? tokens.bgElevated
                          : tokens.surface,
                        borderColor: tokens.border,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: isUser
                          ? tokens.textMuted
                          : tokens.accent,
                        fontWeight: '800',
                        marginBottom: spacing.xs,
                        letterSpacing: 0.8,
                      }}
                    >
                      {isUser ? 'YOU' : 'WASM'}
                    </Text>

                    {message.imageUris?.map((uri, index) => (
                      <Image
                        key={`${uri}_${index}`}
                        source={{ uri }}
                        resizeMode="cover"
                        style={styles.messageImage}
                      />
                    ))}

                    <Text
                      variant="small"
                      style={{
                        color: tokens.text,
                        lineHeight: 22,
                      }}
                    >
                      {message.content}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Thinking indicator */}
            {run.isPending && (
              <View style={styles.thinkingRow}>
                <View
                  style={[
                    styles.smallAvatar,
                    {
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={15}
                    color={tokens.accent}
                  />
                </View>
                <View
                  style={[
                    styles.thinkingBubble,
                    {
                      backgroundColor: tokens.surface,
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <Text variant="small" muted>
                    WASM is thinking…
                  </Text>
                </View>
              </View>
            )}

            {/* Result metadata and product recommendations */}
            {last && (
              <View style={styles.results}>
                <Text
                  variant="caption"
                  muted
                  style={{ marginBottom: spacing.xs }}
                >
                  RESPONSE SOURCE
                </Text>

                <View style={styles.resultBadges}>
                  <Badge
                    label={
                      last.engine === 'cloud-ai'
                        ? t('studio.cloud')
                        : t('studio.local')
                    }
                    color={
                      last.engine === 'cloud-ai'
                        ? tokens.info
                        : tokens.warning
                    }
                  />

                  {last.model ? (
                    <Badge
                      label={last.model}
                      color={tokens.textFaint}
                    />
                  ) : null}
                </View>

                {(last.product_ids ?? []).length > 0 && (
                  <Text
                    variant="small"
                    style={{
                      color: tokens.text,
                      fontWeight: '800',
                      marginTop: spacing.md,
                      marginBottom: spacing.sm,
                    }}
                  >
                    Recommended for you
                  </Text>
                )}

                {(last.product_ids ?? [])
                  .slice(0, 6)
                  .map((id) => (
                    <ProductRowFromId key={id} id={id} />
                  ))}
              </View>
            )}

            <View style={{ height: spacing.md }} />
          </ScrollView>

          {/* Preferences drawer */}
          {showSettings && (
            <View
              style={[
                styles.settingsPanel,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                },
              ]}
            >
              <View style={styles.settingsHeading}>
                <Text
                  variant="small"
                  style={{
                    color: tokens.text,
                    fontWeight: '800',
                  }}
                >
                  Style preferences
                </Text>

                <Pressable
                  onPress={() => setShowSettings(false)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={tokens.textMuted}
                  />
                </Pressable>
              </View>

              <Text
                variant="caption"
                muted
                style={styles.sectionLabel}
              >
                OCCASION
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <View style={styles.chipRow}>
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
                              ? tokens.accent
                              : tokens.border,
                            backgroundColor: selected
                              ? tokens.bgElevated
                              : 'transparent',
                          },
                        ]}
                      >
                        <Ionicons
                          name={OCCASION_ICONS[item]}
                          size={15}
                          color={
                            selected
                              ? tokens.accent
                              : tokens.textMuted
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
                </View>
              </ScrollView>

              <Text
                variant="caption"
                muted
                style={styles.sectionLabel}
              >
                UNIVERSE
              </Text>

              <View style={styles.universeRow}>
                {(['CALM', 'CHAOS'] as Universe[]).map((item) => {
                  const selected = universe === item;
                  const color =
                    item === 'CALM' ? tokens.calm : tokens.chaos;

                  return (
                    <Pressable
                      key={item}
                      onPress={() => setUniverse(item)}
                      style={[
                        styles.universeButton,
                        {
                          borderColor: selected
                            ? color
                            : tokens.border,
                          backgroundColor: selected
                            ? tokens.bgElevated
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
                        variant="small"
                        style={{
                          color: tokens.text,
                          fontWeight: '800',
                        }}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text
                variant="caption"
                muted
                style={styles.sectionLabel}
              >
                MAXIMUM BUDGET · DZD
              </Text>

              <TextInput
                value={budget}
                onChangeText={(value) =>
                  setBudget(value.replace(/[^0-9]/g, ''))
                }
                keyboardType="number-pad"
                placeholder="100000"
                placeholderTextColor={tokens.textMuted}
                selectionColor={tokens.accent}
                style={[
                  styles.budgetInput,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.bgElevated,
                  },
                ]}
              />

              <Text
                variant="caption"
                muted
                style={styles.sectionLabel}
              >
                COLOR PALETTE
              </Text>

              <View style={styles.paletteRow}>
                {PALETTE.map((color) => {
                  const selected = palette.includes(color);

                  return (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={`Palette ${color}`}
                      accessibilityState={{ selected }}
                      onPress={() => toggleColor(color)}
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: color,
                          borderColor: selected
                            ? tokens.accent
                            : tokens.border,
                          borderWidth: selected ? 3 : 1,
                        },
                      ]}
                    >
                      {selected && (
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
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Attached image preview */}
          {images.length > 0 && (
            <View
              style={[
                styles.attachmentRow,
                { borderColor: tokens.border },
              ]}
            >
              {images.map((uri, index) => (
                <View key={`${uri}_${index}`} style={styles.preview}>
                  <Image
                    source={{ uri }}
                    style={styles.previewImage}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove attached image"
                    onPress={() => {
                      setImages((current) =>
                        current.filter((_, i) => i !== index),
                      );
                      setImagePayloads((current) =>
                        current.filter((_, i) => i !== index),
                      );
                    }}
                    style={[
                      styles.removeImage,
                      { backgroundColor: tokens.bgElevated },
                    ]}
                  >
                    <Ionicons
                      name="close"
                      size={14}
                      color={tokens.text}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Chat composer */}
          <View
            style={[
              styles.composer,
              {
                backgroundColor: tokens.bgElevated,
                borderColor: tokens.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach clothing image"
              onPress={pickImage}
              disabled={run.isPending}
              style={styles.composerIcon}
            >
              <Ionicons
                name="add-circle-outline"
                size={25}
                color={tokens.textMuted}
              />
            </Pressable>

            <TextInput
  ref={inputRef}
  value={draft}
  onChangeText={setDraft}
  onFocus={() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    });
  }}
  placeholder="Message WASM…"
  placeholderTextColor={tokens.textMuted}
  selectionColor={tokens.accent}
  multiline
  editable={!run.isPending}
  onSubmitEditing={sendMessage}
  returnKeyType="send"
  blurOnSubmit={false}
  style={[
    styles.composerInput,
    { color: tokens.text },
  ]}
/>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Style preferences"
              onPress={() => setShowSettings((value) => !value)}
              style={styles.composerIcon}
            >
              <Ionicons
                name="options-outline"
                size={22}
                color={showSettings ? tokens.accent : tokens.textMuted}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: run.isPending }}
              onPress={sendMessage}
              disabled={
                run.isPending ||
                (!draft.trim() && images.length === 0)
              }
              style={[
                styles.sendButton,
                {
                  backgroundColor: accent,
                  opacity:
                    run.isPending ||
                    (!draft.trim() && images.length === 0)
                      ? 0.45
                      : 1,
                },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <Text
            variant="caption"
            muted
            style={styles.disclaimer}
          >
            WASM · ATHR · AI responses may use local fallback
          </Text>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

function ProductRowFromId({ id }: { id: string }) {
  const source = useDataSource();
  const [product, setProduct] = useState<
    import('../../src/data/types').Product | null
  >(null);

  React.useEffect(() => {
    let active = true;

    source
      .getProduct(id)
      .then((value) => {
        if (active) setProduct(value);
      })
      .catch(() => {
        if (active) setProduct(null);
      });

    return () => {
      active = false;
    };
  }, [id, source]);

  if (!product) return null;

  return <ProductRow product={product} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  conversation: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  identity: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  heroDescription: {
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  identityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeBubble: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    padding: spacing.md,
  },
  suggestions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  suggestion: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '88%',
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  thinkingBubble: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  results: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  resultBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  settingsPanel: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  settingsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  occasionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  universeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  universeButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 14,
  },
  universeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  budgetInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  preview: {
    position: 'relative',
  },
  previewImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  removeImage: {
    position: 'absolute',
    right: -5,
    top: -5,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  composerIcon: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    maxHeight: 112,
    minHeight: 40,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: spacing.xs,
    fontSize: 15,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  disclaimer: {
    textAlign: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
