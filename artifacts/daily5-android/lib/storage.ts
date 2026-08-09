import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Book } from './data';

export const KEYS = {
  BOOKS: '@daily5/books',
  SEED_VERSION: '@daily5/seed_version',
  AUTH_USER: '@daily5/auth_user',
  ONBOARDED: '@daily5/onboarded',
  THEME: '@daily5/theme',
  BIOMETRIC: '@daily5/biometric_enabled',
  RECENT_SEARCHES: '@daily5/recent_searches',
  NOTIF_PREFS: '@daily5/notif_prefs',
  BACKUP_ENABLED: '@daily5/backup_enabled',
  // Google Drive backup
  DRIVE_CONNECTED: '@daily5/drive_connected',
  DRIVE_ACCOUNT: '@daily5/drive_account',
  DRIVE_SCHEDULE: '@daily5/drive_schedule',   // 'off' | 'daily' | 'weekly'
  DRIVE_LAST_BACKUP: '@daily5/drive_last_backup', // ISO timestamp
};

export async function loadBooks(): Promise<Book[]> {
  try {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    return json ? (JSON.parse(json) as Book[]) : [];
  } catch { return []; }
}

export async function saveBooks(books: Book[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
}

export async function getSeedVersion(): Promise<number> {
  const v = await AsyncStorage.getItem(KEYS.SEED_VERSION);
  return v ? parseInt(v, 10) : 0;
}

export async function setSeedVersion(v: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.SEED_VERSION, String(v));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
