import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AuthSession = {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
};

// Tokens are stored under separate keys because a combined Cognito payload can exceed
// SecureStore's recommended per-value size on iOS.
const keys = {
  idToken: 'gigguru.id-token',
  accessToken: 'gigguru.access-token',
  refreshToken: 'gigguru.refresh-token',
  userId: 'gigguru.user-id',
  email: 'gigguru.email',
  expiresAt: 'gigguru.expires-at',
} as const;

/**
 * Keychain items are only readable while the device is unlocked and never migrate to
 * backups or a new device, so a restored backup can't resurrect a session.
 */
const storeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Web has no secure storage; keep the session in memory only.
let webSession: AuthSession | null = null;

export async function readSession(): Promise<AuthSession | null> {
  if (Platform.OS === 'web') return webSession;

  const values = await Promise.all(
    Object.values(keys).map((key) => SecureStore.getItemAsync(key, storeOptions))
  );
  if (values.some((value) => !value)) return null;

  const expiresAt = Number(values[5]);
  if (!Number.isFinite(expiresAt)) return null;

  return {
    idToken: values[0]!,
    accessToken: values[1]!,
    refreshToken: values[2]!,
    userId: values[3]!,
    email: values[4]!,
    expiresAt,
  };
}

export async function writeSession(session: AuthSession): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = session;
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(keys.idToken, session.idToken, storeOptions),
    SecureStore.setItemAsync(keys.accessToken, session.accessToken, storeOptions),
    SecureStore.setItemAsync(keys.refreshToken, session.refreshToken, storeOptions),
    SecureStore.setItemAsync(keys.userId, session.userId, storeOptions),
    SecureStore.setItemAsync(keys.email, session.email, storeOptions),
    SecureStore.setItemAsync(keys.expiresAt, String(session.expiresAt), storeOptions),
  ]);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = null;
    return;
  }

  await Promise.all(Object.values(keys).map((key) => SecureStore.deleteItemAsync(key, storeOptions)));
}

const preferenceKeys = { appLock: 'gigguru.pref.app-lock' } as const;

export async function readAppLockPreference(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await SecureStore.getItemAsync(preferenceKeys.appLock, storeOptions)) === 'on';
}

export async function writeAppLockPreference(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  if (enabled) await SecureStore.setItemAsync(preferenceKeys.appLock, 'on', storeOptions);
  else await SecureStore.deleteItemAsync(preferenceKeys.appLock, storeOptions);
}
