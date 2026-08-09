import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiary } from '@/contexts/DiaryContext';
import { CategoryPicker } from '@/components/CategoryPicker';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ProtectedScreen } from '@/components/ProtectedScreen';
import { randomPrompt } from '@/constants/placeholders';
import { uid, todayStr, formatFullDate } from '@/lib/data';
import type { Entry, CategoryId } from '@/lib/data';

const MAX_CHARS = 120;
const COUNTER_THRESHOLD = Math.floor(MAX_CHARS * 0.8);

interface SlotState {
  id: string;
  text: string;
  category?: CategoryId;
  photos: string[];
  placeholder: string;
}

function makeSlot(entry?: Entry): SlotState {
  return {
    id: entry?.id ?? uid(),
    text: entry?.text ?? '',
    category: entry?.category,
    photos: entry?.photos ?? [],
    placeholder: randomPrompt(),
  };
}

function LogModalContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTodayLog, upsertDayEntries } = useDiary();
  const today = todayStr();

  const [slots, setSlots] = useState<SlotState[]>(() => {
    const existing = getTodayLog()?.entries ?? [];
    return Array.from({ length: 5 }, (_, i) => makeSlot(existing[i]));
  });
  const [saving, setSaving] = useState(false);
  const [lockedError, setLockedError] = useState(false);

  function updateSlot(index: number, updates: Partial<SlotState>) {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
    // Clear locked error when user modifies content
    if (lockedError) setLockedError(false);
  }

  async function handleDone() {
    const entries = slots
      .filter(s => s.text.trim().length > 0)
      .map(s => ({
        id: s.id,
        text: s.text.trim(),
        category: s.category,
        photos: s.photos,
      }));

    if (entries.length === 0) {
      Alert.alert('No moments', 'Add at least one moment before saving.');
      return;
    }

    setSaving(true);
    const success = await upsertDayEntries(today, entries);

    if (!success) {
      // Book is locked — keep modal open, show error, do not discard draft
      setSaving(false);
      setLockedError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    router.dismiss();
  }

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.dismiss()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerDate, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {formatFullDate(today)}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Tonight's 5
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDone}
          disabled={saving}
          style={[styles.doneBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        >
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Locked error banner */}
      {lockedError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive }]}>
          <Ionicons name="lock-closed" size={14} color="#fff" />
          <Text style={styles.errorBannerText}>
            This month is locked and can no longer accept new entries. Your draft is safe — close to discard.
          </Text>
        </View>
      )}

      {/* Slots */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {slots.map((slot, i) => (
          <SlotEditor
            key={slot.id}
            slot={slot}
            slotNumber={i + 1}
            onChange={updates => updateSlot(i, updates)}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface SlotEditorProps {
  slot: SlotState;
  slotNumber: number;
  onChange: (updates: Partial<SlotState>) => void;
  colors: ReturnType<typeof useColors>;
}

function SlotEditor({ slot, slotNumber, onChange, colors }: SlotEditorProps) {
  const showCounter = slot.text.length >= COUNTER_THRESHOLD;
  const charsLeft = MAX_CHARS - slot.text.length;

  return (
    <View style={[styles.slot, { borderBottomColor: colors.border }]}>
      <View style={styles.slotHeader}>
        <Text style={[styles.slotNum, { color: colors.tertiary }]}>{slotNumber}</Text>
        {showCounter && (
          <Text style={[styles.counter, { color: charsLeft <= 10 ? colors.destructive : colors.tertiary }]}>
            {slot.text.length}/{MAX_CHARS}
          </Text>
        )}
      </View>
      <TextInput
        style={[styles.textInput, { color: colors.foreground }]}
        placeholder={slot.placeholder}
        placeholderTextColor={colors.tertiary}
        value={slot.text}
        onChangeText={t => onChange({ text: t.slice(0, MAX_CHARS) })}
        multiline
        maxLength={MAX_CHARS}
        textAlignVertical="top"
      />
      <View style={styles.slotMeta}>
        <CategoryPicker selected={slot.category} onChange={cat => onChange({ category: cat })} />
        <PhotoPicker photos={slot.photos} onChange={photos => onChange({ photos })} maxPhotos={2} />
      </View>
    </View>
  );
}

export default function LogModal() {
  return (
    <ProtectedScreen>
      <LogModalContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1 },
  headerDate: { fontSize: 18, letterSpacing: 0.2 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  doneBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  errorBannerText: {
    flex: 1, color: '#fff', fontSize: 13,
    fontFamily: 'Inter_400Regular', lineHeight: 18,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  slot: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotNum: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  counter: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  textInput: {
    fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22,
    minHeight: 66,
  },
  slotMeta: { gap: 10 },
});
