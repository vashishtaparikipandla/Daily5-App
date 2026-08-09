/**
 * DriveBackupContext
 *
 * Handles encrypted Google Drive backup and restore for Daily 5.
 *
 * Architecture:
 *   - All Drive API calls go through lib/gdrive.ts with the access token
 *     obtained from AppContext.getDriveToken().
 *   - Backup content is the same AES-256-GCM BackupPayload produced by
 *     lib/backup.ts; it's serialised as JSON and stored as a plain text
 *     file named "daily5_backup.d5b" in the app's private Drive appDataFolder.
 *   - The context tracks the Drive file ID of the most-recent backup so
 *     subsequent uploads overwrite the same file (Drive keeps one copy).
 *
 * Schedule:
 *   - Users can choose Off / Daily / Weekly.
 *   - On each mount, if enough time has passed since the last Drive backup
 *     the context silently runs a backup in the background.
 *   - (True OS-level background fetch requires a native build; this on-open
 *     approach covers the common case without extra native modules.)
 *
 * Post-install restore:
 *   - If Drive is connected and local books are empty (fresh install), the
 *     context checks Drive for a backup and presents a one-tap restore alert.
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { KEYS } from '@/lib/storage';
import { encryptBackup, decryptBackup, BackupPayload } from '@/lib/backup';
import {
  listBackupFiles, uploadBackupToDrive, downloadBackupFromDrive,
  DriveFile,
} from '@/lib/gdrive';
import { useApp } from '@/contexts/AppContext';
import { useDiary } from '@/contexts/DiaryContext';
import type { Book } from '@/lib/data';

export type DriveSchedule = 'off' | 'daily' | 'weekly';

interface DriveBackupContextValue {
  /** Whether a Drive backup/restore operation is in progress. */
  driveWorking: boolean;
  /** Timestamp of the last successful Drive backup, or null. */
  lastDriveBackupTime: Date | null;
  /** Current auto-backup schedule. */
  driveSchedule: DriveSchedule;
  /** Change the auto-backup schedule and persist it. */
  setDriveSchedule: (s: DriveSchedule) => Promise<void>;
  /** Run a manual Drive backup immediately. Returns true on success. */
  backupToDrive: () => Promise<boolean>;
  /** Download latest backup from Drive and restore books. Returns true on success. */
  restoreFromDrive: () => Promise<boolean>;
  /** Refresh the last Drive backup time from AsyncStorage. */
  refreshDriveBackupTime: () => Promise<void>;
}

const DriveBackupContext = createContext<DriveBackupContextValue | null>(null);

