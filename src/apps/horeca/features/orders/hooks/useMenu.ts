import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { MenuTree } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';

export const HORECA_MENU_QUERY_KEY = ['horeca', 'menu'] as const;

/**
 * Loads the menu from GET /v1/menu and caches it locally. The store always
 * holds the latest known menu, so the UI keeps working offline.
 */
export function useMenu() {
  const categories = useHorecaStore(state => state.categories);
  const menuItems = useHorecaStore(state => state.menuItems);
  const setMenu = useHorecaStore(state => state.setMenu);
  const hydrateMenu = useHorecaStore(state => state.hydrateMenu);

  useEffect(() => {
    hydrateMenu();
  }, [hydrateMenu]);

  const { data, isLoading, isError, refetch: queryRefetch } = useQuery<MenuTree, Error>({
    queryKey: HORECA_MENU_QUERY_KEY,
    queryFn: () => horecaApi.getMenu(),
    staleTime: 60_000,
    networkMode: 'offlineFirst',
  });

  useEffect(() => {
    if (data && Array.isArray(data.categories)) {
      setMenu(data);
    }
  }, [data, setMenu]);

  const refetch = useCallback(async () => {
    try {
      await queryRefetch();
    } catch {
      // Keep showing the cached menu
    }
  }, [queryRefetch]);

  const hasMenu = menuItems.length > 0;

  return {
    categories,
    menuItems,
    isLoading: isLoading && !hasMenu,
    isError: isError && !hasMenu,
    refetch,
  };
}
