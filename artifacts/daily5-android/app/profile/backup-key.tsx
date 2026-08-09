/**
 * Recovery Key screen.
 *
 * Shows the user's 64-char AES-256 encryption key formatted in groups of 8,
 * and lets them copy it or enter a different key for cross-device restore.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Alert, TextInput, ActivityIndicator, ScrollView, Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOrCreateRecoveryKey, formatRecoveryKey, importRecoveryKey } from '@/lib/backup';
import { ProtectedScreen } from '@/components/ProtectedScreen';

function BackupKeyContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadKey();
  }, []);

  async function loadKey() {
    try {
      const key = await getOrCreateRecoveryKey();
      setRecoveryKey(key);
    } catch (e) {
      console.warn('Could not load recovery key', e);
    }
    setLoading(false);
  }

  async function handleCopy() {
    if (!recoveryKey) return;
    try {
      Clipboard.setString(formatRecoveryKey(recoveryKey));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard.');
    }
  }

  async function handleImport() {
    if (!importInput.trim()) return;
    setImporting(true);
    const ok = await importRecoveryKey(importInput);
    setImporting(false);
    if (ok) {
      const key = await getOrCreateRecoveryKey();
      setRecoveryKey(key);
      setShowImport(false);
      setImportInput('');
      Alert.alert('Key imported', 'Your recovery key has been updated. You can now restore your backup.');
    } else {
      Alert.alert(
        'Invalid key',
        'The key must be exactly 64 hexadecimal characters (with or without dashes). Please check and try again.',
      );
    }
  }

  // Format key into 4-char groups per line for readability
  function renderKey(hex: string) {
    const formatted = formatRecoveryKey(hex);
    const parts = formatted.split('-');
    // 8 groups of 8 → show as 2 rows of 4
    const rows: string[][] = [parts.slice(0, 4), parts.slice(4)];
    return rows.map((row, ri) => (
      <Text key={ri} style={[styles.keyRow, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {row.join('  ')}
      </Text>
    ));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Recovery Key
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.accentLight, borderColor: colors.border }]}>
          <Ionicons name="warning-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            This key encrypts your diary backup. Write it down and keep it somewhere safe.{'\n'}
            If you switch to a new device and don't have iCloud or Google account backup enabled,
            you'll need this key to restore your diary.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Your recovery key</Text>
        <View style={[styles.keyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
          ) : recoveryKey ? (
            <>
              <View style={styles.keyDisplay}>
                {renderKey(recoveryKey)}
              </View>
              <View style={[styles.keyActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={styles.keyAction} onPress={handleCopy}>
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={18}
                    color={copied ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.keyActionLabel, { color: copied ? colors.primary : colors.mutedForeground }]}>
                    {copied ? 'Copied!' : 'Copy key'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              Could not load recovery key. Please try again.
            </Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>Import a key</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!showImport ? (
            <TouchableOpacity style={styles.row} onPress={() => setShowImport(true)}>
              <Ionicons name="enter-outline" size={20} color={colors.mutedForeground} />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Enter a recovery key</Text>
                <Text style={[styles.rowSub, { color: colors.tertiary }]}>
                  Use this when restoring from another device
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.importForm}>
              <Text style={[styles.importLabel, { color: colors.foreground }]}>
                Paste or type your 64-character recovery key:
              </Text>
              <TextInput
                style={[styles.importInput, {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                  fontFamily: 'Inter_400Regular',
                }]}
                value={importInput}
                onChangeText={setImportInput}
                placeholder="xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx"
                placeholderTextColor={colors.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <View style={styles.importButtons}>
                <TouchableOpacity
                  style={[styles.importBtn, { borderColor: colors.border }]}
                  onPress={() => { setShowImport(false); setImportInput(''); }}
                >
                  <Text style={[styles.importBtnLabel, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.importBtn, styles.importBtnPrimary, { backgroundColor: colors.primary, opacity: importing ? 0.6 : 1 }]}
                  onPress={handleImport}
                  disabled={importing}
                >
                  {importing
                    ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                    : <Text style={[styles.importBtnLabel, { color: colors.primaryForeground }]}>Import</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.footnote, { color: colors.tertiary }]}>
          The key is also stored in your device's secure enclave and automatically backed up
          via iCloud Keychain (iOS) or Android Backup Service (Android).
        </Text>
      </ScrollView>
    </View>
  );
}

export default function BackupKeyScreen() {
  return (
    <ProtectedScreen>
      <BackupKeyContent />
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
  keyCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  keyDisplay: {
    padding: 20, gap: 10, alignItems: 'center',
  },
  keyRow: {
    fontSize: 14, letterSpacing: 1.5,
  },
  keyActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  keyAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  keyActionLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowMeta: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  importForm: { padding: 16, gap: 12 },
  importLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  importInput: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 10,
    padding: 12, fontSize: 12, lineHeight: 18, minHeight: 80,
  },
  importButtons: { flexDirection: 'row', gap: 8 },
  importBtn: {
    flex: 1, height: 42, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth,
  },
  importBtnPrimary: { borderWidth: 0 },
  importBtnLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  errorText: { padding: 20, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  footnote: {
    fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18,
    textAlign: 'center', paddingHorizontal: 8,
  },
});
