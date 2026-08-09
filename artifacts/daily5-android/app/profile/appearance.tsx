import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { ProtectedScreen } from '@/components/ProtectedScreen';

const OPTIONS: { value: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

function AppearanceContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useApp();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Appearance</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Theme</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {OPTIONS.map((opt, i) => {
            const active = theme === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.row,
                  i < OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
                onPress={() => setTheme(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons name={opt.icon as any} size={20} color={active ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: active ? colors.primary : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: colors.tertiary }]}>
          Light mode is the default. Changes apply immediately.
        </Text>
      </View>
    </View>
  );
}

export default function AppearanceScreen() {
  return (
    <ProtectedScreen>
      <AppearanceContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18 },
  content: { padding: 20, gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
