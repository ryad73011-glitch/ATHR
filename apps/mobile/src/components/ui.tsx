import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initials } from '../lib/format';
import { spacing, radius, fontSize, lineHeight, duration } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useLocale } from '../i18n';

/* ------------------------------------------------------------------ Text */

type TextVariant = 'display' | 'headline' | 'title' | 'lead' | 'body' | 'small' | 'caption';

export function Text({
  variant = 'body',
  muted,
  faint,
  accent,
  align,
  style,
  numberOfLines,
  onPress,
  children,
}: {
  variant?: TextVariant;
  muted?: boolean;
  faint?: boolean;
  accent?: boolean;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  style?: object;
  numberOfLines?: number;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const { tokens, fonts } = useTheme();
  const sizes: Record<TextVariant, number> = {
    display: fontSize.display,
    headline: fontSize.headline,
    title: fontSize.title,
    lead: fontSize.lead,
    body: fontSize.body,
    small: fontSize.small,
    caption: fontSize.caption,
  };
  const family =
    variant === 'display' || variant === 'headline' ? fonts.display : variant === 'title' ? fonts.sansBold : fonts.sans;
  const color = accent ? tokens.accent : faint ? tokens.textFaint : muted ? tokens.textMuted : tokens.text;
  const textStyle = [
    { color, fontSize: sizes[variant], fontFamily: family, lineHeight: sizes[variant] * lineHeight.snug },
    variant === 'display' || variant === 'headline' ? { letterSpacing: 0.5 } : { letterSpacing: 0.1 },
    align ? { textAlign: align } : null,
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        <RNText numberOfLines={numberOfLines} style={textStyle}>
          {children}
        </RNText>
      </Pressable>
    );
  }
  return (
    <RNText numberOfLines={numberOfLines} style={textStyle}>
      {children}
    </RNText>
  );
}

/* --------------------------------------------------------------- Screen */

export function Screen({
  children,
  scroll,
  style,
  insetTop = true,
  insetBottom = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  insetTop?: boolean;
  insetBottom?: boolean;
}) {
  const { tokens } = useTheme();
  const inner = <View style={[styles.screenInner, style]}>{children}</View>;
  const edges: Array<'top' | 'bottom'> = [];
  if (insetTop) edges.push('top');
  if (insetBottom) edges.push('bottom');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, flex: 1 },
});

/* --------------------------------------------------------------- Header */

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={{ marginEnd: spacing.sm }}>
            <Ionicons name="arrow-back" size={22} color={tokens.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text variant="title">{title}</Text>
          {subtitle ? (
            <Text variant="caption" faint>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

/* --------------------------------------------------------------- Button */

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  full,
  small,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  full?: boolean;
  small?: boolean;
}) {
  const { tokens, fonts } = useTheme();
  const bg = variant === 'primary' ? tokens.accent : variant === 'danger' ? tokens.danger : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? tokens.textOnAccent : variant === 'outline' ? tokens.text : tokens.textMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingVertical: small ? spacing.sm : spacing.md,
          paddingHorizontal: spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: tokens.borderStrong,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={small ? 16 : 18} color={fg} />
      ) : null}
      <RNText style={{ color: fg, fontFamily: fonts.sansBold, fontSize: small ? fontSize.small : fontSize.body }}>{label}</RNText>
    </Pressable>
  );
}

/* ----------------------------------------------------------------- Chip */

export function Chip({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  const { tokens, fonts } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? (color ?? tokens.accent) : tokens.border,
        backgroundColor: selected ? (color ?? tokens.accent) + '22' : 'transparent',
      }}
    >
      <RNText style={{ color: selected ? (color ?? tokens.accent) : tokens.textMuted, fontFamily: fonts.sansMedium, fontSize: fontSize.small }}>{label}</RNText>
    </Pressable>
  );
}

/* ---------------------------------------------------------------- Input */

