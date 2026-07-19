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
        <div className="hero-card-empty">
          <div className="hero-card-context">
            <h2 className="hero-day-name">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </h2>
            <p className="hero-recall">Your last entry was yesterday.</p>
            <p className="hero-weather">Rainy, 72° in Bengaluru</p>
          </div>
          
          <div className="hero-book-progress">
            <div className="hero-prog-header">
              <div className="mini-book-visual-inline">
                <div className="mini-book-cover" />
                <div className="mini-pages" style={{ height: `${Math.max(10, progress * 100)}%` }} />
              </div>
              <span>Page {daysLogged + 1} of ~{totalDays} this month</span>
            </div>
          </div>

          <motion.button
            className="hero-log-cta"
            onClick={onLog}
            whileHover={{ scale: 0.985 }}
            whileTap={{ scale: 0.97 }}
          >
            Log tonight's 5
          </motion.button>
        </div>
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
    </motion.div>
  );
}
