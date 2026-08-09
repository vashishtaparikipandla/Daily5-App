import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { loadBooks, saveBooks } from '@/lib/storage';
import { seedDemoData } from '@/lib/seed';
import { uid, todayStr, monthKey, type Book, type DayLog, type Entry } from '@/lib/data';
import {
  saveBackupToFile,
  loadBackupFromFile,
  backupFileExists,
  getLastBackupTime,
} from '@/lib/backup';
import { useApp } from '@/contexts/AppContext';

interface DiaryContextValue {
  books: Book[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  getBook: (mk: string) => Book | undefined;
  getTodayBook: () => Book | undefined;
  getTodayLog: () => DayLog | undefined;
  getDayLog: (date: string) => DayLog | undefined;
  /** Returns false (and does nothing) if the target book is locked. */
  upsertDayEntries: (date: string, entries: Entry[], extras?: Entry[]) => Promise<boolean>;
  lockCurrentMonth: () => Promise<void>;
  getOnThisDay: () => { book: Book; day: DayLog }[];
  totalMoments: number;
  totalDays: number;
  /** Manually trigger an encrypted backup. */
  performBackup: () => Promise<boolean>;
  /** Restore books from the local backup file. Returns true on success. */
  restoreFromBackup: () => Promise<boolean>;
  /**
   * Restore books from already-decrypted data (e.g. from a Drive download).
   * Saves to AsyncStorage and updates in-memory state.
   */
  restoreFromData: (data: Book[]) => Promise<boolean>;
  /** ISO string of the last successful backup, or null. */
  lastBackupTime: Date | null;
  /** Refresh the last backup time display. */
  refreshBackupTime: () => Promise<void>;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  const { backupEnabled } = useApp();

  useEffect(() => { init(); }, []);

  // Refresh last backup time whenever backup enabled changes
  useEffect(() => {
    if (backupEnabled) refreshBackupTime();
  }, [backupEnabled]);

  async function init() {
    try {
      await seedDemoData();
      const loaded = await loadBooks();

      // If no local books exist, check for a backup to restore
      if (loaded.length === 0) {
        const exists = await backupFileExists();
        if (exists) {
          // Prompt user — this fires after the splash, so the UI is ready
          Alert.alert(
            'Backup found',
            'A Daily 5 backup was found on this device. Would you like to restore your diary?',
            [
              {
                text: 'Restore',
                onPress: async () => {
                  const restored = await loadBackupFromFile();
                  if (restored && Array.isArray(restored) && restored.length > 0) {
                    const booksData = restored as Book[];
                    await saveBooks(booksData);
                    setBooks(booksData);
                    Alert.alert('Restored', 'Your diary has been restored from backup.');
                  } else {
                    Alert.alert(
                      'Restore failed',
                      'The backup could not be decrypted. If you switched devices, enter your recovery key in Data & Privacy first.',
                    );
                  }
                },
              },
              { text: 'Skip', style: 'cancel' },
            ],
          );
        }
      }

      setBooks(loaded);
    } catch (e) { console.warn('DiaryContext init error', e); }
    setIsLoading(false);

    // Load last backup time
    try {
      const t = await getLastBackupTime();
      setLastBackupTime(t);
    } catch {}
  }

  async function refresh() {
    const loaded = await loadBooks();
    setBooks(loaded);
  }

  async function refreshBackupTime() {
    try {
      const t = await getLastBackupTime();
      setLastBackupTime(t);
    } catch {}
  }

  /** Run an encrypted backup of current books. Returns true on success. */
  async function performBackup(booksToBackup?: Book[]): Promise<boolean> {
    try {
      await saveBackupToFile(booksToBackup ?? books);
      const t = await getLastBackupTime();
      setLastBackupTime(t);
      return true;
    } catch (e) {
      console.warn('[DiaryContext] backup failed', e);
      return false;
    }
  }

  /** Restore books from the backup file (with current encryption key). */
  async function restoreFromBackup(): Promise<boolean> {
    try {
      const data = await loadBackupFromFile();
      if (!data || !Array.isArray(data)) return false;
      const booksData = data as Book[];
      await saveBooks(booksData);
      setBooks(booksData);
      return true;
    } catch {
      return false;
    }
  }

  /** Restore books from already-decrypted data (e.g. downloaded from Drive). */
  async function restoreFromData(data: Book[]): Promise<boolean> {
    try {
      if (!data || !Array.isArray(data) || data.length === 0) return false;
      await saveBooks(data);
      setBooks(data);
      return true;
    } catch {
      return false;
    }
  }

  function getBook(mk: string) {
    return books.find(b => b.monthKey === mk);
  }

  function getTodayBook() {
    const mk = monthKey();
    return books.find(b => b.monthKey === mk && !b.locked);
  }

  function getTodayLog() {
    const today = todayStr();
    return getTodayBook()?.days.find(d => d.date === today);
  }

  function getDayLog(date: string) {
    for (const book of books) {
      const day = book.days.find(d => d.date === date);
      if (day) return day;
    }
    return undefined;
  }

  async function upsertDayEntries(
    date: string,
    entries: Entry[],
    extras: Entry[] = [],
  ): Promise<boolean> {
    const mk = date.slice(0, 7);

    // Reject writes to locked books
    const existingBook = books.find(b => b.monthKey === mk);
    if (existingBook?.locked) {
      console.warn('[DiaryContext] upsertDayEntries: book is locked', mk);
      return false;
    }

    let updated = books.map(b => {
      if (b.monthKey !== mk) return b;
      const hasDay = b.days.some(d => d.date === date);
      if (hasDay) {
        return { ...b, days: b.days.map(d => d.date === date ? { ...d, entries, extras } : d) };
      }
      return { ...b, days: [...b.days, { date, entries, extras }] };
    });

    // Create book for this month if none exists
    if (!updated.find(b => b.monthKey === mk)) {
      updated = [...updated, { monthKey: mk, locked: false, days: [{ date, entries, extras }] }];
    }

    await saveBooks(updated);
    setBooks(updated);

    // Auto-backup in the background when enabled
    if (backupEnabled) {
      performBackup(updated).catch(() => {});
    }

    return true;
  }

  async function lockCurrentMonth() {
    const mk = monthKey();
    const updated = books.map(b => b.monthKey === mk ? { ...b, locked: true } : b);
    await saveBooks(updated);
    setBooks(updated);

    // Backup after locking — locking is a significant event
    if (backupEnabled) {
      performBackup(updated).catch(() => {});
    }
  }

  function getOnThisDay() {
    const now = new Date();
    const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentYear = now.getFullYear();
    const result: { book: Book; day: DayLog }[] = [];
    for (const book of books) {
      if (parseInt(book.monthKey.slice(0, 4)) >= currentYear) continue;
      for (const day of book.days) {
        if (day.date.slice(5) === mmdd) result.push({ book, day });
      }
    }
    return result.sort((a, b) => b.day.date.localeCompare(a.day.date));
  }

  const totalMoments = books.reduce(
    (sum, b) => sum + b.days.reduce((s, d) => s + d.entries.length + d.extras.length, 0),
    0,
  );
  const totalDays = books.reduce(
    (sum, b) => sum + b.days.filter(d => d.entries.length > 0).length,
    0,
  );

  return (
    <DiaryContext.Provider value={{
      books, isLoading, refresh,
      getBook, getTodayBook, getTodayLog, getDayLog,
      upsertDayEntries, lockCurrentMonth, getOnThisDay,
      totalMoments, totalDays,
      performBackup: () => performBackup(),
      restoreFromBackup,
      restoreFromData,
      lastBackupTime,
      refreshBackupTime,
    }}>
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiary() {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary must be inside DiaryProvider');
  return ctx;
}
