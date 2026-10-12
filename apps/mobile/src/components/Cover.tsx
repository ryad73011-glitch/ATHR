import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Universe } from '../data/types';
import { palette } from '../theme/tokens';

/**
 * Deterministic generative "fashion plate" cover art.
 *
 * Demo mode never hotlinks unlicensed photography; instead each look/product
 * gets an on-brand abstract composition derived from its palette, universe and
 * a stable seed. In live mode, when a look has `hero_image` we render that
 * instead (see `LookHero`).
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CoverProps {
  seed: string;
  paletteHex: string[];
  universe?: Universe;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function Cover({ seed, paletteHex, universe = 'CALM', width = 300, height = 380, borderRadius = 16 }: CoverProps) {
  const shapes = useMemo(() => {
    const rnd = mulberry(hash(seed));
    const cols = paletteHex.length ? paletteHex : [palette.cream300, palette.gold, palette.ink500];
    const n = Math.min(5, Math.max(3, cols.length + 1));
    const gap = 14;
    const innerW = 300 - gap * (n + 1);
    const colW = innerW / n;
    const items = [] as { x: number; w: number; top: number; r: number; fill: string; arc: boolean }[];
    for (let i = 0; i < n; i++) {
      const fill = cols[i % cols.length];
      const top = 90 + rnd() * 120;
      items.push({
        x: gap + i * (colW + gap),
        w: colW,
        top,
        r: universe === 'CALM' ? 10 : 4 + rnd() * 10,
        fill,
        arc: rnd() > 0.6,
      });
    }
    return { items, accent: universe === 'CALM' ? palette.calm : palette.chaos, horizon: 300 + rnd() * 40 };
  }, [seed, paletteHex, universe]);

  const accentColor = universe === 'CALM' ? palette.calm : palette.chaos;

  return (
    <View style={[styles.wrap, { width, height, borderRadius }]}>
      <Svg width={width} height={height} viewBox="0 0 300 380">
        <Rect x="0" y="0" width="300" height="380" fill={palette.ink800} />
        {/* horizon line */}
        <Rect x="0" y={shapes.horizon} width="300" height="1.5" fill={palette.hairline} />
        {/* garment silhouettes */}
        {shapes.items.map((s, i) => (
          <Rect key={i} x={s.x} y={s.top} width={s.w} height={380 - s.top - 40} rx={s.r} fill={s.fill} opacity={0.92} />
        ))}
        {/* universe accent arc */}
        <Path d={`M 20 ${shapes.horizon} Q 150 ${shapes.horizon - 120} 280 ${shapes.horizon}`} stroke={accentColor} strokeWidth={2} fill="none" opacity={0.7} />
        <Circle cx={universe === 'CALM' ? 60 : 240} cy={70} r={20} fill={accentColor} opacity={0.85} />
        {/* trailing imprint line (the ATHR mark's gesture) */}
        <Path d={`M 30 40 C 120 30, 200 50, 270 36`} stroke={palette.cream300} strokeWidth={1.2} fill="none" opacity={0.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: palette.ink800 },
});

/** Renders a remote hero image when present, otherwise the generative cover. */
export function LookHero({ heroImage, seed, paletteHex, universe, width, height, borderRadius }: { heroImage?: string | null } & Omit<CoverProps, 'seed'> & { seed: string }) {
  if (heroImage) {
    // In live mode hero images come from Supabase Storage.
    return <Image source={{ uri: heroImage }} style={{ width, height, borderRadius }} contentFit="cover" />;
  }
  return <Cover seed={seed} paletteHex={paletteHex} universe={universe} width={width} height={height} borderRadius={borderRadius} />;
}
