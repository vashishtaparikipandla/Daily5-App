import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Splash } from './components/Splash';
import { Onboarding } from './components/Onboarding';
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import './App.css';

type AppState = 'splash' | 'onboarding' | 'auth' | 'home';

// For demo: always clear stale auth so Splash → Onboarding → Auth → Home
// is always visible on first load of a new session.
// Remove this block to restore persistent auth.
const DEMO_FORCE_FRESH = true;
if (DEMO_FORCE_FRESH) {
  // Only clear if this is a new browser tab session (sessionStorage check)
  if (!sessionStorage.getItem('daily5_session_started')) {
    localStorage.removeItem('daily5_auth');
    localStorage.removeItem('daily5_onboarded');
    sessionStorage.setItem('daily5_session_started', 'true');
  }
}

import { seedDemoDataIfNeeded } from './lib/data';

function App() {
  const [state, setState] = useState<AppState>('splash');

  useEffect(() => {
    seedDemoDataIfNeeded();
    // Show splash for a minimum of 2s, then decide next screen
    const timer = setTimeout(() => {
      const authed   = localStorage.getItem('daily5_auth')     === 'true';
      const onboarded = localStorage.getItem('daily5_onboarded') === 'true';
      if (authed)         setState('home');
      else if (onboarded) setState('auth');
      else                setState('onboarding');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleOnboardDone = () => setState('auth');

  const handleLogin = () => {
    localStorage.setItem('daily5_auth',     'true');
    localStorage.setItem('daily5_onboarded','true');
    sessionStorage.setItem('daily5_session_started', 'true');
    setState('home');
  };

  return (
    <div className="phone-shell">
      <div className="app-viewport">
        <AnimatePresence mode="wait">
          {state === 'splash'     && <Splash     key="splash"  />}
          {state === 'onboarding' && <Onboarding key="onboard" onDone={handleOnboardDone} />}
          {state === 'auth'       && <Auth       key="auth"    onLogin={handleLogin} />}
          {state === 'home'       && <Home       key="home"    />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
