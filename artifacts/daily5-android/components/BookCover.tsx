import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { monthLabel } from '@/lib/data';
import type { Book } from '@/lib/data';

// Procedural cover — each monthKey gets a unique hue
const COVER_PALETTES = [
  { bg: '#2D3F2A', text: '#C8D8B4' },
  { bg: '#3D2A2F', text: '#D8B4C0' },
  { bg: '#2A3A4A', text: '#B4C8D8' },
  { bg: '#4A3A1A', text: '#D8C8A0' },
  { bg: '#1A2F3F', text: '#A0B8C8' },
  { bg: '#3F2A1A', text: '#D0B090' },
  { bg: '#2A1A3F', text: '#B8A8D0' },
  { bg: '#1A3F2A', text: '#A8D0B8' },
];

function paletteForMonth(mk: string) {
  const [y, m] = mk.split('-').map(Number);
  return COVER_PALETTES[(y * 12 + m) % COVER_PALETTES.length];
}

interface Props {
  book: Book;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { width: 80, height: 110, fontSize: 10, yearSize: 9 },
  medium: { width: 120, height: 165, fontSize: 13, yearSize: 11 },
  large: { width: 160, height: 220, fontSize: 16, yearSize: 13 },
};

export function BookCover({ book, onPress, size = 'medium' }: Props) {
  const colors = useColors();
  const palette = paletteForMonth(book.monthKey);
  const dim = SIZES[size];
  const [y, m] = book.monthKey.split('-');
  const monthName = new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long' });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      style={[
        styles.cover,
        { width: dim.width, height: dim.height, backgroundColor: palette.bg },
      ]}
    >
      {/* Spine-like left strip */}
      <View style={[styles.spine, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      {/* Content */}
      <View style={styles.inner}>
        <Text
          style={[styles.month, { color: palette.text, fontSize: dim.fontSize, fontFamily: 'PlayfairDisplay_700Bold' }]}
          numberOfLines={1}
        >
          {monthName}
        </Text>
        <Text style={[styles.year, { color: palette.text, fontSize: dim.yearSize, opacity: 0.7 }]}>
          {y}
        </Text>
        <View style={[styles.divider, { backgroundColor: palette.text, opacity: 0.3 }]} />
        <Text style={[styles.count, { color: palette.text, fontSize: dim.yearSize - 1, opacity: 0.6 }]}>
          {book.days.filter(d => d.entries.length > 0).length} days
        </Text>
      </View>
      {book.locked && (
        <View style={[styles.lockedDot, { backgroundColor: palette.text, opacity: 0.6 }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: 4, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 2, height: 4 } },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10 },
  inner: { flex: 1, paddingLeft: 18, paddingRight: 10, paddingVertical: 14, justifyContent: 'flex-end', gap: 4 },
  month: { letterSpacing: 0.3 },
  year: { fontFamily: 'Inter_400Regular' },
  divider: { height: 1, width: 24, borderRadius: 1, marginVertical: 4 },
  count: { fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  lockedDot: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3 },
});
