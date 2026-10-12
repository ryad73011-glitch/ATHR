import { createContext, useContext } from 'react';

import { demoSource } from './demoSource';
import type { DataSource } from './repo';
import { createSupabaseSource } from './supabaseSource';

export type { DataSource, AuthSession } from './repo';
export * from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Mode resolution: live when both Supabase env vars exist, otherwise demo.
 * Demo is the honest default so the app is fully usable before credentials.
 */
export const isLiveConfigured = Boolean(url && anonKey);

let _source: DataSource | null = null;

export function getDataSource(): DataSource {
  if (_source) return _source;
  if (isLiveConfigured && url && anonKey) {
    _source = createSupabaseSource({ url, anonKey });
  } else {
    _source = demoSource;
  }
  return _source;
}

/** Test hook so unit tests can swap the source. */
export function overrideDataSource(source: DataSource | null): void {
  _source = source;
}

export const DataSourceContext = createContext<DataSource | null>(null);

export function useDataSource(): DataSource {
  const ctx = useContext(DataSourceContext);
  return ctx ?? getDataSource();
}

export function useIsLive(): boolean {
  return useDataSource().mode === 'live';
}
