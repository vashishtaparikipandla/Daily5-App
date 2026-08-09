import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Clock, Image as ImageIcon, Calendar, BookOpen, Coffee, Plane, Heart, Activity } from 'lucide-react';
import { getBooks, type Book, type DayLog } from '../lib/data';
import './SearchOverlay.css';

interface SearchOverlayProps {
  onClose: () => void;
  onSelectResult: (book: Book, day: DayLog) => void;
}

const CATEGORIES = [
  { id: 'coffee', label: 'Coffee', icon: Coffee },
  { id: 'plane', label: 'Travel', icon: Plane },
  { id: 'heart', label: 'People', icon: Heart },
  { id: 'activity', label: 'Health', icon: Activity }
];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Load recents and simulate index building
  useEffect(() => {
    const saved = localStorage.getItem('daily5_recent_searches');
    if (saved) setRecent(JSON.parse(saved));
    
    // Simulate indexing state
    const t = setTimeout(() => setIsReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const saveRecent = (q: string) => {
    if (!q.trim()) return;
    const newRecent = [q, ...recent.filter(x => x !== q)].slice(0, 5);
    setRecent(newRecent);
    localStorage.setItem('daily5_recent_searches', JSON.stringify(newRecent));
  };

  const results = useMemo(() => {
    if (!debouncedQuery && activeFilters.length === 0) return null;
    if (debouncedQuery.length > 0 && debouncedQuery.length < 2 && activeFilters.length === 0) return null; // Min length 2
    
    const books = getBooks();
    const matches: { book: Book, day: DayLog, text: string }[] = [];

    const q = debouncedQuery.toLowerCase();

    for (const book of books) {
      // Skip locked time capsules
      // In our data model we just have 'locked', but prompt says exclude locked time capsule content
      // Our mock doesn't have explicit time capsules yet, so we just search everything (or assume they're open).
      
      for (const day of book.days) {
        if (day.entries.length === 0) continue;
        
        let dayMatches = false;
        let matchText = '';

        for (const entry of day.entries) {
          // Logic: if query exists, must match text OR category label.
          // If filters exist, must match ALL filters (additive)
          
          let passesFilter = true;
          if (activeFilters.includes('has_photo') && !(entry.photos && entry.photos.length > 0)) passesFilter = false;
          
          // category filter
          const selectedCats = activeFilters.filter(f => CATEGORIES.map(c=>c.id).includes(f));
          if (selectedCats.length > 0 && (!entry.category || !selectedCats.includes(entry.category))) passesFilter = false;

          let passesText = false;
          if (!q) passesText = true;
          else {
            passesText = entry.text.toLowerCase().includes(q) || 
                         CATEGORIES.find(c => c.id === entry.category)?.label.toLowerCase().includes(q) || false;
          }

          if (passesFilter && passesText) {
            dayMatches = true;
            matchText = entry.text;
            break; // found match in this day
          }
        }

        if (dayMatches) {
          matches.push({ book, day, text: matchText });
        }
      }
    }
    
    // Sort recent first
    return matches.sort((a, b) => new Date(b.day.date).getTime() - new Date(a.day.date).getTime());
  }, [debouncedQuery, activeFilters]);

  return (
    <motion.div 
      className="search-overlay"
      initial={{ y: '-100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="search-header">
        <div className="search-input-wrap">
          <Search size={20} color="var(--text-tertiary)" className="search-icon" />
          <input
            autoFocus
            type="text"
            className="search-input"
            placeholder="Search your memories"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveRecent(query)}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <button className="search-cancel" onClick={onClose}>Cancel</button>
      </div>

      <div className="search-body">
        {!isReady ? (
          <div className="search-state-msg">
            <div className="spinner" />
            <p>Still catching up on your history — search will be ready in a moment.</p>
          </div>
        ) : (
          <>
            {/* Suggestions / Filters */}
            <div className="search-filters-scroll">
              <div className="search-filters">
                <button className={`filter-chip ${activeFilters.includes('has_photo') ? 'active' : ''}`} onClick={() => toggleFilter('has_photo')}>
                  <ImageIcon size={14} /> Has photo
                </button>
                <button className={`filter-chip ${activeFilters.includes('this_year') ? 'active' : ''}`} onClick={() => toggleFilter('this_year')}>
                  <Calendar size={14} /> This year
                </button>
                {CATEGORIES.map(c => (
                  <button key={c.id} className={`filter-chip ${activeFilters.includes(c.id) ? 'active' : ''}`} onClick={() => toggleFilter(c.id)}>
                    <c.icon size={14} /> {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recents (only show if no query/results) */}
            {!query && activeFilters.length === 0 && recent.length > 0 && (
              <div className="search-recent">
                <h3 className="section-label">Recent Searches</h3>
                {recent.map((r, i) => (
                  <button key={i} className="recent-item" onClick={() => setQuery(r)}>
                    <Clock size={16} color="var(--text-tertiary)" />
                    <span>{r}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {results !== null && (
              <div className="search-results">
                {results.length === 0 ? (
                  <div className="search-empty">
                    <p>No memories found for '{debouncedQuery}'.</p>
                    <p className="search-empty-sub">Try browsing by category instead.</p>
                  </div>
                ) : (
                  <div className="search-list">
                    {results.map((res, i) => (
                      <button 
                        key={i} 
                        className="search-result-card"
                        onClick={() => {
                          saveRecent(query);
                          onSelectResult(res.book, res.day);
                        }}
                      >
                        <div className="result-thumb">
                          {res.day.entries.find((e: any) => e.photos?.length)?.photos?.[0] ? (
                            <img src={res.day.entries.find((e: any) => e.photos?.length)?.photos![0]} alt="thumb" />
                          ) : (
                            <BookOpen size={20} color="var(--text-tertiary)" />
                          )}
                        </div>
                        <div className="result-content">
                          <span className="result-date">
                            {new Date(res.day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <p className="result-text">{res.text.length > 60 ? res.text.substring(0, 60) + '...' : res.text}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
