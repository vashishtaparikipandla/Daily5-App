import { motion } from 'framer-motion';
import { getBooks, formatDate, getCategoryById, type Entry, type Book } from '../lib/data';
import './DiscoverTab.css';
import { ChevronRight } from 'lucide-react';

export function DiscoverTab() {
  const books = getBooks();
  const now = new Date();
  const currentDay = String(now.getDate()).padStart(2, '0');
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Find memories that occurred on this day in past months/years
  const onThisDayMemories: { book: Book; entries: Entry[]; yearLabel: string; dateStr: string }[] = [];

  books.forEach(book => {
    if (book.monthKey === currentMonthKey) return; // Skip current month
    const targetDate = `${book.monthKey}-${currentDay}`;
    const dayLog = book.days.find(d => d.date === targetDate);
    
    if (dayLog && dayLog.entries.length > 0) {
      // Calculate how long ago
      const [y, m] = book.monthKey.split('-').map(Number);
      const monthsAgo = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
      
      let yearLabel = '';
      if (monthsAgo === 12) yearLabel = '1 year ago';
      else if (monthsAgo > 12) yearLabel = `${Math.floor(monthsAgo / 12)} years ago`;
      else yearLabel = `${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`;

      onThisDayMemories.push({
        book,
        entries: dayLog.entries,
        yearLabel,
        dateStr: targetDate
      });
    }
  });

  // Sort by most recent first
  onThisDayMemories.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return (
    <motion.div
      className="discover-wrap"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      <div className="discover-header">
        <h1 className="discover-title">Discover</h1>
        <p className="discover-subtitle">On this day in your past</p>
      </div>

      <div className="discover-content">
        {onThisDayMemories.length === 0 ? (
          <div className="discover-empty">
            <p>You don't have any memories on this day in past months yet. Keep logging to build your archive!</p>
          </div>
        ) : (
          onThisDayMemories.map((memoryBlock, idx) => (
            <motion.div 
              key={memoryBlock.dateStr} 
              className="otd-group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="otd-group-header">
                <span className="otd-time-label">{memoryBlock.yearLabel}</span>
                <span className="otd-date-label">{formatDate(memoryBlock.dateStr)}</span>
              </div>
              
              <div className="otd-cards">
                {memoryBlock.entries.map((e, i) => {
                  const cat = getCategoryById(e.category);
                  const rot = ((e.text.length + i) % 7) - 3; // Slight rotation
                  
                  return (
                    <div 
                      key={e.id} 
                      className="scrapbook-card"
                      style={{ transform: `rotate(${rot}deg)` }}
                    >
                      <div className="scrapbook-tape"></div>
                      
                      {e.photos && e.photos.length > 0 && (
                        <div className="scrapbook-photos">
                          {e.photos.map((url, pIdx) => (
                            <img 
                              key={pIdx} 
                              src={url} 
                              alt="Memory" 
                              className={`scrapbook-photo ${e.photos!.length === 2 ? (pIdx === 0 ? 'fan-left' : 'fan-right') : ''}`}
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
                    </div>
                  );
                })}
              </div>
              
              <button className="otd-view-book-btn">
                View in Book
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
