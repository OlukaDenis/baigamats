import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { Table } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';
import { tableRepository } from '../../../db/repositories/tableRepository';
import type TableModel from '../../../db/models/TableModel';

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

function tableModelToTable(m: TableModel): Table {
  return {
    id: m.serverId || m.id,
    table_number: m.tableNumber,
    capacity: m.capacity,
    status: m.status,
    section: m.section ?? null,
  };
}

/**
 * Hook to fetch floor tables from the /tables endpoint with offline caching and reactive SQLite updates.
 *
 * - When online: fetches latest tables from /tables and syncs to SQLite.
 * - Reactive: subscribes directly to WatermelonDB tables table so table updates reflect immediately.
 * - When offline: serves cached tables from SQLite so the floor plan remains fully interactive.
 */
export function useFloorTables(): UseFloorTablesResult {
  const isOnline = useHorecaStore(state => state.isOnline);
  const storeTables = useHorecaStore(state => state.tables);
  const setTables = useHorecaStore(state => state.setTables);
  const hydrateTables = useHorecaStore(state => state.hydrateTables);

  const [dbTables, setDbTables] = useState<Table[]>([]);

  // 1. Hydrate tables from local offline storage on initial mount
  useEffect(() => {
    hydrateTables();
  }, [hydrateTables]);

  // 2. Subscribe reactively to WatermelonDB tables
  useEffect(() => {
    const subscription = tableRepository.observeTables().subscribe({
      next: models => {
        if (models && models.length > 0) {
          setDbTables(models.map(tableModelToTable));
        }
      },
      error: err => {
        console.warn('[useFloorTables] Error observing SQLite tables:', err);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Fetch fresh tables from the API
  const {
    data,
    isLoading,
    isFetching,
    isRefetching,
    isError,
    error,
    refetch: queryRefetch,
  } = useQuery<Table[], Error>({
    queryKey: [...HORECA_TABLES_QUERY_KEY, 'all'],
    queryFn: async () => {
      const fetched = await horecaApi.getTables();
      return fetched;
    },
    staleTime: 30_000,
    networkMode: 'offlineFirst',
  });

  // 4. Update store and offline cache whenever fresh data arrives
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      setTables(data);
    }
  }, [data, setTables]);

  // 5. Safe pull-to-refresh
  const refetch = useCallback(async () => {
    try {
      await queryRefetch();
    } catch {
      // Swallowed safely so pull-to-refresh spinner dismisses gracefully
    }
  }, [queryRefetch]);

  const activeTables = dbTables.length > 0 ? dbTables : storeTables;

  return {
    tables: activeTables,
    isLoading: isLoading && activeTables.length === 0,
    isFetching,
    isRefetching,
    isError: isError && activeTables.length === 0,
    error: (error as Error) ?? null,
    refetch,
    isOnline,
  };
}
