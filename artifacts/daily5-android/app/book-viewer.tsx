import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiary } from '@/contexts/DiaryContext';
import { EntrySlot } from '@/components/EntrySlot';
import { BookCover } from '@/components/BookCover';
import { ProtectedScreen } from '@/components/ProtectedScreen';
import { monthLabel, formatShortDate } from '@/lib/data';
import { exportBookAsPdf } from '@/lib/pdfExport';
import type { Book, DayLog } from '@/lib/data';

const { width: SW } = Dimensions.get('window');

function CoverPage({ book, colors }: { book: Book; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.page, { width: SW, backgroundColor: colors.background }]}>
      <BookCover book={book} size="large" />
      <Text style={[styles.coverTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
        {monthLabel(book.monthKey)}
      </Text>
      <Text style={[styles.coverSub, { color: colors.mutedForeground }]}>
        {book.days.filter(d => d.entries.length > 0).length} days recorded
      </Text>
    </View>
  );
}

function DayPage({ day, book, colors }: { day: DayLog; book: Book; colors: ReturnType<typeof useColors> }) {
  const slots = Array.from({ length: 5 }, (_, i) => day.entries[i] ?? null);
  return (
    <View style={[styles.page, { width: SW, backgroundColor: colors.background }]}>
      <Text style={[styles.dayDate, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
        {formatShortDate(day.date)}
      </Text>
      <View style={[styles.marginLine, { backgroundColor: colors.marginLine }]} />
      <View style={styles.slots}>
        {slots.map((entry, i) => (
          <View key={i} style={{ height: 80 }}>
            <EntrySlot entry={entry} slotNumber={i + 1} compact />
          </View>
        ))}
      </View>
      {day.extras.length > 0 && (
        <View style={[styles.extrasSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.extrasLabel, { color: colors.tertiary }]}>
            +{day.extras.length} extra moment{day.extras.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

function BookViewerContent() {
  const { monthKey: mk } = useLocalSearchParams<{ monthKey: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getBook, lockCurrentMonth } = useDiary();
  const flatRef = useRef<FlatList>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  const book = getBook(mk ?? '');

  if (!book) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Book not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedDays = [...book.days].sort((a, b) => a.date.localeCompare(b.date));
  type PageItem = { type: 'cover' } | { type: 'day'; day: DayLog };
  const pages: PageItem[] = [{ type: 'cover' }, ...sortedDays.map(day => ({ type: 'day' as const, day }))];

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  async function handleLock() {
    Alert.alert(
      'Lock this book?',
      "Locking closes the month and makes it permanent. You won't be able to add more entries.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Lock it', onPress: async () => { await lockCurrentMonth(); router.back(); } },
      ],
    );
  }

  async function handleExportPdf() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportBookAsPdf(book!);
    } catch (e) {
      Alert.alert('Export failed', 'Could not generate the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          {monthLabel(book.monthKey)}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleExportPdf}
            disabled={exporting}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
          >
            {exporting
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="share-outline" size={22} color={colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/order-flow', params: { monthKey: book.monthKey } } as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.headerBtn}
          >
            <Ionicons name="print-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={pages}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
          setPageIndex(idx);
        }}
        renderItem={({ item }) => {
          if (item.type === 'cover') return <CoverPage book={book} colors={colors} />;
          return <DayPage day={item.day} book={book} colors={colors} />;
        }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8, borderTopColor: colors.border }]}>
        <Text style={[styles.pageNum, { color: colors.tertiary }]}>
          {pageIndex === 0 ? 'Cover' : `${pageIndex} / ${pages.length - 1}`}
        </Text>
        {!book.locked && pageIndex === 0 && (
          <TouchableOpacity onPress={handleLock} style={[styles.lockBtn, { borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.lockText, { color: colors.mutedForeground }]}>Lock month</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function BookViewer() {
  return (
    <ProtectedScreen>
      <BookViewerContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, letterSpacing: 0.2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  coverTitle: { fontSize: 24, letterSpacing: 0.3, marginTop: 16 },
  coverSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  dayDate: { fontSize: 22, alignSelf: 'flex-start', letterSpacing: 0.2 },
  marginLine: { position: 'absolute', left: 50, top: 0, bottom: 0, width: 1 },
  slots: { width: '100%', gap: 0 },
  extrasSection: { width: '100%', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 4 },
  extrasLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageNum: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  lockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
  },
  lockText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  backLink: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
