import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Alert, Switch, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useDiary } from '@/contexts/DiaryContext';
import { ProtectedScreen } from '@/components/ProtectedScreen';
import { exportBackupFile, importBackupFromFilePicker } from '@/lib/backup';

function PrivacyContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { biometricEnabled, setBiometricEnabled, deleteAccount, backupEnabled, setBackupEnabled } = useApp();
  const { performBackup, restoreFromBackup, lastBackupTime, refreshBackupTime } = useDiary();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [togglingBiometric, setTogglingBiometric] = useState(false);
  const [togglingBackup, setTogglingBackup] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    refreshBackupTime();
  }, []);

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

  async function handleBackupToggle(next: boolean) {
    if (togglingBackup) return;
    setTogglingBackup(true);

    if (next) {
      // Enabling — do an initial backup immediately
      await setBackupEnabled(true);
      const ok = await performBackup();
      if (!ok) {
        // If initial backup failed, revert
        await setBackupEnabled(false);
        Alert.alert(
          'Backup failed',
          'Could not create the initial backup. Please try again.',
        );
      } else {
        Alert.alert(
          'Backup enabled',
          'Your diary is now encrypted and backed up automatically. You can view your recovery key below to save it somewhere safe.',
        );
        await refreshBackupTime();
      }
    } else {
      Alert.alert(
        'Disable backup?',
        'Your diary will no longer be backed up automatically. Existing backup files will be kept on this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await setBackupEnabled(false);
              setTogglingBackup(false);
            },
          },
        ],
      );
      setTogglingBackup(false);
      return;
    }

    setTogglingBackup(false);
  }

  async function handleBackupNow() {
    if (backingUp) return;
    setBackingUp(true);
    const ok = await performBackup();
    setBackingUp(false);
    if (ok) {
      await refreshBackupTime();
      Alert.alert('Backup complete', 'Your diary has been encrypted and saved.');
    } else {
      Alert.alert('Backup failed', 'Could not save the backup. Please try again.');
    }
  }

  async function handleExport() {
    try {
      await exportBackupFile();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Export failed', msg);
    }
  }

  async function handleImport() {
    if (importing) return;

    Alert.alert(
      'Import backup',
      'This will replace your current diary with the contents of the backup file. Make sure your recovery key matches the one used to create the backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          onPress: async () => {
            setImporting(true);
            const data = await importBackupFromFilePicker();
            setImporting(false);
            if (!data) {
              Alert.alert(
                'Import failed',
                'Could not decrypt the backup. Make sure you are using the correct recovery key.',
              );
              return;
            }
            const ok = await restoreFromBackup();
            if (ok) {
              Alert.alert('Restored', 'Your diary has been restored from the backup file.');
            } else {
              Alert.alert('Restore failed', 'The backup data was invalid.');
            }
          },
        },
      ],
    );
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

  function formatBackupTime(d: Date | null): string {
    if (!d) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.accentLight, borderColor: colors.border }]}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Your diary is stored locally on this device. Backup is end-to-end encrypted — only you hold the key.
          </Text>
        </View>

        {/* Security */}
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

        {/* Backup */}
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Encrypted Backup</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Toggle */}
          <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.rowMeta}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Back up my diary</Text>
              <Text style={[styles.rowSub, { color: colors.tertiary }]}>
                {backupEnabled
                  ? `Last backup: ${formatBackupTime(lastBackupTime)}`
                  : 'Encrypted backup saved to this device'}
              </Text>
            </View>
            {togglingBackup ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={backupEnabled}
                onValueChange={handleBackupToggle}
                thumbColor={backupEnabled ? colors.primaryForeground : colors.tertiary}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            )}
          </View>

          {backupEnabled && (
            <>
              {/* Back up now */}
              <TouchableOpacity
                style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={handleBackupNow}
                disabled={backingUp}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: colors.foreground, flex: 1 }]}>Back up now</Text>
                {backingUp
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />}
              </TouchableOpacity>

              {/* View recovery key */}
              <TouchableOpacity
                style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={() => router.push('/profile/backup-key')}
              >
                <Ionicons name="key-outline" size={20} color={colors.mutedForeground} />
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>Recovery key</Text>
                  <Text style={[styles.rowSub, { color: colors.tertiary }]}>Save this to restore on a new device</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
              </TouchableOpacity>

              {/* Export */}
              <TouchableOpacity
                style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={handleExport}
              >
                <Ionicons name="share-outline" size={20} color={colors.mutedForeground} />
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>Export backup file</Text>
                  <Text style={[styles.rowSub, { color: colors.tertiary }]}>Share the encrypted file to another location</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
              </TouchableOpacity>

              {/* Import */}
              <TouchableOpacity
                style={styles.row}
                onPress={handleImport}
                disabled={importing}
              >
                <Ionicons name="download-outline" size={20} color={colors.mutedForeground} />
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>Import backup file</Text>
                  <Text style={[styles.rowSub, { color: colors.tertiary }]}>Restore from an exported backup</Text>
                </View>
                {importing
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />}
              </TouchableOpacity>
            </>
          )}

          {!backupEnabled && (
            /* Enter recovery key when backup is off — for cross-device restore */
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/profile/backup-key')}
            >
              <Ionicons name="key-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Enter recovery key</Text>
                <Text style={[styles.rowSub, { color: colors.tertiary }]}>Import a key from another device</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Your data */}
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Your data</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.row} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            <Text style={[styles.rowLabel, { color: colors.destructive }]}>Delete account</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footnote, { color: colors.tertiary }]}>
          Backups are encrypted with AES-256-GCM before being saved. Your key never leaves this device.
          On iOS, backups sync with iCloud automatically. On Android, they are included in Android Auto Backup.
        </Text>
      </ScrollView>
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
  content: { padding: 20, gap: 12, paddingBottom: 40 },
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
  footnote: {
    fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18,
    textAlign: 'center', paddingHorizontal: 8,
  },
});
