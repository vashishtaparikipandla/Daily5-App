import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';
import { KEYS } from '@/lib/storage';
import { deleteBackupFile } from '@/lib/backup';

const ACCESS_TOKEN_STORE_KEY   = 'daily5_access_token';
const DRIVE_TOKEN_STORE_KEY    = 'daily5_drive_token';
const DRIVE_EXPIRY_STORE_KEY   = 'daily5_drive_token_expiry'; // ms-since-epoch string

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
  // ── Google Drive ──────────────────────────────────────────────────────────
  /** True when the user has granted Drive appdata access. */
  driveConnected: boolean;
  /** Email of the connected Google Drive account, or null. */
  driveAccount: string | null;
  /**
   * Persist a Drive OAuth token obtained from the connect flow.
   * `expiryMs` is an absolute ms-since-epoch timestamp when the token expires.
   */
  setDriveConnection: (email: string, token: string, expiryMs: number) => Promise<void>;
  /** Remove all Drive credentials and disconnect. */
  disconnectGoogleDrive: () => Promise<void>;
  /**
   * Return the current Drive access token if it is still valid, or null if it
   * has expired (caller should prompt the user to reconnect).
   */
  getDriveToken: () => Promise<string | null>;
  // ─────────────────────────────────────────────────────────────────────────
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
  const [isUnlocked, setIsUnlocked] = useState(false);
  // Drive state
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveAccount, setDriveAccount] = useState<string | null>(null);
  const [driveTokenExpiry, setDriveTokenExpiry] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [userJson, onboarded, savedTheme, biometric, backup, driveConn, driveAcc] =
        await Promise.all([
          AsyncStorage.getItem(KEYS.AUTH_USER),
          AsyncStorage.getItem(KEYS.ONBOARDED),
          AsyncStorage.getItem(KEYS.THEME),
          AsyncStorage.getItem(KEYS.BIOMETRIC),
          AsyncStorage.getItem(KEYS.BACKUP_ENABLED),
          AsyncStorage.getItem(KEYS.DRIVE_CONNECTED),
          AsyncStorage.getItem(KEYS.DRIVE_ACCOUNT),
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

      // Restore Drive connection state
      if (driveConn === 'true') {
        setDriveConnected(true);
        if (driveAcc) setDriveAccount(driveAcc);
      }

      if (Platform.OS !== 'web' && hasUser) {
        try {
          // Restore sign-in access token + Drive token/expiry in parallel
          const [token, driveExpRaw] = await Promise.all([
            SecureStore.getItemAsync(ACCESS_TOKEN_STORE_KEY),
            driveConn === 'true' ? SecureStore.getItemAsync(DRIVE_EXPIRY_STORE_KEY) : Promise.resolve(null),
          ]);
          if (token) setAccessToken(token);
          if (driveExpRaw) setDriveTokenExpiry(Number(driveExpRaw));
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

  async function setDriveConnection(email: string, token: string, expiryMs: number): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.DRIVE_CONNECTED, 'true'],
      [KEYS.DRIVE_ACCOUNT, email],
    ]);
    if (Platform.OS !== 'web') {
      await Promise.all([
        SecureStore.setItemAsync(DRIVE_TOKEN_STORE_KEY, token).catch(() => {}),
        SecureStore.setItemAsync(DRIVE_EXPIRY_STORE_KEY, String(expiryMs)).catch(() => {}),
      ]);
    }
    setDriveConnected(true);
    setDriveAccount(email);
    setDriveTokenExpiry(expiryMs);
  }

  async function disconnectGoogleDrive(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.DRIVE_CONNECTED, KEYS.DRIVE_ACCOUNT, KEYS.DRIVE_LAST_BACKUP, KEYS.DRIVE_SCHEDULE]);
    if (Platform.OS !== 'web') {
      await Promise.all([
        SecureStore.deleteItemAsync(DRIVE_TOKEN_STORE_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(DRIVE_EXPIRY_STORE_KEY).catch(() => {}),
      ]);
    }
    setDriveConnected(false);
    setDriveAccount(null);
    setDriveTokenExpiry(null);
  }

  async function getDriveToken(): Promise<string | null> {
    if (!driveConnected) return null;
    // Buffer of 60 s so we don't use a token that will expire mid-request
    if (!driveTokenExpiry || Date.now() + 60_000 >= driveTokenExpiry) return null;
    if (Platform.OS === 'web') return null;
    try {
      return await SecureStore.getItemAsync(DRIVE_TOKEN_STORE_KEY);
    } catch {
      return null;
    }
  }

  async function signOut() {
    await AsyncStorage.removeItem(KEYS.AUTH_USER);
    if (Platform.OS !== 'web') {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_STORE_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(DRIVE_TOKEN_STORE_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(DRIVE_EXPIRY_STORE_KEY).catch(() => {}),
      ]);
    }
    setUser(null);
    setAccessToken(null);
    setDriveConnected(false);
    setDriveAccount(null);
    setDriveTokenExpiry(null);
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
    try { await deleteBackupFile(); } catch {}
    if (Platform.OS !== 'web') {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_STORE_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(DRIVE_TOKEN_STORE_KEY).catch(() => {}),
        SecureStore.deleteItemAsync(DRIVE_EXPIRY_STORE_KEY).catch(() => {}),
      ]);
    }
    setUser(null);
    setAccessToken(null);
    setHasOnboarded(false);
    setIsUnlocked(false);
    setBackupState(false);
    setDriveConnected(false);
    setDriveAccount(null);
    setDriveTokenExpiry(null);
  }

  return (
    <AppContext.Provider value={{
      isLoading, isAuthenticated: !!user, hasOnboarded,
      isUnlocked, user, accessToken, theme, biometricEnabled, backupEnabled,
      driveConnected, driveAccount,
      setDriveConnection, disconnectGoogleDrive, getDriveToken,
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
