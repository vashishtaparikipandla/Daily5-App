export type CategoryId =
  | 'food' | 'travel' | 'people' | 'work'
  | 'health' | 'learning' | 'home' | 'love' | 'other';

export interface Entry {
  id: string;
  text: string;
  category?: CategoryId;
  photos?: string[]; // URIs (local file or remote for demo seed)
}

export interface DayLog {
  date: string;    // YYYY-MM-DD
  entries: Entry[];
  extras: Entry[];
}

export interface Book {
  monthKey: string; // YYYY-MM
  locked: boolean;
  days: DayLog[];
  isAnnual?: boolean;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(mk: string): string {
  const [y, m] = mk.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatYear(dateStr: string): string {
  return dateStr.slice(0, 4);
}

/** Days in a YYYY-MM monthKey */
export function daysInMonth(mk: string): number {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** How many pages a book will have (~30 per month) */
export function estimatedPages(mk: string): number {
  return daysInMonth(mk);
}
