/**
 * ProtectedScreen
 * Wrap any screen that must not be accessible via deep link
 * without authentication and (when enabled) biometric unlock.
 *
 * - Not authenticated → <Redirect href="/auth" />
 * - Authenticated but locked → inline BiometricLock overlay
 * - Authenticated + unlocked → renders children
 *
 * The context `isLoading` guard ensures we never flash a redirect
 * while AsyncStorage is still being read.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';

function BiometricLock({ onUnlock }: { onUnlock: () => Promise<boolean> }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { challenge(); }, []);

  async function challenge() {
    setLoading(true);
    setError('');
    const ok = await onUnlock();
    if (!ok) setError('Biometric failed. Tap to try again.');
    setLoading(false);
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="lock-closed" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Daily 5 is locked
        </Text>
        {error ? (
          <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
        ) : (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Use your biometric to open your diary
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
        onPress={challenge}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Ionicons name="finger-print" size={20} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Unlock</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function ProtectedScreen({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isUnlocked, unlock } = useApp();

  if (isLoading) return <View style={{ flex: 1 }} />;
  if (!isAuthenticated) return <Redirect href="/auth" />;
  if (!isUnlocked) return <BiometricLock onUnlock={unlock} />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  icon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, textAlign: 'center' },
  sub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  error: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 12,
  },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
