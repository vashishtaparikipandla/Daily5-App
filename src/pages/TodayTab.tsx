import { motion } from 'framer-motion';
import { getCurrentBook, getDay, todayKey } from '../lib/data';
import './TodayTab.css';

const PROMPTS = [
  'What mattered most today?',
  'What surprised you today?',
  'Who made you smile today?',
  'What will you remember?',
  'Choose 5 moments from today.',
];

interface TodayTabProps {
  onLog: () => void;
  refresh: number;
}

export function TodayTab({ onLog, refresh: _refresh }: TodayTabProps) {
  const today   = todayKey();
  const dayLog  = getDay(today);
  const book    = getCurrentBook();
  const entries = dayLog?.entries ?? [];
  const daysLogged = book.days.filter(d => d.entries.length > 0).length;
  const totalDays  = new Date(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)),
    0
  ).getDate();
  const progress = daysLogged / totalDays;

  const prompt = PROMPTS[new Date().getDay() % PROMPTS.length];

  return (
    <motion.div
      className="today-wrap"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      {/* Header */}
      <div className="today-header">
        <div>
          <p className="today-dayname">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
          <h1 className="today-date">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </h1>
        </div>
        <div className="today-book-mini">
          <div className="mini-book-visual">
            <div className="mini-book-cover" />
            <div className="mini-pages" style={{ height: `${Math.max(10, progress * 100)}%` }} />
          </div>
          <p className="mini-book-label">Pg {daysLogged}/{totalDays}</p>
        </div>
      </div>

      {/* Prompt */}
      <p className="today-prompt">{prompt}</p>

      {/* Hero CTA card */}
      {entries.length === 0 ? (
        <motion.button
          className="hero-card-empty"
          onClick={onLog}
          whileHover={{ scale: 0.985 }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="hero-slots-preview">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="hero-slot-dot">
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="hero-card-text">
            <h2>Tonight's 5</h2>
            <p>Tap to log today's moments</p>
          </div>
          <div className="hero-book-progress">
            <div className="prog-bar-track">
              <motion.div
                className="prog-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
            <span>Page {daysLogged} of {totalDays} this month</span>
          </div>
        </motion.button>
      ) : (
        <div className="hero-card-filled">
          <div className="hero-card-filled-header">
            <h2>{entries.length} moment{entries.length !== 1 ? 's' : ''} logged</h2>
            <button className="edit-btn" onClick={onLog}>Edit</button>
          </div>
          <div className="filled-entries">
            {entries.map((e, i) => (
              <motion.div
                key={e.id}
                className="filled-entry"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <span className="entry-num">{i + 1}</span>
                <span className="entry-text">{e.text}</span>
                {e.category && <span className="entry-cat-badge">{e.category}</span>}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* On This Day (resurfaced past memory) */}
      <div className="on-this-day-section">
        <p className="section-label">On This Day</p>
        <div className="on-this-day-card">
          <p className="otd-year">Last year</p>
          <p className="otd-text">Start logging every day to unlock your memories here.</p>
        </div>
      </div>
    </motion.div>
  );
}