export function Input({ label, ...rest }: { label?: string } & TextInputProps) {
  const { tokens, fonts } = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <RNText style={{ color: tokens.textMuted, fontFamily: fonts.sansMedium, fontSize: fontSize.small, marginBottom: spacing.xs }}>
          {label}
        </RNText>
      ) : null}
      <TextInput
        placeholderTextColor={tokens.textFaint}
        {...rest}
        style={[
          {
            backgroundColor: tokens.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: tokens.border,
            color: tokens.text,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            fontFamily: fonts.sans,
            fontSize: fontSize.body,
          },
          rest.style,
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------ Segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { tokens, fonts } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: tokens.surface, borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: tokens.border }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: active ? (o.color ?? tokens.accent) : 'transparent',
              alignItems: 'center',
            }}
          >
            <RNText style={{ color: active ? tokens.textOnAccent : tokens.textMuted, fontFamily: fonts.sansBold, fontSize: fontSize.small }}>
              {o.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ----------------------------------------------------------------- Card */

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const { tokens } = useTheme();
  const inner = (
    <View
      style={[
        { backgroundColor: tokens.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: tokens.border, overflow: 'hidden' },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

/* ------------------------------------------------------------- Skeleton */

export function Skeleton({ width, height, style }: { width?: number | string; height?: number; style?: ViewStyle }) {
  const { tokens } = useTheme();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(anim, { toValue: 1, duration: duration.slow, useNativeDriver: true }), Animated.timing(anim, { toValue: 0, duration: duration.slow, useNativeDriver: true })]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  return <Animated.View style={([{ width, height, borderRadius: radius.sm, backgroundColor: tokens.skeleton, opacity }, style] as unknown) as ViewStyle} />;
}

/* ------------------------------------------------------- Empty / Error */

export function EmptyState({ icon = 'sparkles-outline', title, body, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; body?: string; action?: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
      <Ionicons name={icon} size={40} color={tokens.textFaint} />
      <Text variant="lead" muted style={{ marginTop: spacing.md, textAlign: 'center' }}>
        {title}
      </Text>
      {body ? (
        <Text variant="small" faint style={{ marginTop: spacing.xs, textAlign: 'center' }}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title={message ?? t('common.error')}
      action={onRetry ? <Button label={t('common.retry')} variant="outline" onPress={onRetry} /> : undefined}
    />
  );
}

/* --------------------------------------------------------------- Avatar */

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const { tokens, fonts } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tokens.bgElevated,
        borderWidth: 1,
        borderColor: tokens.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <RNText style={{ color: tokens.accent, fontFamily: fonts.sansBold, fontSize: size * 0.38 }}>{initials(name || 'A')}</RNText>
    </View>
  );
}

/* ------------------------------------------------------------- VoteBar */

export function VoteBar({ leftPct, leftColor, rightColor, animated }: { leftPct: number; leftColor: string; rightColor: string; animated?: boolean }) {
  const { tokens } = useTheme();
  const [width] = useState(() => new Animated.Value(leftPct));
  useEffect(() => {
    Animated.timing(width, { toValue: leftPct, duration: duration.base, useNativeDriver: false }).start();
  }, [leftPct, width]);
  return (
    <View style={{ flexDirection: 'row', height: 6, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: tokens.surface }}>
      <Animated.View style={{ width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: leftColor }} />
      <View style={{ flex: 1, backgroundColor: rightColor }} />
    </View>
  );
}

/* ------------------------------------------------------------ Badge */

export function Badge({ label, color }: { label: string; color?: string }) {
  const { tokens, fonts } = useTheme();
  const c = color ?? tokens.accent;
  return (
    <View style={{ backgroundColor: c + '22', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
      <RNText style={{ color: c, fontFamily: fonts.sansBold, fontSize: fontSize.caption, letterSpacing: 0.6 }}>{label}</RNText>
    </View>
  );
}

/* -------------------------------------------------------------- Toast */

interface ToastItem {
  id: number;
  message: string;
}
const ToastContext = createContext<{ show: (m: string) => void }>({ show: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { tokens, fonts } = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={{ position: 'absolute', bottom: 90, alignSelf: 'center', gap: spacing.sm, zIndex: 60 }} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={{ backgroundColor: tokens.bgElevated, borderWidth: 1, borderColor: tokens.borderStrong, borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
            <RNText style={{ color: tokens.text, fontFamily: fonts.sansMedium, fontSize: fontSize.small }}>{t.message}</RNText>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ----------------------------------------------------------- Divider */

export function Divider() {
  const { tokens } = useTheme();
  return <View style={{ height: 1, backgroundColor: tokens.border, marginVertical: spacing.md }} />;
}

/* ------------------------------------------------------ SectionHeader */

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { t } = useLocale();
  const { tokens, fonts } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.md }}>
      <Text variant="title">{title}</Text>
      {action ? (
        <Pressable onPress={onAction}>
          <RNText style={{ color: tokens.accent, fontFamily: fonts.sansMedium, fontSize: fontSize.small }}>{action ?? t('common.seeAll')}</RNText>
        </Pressable>
      ) : null}
    </View>
  );
}
