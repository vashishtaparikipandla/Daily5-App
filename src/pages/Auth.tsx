import { useState } from 'react';
import { motion } from 'framer-motion';
import './Auth.css';

interface AuthProps {
  onLogin: () => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [mode, setMode]   = useState<'options' | 'email' | 'otp' | 'encrypt'>('options');
  const [email, setEmail] = useState('');
  const [otp, setOtp]     = useState(['', '', '', '', '', '']);
  const [shake, setShake] = useState(false);

  const handleEmailSubmit = () => {
    if (!email || !email.includes('@')) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setMode('otp');
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) return; // limit to 1 char
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // auto-advance
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // auto-submit if full
    if (index === 5 && val) {
      setTimeout(() => setMode('encrypt'), 300);
    }
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

  if (mode === 'otp') {
    return (
      <motion.div
        className="auth-wrap"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <div className="auth-header">
          <h1 className="auth-wordmark">Verify Email</h1>
          <p className="auth-subtitle">Code sent to {email}</p>
        </div>
        <div className="otp-container">
          {otp.map((v, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              className="otp-input"
              value={v}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Backspace' && !v && i > 0) {
                  document.getElementById(`otp-${i - 1}`)?.focus();
                }
              }}
            />
          ))}
        </div>
        <div className="otp-footer">
          <button className="otp-resend" onClick={() => {}}>Resend in 0:59</button>
          <button className="otp-change" onClick={() => setMode('email')}>Change email</button>
        </div>
      </motion.div>
    );
  }

  if (mode === 'email') {
    return (
      <motion.div
        className="auth-wrap"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <div className="auth-header">
          <h1 className="auth-wordmark">Sign in</h1>
          <p className="auth-subtitle">Enter your email to continue</p>
        </div>
        <div className="auth-fields">
          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              type="email"
              className={`field-input ${shake ? 'shake' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <motion.button className="auth-btn-primary" onClick={handleEmailSubmit} whileTap={{ scale: 0.97 }}>
          Send Code
        </motion.button>
        <button className="otp-change" onClick={() => setMode('options')} style={{ marginTop: 16 }}>Back</button>
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

      <div className="auth-oauth" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        <motion.button className="oauth-btn" whileTap={{ scale: 0.97 }} onClick={() => setMode('encrypt')}>
          <span className="oauth-icon">🍎</span>
          Continue with Apple
        </motion.button>
        <motion.button className="oauth-btn" whileTap={{ scale: 0.97 }} onClick={() => setMode('encrypt')}>
          <span className="oauth-icon">G</span>
          Continue with Google
        </motion.button>
        <motion.button className="oauth-btn" whileTap={{ scale: 0.97 }} onClick={() => setMode('email')}>
          <span className="oauth-icon">✉️</span>
          Continue with Email
        </motion.button>
      </div>

      <p className="auth-footer-note">
        By continuing you agree to the Terms of Service and Privacy Policy.
      </p>
    </motion.div>
  );
}
