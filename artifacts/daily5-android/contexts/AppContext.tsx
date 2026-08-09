import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';
import { KEYS } from '@/lib/storage';
import { deleteBackupFile } from '@/lib/backup';

const ACCESS_TOKEN_STORE_KEY = 'daily5_access_token';

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
  /** Google OAuth2 access token for the current session. Null for demo accounts or after expiry. */
  accessToken: string | null;
  theme: 'light' | 'dark' | 'system';
  biometricEnabled: boolean;
  backupEnabled: boolean;
  signIn: (user: AppUser, googleAccessToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Challenge biometric if enabled; otherwise resolves true immediately. */
  unlock: () => Promise<boolean>;
  setTheme: (t: 'light' | 'dark' | 'system') => Promise<void>;
  /** Enable/disable biometric. Enabling requires a live auth challenge first. */
  setBiometricEnabled: (v: boolean) => Promise<boolean>;
  /** Enable/disable encrypted cloud backup. */
  setBackupEnabled: (v: boolean) => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('light');
  const [biometricEnabled, setBiometricState] = useState(false);
  const [backupEnabled, setBackupState] = useState(false);
  // isUnlocked: true when biometric is disabled OR after a successful biometric challenge
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [userJson, onboarded, savedTheme, biometric, backup] = await Promise.all([
        AsyncStorage.getItem(KEYS.AUTH_USER),
        AsyncStorage.getItem(KEYS.ONBOARDED),
        AsyncStorage.getItem(KEYS.THEME),
        AsyncStorage.getItem(KEYS.BIOMETRIC),
        AsyncStorage.getItem(KEYS.BACKUP_ENABLED),
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
      setBackupState(backup === 'true');
      setIsUnlocked(!hasUser || !bioEnabled);

      // Restore persisted access token in the same async batch so the token
      // is already set when setIsLoading(false) fires and downstream consumers
      // (OrdersContext) see user + token together on the first render.
      if (Platform.OS !== 'web' && hasUser) {
        try {
          const token = await SecureStore.getItemAsync(ACCESS_TOKEN_STORE_KEY);
          if (token) setAccessToken(token);
        } catch {}
      }
    } catch {}
    setIsLoading(false);
  }

  function applyTheme(t: 'light' | 'dark' | 'system') {
    if (t === 'system') Appearance.setColorScheme(null);
    else Appearance.setColorScheme(t);
  }

  async function signIn(u: AppUser, googleAccessToken?: string) {
    await AsyncStorage.multiSet([
      [KEYS.AUTH_USER, JSON.stringify(u)],
      [KEYS.ONBOARDED, 'true'],
    ]);
    setUser(u);
    setHasOnboarded(true);
    setIsUnlocked(true);

    // Persist the access token so order sync survives a cold restart
    const tok = googleAccessToken ?? null;
    setAccessToken(tok);
    if (Platform.OS !== 'web') {
      if (tok) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_STORE_KEY, tok).catch(() => {});
      } else {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORE_KEY).catch(() => {});
      }
    }
  }

  async function signOut() {
    await AsyncStorage.removeItem(KEYS.AUTH_USER);
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORE_KEY).catch(() => {});
    }
    setUser(null);
    setAccessToken(null);
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

  async function setBackupEnabled(v: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.BACKUP_ENABLED, v ? 'true' : 'false');
    setBackupState(v);
  }

  async function deleteAccount() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    // Also remove the backup file so deleted accounts don't leave data behind
    try { await deleteBackupFile(); } catch {}
    setUser(null);
    setHasOnboarded(false);
    setIsUnlocked(false);
    setBackupState(false);
  }

  return (
    <AppContext.Provider value={{
      isLoading, isAuthenticated: !!user, hasOnboarded,
      isUnlocked, user, accessToken, theme, biometricEnabled, backupEnabled,
      signIn, signOut, completeOnboarding,
      unlock, setTheme, setBiometricEnabled, setBackupEnabled,
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
