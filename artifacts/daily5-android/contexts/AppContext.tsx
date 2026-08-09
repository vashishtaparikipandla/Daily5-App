import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { KEYS } from '@/lib/storage';

export interface AppUser {
  name: string;
  email: string;
  avatar?: string;
}

interface AppContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  /** True once the user has passed biometric (or biometric is disabled). */
  isUnlocked: boolean;
  user: AppUser | null;
  theme: 'light' | 'dark' | 'system';
  biometricEnabled: boolean;
  signIn: (user: AppUser) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Challenge biometric if enabled; otherwise resolves true immediately. */
  unlock: () => Promise<boolean>;
  setTheme: (t: 'light' | 'dark' | 'system') => Promise<void>;
  /** Enable/disable biometric. Enabling requires a live auth challenge first. */
  setBiometricEnabled: (v: boolean) => Promise<boolean>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('light');
  const [biometricEnabled, setBiometricState] = useState(false);
  // isUnlocked: true when biometric is disabled OR after a successful biometric challenge
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [userJson, onboarded, savedTheme, biometric] = await Promise.all([
        AsyncStorage.getItem(KEYS.AUTH_USER),
        AsyncStorage.getItem(KEYS.ONBOARDED),
        AsyncStorage.getItem(KEYS.THEME),
        AsyncStorage.getItem(KEYS.BIOMETRIC),
      ]);
      const hasUser = !!userJson;
      const bioEnabled = biometric === 'true';

      if (userJson) setUser(JSON.parse(userJson) as AppUser);
      if (onboarded === 'true') setHasOnboarded(true);
      if (savedTheme) {
        const t = savedTheme as 'light' | 'dark' | 'system';
        setThemeState(t);
        applyTheme(t);
      }
      setBiometricState(bioEnabled);
      // If no user or biometric not enabled, the app is already "unlocked"
      setIsUnlocked(!hasUser || !bioEnabled);
    } catch {}
    setIsLoading(false);
  }

  function applyTheme(t: 'light' | 'dark' | 'system') {
    if (t === 'system') Appearance.setColorScheme(null);
    else Appearance.setColorScheme(t);
  }

  async function signIn(u: AppUser) {
    await AsyncStorage.multiSet([
      [KEYS.AUTH_USER, JSON.stringify(u)],
      [KEYS.ONBOARDED, 'true'],
    ]);
    setUser(u);
    setHasOnboarded(true);
    // Signing in counts as unlocked for this session
    setIsUnlocked(true);
  }

  async function signOut() {
    await AsyncStorage.removeItem(KEYS.AUTH_USER);
    setUser(null);
    setIsUnlocked(false);
  }

  async function completeOnboarding() {
    await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
    setHasOnboarded(true);
  }

  /**
   * Challenge biometric if enabled; persist flag on success.
   * Returns true on success or when biometric is disabled.
   */
  async function unlock(): Promise<boolean> {
    if (!biometricEnabled) {
      setIsUnlocked(true);
      return true;
    }
    const { authenticateWithBiometric } = await import('@/lib/biometric');
    const success = await authenticateWithBiometric();
    if (success) setIsUnlocked(true);
    return success;
  }

  async function setTheme(t: 'light' | 'dark' | 'system') {
    await AsyncStorage.setItem(KEYS.THEME, t);
    setThemeState(t);
    applyTheme(t);
  }

  /**
   * Enable or disable biometric. When enabling, runs an auth challenge first
   * and only persists if the challenge succeeds. Returns whether the final
   * biometric state is enabled.
   */
  async function setBiometricEnabled(v: boolean): Promise<boolean> {
    if (v) {
      const { isBiometricAvailable, authenticateWithBiometric } = await import('@/lib/biometric');
      const available = await isBiometricAvailable();
      if (!available) return false;
      const success = await authenticateWithBiometric();
      if (!success) return false;
    }
    await AsyncStorage.setItem(KEYS.BIOMETRIC, v ? 'true' : 'false');
    setBiometricState(v);
    return v;
  }

  async function updateUser(updates: Partial<AppUser>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(KEYS.AUTH_USER, JSON.stringify(updated));
    setUser(updated);
  }

  async function deleteAccount() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    setUser(null);
    setHasOnboarded(false);
    setIsUnlocked(false);
  }

  return (
    <AppContext.Provider value={{
      isLoading, isAuthenticated: !!user, hasOnboarded,
      isUnlocked, user, theme, biometricEnabled,
      signIn, signOut, completeOnboarding,
      unlock, setTheme, setBiometricEnabled,
      updateUser, deleteAccount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
