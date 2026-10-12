import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { request } from '@/lib/api';
import { clearSession, readSession, writeSession, type AuthSession } from '@/lib/session';

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  challenge: { email: string; session: string } | null;
  signIn: (email: string, password: string) => Promise<void>;
  completeChallenge: (password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

type AuthResult = {
  success?: boolean;
  message?: string;
  data?: {
    id?: string;
    access?: string;
    refresh?: string;
    expires?: number;
    user?: { sub?: string; username?: string; email?: string };
    email?: string;
    session?: string;
  };
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromResult(result: AuthResult, email: string): AuthSession {
  const data = result.data;
  if (!data?.id || !data.access || !data.refresh) {
    throw new Error(result.message || 'The API did not return a complete sign-in session.');
  }
  const userId = data.user?.sub || data.user?.username || email;
  return {
    idToken: data.id,
    accessToken: data.access,
    refreshToken: data.refresh,
    userId,
    email: data.user?.email || email,
    expiresAt: Date.now() + (data.expires ?? 3600) * 1000,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<AuthContextValue['challenge']>(null);

  useEffect(() => {
    readSession()
      .then(setSession)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Unable to restore your secure session.');
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const result = await request<AuthResult>('/auth/sign-in', {
      method: 'POST',
      body: { email: email.trim(), password },
      authenticated: false,
    });
    if (result.message === 'NEW_PASSWORD_REQUIRED') {
      if (!result.data?.session) throw new Error('The password challenge response was incomplete.');
      setChallenge({ email: result.data.email || email.trim(), session: result.data.session });
      return;
    }
    if (result.success === false) throw new Error(result.message || 'Unable to sign in.');
    const next = sessionFromResult(result, email.trim());
    await writeSession(next);
    setSession(next);
  };

  const completeChallenge = async (password: string) => {
    if (!challenge) throw new Error('There is no active password challenge.');
    setError(null);
    const result = await request<AuthResult>('/auth/complete-new-password-challenge', {
      method: 'POST',
      body: { email: challenge.email, session: challenge.session, password },
      authenticated: false,
    });
    const next = sessionFromResult(result, challenge.email);
    await writeSession(next);
    setSession(next);
    setChallenge(null);
  };

  const signOut = async () => {
    const current = session;
    setError(null);
    try {
      if (current) {
        await request('/auth/sign-out', {
          method: 'POST',
          authenticated: false,
          bearerToken: current.accessToken,
        });
      }
    } finally {
      await clearSession();
      setSession(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!session) throw new Error('Please sign in again before changing your password.');
    await request('/auth/change-password', {
      method: 'POST',
      authenticated: false,
      bearerToken: session.accessToken,
      body: { current_password: currentPassword, new_password: newPassword },
    });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      error,
      challenge,
      signIn: async (email, password) => {
        try {
          await signIn(email, password);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : 'Unable to sign in.';
          setError(message);
          throw cause;
        }
      },
      completeChallenge: async (password) => {
        try {
          await completeChallenge(password);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : 'Unable to update the password.';
          setError(message);
          throw cause;
        }
      },
      changePassword,
      signOut,
      clearError: () => setError(null),
    }),
    [session, loading, error, challenge]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider.');
  return context;
}
