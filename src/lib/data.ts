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
  const seedVersion = localStorage.getItem('daily5_seed_version');
  if (seedVersion !== '4') {
    localStorage.removeItem('daily5_books');
    localStorage.setItem('daily5_seed_version', '4');
  } else {
    if (getBooks().length > 0) return;
  }
  const books: Book[] = [];
  const now = new Date();
  
  const sampleTexts = [
    { cat: 'food', text: 'Had the most incredible truffle pasta at that hidden spot downtown.' },
    { cat: 'food', text: 'Brewed a perfect pour-over coffee this morning, the beans from Colombia are amazing.' },
    { cat: 'food', text: 'Tried making sourdough bread for the first time. It actually rose properly!' },
    { cat: 'health', text: 'Crushed a 10k run by the river, feeling exhausted but accomplished.' },
    { cat: 'health', text: 'Finally managed to hold a handstand for more than 5 seconds in yoga class.' },
    { cat: 'learning', text: 'Read the first 50 pages of the new sci-fi novel. Absolutely hooked.' },
    { cat: 'learning', text: 'Watched a documentary about deep sea exploration. Mind-blowing stuff.' },
    { cat: 'people', text: 'Caught up with Sarah over matcha lattes. It\'s been way too long.' },
    { cat: 'people', text: 'Family dinner was loud and chaotic in the best way possible.' },
    { cat: 'work', text: 'Nailed the presentation today. The team seemed really impressed.' },
    { cat: 'work', text: 'Cleared out my inbox completely. Inbox zero is a myth no longer.' },
    { cat: 'home', text: 'Spent the afternoon repotting all my monstera plants.' },
    { cat: 'home', text: 'Rearranged the living room. It feels like a completely new space.' },
    { cat: 'travel', text: 'Wandered around the historic district and found a tiny indie bookstore.' },
    { cat: 'travel', text: 'The sunset view from the scenic overlook was worth the 2 hour drive.' },
    { cat: 'love', text: 'Surprise date night at the observatory. Seeing Saturn\'s rings was surreal.' },
    { cat: 'love', text: 'Left a little sticky note on the mirror and it made their whole day.' },
    { cat: 'other', text: 'Sat on the balcony and just watched the rain for an hour.' },
    { cat: 'other', text: 'Found a $20 bill inside an old winter coat. Score!' },
  ];

  const getPhotos = () => {
    // 50% chance to have photos
    if (Math.random() > 0.5) return undefined;
    const numPhotos = Math.random() > 0.3 ? 1 : 2;
    const urls = [];
    for (let i = 0; i < numPhotos; i++) {
      const seed = Math.random().toString(36).slice(2, 8);
      urls.push(`https://picsum.photos/seed/${seed}/400/400`);
    }
    return urls;
  };

  const generateMonth = (y: number, mo: number, isLocked: boolean) => {
    const mk = `${y}-${String(mo + 1).padStart(2, '0')}`;
    const days: DayLog[] = [];
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const currentCalendarDay = now.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
       // Almost all days are filled, but guarantee current calendar day is filled
       if (day !== currentCalendarDay && Math.random() > 0.95) continue;

       const dayStr = `${mk}-${String(day).padStart(2, '0')}`;
       const entries: Entry[] = [];
       // Force exactly 5 entries for past days
       const count = 5; 
       for (let i=0; i<count; i++) {
         const t = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
         entries.push({
           id: uid(),
           text: t.text,
           category: t.cat as CategoryId,
           photos: getPhotos()
         });
       }
       
       const extras: Entry[] = [];
       if (Math.random() > 0.8) {
         extras.push({ id: uid(), text: 'Bonus: Found a great new podcast today.', category: 'other' });
       }

       days.push({ date: dayStr, entries, extras });
    }
    return { monthKey: mk, locked: isLocked, days };
  };

  // Generate 4 past locked months
  for (let m = 4; m >= 1; m--) {
    let y = now.getFullYear();
    let mo = now.getMonth() - m;
    if (mo < 0) { mo += 12; y -= 1; }
    books.push(generateMonth(y, mo, true));
  }
  
  // Prior Year Data (Same month last year)
  books.push(generateMonth(now.getFullYear() - 1, now.getMonth(), true));

  // Current (Unlocked) Month (partial fill up to yesterday)
  const currentMk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDays: DayLog[] = [];
  for (let day = 1; day <= now.getDate() - 1; day++) {
       if (Math.random() > 0.9) continue;
       const dayStr = `${currentMk}-${String(day).padStart(2, '0')}`;
       const entries: Entry[] = [];
       for (let i=0; i<5; i++) {
         const t = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
         entries.push({ id: uid(), text: t.text, category: t.cat as CategoryId, photos: getPhotos() });
       }
       currentDays.push({ date: dayStr, entries, extras: [] });
  }

  // Pre-fill today with exactly 3 moments
  const todayStr = `${currentMk}-${String(now.getDate()).padStart(2, '0')}`;
  const todayEntries: Entry[] = [];
  for (let i=0; i<3; i++) {
    const t = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    todayEntries.push({ id: uid(), text: t.text, category: t.cat as CategoryId, photos: getPhotos() });
  }
  currentDays.push({ date: todayStr, entries: todayEntries, extras: [] });

  books.push({ monthKey: currentMk, locked: false, days: currentDays });

  saveBooks(books);
}
