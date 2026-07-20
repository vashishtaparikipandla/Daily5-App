import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ShieldCheck, Lock, Mail } from 'lucide-react';

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
  </svg>
);
import { PhotoBackfillFlow } from '../components/PhotoBackfillFlow';
import './Auth.css';

interface AuthProps {
  onLogin: () => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [mode, setMode]   = useState<'options' | 'email' | 'otp' | 'encrypt' | 'backfill'>('options');
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

  if (mode === 'backfill') {
    return <PhotoBackfillFlow onComplete={onLogin} onSkip={onLogin} />;
  }

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
        <h2 className="auth-title">Your diary,<br/>only yours.</h2>
        <div className="auth-trust-block">
          <div className="auth-trust-row">
            <Lock size={18} className="auth-trust-icon" />
            <p className="auth-body">
              Your entries are end-to-end encrypted. Only you can read them — not even we can access your content.
            </p>
          </div>
          <div className="auth-trust-row auth-trust-secondary">
            <ShieldCheck size={18} className="auth-trust-icon" />
            <p className="auth-body">
              Over 2 million private memories logged so far. None of them, ever seen by us.
            </p>
          </div>
        </div>
        <motion.button className="auth-btn-primary" onClick={() => setMode('backfill')} whileTap={{ scale: 0.97 }}>
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
          <span className="oauth-icon"><AppleIcon /></span>
          Continue with Apple
        </motion.button>
        <motion.button className="oauth-btn" whileTap={{ scale: 0.97 }} onClick={() => setMode('encrypt')}>
          <span className="oauth-icon"><GoogleIcon /></span>
          Continue with Google
        </motion.button>
        <motion.button className="oauth-btn" whileTap={{ scale: 0.97 }} onClick={() => setMode('email')}>
          <span className="oauth-icon"><Mail size={18} /></span>
          Continue with Email
        </motion.button>
        <div className="auth-trust-line">
          <Users size={16} className="auth-trust-icon" />
          <span style={{ textAlign: 'left', lineHeight: '1.4' }}>Trusted by 12,000+ people keeping a year they didn't want to lose.</span>
        </div>
      </div>

      <p className="auth-footer-note">
        By continuing you agree to the Terms of Service and Privacy Policy.
      </p>
    </motion.div>
  );
}
