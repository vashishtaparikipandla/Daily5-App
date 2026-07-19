import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, Coffee, Plane, Heart, BookOpen } from 'lucide-react';
import { getBooks, formatMonthYear, lockBook, type Book, CATEGORIES } from '../lib/data';
import { BookViewer } from '../components/BookViewer';
import './LibraryTab.css';

const COVER_ICONS = [Coffee, Plane, Heart, BookOpen] as const;

// Helper to get top categories for a book
function getTopCategories(book: Book, count: number = 3) {
  const counts: Record<string, number> = {};
  book.days.forEach(day => {
    day.entries.forEach(e => {
      if (e.category) {
        counts[e.category] = (counts[e.category] || 0) + 1;
      }
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(c => c[0]);
}

export function LibraryTab() {
  const [books, setBooks]   = useState<Book[]>(getBooks);
  const [viewing, setViewing] = useState<Book | null>(null);

  const handleLock = (mk: string, e: React.MouseEvent) => {
    e.stopPropagation();
    lockBook(mk);
    setBooks(getBooks());
  };

  return (
    <>
      <motion.div
        className="library-wrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
      >
        <div className="library-header">
          <h1 className="library-title">Library</h1>
          <p className="library-subtitle">Your memory archive</p>
        </div>

        {books.length === 0 ? (
          <div className="library-empty">
            <div className="library-empty-icon">
              <BookMarked size={52} strokeWidth={1} color="var(--accent)" style={{ opacity: 0.5 }} />
            </div>
            <h3>Your first book is forming</h3>
            <p>Log your moments every day. At the end of the month, your first book will appear here.</p>
          </div>
        ) : (
          <div className="shelf">
            {books.map((book, i) => {
              const label = formatMonthYear(book.monthKey);
              const daysLogged = book.days.filter(d => d.entries.length > 0).length;
              const [y, m] = book.monthKey.split('-').map(Number);
              const totalDays = new Date(y, m, 0).getDate();
              const pct = daysLogged / totalDays;

              return (
                <motion.button
                  key={book.monthKey}
                  className={`book-item ${book.locked ? 'locked' : 'current'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setViewing(book)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="book-cover-3d">
                    <div className="book-cover-face">
                      <span className="book-cover-month">{label.split(' ')[0]}</span>
                      <span className="book-cover-year">{label.split(' ')[1]}</span>
                      {/* Lucide icon grid on cover (fallback if no categories) */}
                      <div className="book-cover-icons">
                        {COVER_ICONS.map((Icon, ii) => (
                          <Icon key={ii} size={10} strokeWidth={1.5} color="rgba(255,255,255,0.3)" />
                        ))}
                      </div>
                    </div>
                    <div className="book-spine-3d" />
                    <div className="book-pages-3d" />
                  </div>

                  <div className="book-meta-overlay">
                    <div className="book-meta-top">
                      <div className="book-radial-progress">
                        <svg width="32" height="32" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="3" />
                          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" 
                            strokeDasharray="87.96" 
                            strokeDashoffset={87.96 - (pct * 87.96)}
                            transform="rotate(-90 16 16)"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="book-radial-text">{daysLogged}</span>
                      </div>
                    </div>
                    
                    <div className="book-meta-bottom">
                      <p className="book-meta-label">{label.split(' ')[0]}</p>
                      
                      {/* Top categories overlapping the edge */}
                      <div className="book-top-cats">
                        {getTopCategories(book).map(catId => {
                          const catDef = CATEGORIES.find(c => c.id === catId);
                          if (!catDef) return null;
                          return (
                            <div key={catId} className="book-top-cat-icon" style={{ color: catDef.color }}>
                              <catDef.Icon size={12} strokeWidth={2} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {!book.locked && (
                    <button
                      className="lock-now-btn"
                      onClick={e => handleLock(book.monthKey, e)}
                    >
                      Close Book
                    </button>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {viewing && (
          <BookViewer key="viewer" book={viewing} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
