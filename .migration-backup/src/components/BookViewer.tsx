import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, RotateCcw, Share2, Printer } from 'lucide-react';
import { Coffee, Plane, Heart, BookOpen, Activity, Bandage } from 'lucide-react';
import { type Book, formatDate, formatMonthYear, getCategoryById } from '../lib/data';
import { CheckoutFlow } from './CheckoutFlow';
import './BookViewer.css';

const COVER_ICONS = [Coffee, Plane, Heart, BookOpen, Activity, Bandage] as const;

interface BookViewerProps {
  book: Book;
  onClose: () => void;
}

export function BookViewer({ book, onClose }: BookViewerProps) {
  const days = book.days;
  const [pageIdx, setPageIdx]   = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [showCover, setShowCover] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  const currentDay = days[pageIdx];
  const hasPrev    = pageIdx > 0;
  const hasNext    = pageIdx < days.length - 1;
  const hasExtras  = (currentDay?.extras?.length ?? 0) > 0;

  const turnPage = (dir: 'next' | 'prev') => {
    setFlipped(false);
    if (dir === 'next' && hasNext) setPageIdx(p => p + 1);
    if (dir === 'prev' && hasPrev) setPageIdx(p => p - 1);
  };

  const [focusedPhoto, setFocusedPhoto] = useState<{ entryId: string; photoIdx: number } | null>(null);

  // Helper for Focus Mode swiping
  const getNextPhoto = () => {
    // Collect all photos in current day
    const allPhotos: { entryId: string; url: string; idx: number }[] = [];
    currentDay.entries.forEach(e => {
      if (e?.photos) {
        e.photos.forEach((url, i) => allPhotos.push({ entryId: e.id, url, idx: i }));
      }
    });
    if (!focusedPhoto) return null;
    const currIdx = allPhotos.findIndex(p => p.entryId === focusedPhoto.entryId && p.idx === focusedPhoto.photoIdx);
    if (currIdx < allPhotos.length - 1) {
      return { entryId: allPhotos[currIdx + 1].entryId, photoIdx: allPhotos[currIdx + 1].idx };
    }
    return null;
  };

  const getPrevPhoto = () => {
    const allPhotos: { entryId: string; url: string; idx: number }[] = [];
    currentDay.entries.forEach(e => {
      if (e?.photos) {
        e.photos.forEach((url, i) => allPhotos.push({ entryId: e.id, url, idx: i }));
      }
    });
    if (!focusedPhoto) return null;
    const currIdx = allPhotos.findIndex(p => p.entryId === focusedPhoto.entryId && p.idx === focusedPhoto.photoIdx);
    if (currIdx > 0) {
      return { entryId: allPhotos[currIdx - 1].entryId, photoIdx: allPhotos[currIdx - 1].idx };
    }
    return null;
  };

  const swipeNextPhoto = () => {
    const next = getNextPhoto();
    if (next) setFocusedPhoto(next);
  };

  const swipePrevPhoto = () => {
    const prev = getPrevPhoto();
    if (prev) setFocusedPhoto(prev);
  };

  // Find last filled entry index for the extras badge
  let lastFilledIndex = -1;
  for (let i = 4; i >= 0; i--) {
    if (currentDay.entries[i]) {
      lastFilledIndex = i;
      break;
    }
  }

  return (
    <motion.div
      className="viewer-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Cover reveal */}
      <AnimatePresence>
        {showCover && (
          <motion.div
            className="cover-reveal"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            <button className="cover-close" onClick={onClose}>
              <X size={20} strokeWidth={2} />
            </button>
            <div className="cover-reveal-card">
              <div className="cover-reveal-face">
                <motion.div
                  className={`cover-3d-inner ${book.isAnnual ? 'annual-mode' : ''}`}
                  initial={{ rotateY: -90 }}
                  animate={{ rotateY: 0 }}
                  transition={{ duration: 1, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="cover-face">
                    <h2 className="cover-title">{book.isAnnual ? book.monthKey.split('-')[0] + ' Collection' : formatMonthYear(book.monthKey)}</h2>
                    <div className="cover-icons">
                      {COVER_ICONS.map((Icon, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.8 + i * 0.07, type: 'spring', stiffness: 280, damping: 14 }}
                        >
                          <Icon size={22} strokeWidth={1.5} color="rgba(255,255,255,0.85)" />
                        </motion.div>
                      ))}
                    </div>
                    <p className="cover-days">{book.isAnnual ? '365' : days.length} day{days.length !== 1 && !book.isAnnual ? 's' : ''} remembered</p>
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
                
                <div className="cover-cta-row">
                  <button className="cover-cta-sec" onClick={() => setShowCheckout(true)}>
                    <Printer size={16} strokeWidth={1.75} />
                    Print
                  </button>
                  
                  <button className="cover-cta-sec">
                    <Share2 size={16} strokeWidth={1.75} />
                    Share
                  </button>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span className="cover-trust-sub">Join 5,000+ others who printed their book.</span>
                </div>
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
            <button className="reader-icon-btn" onClick={onClose}>
              <X size={18} strokeWidth={2} />
            </button>
            <div className="reader-title-area">
              <p className="reader-book-title">{formatMonthYear(book.monthKey)}</p>
              <p className="reader-page-count">{pageIdx + 1} / {days.length || 1}</p>
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
              <div className="reader-page">
                <AnimatePresence>
                  <motion.div
                    key={`${pageIdx}-${flipped}`}
                    className="page-leaf"
                    initial={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {!flipped ? (
                      <div className="page-front">
                        <div className="page-date-header">
                          <p className="page-date">{formatDate(currentDay.date)}</p>
                          <p className="page-num">Day {pageIdx + 1}</p>
                        </div>
                        <div className="page-entries">
                          {[0, 1, 2, 3, 4].map(i => {
                            const e = currentDay.entries[i];
                            if (e) {
                              const cat = getCategoryById(e.category);
                              // deterministic rotation based on string length and index
                              const rot = ((e.text.length + i) % 9) - 4; 
                              
                              return (
                                <motion.div
                                  key={e.id}
                                  className="scrapbook-card"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  style={{ transform: `rotate(${rot}deg)` }}
                                >
                                  <div className="scrapbook-tape"></div>
                                  
                                  {e.photos && e.photos.length > 0 && (
                                    <div className="scrapbook-photos">
                                      {e.photos.map((url, idx) => (
                                        <img 
                                          key={idx} 
                                          src={url} 
                                          alt="Memory" 
                                          className={`scrapbook-photo ${e.photos!.length === 2 ? (idx === 0 ? 'fan-left' : 'fan-right') : ''}`}
                                          onClick={() => setFocusedPhoto({ entryId: e.id, photoIdx: idx })}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  
                                  <div className="scrapbook-caption-area">
                                    <p className="scrapbook-caption">{e.text}</p>
                                    {cat && (
                                      <div className="scrapbook-cat-icon" style={{ color: cat.color }}>
                                        <cat.Icon size={14} strokeWidth={2.5} />
                                      </div>
                                    )}
                                  </div>

                                  {/* Extras badge on the last card */}
                                  {hasExtras && i === lastFilledIndex && (
                                    <div className="scrapbook-extras-badge">
                                      +{currentDay.extras.length} extra
                                    </div>
                                  )}
                                </motion.div>
                              );
                            } else {
                              return (
                                <div key={`empty-${i}`} className="scrapbook-card-empty">
                                  <div className="scrapbook-empty-frame">
                                    <span className="scrapbook-empty-dash">—</span>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                        {hasExtras && (
                          <button className="page-flip-hint" onClick={() => setFlipped(true)}>
                            <RotateCcw size={13} strokeWidth={2} />
                            <span>Extras on back</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="page-back">
                        <div className="page-date-header">
                          <p className="page-date">Extras — {formatDate(currentDay.date)}</p>
                        </div>
                        <div className="page-entries">
                          {currentDay.extras.map(e => (
                            <div key={e.id} className="page-entry extra-entry">
                              <p className="page-entry-text">{e.text}</p>
                            </div>
                          ))}
                        </div>
                        <button className="page-flip-hint" onClick={() => setFlipped(false)}>
                          <RotateCcw size={13} strokeWidth={2} style={{ transform: 'scaleX(-1)' }} />
                          <span>Back to main page</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Turn controls */}
          <div className="reader-controls">
            <button
              className={`turn-btn ${!hasPrev ? 'disabled' : ''}`}
              onClick={() => turnPage('prev')}
              disabled={!hasPrev}
            >
              <ChevronLeft size={18} strokeWidth={2} />
              Prev
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
              Next
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {focusedPhoto && (
          <motion.div
            className="focus-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFocusedPhoto(null)}
          >
            <button className="focus-close">
              <X size={24} color="#fff" />
            </button>
            
            {(() => {
              const e = currentDay.entries.find(e => e?.id === focusedPhoto.entryId);
              const url = e?.photos?.[focusedPhoto.photoIdx];
              const prev = getPrevPhoto();
              const next = getNextPhoto();
              return (
                <div className="focus-content" onClick={e => e.stopPropagation()}>
                  {prev && (
                    <button className="focus-nav-btn prev" onClick={(e) => { e.stopPropagation(); swipePrevPhoto(); }}>
                      <ChevronLeft size={32} color="#fff" />
                    </button>
                  )}
                  <motion.img 
                    src={url} 
                    alt="Focus" 
                    className="focus-img" 
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -50 && next) swipeNextPhoto();
                      if (info.offset.x > 50 && prev) swipePrevPhoto();
                    }}
                  />
                  {next && (
                    <button className="focus-nav-btn next" onClick={(e) => { e.stopPropagation(); swipeNextPhoto(); }}>
                      <ChevronRight size={32} color="#fff" />
                    </button>
                  )}
                  <div className="focus-caption-scrim">
                    <p className="focus-caption">{e?.text}</p>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <CheckoutFlow book={book} onClose={() => setShowCheckout(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
