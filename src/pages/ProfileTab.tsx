import { motion } from 'framer-motion';
import './ProfileTab.css';

export function ProfileTab() {
  const handleLogout = () => {
    localStorage.removeItem('daily5_auth');
    localStorage.removeItem('daily5_onboarded');
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
      <div className="profile-hero">
        <div className="profile-avatar">D</div>
        <h2 className="profile-name">Daily 5 User</h2>
        <p className="profile-email">yourname@email.com</p>
      </div>

      <div className="profile-section">
        <p className="section-label">Your Story</p>
        <div className="stats-grid">
          {[
            { label: 'Days logged', value: '14' },
            { label: 'Books created', value: '0' },
            { label: 'Moments saved', value: '42' },
            { label: 'Months active', value: '1' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <p className="section-label">Settings</p>
        <div className="settings-list">
          {[
            { icon: '🔔', label: 'Notifications', sub: '9:00 PM daily reminder' },
            { icon: '🎨', label: 'Appearance',    sub: 'Auto (follows system)' },
            { icon: '🔒', label: 'Privacy',       sub: 'End-to-end encrypted' },
            { icon: '📦', label: 'Export data',   sub: 'Download all entries' },
            { icon: '🖨️', label: 'Print orders',  sub: 'View order history' },
          ].map(s => (
            <button key={s.label} className="settings-row">
              <span className="settings-icon">{s.icon}</span>
              <div className="settings-text">
                <span className="settings-label">{s.label}</span>
                <span className="settings-sub">{s.sub}</span>
              </div>
              <span className="settings-chevron">›</span>
            </button>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <button className="share-btn">
          <span>🎁</span>
          Gift Daily 5 to a friend
        </button>
      </div>

      <div className="profile-footer">
        <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        <p className="profile-version">Daily 5 • v1.0 prototype</p>
      </div>
    </motion.div>
  );
}
