import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar, BookMarked, Compass, User, Plus,
} from 'lucide-react';
import { TodayTab }   from './TodayTab';
import { LibraryTab } from './LibraryTab';
import { ExtrasTab }  from './ExtrasTab';
import { ProfileTab } from './ProfileTab';
import { LoggingModal } from '../components/LoggingModal';
import './Home.css';

export type TabId = 'today' | 'library' | 'extras' | 'profile';

const TABS: { id: TabId; Icon: React.ElementType; label: string }[] = [
  { id: 'today',   Icon: Calendar,   label: 'Today'   },
  { id: 'library', Icon: BookMarked, label: 'Library' },
  { id: 'extras',  Icon: Compass,    label: 'Discover'},
  { id: 'profile', Icon: User,       label: 'Profile' },
];

export function Home() {
  const [tab, setTab]         = useState<TabId>('today');
  const [logging, setLogging] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const onSaved = () => setRefresh(r => r + 1);

  return (
    <motion.div
      className="home-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Status bar */}
      <div className="status-bar">
        <span>9:41</span>
        <span className="status-right">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" opacity=".7">
            <rect x="0" y="4" width="3" height="8" rx="1"/>
            <rect x="4.5" y="2.5" width="3" height="9.5" rx="1"/>
            <rect x="9" y="1" width="3" height="11" rx="1"/>
            <rect x="13.5" y="0" width="3" height="12" rx="1"/>
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".7">
            <path d="M8 3C10.5 3 12.7 4 14.2 5.7L15.5 4.3C13.6 2.3 11 1 8 1S2.4 2.3.5 4.3L1.8 5.7C3.3 4 5.5 3 8 3Z"/>
            <path d="M8 7C9.3 7 10.4 7.5 11.2 8.3L12.5 7C11.3 5.8 9.7 5 8 5S4.7 5.8 3.5 7L4.8 8.3C5.6 7.5 6.7 7 8 7Z"/>
            <circle cx="8" cy="11" r="1.5" fill="currentColor"/>
          </svg>
          100%
        </span>
      </div>

      {/* Main content */}
      <div className="home-content">
        <AnimatePresence mode="wait">
          {tab === 'today'   && <TodayTab   key="today"   onLog={() => setLogging(true)} refresh={refresh} />}
          {tab === 'library' && <LibraryTab key="library" />}
          {tab === 'extras'  && <ExtrasTab  key="extras"  />}
          {tab === 'profile' && <ProfileTab key="profile" />}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {TABS.slice(0, 2).map(t => {
          const isActive  = tab === t.id;
          return (
            <button
              key={t.id}
              className={`nav-tab ${isActive ? 'nav-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <t.Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              <span className="nav-label">{t.label}</span>
            </button>
          );
        })}

        <div className="nav-fab-spacer">
          <motion.button
            className="nav-fab"
            onClick={e => { e.stopPropagation(); setLogging(true); }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
          >
            <Plus size={26} strokeWidth={2.5} color="#fff" />
          </motion.button>
        </div>

        {TABS.slice(2, 4).map(t => {
          const isActive  = tab === t.id;
          return (
            <button
              key={t.id}
              className={`nav-tab ${isActive ? 'nav-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <t.Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              <span className="nav-label">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logging modal */}
      <AnimatePresence>
        {logging && (
          <LoggingModal
            key="logging"
            onClose={() => setLogging(false)}
            onSaved={onSaved}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
