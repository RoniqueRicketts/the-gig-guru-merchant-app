import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { request, unwrapData, unwrapPage } from '@/lib/api';
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
  refresh: () => Promise<void>;
};

/** Loads a single resource and quietly refreshes stale data when the screen regains focus. */
export function useQuery<T>(path: string | null): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedAt = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!path) return;
      if (mode === 'refresh') setRefreshing(true);
      try {
        const response = await request<unknown>(path);
        setData(unwrapData<T>(response));
        setError(null);
        loadedAt.current = Date.now();
      } catch (cause) {
        setError(safeMessage(cause));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [path]
  );

  useFocusEffect(
    useCallback(() => {
      if (!loadedAt.current) void load('initial');
      else if (Date.now() - loadedAt.current > STALE_AFTER_MS) void load('silent');
    }, [load])
  );

  return { data, loading, refreshing, error, refresh: () => load('refresh') };
}

type PagedState<T> = {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
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
        loadedAt.current = Date.now();
      } catch (cause) {
        if (current === generation.current) setError(safeMessage(cause));
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

  return { items, loading, refreshing, loadingMore, hasMore, error, refresh: () => loadFirst('refresh'), loadMore };
}
