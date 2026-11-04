import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { MenuAvailabilityMap, MenuCategory, MenuItem } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';

export const HORECA_MENU_V2_QUERY_KEY = ['horeca', 'menu', 'v2'] as const;
export const HORECA_MENU_AVAILABILITY_QUERY_KEY = ['horeca', 'menu', 'availability'] as const;

const AVAILABILITY_POLL_MS = 20_000;

export interface UseMenuOptions {
  station?: 'kitchen' | 'bar';
  pollAvailability?: boolean;
}

/**
 * Menu API v2 hook:
 * 1. Hydrates cached catalogue on mount.
 * 2. Checks `GET /v1/menu/version` and only downloads `/v1/menu/categories` +
 *    paged `/v1/menu/items` when the catalogue `hash` has changed or cache is empty.
 * 3. Polls `GET /v1/menu/items/availability` every 20s to update `is_active`
 *    in-place without forcing a catalogue re-download.
 */
export function useMenu(options?: UseMenuOptions) {
  const station = options?.station;
  const pollAvailability = options?.pollAvailability ?? true;

  const categories = useHorecaStore(state => state.categories);
  const menuItems = useHorecaStore(state => state.menuItems);
  const hydrateMenu = useHorecaStore(state => state.hydrateMenu);
  const setMenuCatalogue = useHorecaStore(state => state.setMenuCatalogue);
  const applyMenuAvailability = useHorecaStore(state => state.applyMenuAvailability);

  useEffect(() => {
    hydrateMenu();
  }, [hydrateMenu]);

  // 1 & 2. Version check + conditional catalogue download
  const {
    isLoading,
    isError,
    refetch: refetchCatalogue,
  } = useQuery<{ hash: string; categories: MenuCategory[]; items: MenuItem[]; categoriesEtag?: string }, Error>({
    queryKey: [...HORECA_MENU_V2_QUERY_KEY, station ?? 'all'],
    queryFn: async () => {
      const store = useHorecaStore.getState();
      const version = await horecaApi.getMenuVersion();

      if (
        version?.hash &&
        store.menuHash === version.hash &&
        store.categories.length > 0 &&
        store.menuItems.length > 0
      ) {
        return {
          hash: version.hash,
          categories: store.categories,
          items: store.menuItems,
          categoriesEtag: store.categoriesEtag,
        };
      }

      const [catRes, items] = await Promise.all([
        horecaApi.getMenuCategories(store.categoriesEtag),
        horecaApi.getAllMenuItems(station ? { station } : undefined),
      ]);

      const resolvedCategories =
        catRes.notModified || !catRes.data ? store.categories : catRes.data;

      setMenuCatalogue({
        hash: version.hash,
        categories: resolvedCategories,
        items,
        categoriesEtag: catRes.etag,
      });

      return {
        hash: version.hash,
        categories: resolvedCategories,
        items,
        categoriesEtag: catRes.etag,
      };
    },
    staleTime: 60_000,
    networkMode: 'offlineFirst',
  });

  // 3. Lightweight availability polling (every 20s)
  const { data: availabilityData, refetch: refetchAvailability } = useQuery<
    MenuAvailabilityMap,
    Error
  >({
    queryKey: HORECA_MENU_AVAILABILITY_QUERY_KEY,
    queryFn: () => horecaApi.getMenuAvailability(),
    enabled: pollAvailability,
    refetchInterval: pollAvailability ? AVAILABILITY_POLL_MS : false,
    staleTime: 10_000,
    networkMode: 'offlineFirst',
  });

  useEffect(() => {
    if (availabilityData && typeof availabilityData === 'object') {
      applyMenuAvailability(availabilityData);
    }
  }, [availabilityData, applyMenuAvailability]);

  const refetch = useCallback(async () => {
    try {
      await Promise.all([refetchCatalogue(), refetchAvailability()]);
    } catch {
      // Keep showing cached menu when offline
    }
  }, [refetchCatalogue, refetchAvailability]);

  const hasMenu = menuItems.length > 0;

  return {
    categories,
    menuItems,
    isLoading: isLoading && !hasMenu,
    isError: isError && !hasMenu,
    refetch,
  };
}
