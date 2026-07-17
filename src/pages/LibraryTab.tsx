import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBooks, formatMonthYear, lockBook, type Book } from '../lib/data';
import { BookViewer } from '../components/BookViewer';
import './LibraryTab.css';

export function LibraryTab() {
  const [books, setBooks]     = useState<Book[]>(getBooks);
  const [viewing, setViewing] = useState<Book | null>(null);

  const handleLockDemo = (mk: string) => {
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
            <div className="library-empty-icon">📚</div>
            <h3>Your first book is forming</h3>
            <p>Log your moments every day. At the end of the month, your first book will appear here.</p>
          </div>
        ) : (
          <div className="shelf">
            {books.map((book, i) => {
              const label   = formatMonthYear(book.monthKey);
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
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="book-cover-3d">
                    <div className="book-cover-face">
                      <span className="book-cover-month">{label.split(' ')[0]}</span>
                      <span className="book-cover-year">{label.split(' ')[1]}</span>
                      <div className="book-cover-icons">
                        {['☕','✈️','❤️','📖'].slice(0, 4).map((ic, ii) => (
                          <span key={ii}>{ic}</span>
                        ))}
                      </div>
                    </div>
                    <div className="book-spine-3d" />
                    <div className="book-pages-3d" />
                  </div>
                  <div className="book-meta">
                    <p className="book-meta-label">{label}</p>
                    {book.locked ? (
                      <p className="book-meta-sub locked-label">Complete</p>
                    ) : (
                      <>
                        <div className="book-meta-progress">
                          <div className="book-meta-fill" style={{ width: `${pct * 100}%` }} />
                        </div>
                        <p className="book-meta-sub">{daysLogged}/{totalDays} days</p>
                      </>
                    )}
                  </div>
                  {!book.locked && (
                    <button
                      className="lock-now-btn"
                      onClick={e => { e.stopPropagation(); handleLockDemo(book.monthKey); }}
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
