import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiary } from '@/contexts/DiaryContext';
import { PaperBackground } from '@/components/PaperBackground';
import { TonightCard } from '@/components/TonightCard';
import { EntrySlot } from '@/components/EntrySlot';
import { todayStr, formatFullDate, formatShortDate, monthKey } from '@/lib/data';

export default function TodayTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTodayLog, getOnThisDay, books } = useDiary();

  const today = todayStr();
  const todayLog = getTodayLog();
  const entries = todayLog?.entries ?? [];
  const onThisDay = getOnThisDay();

  const dayOfWeek = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 84 : 84); // tab bar height

  function openLog() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/log-modal');
  }

  return (
    <PaperBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date header */}
        <View style={styles.dateHeader}>
          <Text style={[styles.dayOfWeek, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {dayOfWeek}
          </Text>
          <Text style={[styles.fullDate, { color: colors.mutedForeground, fontFamily: 'PlayfairDisplay_400Regular' }]}>
            {fullDate}
          </Text>
        </View>

        <View style={[styles.hairline, { backgroundColor: colors.borderStrong }]} />

        {/* Tonight card — always show if fewer than 5 entries */}
        {entries.length < 5 && (
          <TonightCard onPress={openLog} entryCount={entries.length} />
        )}

        {/* Logged entries for today */}
        {entries.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>
              {entries.length === 5 ? "Today's 5" : `${entries.length} of 5 moments`}
            </Text>
            {entries.map((entry, i) => (
              <EntrySlot
                key={entry.id}
                entry={entry}
                slotNumber={i + 1}
                onPress={openLog}
              />
            ))}
          </View>
        )}

        {/* On This Day */}
        {onThisDay.length > 0 && (
          <View style={[styles.section, { marginTop: 24 }]}>
            <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>On this day</Text>
            {onThisDay.slice(0, 3).map(({ book, day }) => (
              <TouchableOpacity
                key={day.date}
                style={[styles.otdCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/book-viewer', params: { monthKey: book.monthKey } })}
                activeOpacity={0.8}
              >
                <Text style={[styles.otdYear, { color: colors.tertiary }]}>{day.date.slice(0, 4)}</Text>
                {day.entries.slice(0, 2).map(e => (
                  <Text key={e.id} style={[styles.otdText, { color: colors.foreground }]} numberOfLines={2}>
                    {e.text}
                  </Text>
                ))}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: botPad - 56 }]}
        onPress={openLog}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingLeft: 72, paddingRight: 20, gap: 20 },
  dateHeader: { gap: 4, marginBottom: 4 },
  dayOfWeek: { fontSize: 28, letterSpacing: 0.2 },
  fullDate: { fontSize: 20 },
  hairline: { height: 1, marginBottom: 4 },
  section: { gap: 0 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  otdCard: {
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    padding: 14, gap: 6, marginBottom: 8,
  },
  otdYear: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  otdText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
