import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Alert, Switch, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useDiary } from '@/contexts/DiaryContext';
import { useDriveBackup, DriveSchedule } from '@/contexts/DriveBackupContext';
import { ProtectedScreen } from '@/components/ProtectedScreen';
import { exportBackupFile, importBackupFromFilePicker } from '@/lib/backup';

// Required by expo-auth-session to finalise the OAuth redirect
WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(d: Date | null): string {
  if (!d) return 'Never';
  const now = new Date();
  const diffMs   = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7)   return `${diffD} days ago`;
  return d.toLocaleDateString();
}

// ─── Schedule picker ──────────────────────────────────────────────────────────

const SCHEDULE_OPTIONS: { value: DriveSchedule; label: string }[] = [
  { value: 'off',    label: 'Off' },
  { value: 'daily',  label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

function SchedulePicker({
  value,
  onChange,
  disabled,
  colors,
}: {
  value: DriveSchedule;
  onChange: (v: DriveSchedule) => void;
  disabled?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={pickerStyles.row}>
      {SCHEDULE_OPTIONS.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              pickerStyles.chip,
              {
                backgroundColor: active ? colors.primary : colors.accentLight,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            onPress={() => !disabled && onChange(opt.value)}
            disabled={disabled}
          >
            <Text
              style={[
                pickerStyles.label,
                { color: active ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip:  { flex: 1, borderRadius: 8, borderWidth: 1, alignItems: 'center', paddingVertical: 7 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});

// ─── Main screen content ──────────────────────────────────────────────────────

function PrivacyContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, biometricEnabled, setBiometricEnabled, deleteAccount, backupEnabled, setBackupEnabled,
          driveConnected, driveAccount, setDriveConnection, disconnectGoogleDrive, getDriveToken } = useApp();
  const { performBackup, restoreFromBackup, lastBackupTime, refreshBackupTime } = useDiary();
  const {
    driveWorking, lastDriveBackupTime, driveSchedule,
    setDriveSchedule, backupToDrive, restoreFromDrive, refreshDriveBackupTime,
  } = useDriveBackup();

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [togglingBiometric, setTogglingBiometric] = useState(false);
  const [togglingBackup,    setTogglingBackup]     = useState(false);
  const [backingUp,         setBackingUp]          = useState(false);
  const [importing,         setImporting]          = useState(false);
  const [connectingDrive,   setConnectingDrive]    = useState(false);
  const [driveTokenValid,   setDriveTokenValid]    = useState(false);

  // ── Drive OAuth request (drive.appdata scope) ──────────────────────────
  const [, driveResponse, drivePromptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId:     WEB_CLIENT_ID,
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });

  // Resolve token validity whenever Drive connection state changes
  useEffect(() => {
    if (!driveConnected) { setDriveTokenValid(false); return; }
    getDriveToken().then(tok => setDriveTokenValid(!!tok));
  }, [driveConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!driveResponse) return;
    if (driveResponse.type === 'success') {
      const tok = driveResponse.authentication?.accessToken ?? '';
      const expiresIn = (driveResponse.authentication as { expiresIn?: number } | null)?.expiresIn ?? 3600;
      const expiry = Date.now() + expiresIn * 1000 - 60_000; // 1-min buffer
      const email = user?.email ?? driveAccount ?? '';
      setDriveConnection(email, tok, expiry)
        .then(() => {
          setDriveTokenValid(true);
          setConnectingDrive(false);
          Alert.alert('Google Drive connected', 'Your diary can now be backed up to your Google Drive.');
        });
    } else if (driveResponse.type === 'error') {
      Alert.alert('Connection failed', 'Could not connect to Google Drive. Please try again.');
      setConnectingDrive(false);
    } else {
      setConnectingDrive(false);
    }
  }, [driveResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshBackupTime();
    refreshDriveBackupTime();
  }, []);

  // ── Local backup handlers ──────────────────────────────────────────────

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
      await setBackupEnabled(true);
      const ok = await performBackup();
      if (!ok) {
        await setBackupEnabled(false);
        Alert.alert('Backup failed', 'Could not create the initial backup. Please try again.');
      } else {
        Alert.alert(
          'Backup enabled',
          'Your diary is now encrypted and backed up automatically.',
        );
        await refreshBackupTime();
      }
    } else {
      Alert.alert(
        'Disable backup?',
        'Your diary will no longer be backed up automatically. Existing backup files will be kept on this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: async () => { await setBackupEnabled(false); setTogglingBackup(false); } },
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
    if (ok) { await refreshBackupTime(); Alert.alert('Backup complete', 'Your diary has been encrypted and saved.'); }
    else    { Alert.alert('Backup failed', 'Could not save the backup. Please try again.'); }
  }

  async function handleExport() {
    try { await exportBackupFile(); }
    catch (e: unknown) { Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error'); }
  }

  async function handleImport() {
    if (importing) return;
    Alert.alert(
      'Import backup',
      'This will replace your current diary with the contents of the backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          onPress: async () => {
            setImporting(true);
            const data = await importBackupFromFilePicker();
            setImporting(false);
            if (!data) { Alert.alert('Import failed', 'Could not decrypt the backup. Make sure you are using the correct recovery key.'); return; }
            const ok = await restoreFromBackup();
            Alert.alert(ok ? 'Restored' : 'Restore failed', ok ? 'Your diary has been restored.' : 'The backup data was invalid.');
          },
        },
      ],
    );
  }

  // ── Drive handlers ─────────────────────────────────────────────────────

  async function handleConnectDrive() {
    if (connectingDrive) return;
    if (!ANDROID_CLIENT_ID && !WEB_CLIENT_ID) {
      Alert.alert('Not configured', 'Google client IDs are not set. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to connect Google Drive.');
      return;
    }
    setConnectingDrive(true);
    await drivePromptAsync();
  }

  async function handleReconnectDrive() {
    setConnectingDrive(true);
    await drivePromptAsync();
  }

  async function handleDisconnectDrive() {
    Alert.alert(
      'Disconnect Google Drive?',
      'Your diary will no longer back up to Google Drive. Existing Drive backups are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectGoogleDrive();
            setDriveTokenValid(false);
          },
        },
      ],
    );
  }

  async function handleDriveBackupNow() {
    const tok = await getDriveToken();
    if (!tok) {
      Alert.alert('Session expired', 'Your Google Drive session has expired. Please reconnect to continue backing up.');
      return;
    }
    const ok = await backupToDrive();
    if (ok) { await refreshDriveBackupTime(); Alert.alert('Backup complete', 'Your diary has been backed up to Google Drive.'); }
    else    { Alert.alert('Backup failed', 'Could not upload to Google Drive. Please try again.'); }
  }

  async function handleDriveRestore() {
    Alert.alert(
      'Restore from Google Drive?',
      'This will replace your current diary with the latest Drive backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            const tok = await getDriveToken();
            if (!tok) { Alert.alert('Session expired', 'Please reconnect to Google Drive first.'); return; }
            const ok = await restoreFromDrive();
            Alert.alert(ok ? 'Restored' : 'Restore failed', ok ? 'Your diary has been restored from Google Drive.' : 'No backup found or decryption failed.');
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
          onPress: async () => { await deleteAccount(); router.replace('/auth'); },
        },
      ],
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const driveSessionExpired = driveConnected && !driveTokenValid;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Data & Privacy
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
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
                {biometricEnabled ? 'Required to open your diary' : 'Enable fingerprint or face unlock'}
              </Text>
            </View>
            {togglingBiometric
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Switch value={biometricEnabled} onValueChange={handleBiometricToggle}
                  thumbColor={biometricEnabled ? colors.primaryForeground : colors.tertiary}
                  trackColor={{ true: colors.primary, false: colors.border }} />}
          </View>
        </View>

        {/* Local encrypted backup */}
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Local Encrypted Backup</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomWidth: backupEnabled ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }]}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.mutedForeground} />
            <View style={styles.rowMeta}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Back up to this device</Text>
              <Text style={[styles.rowSub, { color: colors.tertiary }]}>
                {backupEnabled ? `Last backup: ${formatTime(lastBackupTime)}` : 'Encrypted backup saved locally'}
              </Text>
            </View>
            {togglingBackup
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Switch value={backupEnabled} onValueChange={handleBackupToggle}
                  thumbColor={backupEnabled ? colors.primaryForeground : colors.tertiary}
                  trackColor={{ true: colors.primary, false: colors.border }} />}
          </View>

          {backupEnabled && (<>
            <TouchableOpacity style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={handleBackupNow} disabled={backingUp}>
              <Ionicons name="refresh-outline" size={20} color={colors.mutedForeground} />
              <Text style={[styles.rowLabel, { color: colors.foreground, flex: 1 }]}>Back up now</Text>
              {backingUp ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={() => router.push('/profile/backup-key')}>
              <Ionicons name="key-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Recovery key</Text>
                <Text style={[styles.rowSub, { color: colors.tertiary }]}>Save this to restore on a new device</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={handleExport}>
              <Ionicons name="share-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Export backup file</Text>
                <Text style={[styles.rowSub, { color: colors.tertiary }]}>Share to another location</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={handleImport} disabled={importing}>
              <Ionicons name="download-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Import backup file</Text>
                <Text style={[styles.rowSub, { color: colors.tertiary }]}>Restore from an exported backup</Text>
              </View>
              {importing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />}
            </TouchableOpacity>
          </>)}

          {!backupEnabled && (
            <TouchableOpacity style={styles.row} onPress={() => router.push('/profile/backup-key')}>
              <Ionicons name="key-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Enter recovery key</Text>
                <Text style={[styles.rowSub, { color: colors.tertiary }]}>Import a key from another device</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Google Drive backup */}
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Google Drive Backup</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Not connected */}
          {!driveConnected && (
            <View>
              <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <Ionicons name="logo-google" size={20} color={colors.mutedForeground} />
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>Google Drive</Text>
                  <Text style={[styles.rowSub, { color: colors.tertiary }]}>
                    Back up your encrypted diary to your personal Drive
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.row, styles.connectBtn, { backgroundColor: colors.accentLight }]}
                onPress={handleConnectDrive} disabled={connectingDrive}>
                {connectingDrive
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <><Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                     <Text style={[styles.connectLabel, { color: colors.primary }]}>Connect Google Drive</Text></>}
              </TouchableOpacity>
            </View>
          )}

          {/* Connected — session expired */}
          {driveSessionExpired && (
            <View>
              <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <Ionicons name="logo-google" size={20} color={colors.destructive} />
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                    {driveAccount ?? 'Google Drive'}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.destructive }]}>Session expired — tap to reconnect</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={handleReconnectDrive} disabled={connectingDrive}>
                {connectingDrive
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <><Ionicons name="refresh-outline" size={20} color={colors.primary} />
                     <Text style={[styles.rowLabel, { color: colors.primary, flex: 1 }]}>Reconnect</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={handleDisconnectDrive}>
                <Ionicons name="unlink-outline" size={20} color={colors.destructive} />
                <Text style={[styles.rowLabel, { color: colors.destructive, flex: 1 }]}>Disconnect Drive</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Connected — session valid */}
          {driveConnected && driveTokenValid && (
            <View>
              {/* Account row */}
              <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <Ionicons name="logo-google" size={20} color={colors.primary} />
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                    {driveAccount ?? 'Google Drive connected'}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.tertiary }]}>
                    Last backup: {formatTime(lastDriveBackupTime)}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              </View>

              {/* Back up now */}
              <TouchableOpacity
                style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={handleDriveBackupNow} disabled={driveWorking}>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: colors.foreground, flex: 1 }]}>Back up to Drive now</Text>
                {driveWorking
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />}
              </TouchableOpacity>

              {/* Restore */}
              <TouchableOpacity
                style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={handleDriveRestore} disabled={driveWorking}>
                <Ionicons name="cloud-download-outline" size={20} color={colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: colors.foreground, flex: 1 }]}>Restore from Drive</Text>
                {driveWorking
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />}
              </TouchableOpacity>

              {/* Schedule picker */}
              <View style={[styles.scheduleHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <Ionicons name="time-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Auto-backup schedule</Text>
              </View>
              <SchedulePicker
                value={driveSchedule}
                onChange={setDriveSchedule}
                disabled={driveWorking}
                colors={colors}
              />

              {/* Disconnect */}
              <TouchableOpacity
                style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                onPress={handleDisconnectDrive}>
                <Ionicons name="unlink-outline" size={20} color={colors.destructive} />
                <Text style={[styles.rowLabel, { color: colors.destructive, flex: 1 }]}>Disconnect Drive</Text>
              </TouchableOpacity>
            </View>
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
          Backups are encrypted with AES-256-GCM before leaving this device. Your key never leaves the device.
          Drive backups are stored in a private app folder — not visible in your Drive file browser.
        </Text>
      </ScrollView>
    </View>
  );
}

export default function PrivacyScreen() {
  return <ProtectedScreen><PrivacyContent /></ProtectedScreen>;
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
  connectBtn: { margin: 10, borderRadius: 10, justifyContent: 'center', gap: 8 },
  connectLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  scheduleHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  footnote: {
    fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18,
    textAlign: 'center', paddingHorizontal: 8,
  },
});
