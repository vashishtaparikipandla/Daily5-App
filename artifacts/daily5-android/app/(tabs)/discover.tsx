import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiary } from '@/contexts/DiaryContext';
import { EntrySlot } from '@/components/EntrySlot';
import { todayStr } from '@/lib/data';

export default function DiscoverTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getOnThisDay } = useDiary();

  const today = todayStr();
  const dayOfWeek = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const onThisDay = getOnThisDay();

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 84 : 84);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Discover
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateChip}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={[styles.dateChipText, { color: colors.primary }]}>
            {dayOfWeek}, {fullDate}
          </Text>
        </View>

        <Text style={[styles.heading, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          On this day
        </Text>

        {onThisDay.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={44} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
              Nothing yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.tertiary }]}>
              Memories from this day in past years will appear here as you build your diary.
            </Text>
          </View>
        ) : (
          onThisDay.map(({ book, day }) => (
            <TouchableOpacity
              key={day.date}
              style={[styles.yearBlock, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/book-viewer', params: { monthKey: book.monthKey } })}
              activeOpacity={0.8}
            >
              <Text style={[styles.yearLabel, { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {day.date.slice(0, 4)}
              </Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {day.entries.slice(0, 3).map((entry, i) => (
                <EntrySlot key={entry.id} entry={entry} slotNumber={i + 1} compact />
              ))}
              {day.entries.length > 3 && (
                <Text style={[styles.moreText, { color: colors.tertiary }]}>
                  +{day.entries.length - 3} more
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, letterSpacing: 0.2 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  heading: { fontSize: 22, letterSpacing: 0.2 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  yearBlock: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    padding: 16, gap: 8,
  },
  yearLabel: { fontSize: 18, letterSpacing: 0.3 },
  divider: { height: 1, marginBottom: 4 },
  moreText: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
});
