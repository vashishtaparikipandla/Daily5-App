import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES } from '@/constants/categories';
import type { CategoryId } from '@/lib/data';

interface Props {
  selected?: CategoryId;
  onChange: (id: CategoryId) => void;
}

export function CategoryPicker({ selected, onChange }: Props) {
  const colors = useColors();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {CATEGORIES.map(cat => {
        const active = selected === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onChange(cat.id)}
            activeOpacity={0.75}
            style={[
              styles.chip,
              {
                backgroundColor: active ? cat.color + '22' : colors.muted,
                borderColor: active ? cat.color : 'transparent',
                borderWidth: active ? 1 : 0,
              },
            ]}
          >
            <Ionicons name={cat.icon as any} size={13} color={active ? cat.color : colors.mutedForeground} />
            <Text style={[styles.label, { color: active ? cat.color : colors.mutedForeground }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
