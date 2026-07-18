import {
  Coffee, Plane, Users, Briefcase, Activity,
  BookOpen, Home, Heart, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type CategoryId =
  'food' | 'travel' | 'people' | 'work' | 'health' |
  'learning' | 'home' | 'love' | 'other';

export interface Category {
  id:    CategoryId;
  label: string;
  Icon:  LucideIcon;
  color: string; // accent tint for active state
}

export const CATEGORIES: Category[] = [
  { id: 'food',     label: 'Food',   Icon: Coffee,    color: '#C47B3A' },
  { id: 'travel',   label: 'Travel', Icon: Plane,     color: '#3A7EC4' },
  { id: 'people',   label: 'People', Icon: Users,     color: '#7C3AC4' },
  { id: 'work',     label: 'Work',   Icon: Briefcase, color: '#3AC47C' },
  { id: 'health',   label: 'Health', Icon: Activity,  color: '#E8593A' },
  { id: 'learning', label: 'Learn',  Icon: BookOpen,  color: '#C43A6F' },
  { id: 'home',     label: 'Home',   Icon: Home,      color: '#3ABDC4' },
  { id: 'love',     label: 'Love',   Icon: Heart,     color: '#E83A7A' },
  { id: 'other',    label: 'Other',  Icon: Sparkles,  color: '#A0A0A0' },
];

export type Entry = {
  id:        string;
  text:      string;
  category?: CategoryId;
  photo?:    string;
};

export type DayLog = {
  date:    string;  // "YYYY-MM-DD"
  entries: Entry[];
  extras:  Entry[];
};

export type Book = {
  monthKey: string;  // "YYYY-MM"
  locked:   boolean;
  days:     DayLog[];
};

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
  try { return JSON.parse(localStorage.getItem('daily5_books') || '[]'); }
  catch { return []; }
}

export function saveBooks(books: Book[]) {
  localStorage.setItem('daily5_books', JSON.stringify(books));
}

export function getCurrentBook(): Book {
  const mk    = monthKey(todayKey());
  const books = getBooks();
  let book    = books.find(b => b.monthKey === mk);
  if (!book) {
    book = { monthKey: mk, locked: false, days: [] };
    books.push(book);
    saveBooks(books);
  }
  return book;
}

export function upsertDay(day: DayLog) {
  const mk    = monthKey(day.date);
  const books = getBooks();
  let book    = books.find(b => b.monthKey === mk);
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
  const mk    = monthKey(date);
  const books = getBooks();
  const book  = books.find(b => b.monthKey === mk);
  return book?.days.find(d => d.date === date) || null;
}

export function lockBook(mk: string) {
  const books = getBooks();
  const book  = books.find(b => b.monthKey === mk);
  if (book) { book.locked = true; saveBooks(books); }
}

export function getCategoryById(id?: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}
