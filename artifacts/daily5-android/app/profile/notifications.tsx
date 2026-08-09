import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/ProtectedScreen';

function NotificationsContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [nightly, setNightly] = useState(true);
  const [onThisDay, setOnThisDay] = useState(true);
  const [bookReady, setBookReady] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState(true);

  const items = [
    { label: 'Nightly reminder', sub: 'Reminds you to log tonight\'s 5 at 9:00 PM', value: nightly, onChange: setNightly },
    { label: 'On This Day', sub: 'A gentle nudge when you have past memories for today', value: onThisDay, onChange: setOnThisDay },
    { label: 'Book ready', sub: 'When a monthly book has completed and is ready to view', value: bookReady, onChange: setBookReady },
    { label: 'Order updates', sub: 'Shipping and delivery status for printed books', value: orderUpdates, onChange: setOrderUpdates },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {items.map((item, i) => (
            <View
              key={item.label}
              style={[
                styles.row,
                i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                thumbColor={item.value ? colors.primaryForeground : colors.tertiary}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function NotificationsScreen() {
  return (
    <ProtectedScreen>
      <NotificationsContent />
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
  content: { padding: 20, gap: 16 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },
});
