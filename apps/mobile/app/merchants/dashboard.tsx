import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, View } from 'react-native';
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
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

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
    enabled: Boolean(activeMerchantId) && (source.mode === 'demo' || Boolean(ownedMerchant.data?.approved)),
  });
  const products = useQuery({
    queryKey: ['mproducts', activeMerchantId],
    queryFn: () => source.listProducts({ merchant_id: activeMerchantId, limit: 50 }),
    enabled: Boolean(activeMerchantId) && (source.mode === 'demo' || Boolean(ownedMerchant.data?.approved)),
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

  const updateProduct = useMutation({
    mutationFn: ({ productId, patch }: { productId: string; patch: { title?: string; price?: number; in_stock?: boolean; stock_count?: number | null } }) => source.updateMerchantProduct(productId, activeMerchantId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mproducts', activeMerchantId] });
      qc.invalidateQueries({ queryKey: ['merchants'] });
      toast.show('Product updated.');
      setEditingProductId(null);
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Could not update product.'),
  });

  const deleteProduct = useMutation({
    mutationFn: (productId: string) => source.deleteMerchantProduct(productId, activeMerchantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mproducts', activeMerchantId] });
      qc.invalidateQueries({ queryKey: ['mstats', activeMerchantId] });
      qc.invalidateQueries({ queryKey: ['merchants'] });
      toast.show('Product deleted.');
    },
    onError: (error) => toast.show(error instanceof Error ? error.message : 'Could not delete product.'),
  });

  const confirmDeleteProduct = (productId: string, productTitle: string) => {
    Alert.alert('Delete product?', `“${productTitle}” will be removed from your store.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteProduct.mutate(productId) },
    ]);
  };
  const max = Math.max(...(stats.data?.by_day.map((d) => d.clicks) ?? [1]), 1);

  return (
    <Screen scroll insetBottom>
      <Header
        title={t('merchants.dashboard')}
        subtitle={activeMerchantName}
        onBack={() => router.back()}
        right={
          <Button
            label={t('merchants.addProduct')}
            small
            disabled={source.mode === 'live' && (!activeMerchantId || !ownedMerchant.data?.approved)}
            onPress={() => setAdding((a) => !a)}
          />
        }
      />

      {source.mode === 'live' && ownedMerchant.isLoading ? <Skeleton width="100%" height={88} style={{ marginBottom: spacing.lg }} /> : null}

      {source.mode === 'live' && !ownedMerchant.isLoading && !activeMerchantId ? (
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm }}>
          <Text variant="title">Open your ATHR store</Text>
          <Text variant="body" muted>No store is linked to this account yet. Submit a store application to start selling on ATHR.</Text>
          <Button label="Register your store" full onPress={() => router.push('/merchants')} />
        </Card>
      ) : null}

      {source.mode === 'live' && activeMerchantId && ownedMerchant.data && !ownedMerchant.data.approved ? (
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm }}>
          <Text variant="title">Application under review</Text>
          <Badge label="Pending approval" />
          <Text variant="body" muted>
            Your store, {ownedMerchant.data.name}, is waiting for ATHR approval. Product publishing and analytics unlock after approval.
          </Text>
          <Text variant="caption" faint>Submitted {new Date(ownedMerchant.data.created_at).toLocaleDateString()}</Text>
        </Card>
      ) : null}

      {source.mode === 'live' && ownedMerchant.data?.approved ? (
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="title">{ownedMerchant.data.name}</Text>
              <Text variant="caption" muted>{ownedMerchant.data.city} · {ownedMerchant.data.product_count} products</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="title">{ownedMerchant.data.review_count ? ownedMerchant.data.rating.toFixed(1) : '—'}/5</Text>
              <Text variant="caption" faint>{ownedMerchant.data.review_count} ratings</Text>
            </View>
          </View>
          <Button label="Read customer ratings" full variant="outline" onPress={() => router.push(`/merchants/reviews?merchantId=${ownedMerchant.data!.id}`)} />
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

      {(source.mode === 'demo' || Boolean(ownedMerchant.data?.approved)) ? (
        <>
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
        <View key={p.id} style={{ marginBottom: spacing.md }}>
          <ProductRow product={p} />
          {editingProductId === p.id ? (
            <Card style={{ padding: spacing.md, gap: spacing.sm }}>
              <Input label="Product title" value={editTitle} onChangeText={setEditTitle} maxLength={120} />
              <Input label="Price (DZD)" value={editPrice} onChangeText={setEditPrice} keyboardType="number-pad" />
              <Input label="Stock quantity" value={editStock} onChangeText={setEditStock} keyboardType="number-pad" />
              <Button label="Save changes" full loading={updateProduct.isPending} disabled={!editTitle.trim() || !Number(editPrice) || !/^\d+$/.test(editStock) || updateProduct.isPending} onPress={() => updateProduct.mutate({ productId: p.id, patch: { title: editTitle.trim(), price: Number(editPrice), stock_count: Number(editStock), in_stock: Number(editStock) > 0 } })} />
              <Button label="Cancel" full variant="outline" onPress={() => setEditingProductId(null)} />
            </Card>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
              <Button label="Edit / stock" small variant="outline" onPress={() => { setEditingProductId(p.id); setEditTitle(p.title); setEditPrice(String(p.price)); setEditStock(String(p.stock_count ?? 0)); }} />
              <Button label={p.in_stock ? 'Mark out of stock' : 'Mark in stock'} small variant="outline" loading={updateProduct.isPending && updateProduct.variables?.productId === p.id} onPress={() => updateProduct.mutate({ productId: p.id, patch: { in_stock: !p.in_stock, ...(p.in_stock ? {} : { stock_count: Math.max(1, p.stock_count ?? 1) }) } })} />
              <Button label="Delete" small variant="outline" loading={deleteProduct.isPending && deleteProduct.variables === p.id} onPress={() => confirmDeleteProduct(p.id, p.title)} />
            </View>
          )}
        </View>
      ))
        </>
      ) : null}
    </Screen>
  );
}
