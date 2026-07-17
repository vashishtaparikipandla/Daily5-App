export type Entry = {
  id: string;
  text: string;
  category?: string;
  photo?: string;
};

export type DayLog = {
  date: string; // "YYYY-MM-DD"
  entries: Entry[];
  extras: Entry[];
};

export type Book = {
  monthKey: string; // "YYYY-MM"
  locked: boolean;
  days: DayLog[];
};

export const CATEGORIES = [
  { id: 'food',     label: 'Food',    emoji: '☕' },
  { id: 'travel',   label: 'Travel',  emoji: '✈️' },
  { id: 'people',   label: 'People',  emoji: '👥' },
  { id: 'work',     label: 'Work',    emoji: '💼' },
  { id: 'health',   label: 'Health',  emoji: '🩹' },
  { id: 'learning', label: 'Learn',   emoji: '📖' },
  { id: 'home',     label: 'Home',    emoji: '🏠' },
  { id: 'love',     label: 'Love',    emoji: '❤️' },
  { id: 'other',    label: 'Other',   emoji: '✦'  },
];

export function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatMonthYear(monthKeyStr: string): string {
  const [y, m] = monthKeyStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function uid(): string {
  return Math.random().toString(36).slice(2);
}

// ---- LocalStorage helpers ----
export function getBooks(): Book[] {
  try {
    return JSON.parse(localStorage.getItem('daily5_books') || '[]');
  } catch { return []; }
}

export function saveBooks(books: Book[]) {
  localStorage.setItem('daily5_books', JSON.stringify(books));
}

export function getCurrentBook(): Book {
  const mk = monthKey(todayKey());
  let books = getBooks();
  let book = books.find(b => b.monthKey === mk);
  if (!book) {
    book = { monthKey: mk, locked: false, days: [] };
    books.push(book);
    saveBooks(books);
  }
  return book;
}

export function upsertDay(day: DayLog) {
  const mk = monthKey(day.date);
  let books = getBooks();
  let book = books.find(b => b.monthKey === mk);
  if (!book) {
    book = { monthKey: mk, locked: false, days: [] };
    books.push(book);
  }
  const idx = book.days.findIndex(d => d.date === day.date);
  if (idx >= 0) book.days[idx] = day;
  else book.days.push(day);
  saveBooks(books);
}

export function getDay(date: string): DayLog | null {
  const mk = monthKey(date);
  const books = getBooks();
  const book = books.find(b => b.monthKey === mk);
  return book?.days.find(d => d.date === date) || null;
}

export function lockBook(mk: string) {
  const books = getBooks();
  const book = books.find(b => b.monthKey === mk);
  if (book) { book.locked = true; saveBooks(books); }
}
