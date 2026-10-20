import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ProductRow } from '../../src/components/cards';
import { Badge, Button, Card, Header, Input, Screen, Skeleton, Text, useToast } from '../../src/components/ui';
import { useDataSource } from '../../src/data';
import type { ProductImageClassification } from '../../src/data/types';
import { useLocale } from '../../src/i18n';
import { formatMoney } from '../../src/lib/format';
import { spacing, radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/ThemeProvider';

const MERCHANT_ID = 'mch_maison_sable';

function Stat({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <Card style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
      <Text variant="title" accent>
        {value}
      </Text>
      <Text variant="caption" faint>
        {label}
      </Text>
    </Card>
  );
}

export default function MerchantDashboard() {
  const source = useDataSource();
  const router = useRouter();
  const { t } = useLocale();
  const { tokens } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [classification, setClassification] = useState<ProductImageClassification | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const chooseAndAnalyseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: true,
        quality: 0.45,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error('Could not read this image. Choose another photo.');
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('Choose a JPEG, PNG, or WebP image.');
      }
      if (asset.base64.length > 5_500_000) throw new Error('Image is too large. Choose a smaller photo.');
      setAnalyzing(true);
      setSelectedImage({ uri: asset.uri, base64: asset.base64, mimeType });
      setClassification(null);
      const resultClassification = await source.classifyProductImage(asset.base64, mimeType);
      setClassification(resultClassification);
      toast.show(resultClassification.review_required ? 'Image analysed; audience needs review.' : 'Image analysed and classified.');
    } catch (error) {
      setSelectedImage(null);
      setClassification(null);
      toast.show(error instanceof Error ? error.message : 'Could not analyse the product image.');
    } finally {
      setAnalyzing(false);
    }
  };

  const ownedMerchant = useQuery({
    queryKey: ['owned-merchant'],
    queryFn: async () => {
      if (source.mode === 'demo') return null;
      const session = await source.getSession();
      if (!session) return null;
      const merchants = await source.listMerchants();
      return merchants.find((merchant) => merchant.owner_id === session.user_id) ?? null;
    },
    enabled: source.mode === 'live',
  });
  const activeMerchantId = source.mode === 'demo' ? MERCHANT_ID : ownedMerchant.data?.id ?? '';
  const activeMerchantName = source.mode === 'demo' ? 'Maison Sable' : ownedMerchant.data?.name ?? 'Merchant account';

  const stats = useQuery({
    queryKey: ['mstats', activeMerchantId],
    queryFn: () => source.merchantStats(activeMerchantId),
    enabled: Boolean(activeMerchantId),
  });
  const products = useQuery({
    queryKey: ['mproducts', activeMerchantId],
    queryFn: () => source.listProducts({ merchant_id: activeMerchantId, limit: 50 }),
    enabled: Boolean(activeMerchantId),
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!selectedImage || !classification) throw new Error('Select and analyse a product image first.');
      const imageUrl = await source.uploadProductImage(selectedImage.base64, selectedImage.mimeType);
      return source.upsertProduct(
        {
          title,
          price: Number(price) || 0,
          category: classification.category,
          universe: classification.universe,
          currency: 'DZD',
          colors: classification.colors,
          images: [imageUrl],
          target_audience: classification.target_audience,
          classification_status: classification.classification_status,
          classification_confidence: classification.confidence,
          image_analysis: {
            category: classification.category,
            target_audience: classification.target_audience,
            confidence: classification.confidence,
            colors: classification.colors,
            universe: classification.universe,
            description: classification.description,
            model: classification.model,
          },
          description: classification.description,
          in_stock: true,
          stock_count: 5,
        },
        activeMerchantId,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mproducts', activeMerchantId] });
      toast.show(`${t('merchants.addProduct')} ✓`);
      setAdding(false);
      setTitle('');
      setPrice('');
      setSelectedImage(null);
      setClassification(null);
    },
    onError: (error) => {
      toast.show(error instanceof Error ? error.message : 'Could not save product.');
    },
  });

  const max = Math.max(...(stats.data?.by_day.map((d) => d.clicks) ?? [1]), 1);

  return (
    <Screen scroll insetBottom>
      <Header title={t('merchants.dashboard')} subtitle={activeMerchantName} onBack={() => router.back()} right={<Button label={t('merchants.addProduct')} small disabled={source.mode === 'live' && !activeMerchantId} onPress={() => setAdding((a) => !a)} />} />

      {source.mode === 'live' && !ownedMerchant.isLoading && !activeMerchantId ? (
        <Card style={{ padding: spacing.md, marginBottom: spacing.lg }}>
          <Text variant="body">No merchant profile is linked to this account yet. Register or link a merchant profile before adding products.</Text>
        </Card>
      ) : null}

      {adding ? (
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
          <Input label="Title" value={title} onChangeText={setTitle} />
          <Input label="Price (DZD)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
          <Button label={analyzing ? 'Analysing image…' : selectedImage ? 'Choose another product photo' : 'Choose product photo'} full loading={analyzing} disabled={analyzing || add.isPending} onPress={chooseAndAnalyseImage} />
          {selectedImage ? <Image source={{ uri: selectedImage.uri }} style={{ width: '100%', height: 180, borderRadius: radius.md, marginTop: spacing.sm }} resizeMode="contain" /> : null}
          {classification ? (
            <View style={{ marginTop: spacing.md, marginBottom: spacing.md, gap: spacing.xs }}>
              <Text variant="body" accent>{classification.category} · {classification.target_audience === 'women' ? 'Women' : classification.target_audience === 'men' ? 'Men' : classification.target_audience === 'unisex' ? 'Unisex' : 'Audience unclear'}</Text>
              <Text variant="caption" muted>Confidence: {Math.round(classification.confidence * 100)}% · {classification.universe}</Text>
              <Text variant="caption" muted>{classification.description}</Text>
              {classification.review_required ? <Text variant="caption" accent>Needs review: the app will keep the audience as unknown rather than guess.</Text> : null}
            </View>
          ) : null}
          <Button label={t('common.save')} full loading={add.isPending} disabled={!title.trim() || !Number(price) || !selectedImage || !classification || analyzing} onPress={() => add.mutate()} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Stat label={t('merchants.impressions')} value={String(stats.data?.impressions ?? 0)} />
        <Stat label={t('merchants.clicks')} value={String(stats.data?.clicks ?? 0)} />
        <Stat label={t('merchants.ctr')} value={`${stats.data?.ctr ?? 0}%`} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Stat label={t('merchants.commission')} value={formatMoney(stats.data?.est_commission ?? 0)} />
        <Stat label="Orders" value={String(stats.data?.orders ?? 0)} />
      </View>

      <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>
        {t('merchants.clicks')} · 7d
      </Text>
      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        {stats.isLoading ? (
          <Skeleton width={'100%' as never} height={120} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 120 }}>
            {(stats.data?.by_day ?? []).map((d) => (
              <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: '100%', height: (d.clicks / max) * 100, borderRadius: radius.xs, backgroundColor: tokens.accent }} />
                <Text variant="caption" faint>
                  {d.day.slice(8)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Text variant="title" style={{ marginBottom: spacing.sm }}>
        {t('merchants.products')} ({products.data?.total ?? 0})
      </Text>
      {(products.data?.items ?? []).map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}
    </Screen>
  );
}
