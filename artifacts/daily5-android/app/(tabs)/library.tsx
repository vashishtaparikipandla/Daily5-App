import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiary } from '@/contexts/DiaryContext';
import { BookCover } from '@/components/BookCover';
import { monthLabel } from '@/lib/data';
import type { Book } from '@/lib/data';

export default function LibraryTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { books } = useDiary();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 84 : 84);

  const sortedBooks = [...books]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const filtered = search
    ? sortedBooks.filter(b =>
        monthLabel(b.monthKey).toLowerCase().includes(search.toLowerCase()) ||
        b.days.some(d => d.entries.some(e => e.text.toLowerCase().includes(search.toLowerCase())))
      )
    : sortedBooks;

  function openBook(book: Book) {
    router.push({ pathname: '/book-viewer', params: { monthKey: book.monthKey } });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Library
        </Text>
        <TouchableOpacity onPress={() => setShowSearch(s => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={showSearch ? 'close' : 'search'} size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.muted, marginHorizontal: 20, marginBottom: 12 }]}>
          <Ionicons name="search" size={16} color={colors.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search moments…"
            placeholderTextColor={colors.tertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No books yet</Text>
          <Text style={[styles.emptySub, { color: colors.tertiary }]}>
            Log your first moments on the Today tab
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={b => b.monthKey}
          contentContainerStyle={[styles.grid, { paddingBottom: botPad }]}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.bookCell}>
              <BookCover book={item} size="medium" onPress={() => openBook(item)} />
              <Text style={[styles.bookLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                {monthLabel(item.monthKey)}
              </Text>
              {item.locked && (
                <View style={styles.lockedRow}>
                  <Ionicons name="lock-closed" size={10} color={colors.tertiary} />
                  <Text style={[styles.lockedText, { color: colors.tertiary }]}>Locked</Text>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, letterSpacing: 0.2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  grid: { paddingHorizontal: 20, paddingTop: 20, gap: 0 },
  row: { justifyContent: 'space-between', marginBottom: 24 },
  bookCell: { alignItems: 'center', gap: 6 },
  bookLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockedText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingHorizontal: 40 },
});
