/**
 * pdfExport.ts
 * Generates a print-ready PDF from a Book using expo-print + expo-sharing.
 * The HTML layout mirrors the book-viewer: warm paper cover + one page per day.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { monthLabel, formatFullDate } from './data';
import { getCategoryById } from '@/constants/categories';
import type { Book, DayLog, Entry } from './data';

// ─── Palette (warm paper, matches light theme) ────────────────────────────────

const PAPER   = '#F7F4EF';
const INK     = '#1C1916';
const MUTED   = '#7A746E';
const PRIMARY = '#E8593A';
const CARD    = '#FFFFFF';
const BORDER  = 'rgba(0,0,0,0.08)';
const MARGIN  = 'rgba(232,89,58,0.35)';

// ─── Cover palettes (matches BookCover.tsx) ───────────────────────────────────

const COVER_PALETTES = [
  { bg: '#2C3E6B', fg: '#FFFFFF', accent: '#F4C27A' },
  { bg: '#4A3728', fg: '#F7EDD8', accent: '#E8593A' },
  { bg: '#1E3A2F', fg: '#E8F5EF', accent: '#7EC8A0' },
  { bg: '#3B2A4E', fg: '#F0EBF8', accent: '#C27AE8' },
  { bg: '#5C2A2A', fg: '#FAE8E8', accent: '#F4A0A0' },
  { bg: '#1E3A4A', fg: '#E8F4FA', accent: '#7AC8E8' },
  { bg: '#3A3A1E', fg: '#F4F4E8', accent: '#C8C87A' },
  { bg: '#2A3A2A', fg: '#EAF4EA', accent: '#7AE87A' },
];

function coverPalette(monthKey: string) {
  const [, m] = monthKey.split('-');
  return COVER_PALETTES[(parseInt(m, 10) - 1) % COVER_PALETTES.length];
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function entryHtml(entry: Entry, slot: number): string {
  const cat = getCategoryById(entry.category);
  const photos = entry.photos ?? [];
  return `
    <div class="entry">
      <div class="slot-num">${slot}</div>
      <div class="entry-body">
        ${entry.text
          ? `<p class="entry-text">${escHtml(entry.text)}</p>`
          : `<p class="entry-placeholder">—</p>`}
        <span class="cat-chip" style="background:${cat.color}22;color:${cat.color}">
          ${escHtml(cat.label)}
        </span>
        ${photos.length > 0
          ? `<div class="photos">${photos.map(uri => `<img class="photo" src="${uri}" />`).join('')}</div>`
          : ''}
      </div>
    </div>`;
}

function emptySlotHtml(slot: number): string {
  return `
    <div class="entry empty">
      <div class="slot-num">${slot}</div>
      <div class="entry-body"><p class="entry-placeholder">—</p></div>
    </div>`;
}

function dayPageHtml(day: DayLog, book: Book): string {
  const slots = Array.from({ length: 5 }, (_, i) => day.entries[i] ?? null);
  const hasExtras = day.extras.length > 0;
  return `
    <div class="page day-page">
      <div class="margin-rule"></div>
      <div class="day-content">
        <h2 class="day-date">${formatFullDate(day.date)}</h2>
        <div class="slots">
          ${slots.map((e, i) => e ? entryHtml(e, i + 1) : emptySlotHtml(i + 1)).join('')}
        </div>
        ${hasExtras
          ? `<p class="extras-note">+${day.extras.length} extra moment${day.extras.length > 1 ? 's' : ''} recorded this day</p>`
          : ''}
        ${book.locked ? `<div class="locked-badge">🔒 Locked</div>` : ''}
      </div>
    </div>`;
}

function coverPageHtml(book: Book): string {
  const pal   = coverPalette(book.monthKey);
  const label = monthLabel(book.monthKey);
  const activeDays = book.days.filter(d => d.entries.length > 0).length;
  const totalMoments = book.days.reduce((s, d) => s + d.entries.length, 0);

  return `
    <div class="page cover-page" style="background:${pal.bg};">
      <div class="cover-spine" style="background:${pal.accent};"></div>
      <div class="cover-body">
        <div class="cover-dots">
          ${Array.from({ length: 25 }, (_, i) =>
            `<div class="dot" style="opacity:${0.08 + (i % 5) * 0.04};background:${pal.fg}"></div>`
          ).join('')}
        </div>
        <p class="cover-app" style="color:${pal.accent}">Daily 5</p>
        <h1 class="cover-title" style="color:${pal.fg}">${label}</h1>
        <p class="cover-meta" style="color:${pal.fg}88">
          ${activeDays} days · ${totalMoments} moments
          ${book.locked ? ' · Locked' : ''}
        </p>
        <div class="cover-rule" style="background:${pal.accent}55"></div>
      </div>
    </div>`;
}

// ─── Full HTML document ───────────────────────────────────────────────────────

function buildHtml(book: Book): string {
  const sortedDays = [...book.days]
    .filter(d => d.entries.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const pages = [
    coverPageHtml(book),
    ...sortedDays.map(d => dayPageHtml(d, book)),
  ].join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${monthLabel(book.monthKey)} — Daily 5</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: ${PAPER};
    color: ${INK};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Page shell ── */
  .page {
    width: 210mm;
    min-height: 297mm;
    page-break-after: always;
    position: relative;
    overflow: hidden;
    background: ${PAPER};
  }

  /* ── Cover ── */
  .cover-page {
    display: flex;
    flex-direction: row;
  }
  .cover-spine {
    width: 14mm;
    flex-shrink: 0;
  }
  .cover-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 24mm 20mm;
    gap: 8mm;
    position: relative;
  }
  .cover-dots {
    position: absolute;
    top: 12mm; right: 12mm;
    display: grid;
    grid-template-columns: repeat(5, 6mm);
    gap: 3mm;
  }
  .dot {
    width: 4mm;
    height: 4mm;
    border-radius: 50%;
  }
  .cover-app {
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 11pt;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
  .cover-title {
    font-family: 'Playfair Display', serif;
    font-size: 38pt;
    line-height: 1.15;
    letter-spacing: 0.01em;
  }
  .cover-meta {
    font-family: 'Inter', sans-serif;
    font-size: 11pt;
  }
  .cover-rule {
    width: 48mm;
    height: 1.5px;
    margin-top: 4mm;
  }

  /* ── Day page ── */
  .day-page {
    display: flex;
    flex-direction: row;
  }
  .margin-rule {
    width: 14mm;
    flex-shrink: 0;
    background: ${MARGIN};
    opacity: 0.5;
  }
  .day-content {
    flex: 1;
    padding: 16mm 16mm 10mm 12mm;
    display: flex;
    flex-direction: column;
    gap: 6mm;
  }
  .day-date {
    font-family: 'Playfair Display', serif;
    font-size: 22pt;
    color: ${INK};
    border-bottom: 0.5pt solid ${BORDER};
    padding-bottom: 4mm;
  }
  .slots {
    display: flex;
    flex-direction: column;
    gap: 4mm;
  }

  /* ── Entry ── */
  .entry {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 5mm;
    padding: 4mm 5mm;
    border-radius: 4mm;
    background: ${CARD};
    border: 0.5pt solid ${BORDER};
  }
  .entry.empty {
    background: transparent;
    border-color: transparent;
    opacity: 0.45;
  }
  .slot-num {
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    font-weight: 700;
    color: ${PRIMARY};
    width: 5mm;
    flex-shrink: 0;
    padding-top: 1mm;
    text-align: center;
  }
  .entry-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2mm;
  }
  .entry-text {
    font-family: 'Inter', sans-serif;
    font-size: 10pt;
    color: ${INK};
    line-height: 1.5;
  }
  .entry-placeholder {
    font-family: 'Inter', sans-serif;
    font-size: 10pt;
    color: ${MUTED};
  }
  .cat-chip {
    display: inline-block;
    font-family: 'Inter', sans-serif;
    font-size: 7.5pt;
    font-weight: 500;
    padding: 1mm 3mm;
    border-radius: 99px;
    align-self: flex-start;
  }

  /* ── Photos ── */
  .photos {
    display: flex;
    flex-direction: row;
    gap: 2mm;
    flex-wrap: wrap;
    margin-top: 1mm;
  }
  .photo {
    width: 40mm;
    height: 30mm;
    object-fit: cover;
    border-radius: 2mm;
    border: 0.5pt solid ${BORDER};
  }

  /* ── Extras / locked ── */
  .extras-note {
    font-family: 'Inter', sans-serif;
    font-size: 8.5pt;
    color: ${MUTED};
    font-style: italic;
    margin-top: auto;
  }
  .locked-badge {
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    color: ${MUTED};
    align-self: flex-end;
    margin-top: auto;
  }

  /* ── Print overrides ── */
  @page {
    size: A4 portrait;
    margin: 0;
  }
  @media print {
    .page { page-break-after: always; }
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate and share a PDF for the given book.
 * Returns the URI of the generated PDF file.
 */
export async function exportBookAsPdf(book: Book): Promise<void> {
  const html = buildHtml(book);

  // Generate PDF (expo-print writes to a temp file and returns its URI)
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Share via native sheet (works on Android and iOS)
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Export ${monthLabel(book.monthKey)}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
