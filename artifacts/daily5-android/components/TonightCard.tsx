import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useDiary } from '@/contexts/DiaryContext';
import { todayStr, monthKey, formatFullDate, estimatedPages, daysInMonth } from '@/lib/data';

interface Props {
  onPress: () => void;
  entryCount?: number; // how many moments already logged today
}

export function TonightCard({ onPress, entryCount = 0 }: Props) {
  const colors = useColors();
  const { books, getTodayLog } = useDiary();

  const today = todayStr();
  const mk = monthKey();
  const currentBook = books.find(b => b.monthKey === mk);

  // Page progress
  const currentDay = new Date().getDate();
  const totalPages = daysInMonth(mk);
  const filledDays = currentBook?.days.filter(d => d.entries.length > 0).length ?? 0;

  // Recall cue — look at yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yd = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const yLog = books.reduce<{ entries: any[] } | undefined>((found, b) => found ?? b.days.find(d => d.date === yd), undefined);
  const recallCue = yLog?.entries.length
    ? `You logged ${yLog.entries.length} moment${yLog.entries.length > 1 ? 's' : ''} yesterday.`
    : 'No entry logged yesterday.';

  const [, mm] = today.split('-');
  const dayOfWeek = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const remaining = 5 - entryCount;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.dateBlock}>
        <Text style={[styles.dayOfWeek, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          {dayOfWeek}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: 'PlayfairDisplay_400Regular' }]}>
          {fullDate}
        </Text>
      </View>

      <Text style={[styles.cue, { color: colors.mutedForeground }]}>{recallCue}</Text>

      <View style={styles.progress}>
        <Text style={[styles.progressLabel, { color: colors.tertiary }]}>
          Page {filledDays} of ~{totalPages} this month
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min((filledDays / totalPages) * 100, 100)}%` }]} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
          {entryCount === 0 ? "Log tonight's 5" : `Add ${remaining} more moment${remaining > 1 ? 's' : ''}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 20, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateBlock: { gap: 2 },
  dayOfWeek: { fontSize: 26, letterSpacing: 0.3 },
  date: { fontSize: 18 },
  cue: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  progress: { gap: 6 },
  progressLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  btn: {
    paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 },
});
