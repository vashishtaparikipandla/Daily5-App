import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadBooks, saveBooks } from '@/lib/storage';
import { seedDemoData } from '@/lib/seed';
import { uid, todayStr, monthKey, type Book, type DayLog, type Entry } from '@/lib/data';

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
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      await seedDemoData();
      const loaded = await loadBooks();
      setBooks(loaded);
    } catch (e) { console.warn('DiaryContext init error', e); }
    setIsLoading(false);
  }

  async function refresh() {
    const loaded = await loadBooks();
    setBooks(loaded);
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
    return true;
  }

  async function lockCurrentMonth() {
    const mk = monthKey();
    const updated = books.map(b => b.monthKey === mk ? { ...b, locked: true } : b);
    await saveBooks(updated);
    setBooks(updated);
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
