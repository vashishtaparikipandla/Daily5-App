import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TodayTab }   from './TodayTab';
import { LibraryTab } from './LibraryTab';
import { ExtrasTab }  from './ExtrasTab';
import { ProfileTab } from './ProfileTab';
import { LoggingModal } from '../components/LoggingModal';
import './Home.css';

export type TabId = 'today' | 'library' | 'extras' | 'profile';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'today',   icon: '📅', label: 'Today'   },
  { id: 'library', icon: '📚', label: 'Library'  },
  { id: 'extras',  icon: '✦',  label: 'Discover' },
  { id: 'profile', icon: '👤', label: 'Profile'  },
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
        <span>●●● ▲ 100%</span>
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
        {TABS.map((t, i) => {
          const isMid = i === 1;
          if (isMid) {
            return (
              <div key="fab-wrap" className="nav-fab-wrap">
                <button
                  className="nav-tab"
                  style={{ flexDirection: 'column', alignItems: 'center' }}
                  onClick={() => setTab(t.id)}
                >
                  <span className={`nav-tab-icon ${tab === t.id ? 'active' : ''}`}>{t.icon}</span>
                  <span className={`nav-tab-label ${tab === t.id ? 'active' : ''}`}>{t.label}</span>
                </button>
                <motion.button
                  className="nav-fab"
                  onClick={() => setLogging(true)}
                  whileTap={{ scale: 0.92 }}
                >
                  <span className="nav-fab-icon">＋</span>
                </motion.button>
              </div>
            );
          }
          return (
            <button key={t.id} className="nav-tab" onClick={() => setTab(t.id)}>
              <span className={`nav-tab-icon ${tab === t.id ? 'active' : ''}`}>{t.icon}</span>
              <span className={`nav-tab-label ${tab === t.id ? 'active' : ''}`}>{t.label}</span>
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
