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
  photos?:   string[];
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

export function seedDemoDataIfNeeded() {
  if (getBooks().length > 0) return;
  const books: Book[] = [];
  const now = new Date();
  
  const sampleTexts = [
    { cat: 'food', text: 'Tried a new recipe for dinner and it was amazing.' },
    { cat: 'health', text: 'Went for a 5k run in the park.' },
    { cat: 'learning', text: 'Read a few chapters of a new book.' },
    { cat: 'people', text: 'Caught up with an old friend over coffee.' },
    { cat: 'work', text: 'Finally finished that big project at work.' },
    { cat: 'home', text: 'Cleaned the entire apartment.' },
    { cat: 'travel', text: 'Took a day trip out to the coast.' },
    { cat: 'love', text: 'Had a wonderful date night.' },
    { cat: 'other', text: 'Just relaxed and did absolutely nothing.' },
  ];

  const getPhotos = (cat: string) => {
    if (Math.random() > 0.5) return undefined;
    const numPhotos = Math.random() > 0.5 ? 2 : 1;
    const urls = [];
    for (let i = 0; i < numPhotos; i++) {
      urls.push(`https://source.unsplash.com/random/400x400?${cat},sig=${Math.random()}`);
    }
    return urls;
  };

  const generateMonth = (y: number, mo: number, isLocked: boolean) => {
    const mk = `${y}-${String(mo + 1).padStart(2, '0')}`;
    const days: DayLog[] = [];
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    
    // Fill ~80-90% of the days
    for (let day = 1; day <= daysInMonth; day++) {
       if (Math.random() > 0.85) continue; // skip some days

       const dayStr = `${mk}-${String(day).padStart(2, '0')}`;
       const entries: Entry[] = [];
       const count = Math.floor(Math.random() * 5) + 1; // 1 to 5 entries
       for (let i=0; i<count; i++) {
         const t = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
         entries.push({
           id: uid(),
           text: t.text,
           category: t.cat as CategoryId,
           photos: getPhotos(t.cat)
         });
       }
       
       const extras: Entry[] = [];
       if (count === 5 && Math.random() > 0.8) {
         extras.push({ id: uid(), text: 'Bonus: Saw a shooting star!', category: 'other' });
         if (Math.random() > 0.5) extras.push({ id: uid(), text: 'Extra thought.', category: 'other' });
       }

       days.push({
         date: dayStr,
         entries,
         extras
       });
    }
    return { monthKey: mk, locked: isLocked, days };
  };

  // Generate 3 past locked months
  for (let m = 3; m >= 1; m--) {
    let y = now.getFullYear();
    let mo = now.getMonth() - m;
    if (mo < 0) { mo += 12; y -= 1; }
    books.push(generateMonth(y, mo, true));
  }
  
  // Prior Year Data (Same month last year)
  books.push(generateMonth(now.getFullYear() - 1, now.getMonth(), true));

  // Current (Unlocked) Month (partial fill up to today)
  const currentMk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDays: DayLog[] = [];
  for (let day = 1; day <= now.getDate() - 1; day++) {
       if (Math.random() > 0.8) continue;
       const dayStr = `${currentMk}-${String(day).padStart(2, '0')}`;
       const entries: Entry[] = [];
       const count = Math.floor(Math.random() * 5) + 1;
       for (let i=0; i<count; i++) {
         const t = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
         entries.push({ id: uid(), text: t.text, category: t.cat as CategoryId, photos: getPhotos(t.cat) });
       }
       currentDays.push({ date: dayStr, entries, extras: [] });
  }
  books.push({ monthKey: currentMk, locked: false, days: currentDays });

  saveBooks(books);
}
