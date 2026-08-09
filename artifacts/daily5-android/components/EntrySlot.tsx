import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getCategoryById } from '@/constants/categories';
import type { Entry } from '@/lib/data';

interface Props {
  entry: Entry | null; // null = empty intentional slot
  slotNumber: number;
  onPress?: () => void;
  compact?: boolean;
}

const SLOT_HEIGHT = 92;

export function EntrySlot({ entry, slotNumber, onPress, compact }: Props) {
  const colors = useColors();
  const category = entry?.category ? getCategoryById(entry.category) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
      style={[styles.container, { height: compact ? SLOT_HEIGHT - 12 : SLOT_HEIGHT, borderColor: colors.border }]}
    >
      <Text style={[styles.num, { color: colors.tertiary }]}>{slotNumber}</Text>
      <View style={styles.content}>
        {entry ? (
          <>
            <Text style={[styles.text, { color: colors.foreground }]} numberOfLines={3}>
              {entry.text}
            </Text>
            <View style={styles.meta}>
              {category && (
                <View style={[styles.catBadge, { backgroundColor: category.color + '22' }]}>
                  <Ionicons name={category.icon as any} size={11} color={category.color} />
                  <Text style={[styles.catLabel, { color: category.color }]}>{category.label}</Text>
                </View>
              )}
              {!!entry.photos?.length && (
                <View style={styles.photos}>
                  {entry.photos.slice(0, 2).map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.photo} />
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={[styles.emptyLine, { backgroundColor: colors.border }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  num: { fontSize: 11, fontFamily: 'Inter_500Medium', width: 16, marginTop: 3 },
  content: { flex: 1, gap: 6 },
  text: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  catLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  photos: { flexDirection: 'row', gap: 4 },
  photo: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#eee' },
  emptyLine: { height: 1, borderRadius: 1, marginTop: 12, opacity: 0.5 },
});
