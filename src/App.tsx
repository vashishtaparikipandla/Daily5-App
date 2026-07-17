import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Splash } from './components/Splash';
import { Onboarding } from './components/Onboarding';
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import './App.css';

type AppState = 'splash' | 'onboarding' | 'auth' | 'home';

function App() {
  const [state, setState] = useState<AppState>('splash');

  useEffect(() => {
    const timer = setTimeout(() => {
      const authed = localStorage.getItem('daily5_auth') === 'true';
      const onboarded = localStorage.getItem('daily5_onboarded') === 'true';
      if (authed) setState('home');
      else if (onboarded) setState('auth');
      else setState('onboarding');
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const handleOnboardDone = () => setState('auth');
  const handleLogin = () => {
    localStorage.setItem('daily5_auth', 'true');
    localStorage.setItem('daily5_onboarded', 'true');
    setState('home');
  };

  return (
    <div className="phone-shell">
      <div className="app-viewport">
        <AnimatePresence mode="wait">
          {state === 'splash'      && <Splash key="splash" />}
          {state === 'onboarding'  && <Onboarding key="onboard" onDone={handleOnboardDone} />}
          {state === 'auth'        && <Auth key="auth" onLogin={handleLogin} />}
          {state === 'home'        && <Home key="home" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
