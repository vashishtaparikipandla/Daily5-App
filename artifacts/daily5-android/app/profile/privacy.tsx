import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { ProtectedScreen } from '@/components/ProtectedScreen';

function PrivacyContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { biometricEnabled, setBiometricEnabled, deleteAccount } = useApp();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [togglingBiometric, setTogglingBiometric] = useState(false);

  async function handleBiometricToggle(next: boolean) {
    if (togglingBiometric) return;
    setTogglingBiometric(true);
    const result = await setBiometricEnabled(next);
    if (next && !result) {
      Alert.alert(
        'Could not enable biometric',
        'Either biometric is not set up on this device, or the authentication challenge was cancelled.',
      );
    }
    setTogglingBiometric(false);
  }

  function handleExport() {
    Alert.alert('Export data', 'Your diary data export will be prepared. This feature is coming soon.');
  }

  function handleDelete() {
    Alert.alert(
      'Delete account',
      'This will permanently delete all your diary entries and books. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            router.replace('/auth');
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Data & Privacy</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.accentLight, borderColor: colors.border }]}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Your diary is stored locally on this device. Nothing is sent to any server without your explicit action.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Ionicons name="finger-print" size={20} color={colors.mutedForeground} />
            <View style={styles.rowMeta}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Biometric unlock</Text>
              <Text style={[styles.rowSub, { color: colors.tertiary }]}>
                {biometricEnabled
                  ? 'Required to open your diary'
                  : 'Tap to enable fingerprint or face unlock'}
              </Text>
            </View>
            {togglingBiometric ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                thumbColor={biometricEnabled ? colors.primaryForeground : colors.tertiary}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            )}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Your data</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
            onPress={handleExport}
          >
            <Ionicons name="download-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Export my data</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            <Text style={[styles.rowLabel, { color: colors.destructive }]}>Delete account</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function PrivacyScreen() {
  return (
    <ProtectedScreen>
      <PrivacyContent />
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
  content: { padding: 20, gap: 12 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowMeta: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },
});
