import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/ProtectedScreen';

function OrdersContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Orders</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.empty}>
        <Ionicons name="cube-outline" size={52} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Coming soon
        </Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
          Print and order your monthly books as physical keepsakes.
        </Text>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  return (
    <ProtectedScreen>
      <OrdersContent />
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22 },
  emptySub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
});
