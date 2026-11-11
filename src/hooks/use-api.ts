import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError, request, unwrapData, unwrapPage } from '@/lib/api';
import { safeMessage } from '@/lib/security';

/**
 * The API allows ~100 requests per 15 minutes per IP, so screens only re-fetch on focus
 * when their data is older than this. Pull-to-refresh and mutations always fetch.
 */
const STALE_AFTER_MS = 30_000;

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** HTTP status of the last failure (402 = needs Premium, 403 = no permission), if any. */
  errorStatus: number | null;
  /** Pull-to-refresh style reload (shows the refresh spinner). */
  refresh: () => Promise<void>;
  /** Background reload with no spinner: polling and post-action refreshes. */
  reload: () => Promise<void>;
};

const statusOf = (cause: unknown) => (cause instanceof ApiError ? cause.status : null);

/** Loads a single resource and quietly refreshes stale data when the screen regains focus. */
export function useQuery<T>(path: string | null): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  /** When the last request (successful or not) finished; throttles automatic re-fetches. */
  const attemptedAt = useRef(0);
  const loadedFor = useRef<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!path) return;
      // Responses from an older path (e.g. a day the user already paged past) are dropped.
      const current = ++generation.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const response = await request<unknown>(path);
        if (current !== generation.current) return;
        setData(unwrapData<T>(response));
        setError(null);
        setErrorStatus(null);
      } catch (cause) {
        if (current !== generation.current) return;
        setError(safeMessage(cause));
        setErrorStatus(statusOf(cause));
      } finally {
        if (current === generation.current) {
          attemptedAt.current = Date.now();
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path]
  );

  useFocusEffect(
    useCallback(() => {
      if (loadedFor.current !== path) {
        // New path (or first focus): show a fresh load rather than the previous resource.
        loadedFor.current = path;
        attemptedAt.current = 0;
        if (path) {
          setData(null);
          void load('initial');
        }
      } else if (path && attemptedAt.current && Date.now() - attemptedAt.current > STALE_AFTER_MS) {
        // Stale data, or a failure worth retrying — but never more than once per window,
        // so a plan-gated endpoint (402) doesn't spend the rate limit on every focus.
        void load('silent');
      }
    }, [load, path])
  );

  return { data, loading, refreshing, error, errorStatus, refresh: () => load('refresh'), reload: () => load('silent') };
}

type PagedState<T> = {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  errorStatus: number | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

/**
 * Offset-paginated list. `buildPath(offset)` returns the request path for a page.
 * Re-fetches the first page whenever `buildPath` changes (search/filter) and on focus when stale.
 */
export function usePagedList<T = Record<string, unknown>>(
  buildPath: ((offset: number) => string) | null,
  pageSize: number
): PagedState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!buildPath);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const generation = useRef(0);
  const loadedAt = useRef(0);
  const loadedFor = useRef<unknown>(null);

  const loadFirst = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!buildPath) return;
      const current = ++generation.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const page = unwrapPage<T>(await request<unknown>(buildPath(0)), pageSize);
        if (current !== generation.current) return;
        setItems(page.rows);
        setHasMore(page.hasMore);
        setError(null);
        setErrorStatus(null);
        loadedAt.current = Date.now();
      } catch (cause) {
        if (current === generation.current) {
          setError(safeMessage(cause));
          setErrorStatus(statusOf(cause));
        }
      } finally {
        if (current === generation.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [buildPath, pageSize]
  );

  // Runs on focus and again whenever the query changes while focused.
  useFocusEffect(
    useCallback(() => {
      if (loadedFor.current !== loadFirst) {
        loadedFor.current = loadFirst;
        loadedAt.current = 0;
        void loadFirst('initial');
      } else if (loadedAt.current && Date.now() - loadedAt.current > STALE_AFTER_MS) {
        void loadFirst('silent');
      }
    }, [loadFirst])
  );

  const loadMore = useCallback(async () => {
    if (!buildPath || loadingMore || !hasMore) return;
    const current = generation.current;
    setLoadingMore(true);
    try {
      const page = unwrapPage<T>(await request<unknown>(buildPath(items.length)), pageSize);
      if (current !== generation.current) return;
      setItems((existing) => [...existing, ...page.rows]);
      setHasMore(page.hasMore);
    } catch (cause) {
      if (current === generation.current) {
        setError(safeMessage(cause));
        setHasMore(false); // Stop automatic paging loops after a failure.
      }
    } finally {
      setLoadingMore(false);
    }
  }, [buildPath, hasMore, items.length, loadingMore, pageSize]);

  return { items, loading, refreshing, loadingMore, hasMore, error, errorStatus, refresh: () => loadFirst('refresh'), loadMore };
}

/**
 * Calls `tick` every `intervalMs` while the screen is focused and the app is in the foreground.
 * Keep intervals generous: every tick spends part of the API's 100-requests-per-15-minutes budget.
 */
export function usePolling(tick: () => void, intervalMs: number, enabled = true) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let timer: ReturnType<typeof setInterval> | null = null;
      const start = () => {
        if (!timer) timer = setInterval(() => latest.current(), intervalMs);
      };
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };
      if (AppState.currentState === 'active') start();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          latest.current();
          start();
        } else stop();
      });
      return () => {
        stop();
        subscription.remove();
      };
    }, [enabled, intervalMs])
  );
}

/** Returns `value` once it has stopped changing for `delayMs` (search boxes → fewer API calls). */
export function useDebounced<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
