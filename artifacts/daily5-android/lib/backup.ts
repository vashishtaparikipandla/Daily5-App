/**
 * Encrypted backup for Daily 5 diary data.
 *
 * Encryption: AES-256-GCM via Web Crypto API (available in Hermes RN 0.71+).
 * Key storage: expo-secure-store (backed up to iCloud Keychain on iOS and
 *   Android Backup Service on Android — survives reinstall on the same account).
 * File storage: expo-file-system v19 legacy API, documents directory (backed
 *   up to iCloud on iOS and Android Auto Backup on Android automatically).
 *
 * Cross-device recovery: The encryption key is stored in SecureStore which the
 *   OS backs up. For manual disaster recovery, users can view and note their
 *   64-hex-char recovery key and re-enter it on a new device.
 */

import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const BACKUP_KEY_STORE_KEY = 'daily5_backup_aes_key_v1';
const BACKUP_FILE_NAME = 'daily5_backup.d5b';
const BACKUP_VERSION = 1;

// ─── Helpers ────────────────────────────────────────────────────────────────

function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b642ab(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map(b => parseInt(b, 16)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Returns the backup file path in the app's documents directory. */
export function getBackupFilePath(): string {
  return `${FileSystem.documentDirectory ?? ''}${BACKUP_FILE_NAME}`;
}

// ─── Key management ─────────────────────────────────────────────────────────

async function generateAndStoreKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  const hex = bytesToHex(new Uint8Array(exported));
  await SecureStore.setItemAsync(BACKUP_KEY_STORE_KEY, hex);
  return hex;
}

async function getOrCreateCryptoKey(): Promise<CryptoKey> {
  let hex = await SecureStore.getItemAsync(BACKUP_KEY_STORE_KEY);
  if (!hex) hex = await generateAndStoreKey();
  // Use Array.from to produce a plain ArrayBuffer (avoids SharedArrayBuffer type mismatch)
  const rawBytes = Array.from(hexToBytes(hex));
  const buf = new Uint8Array(rawBytes).buffer as ArrayBuffer;
  return crypto.subtle.importKey('raw', buf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/**
 * Returns the 64-char hex recovery key, creating one if none exists.
 */
export async function getOrCreateRecoveryKey(): Promise<string> {
  let hex = await SecureStore.getItemAsync(BACKUP_KEY_STORE_KEY);
  if (!hex) hex = await generateAndStoreKey();
  return hex;
}

/** Format the recovery key in groups of 8 for display: XXXXXXXX-XXXXXXXX-… */
export function formatRecoveryKey(hex: string): string {
  return hex.match(/.{8}/g)?.join('-') ?? hex;
}

/**
 * Validates and imports a recovery key from a hex string (with or without dashes/spaces).
 * Returns true if successfully stored.
 */
export async function importRecoveryKey(input: string): Promise<boolean> {
  try {
    const clean = input.trim().toLowerCase().replace(/[\s\-]/g, '');
    if (!/^[0-9a-f]{64}$/.test(clean)) return false;
    // Validate it can actually be used as an AES-256 key before storing
    const rawBytes = Array.from(hexToBytes(clean));
    const buf = new Uint8Array(rawBytes).buffer as ArrayBuffer;
    await crypto.subtle.importKey('raw', buf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await SecureStore.setItemAsync(BACKUP_KEY_STORE_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

// ─── Encrypt / Decrypt ──────────────────────────────────────────────────────

export interface BackupPayload {
  version: number;
  createdAt: string;
  platform: string;
  iv: string;
  data: string; // base64 AES-GCM ciphertext
}

export async function encryptBackup(data: unknown): Promise<BackupPayload> {
  const { Platform } = await import('react-native');
  const key = await getOrCreateCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    platform: Platform.OS,
    iv: ab2b64(iv.buffer as ArrayBuffer),
    data: ab2b64(encrypted),
  };
}

export async function decryptBackup(payload: BackupPayload): Promise<unknown> {
  if (payload.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${payload.version}`);
  }
  const key = await getOrCreateCryptoKey();
  const iv = b642ab(payload.iv);
  const ciphertext = b642ab(payload.data);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

// ─── File operations ────────────────────────────────────────────────────────

/** Write an encrypted backup of `data` to the documents directory. */
export async function saveBackupToFile(data: unknown): Promise<void> {
  const payload = await encryptBackup(data);
  await FileSystem.writeAsStringAsync(
    getBackupFilePath(),
    JSON.stringify(payload),
    { encoding: FileSystem.EncodingType.UTF8 },
  );
}

/** Returns true if a backup file exists in the documents directory. */
export async function backupFileExists(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(getBackupFilePath());
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Load and decrypt the backup from the documents directory.
 * Returns null if no backup exists or decryption fails.
 */
export async function loadBackupFromFile(): Promise<unknown | null> {
  try {
    const exists = await backupFileExists();
    if (!exists) return null;
    const json = await FileSystem.readAsStringAsync(
      getBackupFilePath(),
      { encoding: FileSystem.EncodingType.UTF8 },
    );
    const payload: BackupPayload = JSON.parse(json);
    return await decryptBackup(payload);
  } catch {
    return null;
  }
}

/** Returns the timestamp of the last backup, or null if none. */
export async function getLastBackupTime(): Promise<Date | null> {
  try {
    const exists = await backupFileExists();
    if (!exists) return null;
    const json = await FileSystem.readAsStringAsync(
      getBackupFilePath(),
      { encoding: FileSystem.EncodingType.UTF8 },
    );
    const payload: BackupPayload = JSON.parse(json);
    return new Date(payload.createdAt);
  } catch {
    return null;
  }
}

/** Delete the backup file from the documents directory. */
export async function deleteBackupFile(): Promise<void> {
  try {
    const exists = await backupFileExists();
    if (exists) await FileSystem.deleteAsync(getBackupFilePath(), { idempotent: true });
  } catch {}
}

// ─── Share / Import ─────────────────────────────────────────────────────────

/** Share the backup file via the OS sharing sheet. */
export async function exportBackupFile(): Promise<void> {
  const exists = await backupFileExists();
  if (!exists) throw new Error('No backup file found. Please create a backup first.');
  const Sharing = await import('expo-sharing');
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(getBackupFilePath(), {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Save Daily 5 Backup',
    UTI: 'public.data',
  });
}

/**
 * Let the user pick a backup file and decrypt it with the current key.
 * Returns the decrypted data, or null if cancelled / failed.
 */
export async function importBackupFromFilePicker(): Promise<unknown | null> {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const uri = result.assets[0].uri;
    const json = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    const payload: BackupPayload = JSON.parse(json);
    return await decryptBackup(payload);
  } catch {
    return null;
  }
}
