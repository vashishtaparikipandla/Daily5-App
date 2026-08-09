import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useColorScheme } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Full-screen biometric lock overlay. Shown when the user navigates
 * directly to a tab without passing through the splash unlock flow
 * (e.g. via deep link or hot reload).
 */
function BiometricLock({ onUnlock }: { onUnlock: () => Promise<boolean> }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Automatically prompt on mount
    handleUnlock();
  }, []);

  async function handleUnlock() {
    setLoading(true);
    setError('');
    const success = await onUnlock();
    if (!success) {
      setError('Biometric failed. Try again.');
    }
    setLoading(false);
  }

  return (
    <View style={[styles.lockRoot, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.lockCenter}>
        <View style={[styles.lockIcon, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="lock-closed" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Daily 5 is locked
        </Text>
        {error ? (
          <Text style={[styles.lockError, { color: colors.destructive }]}>{error}</Text>
        ) : (
          <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>
            Use your biometric to open your diary
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.lockBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
        onPress={handleUnlock}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Ionicons name="finger-print" size={20} color={colors.primaryForeground} />
            <Text style={[styles.lockBtnText, { color: colors.primaryForeground }]}>Unlock</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const { isAuthenticated, isUnlocked, unlock } = useApp();

  // Guard: unauthenticated users are redirected to auth
  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  // Guard: authenticated but not yet unlocked — show biometric lock
  if (!isUnlocked) {
    return <BiometricLock onUnlock={unlock} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : undefined,
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  lockRoot: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 40 },
  lockCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  lockIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  lockTitle: { fontSize: 24, textAlign: 'center' },
  lockSub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  lockError: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  lockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 12,
  },
  lockBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
