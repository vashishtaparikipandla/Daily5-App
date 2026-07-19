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
  const [sub, setSub] = useState<'main' | 'edit' | 'notifications' | 'appearance' | 'privacy'>('main');

  const handleLogout = () => {
    localStorage.removeItem('daily5_auth');
    localStorage.removeItem('daily5_onboarded');
    sessionStorage.removeItem('daily5_session_started');
    window.location.reload();
  };

  const setTheme = (val: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', val);
  };

  if (sub !== 'main') {
    return (
      <motion.div
        className="profile-wrap"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.22 }}
      >
        <div className="sub-header">
          <button className="sub-back" onClick={() => setSub('main')}>
            <ChevronRight size={20} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h2 className="sub-title">
            {sub === 'appearance' && 'Appearance'}
            {sub === 'edit' && 'Edit Profile'}
            {sub === 'notifications' && 'Notifications'}
            {sub === 'privacy' && 'Data & Privacy'}
          </h2>
          <div style={{ width: 24 }} />
        </div>

        {sub === 'appearance' && (
          <div className="sub-content">
            <p className="sub-section-desc">Choose how Daily 5 looks on this device.</p>
            <div className="settings-list">
              <button className="settings-row" onClick={() => setTheme('light')}>
                <div className="settings-text">Light Mode (Paper)</div>
              </button>
              <button className="settings-row" onClick={() => setTheme('dark')}>
                <div className="settings-text">Dark Mode</div>
              </button>
            </div>
          </div>
        )}

        {sub === 'edit' && (
          <div className="sub-content">
            <div className="profile-hero">
              <div className="profile-avatar"><User size={28} color="#fff" /></div>
              <button className="edit-btn" style={{ marginTop: 12 }}>Change Photo</button>
            </div>
            <div className="auth-fields">
              <div className="field-group">
                <label className="field-label">Display Name</label>
                <input className="field-input" defaultValue="Daily 5 User" />
              </div>
              <div className="field-group">
                <label className="field-label">Email</label>
                <input className="field-input" defaultValue="yourname@email.com" />
              </div>
            </div>
          </div>
        )}

        {sub === 'notifications' && (
          <div className="sub-content">
            <div className="settings-list">
              <div className="settings-row">
                <div className="settings-text">
                  <span className="settings-label">Nightly reminder</span>
                  <span className="settings-sub">9:00 PM local</span>
                </div>
                <div className="toggle-switch active"><div className="toggle-knob" /></div>
              </div>
              <div className="settings-row">
                <div className="settings-text">
                  <span className="settings-label">On This Day</span>
                  <span className="settings-sub">Resurface past memories</span>
                </div>
                <div className="toggle-switch active"><div className="toggle-knob" /></div>
              </div>
              <div className="settings-row">
                <div className="settings-text">
                  <span className="settings-label">Book complete</span>
                  <span className="settings-sub">Alert when month finishes</span>
                </div>
                <div className="toggle-switch"><div className="toggle-knob" /></div>
              </div>
            </div>
          </div>
        )}

        {sub === 'privacy' && (
          <div className="sub-content">
            <div className="settings-list">
              <button className="settings-row">
                <div className="settings-text">Export my data</div>
              </button>
              <button className="settings-row">
                <div className="settings-text">Biometric Unlock</div>
                <div className="toggle-switch active"><div className="toggle-knob" /></div>
              </button>
              <button className="settings-row" style={{ marginTop: 24 }}>
                <div className="settings-text" style={{ color: 'var(--accent)' }}>Delete Account</div>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

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
        <button className="edit-btn" onClick={() => setSub('edit')} style={{ marginTop: 8 }}>
          Edit Profile
        </button>
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
          <button className="settings-row" onClick={() => setSub('notifications')}>
            <div className="settings-icon-wrap"><Bell size={18} strokeWidth={1.75} /></div>
            <div className="settings-text">
              <span className="settings-label">Notifications</span>
              <span className="settings-sub">9:00 PM daily reminder</span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} className="settings-chevron" />
          </button>
          <button className="settings-row" onClick={() => setSub('appearance')}>
            <div className="settings-icon-wrap"><Palette size={18} strokeWidth={1.75} /></div>
            <div className="settings-text">
              <span className="settings-label">Appearance</span>
              <span className="settings-sub">Light Mode</span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} className="settings-chevron" />
          </button>
          <button className="settings-row" onClick={() => setSub('privacy')}>
            <div className="settings-icon-wrap"><Shield size={18} strokeWidth={1.75} /></div>
            <div className="settings-text">
              <span className="settings-label">Privacy</span>
              <span className="settings-sub">End-to-end encrypted</span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} className="settings-chevron" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="profile-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
        <p className="profile-version">Daily 5 · v1.1</p>
      </div>
    </motion.div>
  );
}
