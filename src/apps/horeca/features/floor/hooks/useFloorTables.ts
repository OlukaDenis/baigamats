import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { Table } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';

export const HORECA_TABLES_QUERY_KEY = ['horeca', 'tables'] as const;

export interface UseFloorTablesResult {
  tables: Table[];
  isLoading: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isOnline: boolean;
}

/**
 * Hook to fetch floor tables from the /tables endpoint with offline caching.
 *
 * - When online: fetches latest tables from /tables and caches them in the offline store.
 * - When offline: serves cached tables from offline storage so the floor plan remains fully interactive.
 */
export function useFloorTables(): UseFloorTablesResult {
  const isOnline = useHorecaStore(state => state.isOnline);
  const tables = useHorecaStore(state => state.tables);
  const setTables = useHorecaStore(state => state.setTables);
  const hydrateTables = useHorecaStore(state => state.hydrateTables);

  // 1. Hydrate tables from local offline storage on initial mount
  useEffect(() => {
    hydrateTables();
  }, [hydrateTables]);

  // 2. Fetch fresh tables from the API
  const {
    data,
    isLoading,
    isFetching,
    isRefetching,
    isError,
    error,
    refetch: queryRefetch,
  } = useQuery<Table[], Error>({
    // Always download the full table list; section filtering happens offline on the client.
    queryKey: [...HORECA_TABLES_QUERY_KEY, 'all'],
    queryFn: async () => {
      const fetched = await horecaApi.getTables();
      return fetched;
    },
    staleTime: 30_000,
    networkMode: 'offlineFirst',
  });

  // 3. Update store and offline cache whenever fresh data arrives
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      setTables(data);
    }
  }, [data, setTables]);

  // 4. Safe pull-to-refresh
  const refetch = useCallback(async () => {
    try {
      await queryRefetch();
    } catch {
      // Swallowed safely so pull-to-refresh spinner dismisses gracefully
    }
  }, [queryRefetch]);

  return {
    tables,
    // Only block with loading UI if we have no offline cached tables
    isLoading: isLoading && tables.length === 0,
    isFetching,
    isRefetching,
    isError: isError && tables.length === 0,
    error: (error as Error) ?? null,
    refetch,
    isOnline,
  };
}

