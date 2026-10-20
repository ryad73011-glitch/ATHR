import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Header, Input, Screen, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function MerchantReviewsScreen() {
  const params = useLocalSearchParams<{ merchantId?: string }>();
  const merchantId = typeof params.merchantId === 'string' ? params.merchantId : '';
  const source = useDataSource();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { tokens } = useTheme();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const merchantQuery = useQuery({
    queryKey: ['merchant', merchantId],
    queryFn: () => source.getMerchant(merchantId),
    enabled: Boolean(merchantId),
  });
  const reviewsQuery = useQuery({
    queryKey: ['merchant-reviews', merchantId],
    queryFn: () => source.listMerchantReviews(merchantId),
    enabled: Boolean(merchantId),
  });
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: () => source.getSession() });
  const myReview = useMemo(
    () => (reviewsQuery.data ?? []).find((review) => review.user_id === sessionQuery.data?.user_id),
    [reviewsQuery.data, sessionQuery.data?.user_id],
  );

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment ?? '');
    }
  }, [myReview?.id, myReview?.rating, myReview?.comment]);

  const saveReview = useMutation({
    mutationFn: async () => {
      if (!sessionQuery.data) throw new Error('Sign in before rating a store.');
      if (!merchantQuery.data?.approved) throw new Error('Only approved stores can be rated.');
      return myReview
        ? source.updateMerchantReview(myReview.id, rating, comment)
        : source.addMerchantReview(merchantId, rating, comment);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['merchant-reviews', merchantId] }),
        qc.invalidateQueries({ queryKey: ['merchant', merchantId] }),
        qc.invalidateQueries({ queryKey: ['merchants'] }),
      ]);
      toast.show('Your rating has been saved');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Could not save rating'),
  });

  const merchant = merchantQuery.data;
  return (
    <Screen scroll insetBottom>
      <Header title="Store ratings" onBack={() => router.back()} />
      {merchantQuery.isLoading ? <Text muted>Loading store…</Text> : null}
      {!merchantQuery.isLoading && !merchant ? <Text muted>Store not found.</Text> : null}
      {merchant ? (
        <>
          <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
            <Text variant="title">{merchant.name}</Text>
            <Text variant="caption" muted>{merchant.city}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
              <Ionicons name="star" size={22} color="#E5A93D" />
              <Text variant="headline">{merchant.review_count ? merchant.rating.toFixed(1) : '—'}/5</Text>
              <Text variant="caption" muted>{merchant.review_count} {merchant.review_count === 1 ? 'rating' : 'ratings'}</Text>
            </View>
          </Card>

          {merchant.approved ? (
            <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
              <Text variant="title">{myReview ? 'Edit your rating' : 'Rate this store'}</Text>
              <Text variant="caption" muted style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
                Rate your experience honestly. One rating per account.
              </Text>
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: rating === value }}
                    accessibilityLabel={`${value} stars`}
                    onPress={() => setRating(value)}
                    hitSlop={8}
                  >
                    <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={32} color={value <= rating ? '#E5A93D' : tokens.textFaint} />
                  </Pressable>
                ))}
              </View>
              <Input label="Comment (optional)" value={comment} onChangeText={setComment} multiline numberOfLines={4} maxLength={1000} placeholder="How was the product and service?" />
              {!sessionQuery.data ? <Text variant="caption" muted style={{ marginBottom: spacing.md }}>Sign in to submit a rating.</Text> : null}
              <Button full label={myReview ? 'Update rating' : 'Submit rating'} loading={saveReview.isPending} disabled={!sessionQuery.data || saveReview.isPending} onPress={() => saveReview.mutate()} />
            </Card>
          ) : (
            <Text muted style={{ marginBottom: spacing.lg }}>This store must be approved before users can rate it.</Text>
          )}

          <Text variant="title" style={{ marginBottom: spacing.md }}>Customer reviews</Text>
          {reviewsQuery.isLoading ? <Text muted>Loading ratings…</Text> : null}
          {!reviewsQuery.isLoading && !(reviewsQuery.data?.length) ? (
            <Card style={{ padding: spacing.lg }}>
              <Text muted>No ratings yet. Be the first to share your experience.</Text>
            </Card>
          ) : null}
          {(reviewsQuery.data ?? []).map((review) => (
            <Card key={review.id} style={{ padding: spacing.lg, marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="small" muted>{review.user_id === sessionQuery.data?.user_id ? 'You' : 'ATHR customer'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="star" size={14} color="#E5A93D" />
                  <Text variant="small">{review.rating}/5</Text>
                </View>
              </View>
              {review.comment ? <Text style={{ marginTop: spacing.sm }}>{review.comment}</Text> : <Text variant="caption" faint style={{ marginTop: spacing.sm }}>No written comment.</Text>}
              <Text variant="caption" faint style={{ marginTop: spacing.sm }}>{new Date(review.created_at).toLocaleDateString()}</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