// ─── Schedule thresholds ──────────────────────────────────────────────────────
const SCHEDULE_MS: Record<DriveSchedule, number> = {
  off: Infinity,
  daily: 20 * 60 * 60 * 1000,   // 20 h (allows some drift)
  weekly: 6 * 24 * 60 * 60 * 1000, // 6 days
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DriveBackupProvider({ children }: { children: React.ReactNode }) {
  const { driveConnected, getDriveToken } = useApp();
  const { books, isLoading: diaryLoading, restoreFromData } = useDiary();

  const [driveWorking, setDriveWorking]             = useState(false);
  const [lastDriveBackupTime, setLastDriveBackupTime] = useState<Date | null>(null);
  const [driveSchedule, setDriveScheduleState]      = useState<DriveSchedule>('off');

  // Cache the Drive file ID so subsequent uploads reuse the same file.
  const knownFileIdRef = useRef<string | null>(null);
  // Guard against running the auto-backup check twice on mount.
  const initRanRef = useRef(false);

  // ── Load persisted Drive settings ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [scheduleRaw, lastRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.DRIVE_SCHEDULE),
        AsyncStorage.getItem(KEYS.DRIVE_LAST_BACKUP),
      ]);
      if (scheduleRaw) setDriveScheduleState(scheduleRaw as DriveSchedule);
      if (lastRaw) setLastDriveBackupTime(new Date(lastRaw));
    }
    load().catch(() => {});
  }, []);

  // ── Post-install restore + scheduled auto-backup ──────────────────────────
  // Runs once when Drive is connected and the diary has finished loading.
  useEffect(() => {
    if (!driveConnected || diaryLoading || initRanRef.current) return;
    initRanRef.current = true;
    handleInit();
  }, [driveConnected, diaryLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInit() {
    const token = await getDriveToken();
    if (!token) return;

    // Discover existing backup file ID
    const listResult = await listBackupFiles(token);
    if (!listResult.ok || !listResult.data) return;
    const [latestFile] = listResult.data;
    if (latestFile) knownFileIdRef.current = latestFile.id;

    // ── Post-install restore prompt ──
    if (books.length === 0 && latestFile) {
      const backupDate = new Date(latestFile.modifiedTime).toLocaleDateString(
        undefined,
        { month: 'long', day: 'numeric', year: 'numeric' },
      );
      Alert.alert(
        'Backup found on Google Drive',
        `A Daily 5 backup from ${backupDate} was found in your Google Drive. Would you like to restore your diary?`,
        [
          {
            text: 'Restore',
            onPress: () => doRestoreFromDrive(token, latestFile.id),
          },
          { text: 'Skip', style: 'cancel' },
        ],
      );
      return; // Skip auto-backup if we just offered a restore
    }

    // ── Scheduled auto-backup ──
    if (driveSchedule === 'off') return;
    const threshold = SCHEDULE_MS[driveSchedule];
    const lastMs = lastDriveBackupTime ? Date.now() - lastDriveBackupTime.getTime() : Infinity;
    if (lastMs >= threshold) {
      // Silently backup in the background — do not alert on success
      doBackupToDrive(token, books).catch(() => {});
    }
  }

  // ── Core backup ───────────────────────────────────────────────────────────

  async function doBackupToDrive(token: string, booksToBackup: Book[]): Promise<boolean> {
    try {
      const payload = await encryptBackup(booksToBackup);
      const content = JSON.stringify(payload);

      // Try to get the known file ID if we don't have one yet
      if (!knownFileIdRef.current) {
        const list = await listBackupFiles(token);
        if (list.ok && list.data?.length) {
          knownFileIdRef.current = list.data[0].id;
        }
      }

      const result = await uploadBackupToDrive(token, content, knownFileIdRef.current ?? undefined);
      if (!result.ok || !result.data) return false;

      knownFileIdRef.current = result.data.id;
      const now = new Date();
      setLastDriveBackupTime(now);
      await AsyncStorage.setItem(KEYS.DRIVE_LAST_BACKUP, now.toISOString());
      return true;
    } catch {
      return false;
    }
  }

  async function doRestoreFromDrive(token: string, fileId: string): Promise<boolean> {
    try {
      const dlResult = await downloadBackupFromDrive(token, fileId);
      if (!dlResult.ok || !dlResult.data) return false;

      const payload: BackupPayload = JSON.parse(dlResult.data);
      const data = await decryptBackup(payload);
      if (!data || !Array.isArray(data)) return false;
      return restoreFromData(data as Book[]);
    } catch {
      return false;
    }
  }

  // ── Public actions ────────────────────────────────────────────────────────

  const backupToDrive = useCallback(async (): Promise<boolean> => {
    if (driveWorking) return false;
    setDriveWorking(true);
    try {
      const token = await getDriveToken();
      if (!token) return false;
      return await doBackupToDrive(token, books);
    } finally {
      setDriveWorking(false);
    }
  }, [driveWorking, books, getDriveToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const restoreFromDrive = useCallback(async (): Promise<boolean> => {
    if (driveWorking) return false;
    setDriveWorking(true);
    try {
      const token = await getDriveToken();
      if (!token) return false;

      const listResult = await listBackupFiles(token);
      if (!listResult.ok || !listResult.data?.length) return false;
      const file: DriveFile = listResult.data[0];
      return await doRestoreFromDrive(token, file.id);
    } finally {
      setDriveWorking(false);
    }
  }, [driveWorking, getDriveToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDriveSchedule = useCallback(async (s: DriveSchedule) => {
    setDriveScheduleState(s);
    await AsyncStorage.setItem(KEYS.DRIVE_SCHEDULE, s);
  }, []);

  const refreshDriveBackupTime = useCallback(async () => {
    const raw = await AsyncStorage.getItem(KEYS.DRIVE_LAST_BACKUP);
    setLastDriveBackupTime(raw ? new Date(raw) : null);
  }, []);

  return (
    <DriveBackupContext.Provider value={{
      driveWorking,
      lastDriveBackupTime,
      driveSchedule,
      setDriveSchedule,
      backupToDrive,
      restoreFromDrive,
      refreshDriveBackupTime,
    }}>
      {children}
    </DriveBackupContext.Provider>
  );
}

export function useDriveBackup() {
  const ctx = useContext(DriveBackupContext);
  if (!ctx) throw new Error('useDriveBackup must be inside DriveBackupProvider');
  return ctx;
}
