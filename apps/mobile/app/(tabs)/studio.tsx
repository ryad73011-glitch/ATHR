
        {/* Budget, palette and chat prompt */}
        <View style={{ padding: spacing.lg, borderRadius: 20, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Ionicons name="options-outline" size={19} color={tokens.accent} />
            <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>Fine-tune your look</Text>
          </View>
          <Text variant="caption" muted style={{ marginBottom: spacing.sm }}>{t('studio.palette')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {PALETTE.map((color) => {
              const selected = paletteSel.includes(color);
              const darkSwatch = color === '#E6DFD2' || color === '#B7BCC1';
              return (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel={`Palette ${color}`}
                  accessibilityState={{ selected }}
                  onPress={() => toggle(paletteSel, color, setPaletteSel)}
                  style={{ width: 31, height: 31, borderRadius: 16, backgroundColor: color, borderWidth: selected ? 3 : 1, borderColor: selected ? tokens.accent : tokens.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  {selected ? <Ionicons name="checkmark" size={15} color={darkSwatch ? '#111111' : '#FFFFFF'} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Input label={`${t('studio.budget')} (DZD)`} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
          <Input label="Tell WASM what you need" value={note} onChangeText={setNote} placeholder="e.g. a smart-casual outfit for a cool evening" />
        </View>

        {/* Image context */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text variant="small" style={{ fontWeight: '800', color: tokens.text }}>Add a visual reference</Text>
            <Text variant="caption" muted>03 / 03</Text>
          </View>
          <View style={{ padding: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, borderStyle: 'dashed', backgroundColor: tokens.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="image-outline" size={22} color={tokens.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="small" style={{ fontWeight: '700', color: tokens.text }}>{t('studio.upload')}</Text>
                <Text variant="caption" muted>Use a clothing photo to guide your styling</Text>
              </View>
              <Button label="Add" variant="outline" icon="add-outline" onPress={pick} small />
            </View>
            {images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {images.map((uri, index) => (
                    <View key={`${uri}_${index}`} style={{ position: 'relative' }}>
                      <Image source={{ uri }} style={{ width: 74, height: 88, borderRadius: 12, backgroundColor: tokens.bgElevated }} />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove image"
                        onPress={() => setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                        style={{ position: 'absolute', right: 4, top: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: tokens.bgElevated, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="close" size={15} color={tokens.text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>

        <Button label={run.isPending ? 'WASM is thinking…' : t('studio.generate')} full loading={run.isPending} onPress={() => run.mutate()} icon="sparkles-outline" />
        <Text variant="caption" muted style={{ textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl }}>
          ATHR · Your style, your preferences, your budget
        </Text>

        {/* Conversation and recommended products */}
        {messages.map((message) => (
          <View key={message.id} style={{ marginTop: spacing.md, alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%', flexDirection: 'row', gap: spacing.sm }}>
            {message.role !== 'user' ? (
              <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="sparkles-outline" size={15} color={tokens.accent} />
              </View>
            ) : null}
            <View style={{ flexShrink: 1, backgroundColor: message.role === 'user' ? tokens.bgElevated : tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 16, padding: spacing.md }}>
              <Text variant="caption" style={{ color: message.role === 'user' ? tokens.textMuted : tokens.accent, fontWeight: '800', marginBottom: spacing.xs }}>
                {message.role === 'user' ? 'YOU' : 'WASM'}
              </Text>
              <Text variant="small" style={{ lineHeight: 21, color: tokens.text }}>{message.content}</Text>
            </View>
          </View>
        ))}

        {last ? (
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Badge label={last.engine === 'cloud-ai' ? t('studio.cloud') : t('studio.local')} color={last.engine === 'cloud-ai' ? tokens.info : tokens.warning} />
              {last.model ? <Badge label={last.model} color={tokens.textFaint} /> : null}
            </View>
            {(last.product_ids ?? []).slice(0, 6).map((id) => <ProductRowFromId key={id} id={id} />)}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ProductRowFromId({ id }: { id: string }) {
  const source = useDataSource();
  const [product, setProduct] = React.useState<import('../../src/data/types').Product | null>(null);

  React.useEffect(() => {
    source.getProduct(id).then(setProduct).catch(() => setProduct(null));
  }, [id, source]);

  if (!product) return null;
  return <ProductRow product={product} />;
}
