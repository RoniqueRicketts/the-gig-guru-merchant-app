import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type AuthSession = {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
};

const keys = {
  idToken: 'gigguru.id-token',
  accessToken: 'gigguru.access-token',
  refreshToken: 'gigguru.refresh-token',
  userId: 'gigguru.user-id',
  email: 'gigguru.email',
  expiresAt: 'gigguru.expires-at',
} as const;

let webSession: AuthSession | null = null;

export async function readSession(): Promise<AuthSession | null> {
  if (Platform.OS === 'web') return webSession;

  const values = await Promise.all(
    Object.values(keys).map((key) => SecureStore.getItemAsync(key))
  );
  if (values.some((value) => value === null)) return null;

  return {
    idToken: values[0]!,
    accessToken: values[1]!,
    refreshToken: values[2]!,
    userId: values[3]!,
    email: values[4]!,
    expiresAt: Number(values[5]),
  };
}

export async function writeSession(session: AuthSession): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = session;
    return;
  }

  await Promise.all([
    SecureStore.setItemAsync(keys.idToken, session.idToken),
    SecureStore.setItemAsync(keys.accessToken, session.accessToken),
    SecureStore.setItemAsync(keys.refreshToken, session.refreshToken),
    SecureStore.setItemAsync(keys.userId, session.userId),
    SecureStore.setItemAsync(keys.email, session.email),
    SecureStore.setItemAsync(keys.expiresAt, String(session.expiresAt)),
  ]);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    webSession = null;
    return;
  }

  await Promise.all(Object.values(keys).map((key) => SecureStore.deleteItemAsync(key)));
}

export function replaceWebSession(session: AuthSession): void {
  webSession = session;
}
