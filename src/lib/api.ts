import { clearSession, readSession, writeSession, type AuthSession } from '@/lib/session';
import { safeMessage } from '@/lib/security';

const REQUEST_TIMEOUT_MS = 20_000;
/** Refresh the ID token this long before it expires so requests don't fail mid-flight. */
const REFRESH_SKEW_MS = 60_000;

/**
 * EXPO_PUBLIC_API_BASE_URL is the full API root, e.g. https://dashboard.thegigguru.biz/api/test,
 * so routes are appended directly: `${base}/meta`, `${base}/auth/sign-in`, …
 * EXPO_PUBLIC_API_PATH_PREFIX is only for deployments where the base is a bare host.
 */
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
const apiPathPrefix = (process.env.EXPO_PUBLIC_API_PATH_PREFIX ?? '').trim().replace(/^\/+|\/+$/g, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Session-expiry broadcast: lets the auth provider sign the user out the moment the
// API can no longer refresh their tokens, instead of leaving a broken session around.
type ExpiryListener = () => void;
const expiryListeners = new Set<ExpiryListener>();

export function onSessionExpired(listener: ExpiryListener): () => void {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

async function expireSession() {
  await clearSession();
  expiryListeners.forEach((listener) => listener());
}

// ---------------------------------------------------------------------------

function assertSafeBaseUrl(): string {
  if (!baseUrl) throw new Error('The app is not connected to a server yet. Set EXPO_PUBLIC_API_BASE_URL.');
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('The configured server address is invalid.');
  }
  // Tokens must never travel over plain HTTP outside local development.
  if (url.protocol !== 'https:' && !__DEV__) {
    throw new Error('Secure connection required. The server address must use HTTPS.');
  }
  return baseUrl;
}

function apiUrl(path: string): string {
  if (!path.startsWith('/') || path.includes('..') || /^\/\//.test(path) || path.includes('://')) {
    throw new Error('Invalid request path.');
  }
  return `${assertSafeBaseUrl()}${apiPathPrefix ? `/${apiPathPrefix}` : ''}${path}`;
}

/** Encodes a value for safe use as a single URL path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

let refreshInFlight: Promise<AuthSession | null> | null = null;

/** Single-flight refresh so concurrent 401s don't trigger a refresh storm. */
export function refreshSession(): Promise<AuthSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const current = await readSession();
      if (!current) return null;
      try {
        const result = await request<{ expires: number; idToken: string; access: string; refresh?: string }>(
          '/auth/refresh',
          {
            method: 'POST',
            body: { userID: current.userId, refreshToken: current.refreshToken },
            authenticated: false,
          }
        );
        if (!result?.idToken || !result.access) throw new Error('Incomplete refresh response.');
        const next: AuthSession = {
          ...current,
          idToken: result.idToken,
          accessToken: result.access,
          refreshToken: result.refresh || current.refreshToken,
          expiresAt: Date.now() + (Number(result.expires) || 3600) * 1000,
        };
        await writeSession(next);
        return next;
      } catch (cause) {
        // Only a definitive auth rejection ends the session; network blips should not log people out.
        if (cause instanceof ApiError && (cause.status === 400 || cause.status === 401 || cause.status === 403)) {
          await expireSession();
          return null;
        }
        throw cause;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function currentSession(): Promise<AuthSession | null> {
  const session = await readSession();
  if (session && session.expiresAt - Date.now() < REFRESH_SKEW_MS) {
    // If refresh fails for network reasons, try the current token; the server has the final word.
    return (await refreshSession().catch(() => session)) ?? null;
  }
  return session;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
  /** Overrides the bearer token (the access token for sign-out / change-password). */
  bearerToken?: string;
  signal?: AbortSignal;
};

function retryAfterText(header: string | null): string {
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0) return 'in a few minutes';
  if (seconds < 90) return `in ${Math.ceil(seconds)} seconds`;
  return `in ${Math.ceil(seconds / 60)} minutes`;
}

function errorFor(status: number, payload: unknown, retryAfter: string | null): ApiError {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const serverMessage =
    (typeof record?.message === 'string' && record.message) ||
    (typeof record?.error === 'string' && record.error) ||
    '';
  if (status === 429) return new ApiError(`Too many requests. Please try again ${retryAfterText(retryAfter)}.`, status);
  if (status === 401) return new ApiError(safeMessage(serverMessage, 'Your session has expired. Please sign in again.'), status);
  if (status === 403) return new ApiError(safeMessage(serverMessage, "You don't have permission to do that."), status);
  if (status === 404) return new ApiError(safeMessage(serverMessage, "We couldn't find that."), status);
  if (status >= 500) return new ApiError('The server ran into a problem. Please try again shortly.', status);
  return new ApiError(safeMessage(serverMessage, `Request failed (${status}).`), status);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, true);
}

async function send<T>(path: string, options: RequestOptions, allowAuthRetry: boolean): Promise<T> {
  const { method = 'GET', body, authenticated = true, bearerToken, signal } = options;
  const url = apiUrl(path);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const session = authenticated ? await currentSession() : null;
  if (authenticated && !session) throw new ApiError('Your session has expired. Please sign in again.', 401);
  if (session) headers.Authorization = `Bearer ${session.idToken}`;
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch {
    if (signal?.aborted) throw new ApiError('Request cancelled.', 0);
    throw new ApiError(
      controller.signal.aborted
        ? 'The server took too long to respond. Check your connection and try again.'
        : "You're offline or the server can't be reached. Check your connection and try again.",
      0
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardAbort);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null; // Never surface raw non-JSON bodies (HTML error pages etc.).
    }
  }

  if (response.status === 401 && authenticated && !bearerToken && allowAuthRetry) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) return send<T>(path, options, false);
    await expireSession();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) throw errorFor(response.status, payload, response.headers.get('Retry-After'));
  return payload as T;
}

export function unwrapData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export type Page<T> = { rows: T[]; hasMore: boolean };

export function unwrapPage<T = Record<string, unknown>>(response: unknown, pageSize: number): Page<T> {
  const data = unwrapData<unknown>(response);
  const rows = Array.isArray(data) ? (data.filter((row) => row && typeof row === 'object') as T[]) : [];
  const body = response && typeof response === 'object' ? (response as Record<string, unknown>) : {};
  const pagination = body.pagination && typeof body.pagination === 'object' ? (body.pagination as Record<string, unknown>) : null;
  const hasMore = typeof pagination?.hasMore === 'boolean' ? pagination.hasMore : rows.length >= pageSize;
  return { rows, hasMore };
}
