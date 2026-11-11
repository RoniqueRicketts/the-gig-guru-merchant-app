import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { request, unwrapData } from '@/lib/api';
import { safeMessage } from '@/lib/security';

/**
 * Option lists served by the API at GET /meta (categories, countries, colors, statuses…).
 * The app ships with none of these values: every picker and status rule reads them from here,
 * so the API stays the single source of truth.
 */
export type Catalog = {
  serviceCategories: string[];
  serviceColors: string[];
  productCategories: string[];
  countries: string[];
  addressLocations: string[];
  businessTypes: string[];
  orderStatuses: string[];
  settableOrderStatuses: string[];
  deliverableOrderStatuses: string[];
  appointmentStatuses: string[];
  appointmentNextStatuses: string[];
  invoiceStatuses: string[];
  itemCategories: string[];
  sendVia: string[];
};

const KEYS: (keyof Catalog)[] = [
  'serviceCategories',
  'serviceColors',
  'productCategories',
  'countries',
  'addressLocations',
  'businessTypes',
  'orderStatuses',
  'settableOrderStatuses',
  'deliverableOrderStatuses',
  'appointmentStatuses',
  'appointmentNextStatuses',
  'invoiceStatuses',
  'itemCategories',
  'sendVia',
];

/** Enum-style tokens only: these values are displayed and sent back to the API verbatim. */
const TOKEN = /^[A-Za-z0-9_]{1,64}$/;

function parseCatalog(payload: unknown): Catalog {
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const catalog = {} as Catalog;
  for (const key of KEYS) {
    const value = source[key];
    const list = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && TOKEN.test(item)) : [];
    if (!list.length) throw new Error('The server sent incomplete app settings. Please try again shortly.');
    catalog[key] = [...new Set(list)].slice(0, 200);
  }
  return catalog;
}

// Snapshot for non-React helpers (e.g. status rules). Set once the provider has loaded.
let snapshot: Catalog | null = null;

/** The loaded catalog outside React. Only null before the app's launch gate has passed. */
export function currentCatalog(): Catalog | null {
  return snapshot;
}

/** True when the API lists `value` in catalog list `key` (false until the catalog is loaded). */
export function allows(key: keyof Catalog, value: string): boolean {
  return !!snapshot?.[key].includes(value);
}

type LoadResult = { catalog: Catalog; error?: undefined } | { catalog?: undefined; error: string };

async function loadCatalog(): Promise<LoadResult> {
  try {
    return { catalog: parseCatalog(unwrapData(await request<unknown>('/meta', { authenticated: false }))) };
  } catch (cause) {
    return { error: safeMessage(cause, "We couldn't reach GigGuru. Check your connection and try again.") };
  }
}

type CatalogState = { catalog: Catalog | null; loading: boolean; error: string | null; retry: () => void };

const CatalogContext = createContext<CatalogState | null>(null);

/** Loads GET /meta once per launch (in memory only; nothing is persisted on the device). */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: LoadResult) => {
    if (result.catalog) {
      snapshot = result.catalog;
      setCatalog(result.catalog);
      setError(null);
    } else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void loadCatalog().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void loadCatalog().then(apply);
  }, [apply]);

  const value = useMemo<CatalogState>(() => ({ catalog, loading, error, retry }), [catalog, loading, error, retry]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalogState(): CatalogState {
  const state = useContext(CatalogContext);
  if (!state) throw new Error('useCatalogState must be used inside CatalogProvider');
  return state;
}

/** The API's option lists. Safe in any screen: the root layout only renders screens once loaded. */
export function useCatalog(): Catalog {
  const { catalog } = useCatalogState();
  if (!catalog) throw new Error('Catalog not loaded; screens render only after the launch gate.');
  return catalog;
}
