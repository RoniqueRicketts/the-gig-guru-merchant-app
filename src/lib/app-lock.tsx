import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { useAuth } from '@/lib/auth';
import { readAppLockPreference, readSession, writeAppLockPreference } from '@/lib/session';

/** How long the app may sit in the background before it asks for Face ID / fingerprint again. */
const RELOCK_AFTER_MS = 60_000;

type AppLockValue = {
  supported: boolean;
  enabled: boolean;
  locked: boolean;
  /** True while the app is backgrounded/inactive — used to hide content from the app switcher. */
  obscured: boolean;
  unlock: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Drops the lock without biometrics — only used together with signing out. */
  reset: () => void;
};

const AppLockContext = createContext<AppLockValue | null>(null);

async function biometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [obscured, setObscured] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  // Any sign-out (manual or expired session) clears the lock so the next sign-in starts unlocked.
  const [seenSession, setSeenSession] = useState(session);
  if (session !== seenSession) {
    setSeenSession(session);
    if (!session) setLocked(false);
  }

  useEffect(() => {
    let active = true;
    Promise.all([biometricsAvailable(), readAppLockPreference(), readSession().catch(() => null)]).then(
      ([available, preference, existing]) => {
        if (!active) return;
        setSupported(available);
        setEnabledState(available && preference);
        // Cold start with a stored session: require unlock before showing business data.
        if (available && preference && existing) setLocked(true);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        setObscured(false);
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabled && session && since !== null && Date.now() - since > RELOCK_AFTER_MS) setLocked(true);
      } else {
        setObscured(true);
        if (state === 'background' && backgroundedAt.current === null && !prompting.current) {
          backgroundedAt.current = Date.now();
        }
      }
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [enabled, session]);

  const unlock = useCallback(async () => {
    if (prompting.current) return false;
    prompting.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock GigGuru Merchant',
        cancelLabel: 'Cancel',
      });
      if (result.success) setLocked(false);
      return result.success;
    } catch {
      return false;
    } finally {
      prompting.current = false;
    }
  }, []);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (next) {
        if (!(await biometricsAvailable())) {
          throw new Error('Set up Face ID, Touch ID or fingerprint unlock in your device settings first.');
        }
        // Confirm the person holding the phone can actually pass the check before turning it on.
        prompting.current = true;
        try {
          const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to turn on app lock' });
          if (!result.success) throw new Error('App lock was not turned on.');
        } finally {
          prompting.current = false;
        }
      }
      await writeAppLockPreference(next);
      setEnabledState(next);
      setSupported(await biometricsAvailable());
    },
    []
  );

  const reset = useCallback(() => setLocked(false), []);

  const value = useMemo(
    () => ({ supported, enabled, locked: locked && enabled && !!session, obscured, unlock, setEnabled, reset }),
    [supported, enabled, locked, session, obscured, unlock, setEnabled, reset]
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockValue {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used within an AppLockProvider.');
  return context;
}
