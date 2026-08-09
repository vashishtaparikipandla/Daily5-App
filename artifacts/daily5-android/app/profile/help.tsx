import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ProtectedScreen } from '@/components/ProtectedScreen';

function HelpContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const items = [
    { icon: 'mail-outline', label: 'Contact support', onPress: () => Linking.openURL('mailto:support@daily5.app') },
    { icon: 'globe-outline', label: 'Privacy Policy', onPress: () => Linking.openURL('https://daily5.app/privacy') },
    { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => Linking.openURL('https://daily5.app/terms') },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Help & About</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.row,
                i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.mutedForeground} />
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.versionBlock}>
          <Text style={[styles.appName, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Daily 5</Text>
          <Text style={[styles.version, { color: colors.tertiary }]}>Version {version}</Text>
          <Text style={[styles.tagline, { color: colors.tertiary }]}>your days, remembered</Text>
        </View>
      </View>
    </View>
  );
}

export default function HelpScreen() {
  return (
    <ProtectedScreen>
      <HelpContent />
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
  content: { padding: 20, gap: 24 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  versionBlock: { alignItems: 'center', gap: 4, paddingVertical: 16 },
  appName: { fontSize: 20 },
  version: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  tagline: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
});
