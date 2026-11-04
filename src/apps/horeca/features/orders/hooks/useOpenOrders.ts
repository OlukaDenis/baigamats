import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { Order } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';

export const HORECA_OPEN_ORDERS_QUERY_KEY = ['horeca', 'orders', 'active', 'mine'] as const;

/**
 * Fetches the current user's active orders (status: 'open' and 'billed') from GET /orders?mine=true.
 * Always refetches on mount so the Order screens have the latest server-assigned order IDs and statuses.
 */
export function useOpenOrders() {
  const orders = useHorecaStore(state => state.orders);
  const setOrders = useHorecaStore(state => state.setOrders);
  const upsertOrder = useHorecaStore(state => state.upsertOrder);

  const { data, isLoading, isFetching, isError, refetch: queryRefetch } = useQuery<Order[], Error>({
    queryKey: HORECA_OPEN_ORDERS_QUERY_KEY,
    queryFn: async () => {
      // Fetch open and billed orders in parallel to support both status tabs
      const [openRes, billedRes] = await Promise.all([
        horecaApi.getOrders({ mine: true, status: 'open' }).catch(() => []),
        horecaApi.getOrders({ mine: true, status: 'billed' }).catch(() => []),
      ]);

      const openList = Array.isArray(openRes) ? openRes : (openRes?.items ?? []);
      const billedList = Array.isArray(billedRes) ? billedRes : (billedRes?.items ?? []);

      const combinedMap = new Map<string, Order>();
      [...openList, ...billedList].forEach(ord => {
        if (ord?.id) {
          combinedMap.set(ord.id, ord);
        }
      });
      const list = Array.from(combinedMap.values());

      // Hydrate line items for orders if the list endpoint omitted `items`
      const hydrated = await Promise.all(
        list.map(async ord => {
          if (Array.isArray(ord.items) && ord.items.length > 0) return ord;
          try {
            return await horecaApi.getOrder(ord.id);
          } catch {
            return { ...ord, items: ord.items ?? [] };
          }
        }),
      );
      return hydrated;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    networkMode: 'offlineFirst',
  });

  useEffect(() => {
    if (Array.isArray(data)) {
      setOrders(data);
    }
  }, [data, setOrders]);

  const refetch = useCallback(async (): Promise<Order[]> => {
    try {
      const result = await queryRefetch();
      if (Array.isArray(result.data)) {
        setOrders(result.data);
        return result.data;
      }
    } catch {
      // Retain cached orders when offline
    }
    return Object.values(useHorecaStore.getState().orders);
  }, [queryRefetch, setOrders]);

  return {
    orders,
    isLoading,
    isFetching,
    isError,
    refetch,
    upsertOrder,
  };
}
