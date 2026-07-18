import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowLeft } from 'lucide-react';
import { CATEGORIES, getDay, upsertDay, todayKey, uid, type Entry, type CategoryId } from '../lib/data';
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
  const today    = todayKey();
  const existing = getDay(today);

  const [entries, setEntries]   = useState<Entry[]>(existing?.entries ?? []);
  const [extras]                = useState<Entry[]>(existing?.extras  ?? []);
  const [phase, setPhase]       = useState<Phase>('slots');
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [text, setText]         = useState('');
  const [category, setCategory] = useState<CategoryId | ''>('');
  const [flippedSlots, setFlippedSlots] = useState<Set<number>>(new Set());
  const [showPageAnim, setShowPageAnim] = useState(false);

  const placeholder = PLACEHOLDERS[new Date().getSeconds() % PLACEHOLDERS.length];
  const slots       = [0, 1, 2, 3, 4];

  const openSlot = (i: number) => {
    setActiveSlot(i);
    setText(entries[i]?.text ?? '');
    setCategory((entries[i]?.category as CategoryId | '') ?? '');
    setPhase('compose');
  };

  const saveSlot = () => {
    if (activeSlot === null) return;
    const newEntries = [...entries];
    if (text.trim()) {
      newEntries[activeSlot] = {
        id:       entries[activeSlot]?.id ?? uid(),
        text:     text.trim(),
        category: category || undefined,
      };
      setFlippedSlots(prev => new Set(prev).add(activeSlot));
    } else {
      newEntries.splice(activeSlot, 1);
    }
    setEntries(newEntries);
    setPhase('slots');
    setActiveSlot(null);
    setText('');
    setCategory('');
  };

  const done = () => {
    if (entries.length === 0) { onClose(); return; }
    upsertDay({ date: today, entries, extras });
    setPhase('saving');
    setShowPageAnim(true);
    setTimeout(() => { onSaved(); onClose(); }, 1900);
  };

  const activeCat = CATEGORIES.find(c => c.id === category);

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dimmed background */}
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Page-into-book hero animation */}
      <AnimatePresence>
        {showPageAnim && (
          <>
            <motion.div
              className="page-fly"
              initial={{ scale: 1, y: 0, opacity: 1, rotateY: 0 }}
              animate={{ scale: 0.12, y: 300, opacity: 0, rotateY: -20 }}
              transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
            >
              {slots.map(i => (
                <div key={i} className={`page-fly-slot ${entries[i] ? 'filled' : ''}`}>
                  {entries[i] && <p>{entries[i].text}</p>}
                </div>
              ))}
            </motion.div>
            <motion.div
              className="page-toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95 }}
            >
              <Check size={14} strokeWidth={2.5} />
              Page added — moments saved
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sheet */}
      {!showPageAnim && (
        <motion.div
          className="logging-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        >
          <div className="sheet-handle" />

          <div className="sheet-header">
            <button className="sheet-icon-btn" onClick={onClose}>
              <X size={18} strokeWidth={2} />
            </button>
            <h2 className="sheet-title">Tonight's 5</h2>
            <button
              className={`sheet-done ${entries.length === 0 ? 'disabled' : ''}`}
              onClick={done}
              disabled={entries.length === 0}
            >
              Done
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Slots view */}
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
                  const entry   = entries[i];
                  const cat     = CATEGORIES.find(c => c.id === entry?.category);
                  const wasFlipped = flippedSlots.has(i);

                  return (
                    <motion.div
                      key={i}
                      className={`slot-card ${entry ? 'slot-filled' : 'slot-empty'}`}
                      onClick={() => openSlot(i)}
                      whileHover={{ scale: 1.012 }}
                      whileTap={{ scale: 0.975 }}
                      initial={wasFlipped ? { rotateY: -90 } : {}}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
                      style={{ perspective: '600px' }}
                    >
                      <div className="slot-content">
                        {entry ? (
                          <>
                            {cat && (
                              <div className="slot-cat-icon" style={{ color: cat.color }}>
                                <cat.Icon size={18} strokeWidth={1.75} />
                              </div>
                            )}
                            {!cat && <div className="slot-num-filled">{i + 1}</div>}
                            <p className="slot-entry-text">{entry.text}</p>
                          </>
                        ) : (
                          <>
                            <div className="slot-num-badge">{i + 1}</div>
                            <p className="slot-hint">
                              {i === 0 ? 'Tap to add your first moment' : `Moment ${i + 1}`}
                            </p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {entries.length >= 5 && (
                  <div className="extras-notice">
                    <Sparkles size={14} className="extras-notice-icon" />
                    Extra moments are saved but won't appear in the main book pages.
                  </div>
                )}
              </motion.div>
            )}

            {/* Compose view */}
            {phase === 'compose' && (
              <motion.div
                key="compose"
                className="compose-view"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.2 }}
              >
                <div className="compose-slot-label">
                  Moment {activeSlot !== null ? activeSlot + 1 : ''}
                </div>

                <textarea
                  className="compose-textarea"
                  autoFocus
                  placeholder={placeholder}
                  value={text}
                  onChange={e => setText(e.target.value)}
                />

                {/* Active category badge */}
                {activeCat && (
                  <div className="compose-active-cat" style={{ color: activeCat.color, borderColor: activeCat.color + '44', background: activeCat.color + '18' }}>
                    <activeCat.Icon size={14} strokeWidth={2} />
                    {activeCat.label}
                  </div>
                )}

                {/* Category chip row */}
                <div className="category-row">
                  {CATEGORIES.map(c => {
                    const isActive = category === c.id;
                    return (
                      <motion.button
                        key={c.id}
                        className={`cat-chip ${isActive ? 'cat-active' : ''}`}
                        style={isActive ? { background: c.color + '22', borderColor: c.color, color: c.color } : {}}
                        onClick={() => setCategory(cat => cat === c.id ? '' : c.id as CategoryId)}
                        whileTap={{ scale: 0.9 }}
                        title={c.label}
                      >
                        <c.Icon
                          size={18}
                          strokeWidth={isActive ? 2.25 : 1.75}
                          color={isActive ? c.color : undefined}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                <div className="compose-actions">
                  <button className="compose-back" onClick={() => { setPhase('slots'); setActiveSlot(null); }}>
                    <ArrowLeft size={16} strokeWidth={2} />
                    Back
                  </button>
                  <motion.button
                    className="compose-save"
                    onClick={saveSlot}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Check size={16} strokeWidth={2.5} />
                    Save Moment
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

// Need to import Sparkles for the extras notice
function Sparkles(props: React.SVGProps<SVGSVGElement> & { size?: number; className?: string }) {
  const { size = 16, className, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/>
      <path d="M3 5h4"/>
      <path d="M19 17v4"/>
      <path d="M17 19h4"/>
    </svg>
  );
}
