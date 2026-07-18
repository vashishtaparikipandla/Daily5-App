import { motion } from 'framer-motion';
import {
  Bell, Palette, Shield, Download, Printer,
  Gift, LogOut, ChevronRight, User,
} from 'lucide-react';
import './ProfileTab.css';

const SETTINGS = [
  { Icon: Bell,     label: 'Notifications', sub: '9:00 PM daily reminder'  },
  { Icon: Palette,  label: 'Appearance',    sub: 'Auto (follows system)'   },
  { Icon: Shield,   label: 'Privacy',       sub: 'End-to-end encrypted'    },
  { Icon: Download, label: 'Export data',   sub: 'Download all entries'    },
  { Icon: Printer,  label: 'Print orders',  sub: 'View order history'      },
];

export function ProfileTab() {
  const handleLogout = () => {
    localStorage.removeItem('daily5_auth');
    localStorage.removeItem('daily5_onboarded');
    sessionStorage.removeItem('daily5_session_started');
    window.location.reload();
  };

  return (
    <motion.div
      className="profile-wrap"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">
          <User size={28} strokeWidth={1.75} color="#fff" />
        </div>
        <h2 className="profile-name">Daily 5 User</h2>
        <p className="profile-email">yourname@email.com</p>
      </div>

      {/* Stats */}
      <div className="profile-section">
        <p className="section-label">Your Story</p>
        <div className="stats-grid">
          {[
            { label: 'Days logged',   value: '14' },
            { label: 'Books created', value: '0'  },
            { label: 'Moments saved', value: '42' },
            { label: 'Months active', value: '1'  },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="profile-section">
        <p className="section-label">Settings</p>
        <div className="settings-list">
          {SETTINGS.map(({ Icon, label, sub }) => (
            <button key={label} className="settings-row">
              <div className="settings-icon-wrap">
                <Icon size={18} strokeWidth={1.75} />
              </div>
              <div className="settings-text">
                <span className="settings-label">{label}</span>
                <span className="settings-sub">{sub}</span>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} className="settings-chevron" />
            </button>
          ))}
        </div>
      </div>

      {/* Gift */}
      <div className="profile-section">
        <button className="share-btn">
          <Gift size={18} strokeWidth={1.75} />
          Gift Daily 5 to a friend
        </button>
      </div>

      {/* Footer */}
      <div className="profile-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
        <p className="profile-version">Daily 5 · v1.0 prototype</p>
      </div>
    </motion.div>
  );
}
