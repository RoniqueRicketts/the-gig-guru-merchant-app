import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ApiError, onSessionExpired, request } from '@/lib/api';
import { createAttemptLimiter, isEmail } from '@/lib/security';
import { clearSession, readSession, writeSession, type AuthSession } from '@/lib/session';

type Challenge = { email: string; session: string };

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  challenge: Challenge | null;
  signIn: (email: string, password: string) => Promise<void>;
  completeChallenge: (password: string) => Promise<void>;
  cancelChallenge: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
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
    throw new Error('Sign-in could not be completed. Please try again.');
  }
  return {
    idToken: data.id,
    accessToken: data.access,
    refreshToken: data.refresh,
    userId: data.user?.sub || data.user?.username || email,
    email: data.user?.email || email,
    expiresAt: Date.now() + (Number(data.expires) || 3600) * 1000,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const limiter = useRef(createAttemptLimiter()).current;

  useEffect(() => {
    readSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    return onSessionExpired(() => setSession(null));
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const assertNotLocked = () => {
      const wait = limiter.remainingLockMs();
      if (wait > 0) {
        throw new Error(`Too many attempts. Try again in ${Math.ceil(wait / 1000)} seconds.`);
      }
    };

    return {
      session,
      loading,
      challenge,

      async signIn(email, password) {
        assertNotLocked();
        const cleanEmail = email.trim().toLowerCase();
        if (!isEmail(cleanEmail)) throw new Error('Enter a valid email address.');
        let result: AuthResult;
        try {
          result = await request<AuthResult>('/auth/sign-in', {
            method: 'POST',
            body: { email: cleanEmail, password },
            authenticated: false,
          });
        } catch (cause) {
          limiter.recordFailure();
          // The API answers bad credentials with a bare 401 "Unauthorized".
          if (cause instanceof ApiError && cause.status === 401) throw new Error('Incorrect email or password.');
          throw cause;
        }
        if (result?.message === 'NEW_PASSWORD_REQUIRED') {
          if (!result.data?.session) throw new Error('Sign-in could not be completed. Please try again.');
          setChallenge({ email: result.data.email || cleanEmail, session: result.data.session });
          return;
        }
        if (result?.success === false) {
          limiter.recordFailure();
          throw new Error('Incorrect email or password.');
        }
        const next = sessionFromResult(result, cleanEmail);
        await writeSession(next);
        limiter.reset();
        setSession(next);
      },

      async completeChallenge(password) {
        if (!challenge) throw new Error('Your sign-in step expired. Please sign in again.');
        const result = await request<AuthResult>('/auth/complete-new-password-challenge', {
          method: 'POST',
          body: { email: challenge.email, session: challenge.session, password },
          authenticated: false,
        });
        const next = sessionFromResult(result, challenge.email);
        await writeSession(next);
        setChallenge(null);
        setSession(next);
      },

      cancelChallenge: () => setChallenge(null),

      async changePassword(currentPassword, newPassword) {
        if (!session) throw new Error('Please sign in again before changing your password.');
        await request('/auth/change-password', {
          method: 'POST',
          authenticated: false,
          bearerToken: session.accessToken,
          body: { current_password: currentPassword, new_password: newPassword },
        });
      },

      async signOut() {
        const current = session;
        try {
          // Revoke the refresh token server-side so a stolen copy stops working.
          if (current) {
            await request('/auth/sign-out', { method: 'POST', authenticated: false, bearerToken: current.accessToken });
          }
        } catch {
          // Local sign-out still proceeds; the token expires on its own.
        } finally {
          await clearSession();
          setSession(null);
        }
      },
    };
  }, [session, loading, challenge, limiter]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider.');
  return context;
}
