import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES, getDay, upsertDay, todayKey, uid, type Entry } from '../lib/data';
import './LoggingModal.css';

const PLACEHOLDERS = [
  'Grabbed coffee with…',
  'Finally finished…',
  'Twisted my ankle at…',
  'Learned that…',
  'Felt grateful for…',
  'Had a long call with…',
  'Found out that…',
  'Made a decision about…',
];

interface LoggingModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type Phase = 'slots' | 'compose' | 'saving';

export function LoggingModal({ onClose, onSaved }: LoggingModalProps) {
  const today   = todayKey();
  const existing = getDay(today);

  const [entries, setEntries] = useState<Entry[]>(existing?.entries ?? []);
  const [extras]  = useState<Entry[]>(existing?.extras  ?? []);
  const [phase, setPhase]     = useState<Phase>('slots');
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [text, setText]       = useState('');
  const [category, setCategory] = useState('');
  const [flipped, setFlipped] = useState<boolean[]>([false,false,false,false,false]);
  const [showPageAnim, setShowPageAnim] = useState(false);

  const placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
  const slots = [0,1,2,3,4];

  const openSlot = (i: number) => {
    setActiveSlot(i);
    setText(entries[i]?.text ?? '');
    setCategory(entries[i]?.category ?? '');
    setPhase('compose');
  };

  const saveSlot = () => {
    if (activeSlot === null) return;
    const newEntries = [...entries];
    if (text.trim()) {
      newEntries[activeSlot] = { id: entries[activeSlot]?.id ?? uid(), text: text.trim(), category };
    } else {
      newEntries.splice(activeSlot, 1);
    }

    // flip animation
    const newFlipped = [...flipped];
    newFlipped[activeSlot] = !!text.trim();
    setFlipped(newFlipped);

    setEntries(newEntries);
    setPhase('slots');
    setActiveSlot(null);
    setText('');
    setCategory('');
  };

  const done = () => {
    if (entries.length === 0) { onClose(); return; }
    // Save to storage
    upsertDay({ date: today, entries, extras });
    setPhase('saving');
    setShowPageAnim(true);
    // After hero anim, close
    setTimeout(() => {
      onSaved();
      onClose();
    }, 1800);
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Background scale-down behind modal */}
      <motion.div
        className="modal-bg-blur"
        initial={{ scale: 1 }}
        animate={{ scale: 0.96 }}
        exit={{ scale: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Page-into-book hero animation */}
      <AnimatePresence>
        {showPageAnim && (
          <motion.div
            className="page-fly"
            initial={{ scale: 1, y: 0, opacity: 1, rotateY: 0 }}
            animate={{ scale: 0.12, y: 280, opacity: 0, rotateY: -20 }}
            transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }}
          >
            {slots.map(i => (
              <div key={i} className={`page-fly-slot ${entries[i] ? 'filled' : ''}`}>
                {entries[i] && <p>{entries[i].text}</p>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!showPageAnim && (
        <motion.div
          className="logging-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        >
          {/* Handle */}
          <div className="sheet-handle" />

          {/* Header */}
          <div className="sheet-header">
            <button className="sheet-close" onClick={onClose}>✕</button>
            <h2 className="sheet-title">Tonight's 5</h2>
            <button
              className="sheet-done"
              onClick={done}
              disabled={entries.length === 0}
            >
              Done
            </button>
          </div>

          {/* Slots grid */}
          <AnimatePresence mode="wait">
            {phase === 'slots' && (
              <motion.div
                key="slots"
                className="slots-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {slots.map(i => {
                  const entry = entries[i];
                  const wasFlipped = flipped[i];
                  return (
                    <motion.div
                      key={i}
                      className={`slot-card ${entry ? 'slot-filled' : 'slot-empty'}`}
                      onClick={() => openSlot(i)}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ perspective: 600 }}
                    >
                      <motion.div
                        className="slot-inner"
                        animate={{ rotateY: wasFlipped ? 0 : 0 }}
                        initial={{ rotateY: wasFlipped ? -90 : 0 }}
                        transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {entry ? (
                          <div className="slot-content filled">
                            {entry.category && <span className="slot-cat">{entry.category}</span>}
                            <p className="slot-entry-text">{entry.text}</p>
                          </div>
                        ) : (
                          <div className="slot-content empty">
                            <div className="slot-num-badge">{i + 1}</div>
                            <p className="slot-hint">
                              {i === 0 ? 'Tap to add a moment' : `Moment ${i + 1}`}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}

                {/* Extras label */}
                {entries.length >= 5 && (
                  <div className="extras-notice">
                    <span>✦</span>
                    Extra moments are saved but won't appear in your book's main pages.
                  </div>
                )}
              </motion.div>
            )}

            {phase === 'compose' && (
              <motion.div
                key="compose"
                className="compose-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="compose-number">
                  {activeSlot !== null ? activeSlot + 1 : ''}
                </div>
                <textarea
                  className="compose-textarea"
                  autoFocus
                  placeholder={placeholder}
                  value={text}
                  onChange={e => setText(e.target.value)}
                />

                {/* Category selector */}
                <div className="category-row">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      className={`cat-chip ${category === c.emoji ? 'cat-active' : ''}`}
                      onClick={() => setCategory(cat => cat === c.emoji ? '' : c.emoji)}
                    >
                      <span>{c.emoji}</span>
                    </button>
                  ))}
                </div>

                <div className="compose-actions">
                  <button className="compose-back" onClick={() => setPhase('slots')}>
                    ← Back
                  </button>
                  <motion.button
                    className="compose-save"
                    onClick={saveSlot}
                    whileTap={{ scale: 0.96 }}
                  >
                    Save Moment
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Confirmation toast */}
      <AnimatePresence>
        {showPageAnim && (
          <motion.div
            className="page-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            Page added — moments saved ✓
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
