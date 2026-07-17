import { motion } from 'framer-motion';
import { getBooks } from '../lib/data';
import './ExtrasTab.css';

export function ExtrasTab() {
  const books = getBooks();
  const allExtras = books.flatMap(b =>
    b.days.flatMap(d => d.extras.map(e => ({ ...e, date: d.date })))
  );

  return (
    <motion.div
      className="extras-wrap"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      <div className="extras-header">
        <h1 className="extras-title">Discover</h1>
        <p className="extras-subtitle">Moments beyond your daily 5</p>
      </div>

      <div className="extras-section">
        <p className="section-label">Extras</p>
        {allExtras.length === 0 ? (
          <div className="extras-empty">
            <span className="extras-empty-icon">✦</span>
            <p>Once you log more than 5 moments in a day, the extras will appear here — still yours, just not in the book.</p>
          </div>
        ) : (
          <div className="extras-list">
            {allExtras.map(e => (
              <div key={e.id} className="extras-entry">
                <span className="extras-date">{e.date}</span>
                <p className="extras-text">{e.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="extras-section">
        <p className="section-label">On This Day</p>
        <div className="on-this-day-empty">
          <span className="extras-empty-icon">📅</span>
          <p>This time next year, you'll see today's memories resurface right here.</p>
        </div>
      </div>
    </motion.div>
  );
}
