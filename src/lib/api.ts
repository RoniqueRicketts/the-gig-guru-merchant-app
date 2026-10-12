import { readSession, writeSession, type AuthSession } from '@/lib/session';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
let refreshInFlight: Promise<AuthSession | null> | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function apiUrl(path: string): string {
  if (!baseUrl) {
    throw new Error('Set EXPO_PUBLIC_API_BASE_URL to connect to the GigGuru API.');
  }
  return `${baseUrl}/api/v1${path.startsWith('/') ? path : `/${path}`}`;
}

async function refreshSession(): Promise<AuthSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const current = await readSession();
      if (!current) return null;
      const result = await request<{
        expires: number;
        idToken: string;
        access: string;
        refresh: string;
      }>('/auth/refresh', {
        method: 'POST',
        body: { userID: current.userId, refreshToken: current.refreshToken },
        authenticated: false,
        retryAuth: false,
      });
      const next = {
        ...current,
        idToken: result.idToken,
        accessToken: result.access,
        refreshToken: result.refresh,
        expiresAt: Date.now() + result.expires * 1000,
      };
      await writeSession(next);
      return next;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
  retryAuth?: boolean;
  bearerToken?: string;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    authenticated = true,
    retryAuth = true,
    bearerToken,
  } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const session = authenticated ? await readSession() : null;
  if (authenticated && !session) throw new Error('Your session has expired. Please sign in again.');
  if (session) headers.Authorization = `Bearer ${session.idToken}`;
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseText = await response.text();
  let payload: unknown = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (response.status === 401 && authenticated && retryAuth && session) {
    try {
      const refreshed = await refreshSession();
      if (refreshed) return request<T>(path, { ...options, retryAuth: false });
    } catch {
      throw new Error('Your session expired. Please sign in again.');
    }
  }

  if (!response.ok) {
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
    const message =
      (typeof record?.message === 'string' && record.message) ||
      (typeof record?.error === 'string' && record.error) ||
      (typeof payload === 'string' && payload) ||
      `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export function unwrapData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}
