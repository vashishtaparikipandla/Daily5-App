import { uid, monthKey, type Book, type DayLog, type Entry, type CategoryId } from './data';
import { saveBooks, getSeedVersion, setSeedVersion } from './storage';

const SEED_VERSION = 1;

const SAMPLES: { text: string; cat: CategoryId }[] = [
  { text: "Had the best coffee of my life at that new place on the corner.", cat: 'food' },
  { text: "Meeting ran 45 minutes over but we actually solved the problem.", cat: 'work' },
  { text: "Called mum just to catch up. Felt good.", cat: 'people' },
  { text: "Twisted my ankle on the stairs. Nothing broken, mostly dignity.", cat: 'health' },
  { text: "Learned that you can freeze avocados. Changed my week.", cat: 'learning' },
  { text: "Rain all day. Stayed in and finally finished that book.", cat: 'home' },
  { text: "Fought with my sister about something small. We'll be fine.", cat: 'people' },
  { text: "Watched the sunset from the balcony, alone. It was enough.", cat: 'other' },
  { text: "Got told 'good job' by someone whose opinion actually matters.", cat: 'work' },
  { text: "Airport food again. At least the flight was on time.", cat: 'travel' },
  { text: "Discovered a shortcut through the park I'd walked past a hundred times.", cat: 'travel' },
  { text: "Made the recipe from scratch. It worked.", cat: 'food' },
  { text: "Ran further than I expected. Didn't push past that.", cat: 'health' },
  { text: "She laughed at my joke in the meeting. Made the whole thing worth it.", cat: 'love' },
  { text: "Quiet evening. The apartment felt like mine tonight.", cat: 'home' },
  { text: "Got lost on purpose in a neighbourhood I'd never been to.", cat: 'travel' },
  { text: "Skipped the gym. Rested instead. Both are training.", cat: 'health' },
  { text: "Read half a chapter. That counts.", cat: 'learning' },
  { text: "Ordered too much food. Had leftovers for tomorrow.", cat: 'food' },
  { text: "Someone held the door open for me and it made my day.", cat: 'other' },
  { text: "Cancelled plans and did not feel guilty about it.", cat: 'home' },
  { text: "Sent a message I'd been putting off for a week.", cat: 'people' },
  { text: "Small win at work. Wrote it down so I wouldn't forget.", cat: 'work' },
  { text: "Sourdough turned out better than last time.", cat: 'food' },
  { text: "Long walk to clear my head. Mostly worked.", cat: 'health' },
  { text: "Finished a difficult chapter. Proud of it.", cat: 'work' },
  { text: "First proper conversation with a stranger in months.", cat: 'people' },
  { text: "Booked a trip on impulse. Already feel lighter.", cat: 'travel' },
  { text: "She said yes to the second date.", cat: 'love' },
  { text: "Fixed the thing I'd been meaning to fix for three months.", cat: 'home' },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickPhotos(id: string): string[] {
  const r = Math.random();
  if (r < 0.5) return [];
  if (r < 0.8) return [`https://picsum.photos/seed/${id}a/400/300`];
  return [
    `https://picsum.photos/seed/${id}a/400/300`,
    `https://picsum.photos/seed/${id}b/400/300`,
  ];
}

function makeEntry(includePhotos = true): Entry {
  const s = pick(SAMPLES);
  const id = uid();
  return {
    id,
    text: s.text,
    category: s.cat,
    photos: includePhotos ? pickPhotos(id) : [],
  };
}

function generateMonth(year: number, month: number, locked: boolean): Book {
  const mk = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: DayLog[] = [];
  let extrasCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    if (Math.random() > 0.88) continue; // ~88% fill rate

    const dateStr = `${mk}-${String(day).padStart(2, '0')}`;
    const entryCount = Math.floor(Math.random() * 5) + 1; // 1–5
    const entries: Entry[] = Array.from({ length: entryCount }, () => makeEntry());

    const extras: Entry[] = [];
    if (extrasCount < 5 && Math.random() > 0.75) {
      const n = Math.floor(Math.random() * 3) + 1;
      for (let e = 0; e < n; e++) extras.push(makeEntry(false));
      extrasCount++;
    }

    days.push({ date: dateStr, entries, extras });
  }

  return { monthKey: mk, locked, days };
}

export async function seedDemoData(): Promise<void> {
  const version = await getSeedVersion();
  if (version >= SEED_VERSION) return;

  const now = new Date();
  const books: Book[] = [];

  // 4 locked past months
  for (let offset = 4; offset >= 1; offset--) {
    let year = now.getFullYear();
    let month = now.getMonth() - offset;
    if (month < 0) { month += 12; year -= 1; }
    books.push(generateMonth(year, month, true));
  }

  // Prior year, same month — for "On This Day"
  books.push(generateMonth(now.getFullYear() - 1, now.getMonth(), true));

  // Current month — partially filled up to yesterday
  const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDays: DayLog[] = [];
  for (let day = 1; day < now.getDate(); day++) {
    if (Math.random() > 0.9) continue;
    const dateStr = `${mk}-${String(day).padStart(2, '0')}`;
    const count = Math.floor(Math.random() * 4) + 1;
    const entries: Entry[] = Array.from({ length: count }, () => makeEntry());
    currentDays.push({ date: dateStr, entries, extras: [] });
  }
  books.push({ monthKey: mk, locked: false, days: currentDays });

  await saveBooks(books);
  await setSeedVersion(SEED_VERSION);
}
