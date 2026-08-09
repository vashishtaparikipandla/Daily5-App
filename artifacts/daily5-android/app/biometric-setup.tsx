import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isBiometricAvailable } from '@/lib/biometric';

export default function BiometricSetup() {
  const { setBiometricEnabled } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    isBiometricAvailable().then(setAvailable);
  }, []);

  async function handleEnable() {
    setError('');
    // setBiometricEnabled now performs availability + auth challenge internally
    const success = await setBiometricEnabled(true);
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError('Biometric authentication failed or cancelled. Try again, or skip for now.');
    }
  }

  function handleSkip() {
    router.replace('/(tabs)');
  }

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="finger-print" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Quick unlock
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {available
            ? 'Use your fingerprint or face to open Daily 5 without typing anything.'
            : 'Biometric authentication is not set up on this device. You can enable it later in Profile → Data & Privacy.'}
        </Text>
        {!!error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        )}
      </View>

      <View style={[styles.actions, { paddingBottom: botPad + 8 }]}>
        {available && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleEnable} activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Enable biometric unlock</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.75}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
            {available ? 'Not now' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, textAlign: 'center', letterSpacing: 0.2 },
  body: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
  actions: { gap: 12 },
  btn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  skipBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
