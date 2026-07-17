import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Book, formatDate, formatMonthYear } from '../lib/data';
import './BookViewer.css';

interface BookViewerProps {
  book: Book;
  onClose: () => void;
}

export function BookViewer({ book, onClose }: BookViewerProps) {
  const days     = book.days.length > 0 ? book.days : [];
  const [pageIdx, setPageIdx]     = useState(0);
  const [flipped, setFlipped]     = useState(false); // front/back of current page
  const [showCover, setShowCover] = useState(!book.locked);

  const currentDay = days[pageIdx];
  const hasPrev    = pageIdx > 0;
  const hasNext    = pageIdx < days.length - 1;
  const hasExtras  = (currentDay?.extras?.length ?? 0) > 0;

  const turnPage = (dir: 'next' | 'prev') => {
    setFlipped(false);
    if (dir === 'next' && hasNext) setPageIdx(p => p + 1);
    if (dir === 'prev' && hasPrev) setPageIdx(p => p - 1);
  };

  return (
    <motion.div
      className="viewer-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Cover reveal (for in-progress, shows brief cover) */}
      <AnimatePresence>
        {showCover && (
          <motion.div
            className="cover-reveal"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            <div className="cover-reveal-card">
              <div className="cover-reveal-face" style={{ perspective: 600 }}>
                <motion.div
                  className="cover-3d-inner"
                  initial={{ rotateY: -90 }}
                  animate={{ rotateY: 0 }}
                  transition={{ duration: 1, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="cover-face">
                    <h2 className="cover-title">{formatMonthYear(book.monthKey)}</h2>
                    <div className="cover-icons">
                      {['☕','✈️','❤️','📖','🩹','🌧️'].map((ic,i) => (
                        <motion.span
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.8 + i * 0.06, type: 'spring', stiffness: 280, damping: 14 }}
                        >
                          {ic}
                        </motion.span>
                      ))}
                    </div>
                    <p className="cover-days">{days.length} day{days.length !== 1 ? 's' : ''} remembered</p>
                  </div>
                </motion.div>
              </div>
              <motion.div
                className="cover-ctas"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
              >
                <button className="cover-cta-primary" onClick={() => setShowCover(false)}>
                  Read Book
                </button>
                <button className="cover-cta-sec">Order Print</button>
                <button className="cover-cta-sec">Share</button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader */}
      {!showCover && (
        <div className="reader-wrap">
          {/* Top bar */}
          <div className="reader-topbar">
            <button className="reader-close" onClick={onClose}>✕</button>
            <div className="reader-title-area">
              <p className="reader-book-title">{formatMonthYear(book.monthKey)}</p>
              <p className="reader-page-count">
                {pageIdx + 1} / {days.length || 1}
              </p>
            </div>
            <div style={{ width: 36 }} />
          </div>

          {/* Page */}
          <div className="reader-page-area">
            {days.length === 0 ? (
              <div className="reader-empty">
                <p>No entries logged yet for this month.</p>
              </div>
            ) : (
              <div className="reader-page" style={{ perspective: 800 }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${pageIdx}-${flipped ? 'back' : 'front'}`}
                    className="page-leaf"
                    initial={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {!flipped ? (
                      /* Front of page */
                      <div className="page-front">
                        <div className="page-date-header">
                          <p className="page-date">{formatDate(currentDay.date)}</p>
                          <p className="page-num">Day {pageIdx + 1}</p>
                        </div>
                        <div className="page-entries">
                          {currentDay.entries.length === 0 ? (
                            <div className="blank-page">
                              <p>A quiet day.</p>
                            </div>
                          ) : (
                            currentDay.entries.map((e, i) => (
                              <motion.div
                                key={e.id}
                                className="page-entry"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                              >
                                <div className="page-entry-num">{i + 1}</div>
                                <div className="page-entry-body">
                                  {e.category && <span className="page-entry-cat">{e.category}</span>}
                                  <p className="page-entry-text">{e.text}</p>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                        {/* Flip affordance for extras */}
                        {hasExtras && (
                          <button className="page-flip-hint" onClick={() => setFlipped(true)}>
                            <span>Extras on back</span>
                            <span className="flip-arrow">↩</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Back of page: Extras */
                      <div className="page-back">
                        <div className="page-date-header">
                          <p className="page-date">Extras — {formatDate(currentDay.date)}</p>
                        </div>
                        <div className="page-entries">
                          {currentDay.extras.map((e) => (
                            <div key={e.id} className="page-entry extra-entry">
                              <p className="page-entry-text">{e.text}</p>
                            </div>
                          ))}
                        </div>
                        <button className="page-flip-hint" onClick={() => setFlipped(false)}>
                          <span>Back to main page</span>
                          <span className="flip-arrow">↩</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Page turn controls */}
          <div className="reader-controls">
            <button
              className={`turn-btn ${!hasPrev ? 'disabled' : ''}`}
              onClick={() => turnPage('prev')}
              disabled={!hasPrev}
            >
              ‹ Prev
            </button>
            <div className="reader-pips">
              {days.slice(0, 7).map((_, i) => (
                <div key={i} className={`reader-pip ${i === pageIdx ? 'active' : ''}`} onClick={() => setPageIdx(i)} />
              ))}
              {days.length > 7 && <span className="reader-pip-more">…</span>}
            </div>
            <button
              className={`turn-btn ${!hasNext ? 'disabled' : ''}`}
              onClick={() => turnPage('next')}
              disabled={!hasNext}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
