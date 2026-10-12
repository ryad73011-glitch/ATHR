import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Share, View, useWindowDimensions } from 'react-native';

import { LookCard, UniverseBadge } from '../../src/components/cards';
import { LookHero } from '../../src/components/Cover';
import { Avatar, Badge, Button, Card, Divider, ErrorState, Input, Screen, Skeleton, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { useLocale } from '../../src/i18n';
import { formatMoney, timeAgo } from '../../src/lib/format';
import { spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function LookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const source = useDataSource();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');

  const look = useQuery({ queryKey: ['look', id], queryFn: () => source.getLook(id!) });
  const similar = useQuery({ queryKey: ['similar', id], queryFn: () => source.similarLooks(id!), enabled: !!id });
  const comments = useQuery({ queryKey: ['comments', id], queryFn: () => source.listComments(id!) });

  useEffect(() => {
    if (id) source.isSaved(id).then(setSaved);
  }, [id, source]);

  const save = useMutation({
    mutationFn: () => source.toggleSaveLook(id!),
    onSuccess: (now) => {
      setSaved(now);
      toast.show(now ? t('common.saved') : t('common.save'));
      qc.invalidateQueries({ queryKey: ['saved'] });
    },
  });

  const addComment = useMutation({
    mutationFn: () => source.addComment(id!, comment),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['comments', id] });
    },
  });

  const share = async () => {
    if (!look.data) return;
    await Share.share({ message: `${look.data.title} — ${t('looks.totalCost')}: ${formatMoney(look.data.total_cost, look.data.currency)} · ATHR أثر` });
  };

  if (look.isLoading) {
    return (
      <Screen>
        <Skeleton width={'100%' as never} height={320} />
        <Skeleton width={200} height={28} style={{ marginTop: spacing.md }} />
      </Screen>
    );
  }
  if (look.isError || !look.data) return <Screen><ErrorState onRetry={() => look.refetch()} /></Screen>;

  const l = look.data;

  return (
    <Screen scroll insetBottom>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={tokens.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Pressable onPress={share} hitSlop={10}>
            <Ionicons name="share-outline" size={22} color={tokens.text} />
          </Pressable>
          <Pressable onPress={() => save.mutate()} hitSlop={10}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? tokens.accent : tokens.text} />
          </Pressable>
        </View>
      </View>

      <LookHero heroImage={l.hero_image} seed={l.id} paletteHex={l.palette} universe={l.universe} width={'100%' as never} height={320} borderRadius={radius.xl} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg }}>
        <Text variant="headline">{l.title}</Text>
        <UniverseBadge universe={l.universe} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm }}>
        <Avatar name={l.author_handle} size={28} />
        <Text variant="small" muted>
          @{l.author_handle} · {timeAgo(l.created_at, locale)}
        </Text>
      </View>
      {l.editorial_note ? (
        <Text variant="body" muted style={{ marginBottom: spacing.md }}>
          {l.editorial_note}
        </Text>
      ) : null}

      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text variant="caption" muted>
          {t('looks.totalCost')}
        </Text>
        <Text variant="display" accent>
          {formatMoney(l.total_cost, l.currency)}
        </Text>
        <Text variant="caption" faint>
          {l.items.length} {t('common.items')}
        </Text>
      </Card>

      <Text variant="title" style={{ marginBottom: spacing.sm }}>
        {t('looks.items')}
      </Text>
      {l.items.map((item) => (
        <Card key={item.product_id} style={{ padding: spacing.md, marginBottom: spacing.sm }}>
          <Pressable onPress={() => router.push(`/product/${item.product_id}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.sm, backgroundColor: item.color }} />
              <View style={{ flex: 1 }}>
                <Text variant="body" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" faint>
                  {item.role} · {item.brand}
                </Text>
              </View>
              <Text variant="small" accent>
                {formatMoney(item.price, item.currency)}
              </Text>
            </View>
          </Pressable>
        </Card>
      ))}

      <View style={{ flexDirection: 'row', gap: spacing.lg, marginVertical: spacing.md }}>
        <Text variant="small" muted>
          ♥ {l.likes}
        </Text>
        <Text variant="small" muted>
          🔖 {l.saves}
        </Text>
        <Text variant="small" muted>
          💬 {comments.data?.length ?? l.comment_count}
        </Text>
      </View>

      <Divider />
      <Text variant="title" style={{ marginBottom: spacing.sm }}>
        {t('looks.comments')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Input placeholder={t('looks.addComment')} value={comment} onChangeText={setComment} style={{ marginBottom: 0 }} />
        </View>
        <Button label="➤" variant="outline" small disabled={!comment.trim()} loading={addComment.isPending} onPress={() => addComment.mutate()} />
      </View>
      {(comments.data ?? []).map((c) => (
        <View key={c.id} style={{ marginBottom: spacing.md }}>
          <Text variant="small" accent>
            @{c.author_handle} <Text variant="caption" faint>{timeAgo(c.created_at, locale)}</Text>
          </Text>
          <Text variant="small">{c.body}</Text>
        </View>
      ))}

      {similar.data?.length ? (
        <>
          <Text variant="title" style={{ marginVertical: spacing.sm }}>
            {t('looks.similar')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
            {similar.data.map((s) => (
              <LookCard key={s.id} look={s} width={160} height={190} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
