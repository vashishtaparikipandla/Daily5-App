import { useState } from 'react';
import { motion } from 'framer-motion';
import './Auth.css';

interface AuthProps {
  onLogin: () => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [mode, setMode]   = useState<'signin' | 'encrypt'>('signin');
  const [shake, setShake] = useState(false);

  const submit = () => {
    if (!email) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (mode === 'signin') setMode('encrypt');
    else onLogin();
  };

  if (mode === 'encrypt') {
    return (
      <motion.div
        className="auth-wrap"
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div className="auth-encrypt-icon">🔒</div>
        <h2 className="auth-title">Your diary,\nonly yours.</h2>
        <p className="auth-body">
          Your entries are end-to-end encrypted. Only you can read them — not even we can access your content.
        </p>
        <motion.button className="auth-btn-primary" onClick={onLogin} whileTap={{ scale: 0.97 }}>
          I understand — let's go
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="auth-wrap"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="auth-header">
        <h1 className="auth-wordmark">Daily 5</h1>
        <p className="auth-subtitle">Sign in to continue</p>
      </div>

      {/* OAuth buttons */}
      <div className="auth-oauth">
        <motion.button className="oauth-btn" whileTap={{ scale: 0.97 }} onClick={submit}>
          <span className="oauth-icon">🍎</span>
          Continue with Apple
        </motion.button>
        <motion.button className="oauth-btn" whileTap={{ scale: 0.97 }} onClick={submit}>
          <span className="oauth-icon">G</span>
          Continue with Google
        </motion.button>
      </div>

      <div className="auth-divider"><span>or</span></div>

      {/* Email */}
      <div className="auth-fields">
        {[
          { label: 'Email', value: email, setter: setEmail, type: 'email', idx: 0 },
          { label: 'Password', value: pass, setter: setPass, type: 'password', idx: 1 },
        ].map(({ label, value, setter, type, idx }) => (
          <motion.div
            key={label}
            className="field-group"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx, duration: 0.2 }}
          >
            <label className="field-label">{label}</label>
            <motion.input
              type={type}
              className={`field-input ${shake && label === 'Email' ? 'shake' : ''}`}
              placeholder={label}
              value={value}
              onChange={e => setter(e.target.value)}
            />
          </motion.div>
        ))}
      </div>

      <motion.button className="auth-btn-primary" onClick={submit} whileTap={{ scale: 0.97 }}>
        Continue
      </motion.button>

      <p className="auth-footer-note">
        By continuing you agree to the Terms of Service and Privacy Policy.
      </p>
    </motion.div>
  );
}
