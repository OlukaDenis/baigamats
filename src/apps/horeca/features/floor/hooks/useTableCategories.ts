import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { TableCategory } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';

export const HORECA_TABLE_CATEGORIES_QUERY_KEY = ['horeca', 'tables', 'categories'] as const;

/**
 * Fetches table categories from GET /v1/tables/categories and caches them
 * locally so the category filter keeps working offline.
 */
export function useTableCategories() {
  const categories = useHorecaStore(state => state.tableCategories);
  const setTableCategories = useHorecaStore(state => state.setTableCategories);
  const hydrateTableCategories = useHorecaStore(state => state.hydrateTableCategories);

  useEffect(() => {
    hydrateTableCategories();
  }, [hydrateTableCategories]);

  const { data, refetch } = useQuery<TableCategory[], Error>({
    queryKey: HORECA_TABLE_CATEGORIES_QUERY_KEY,
    queryFn: () => horecaApi.getTableCategories(),
    staleTime: 5 * 60_000,
    networkMode: 'offlineFirst',
  });

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      setTableCategories(data);
    }
  }, [data, setTableCategories]);

  return { categories, refetch };
}
