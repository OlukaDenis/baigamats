import { useCallback } from 'react';
import { type QueryClient, useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { Order } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';

export const HORECA_OPEN_ORDERS_QUERY_KEY = ['horeca', 'orders', 'active', 'mine'] as const;

/**
 * Fetches open and billed orders for the current staff member from GET /orders?mine=true
 * and synchronizes the offline store without eagerly querying per-order details.
 */
export async function fetchOpenAndBilledOrders(): Promise<Order[]> {
  let openFailed = false;
  let billedFailed = false;

  const [openRes, billedRes] = await Promise.all([
    horecaApi.getOrders({ mine: true, status: 'open' }).catch(() => {
      openFailed = true;
      return [];
    }),
    horecaApi.getOrders({ mine: true, status: 'billed' }).catch(() => {
      billedFailed = true;
      return [];
    }),
  ]);

  if (openFailed && billedFailed) {
    throw new Error('Failed to fetch orders');
  }

  const openList = Array.isArray(openRes) ? openRes : (openRes?.items ?? []);
  const billedList = Array.isArray(billedRes) ? billedRes : (billedRes?.items ?? []);

  const combinedMap = new Map<string, Order>();
  [...openList, ...billedList].forEach(ord => {
    if (ord?.id) {
      combinedMap.set(ord.id, ord);
    }
  });
  const list = Array.from(combinedMap.values());

  // Preserve any already-cached line items without issuing N+1 getOrder calls
  const existingOrders = useHorecaStore.getState().orders;
  const normalized = list.map(ord => {
    if (Array.isArray(ord.items) && ord.items.length > 0) return ord;
    const cachedItems = existingOrders[ord.id]?.items;
    return { ...ord, items: cachedItems ?? ord.items ?? [] };
  });

  useHorecaStore.getState().setOrders(normalized);
  return normalized;
}

/**
 * Refreshes open/billed orders in the background and updates both the QueryClient cache
 * and the Zustand store even when no screen mounting `useOpenOrders` is active.
 */
export async function refreshOpenOrdersInBackground(queryClient?: QueryClient): Promise<Order[]> {
  try {
    if (queryClient) {
      return await queryClient.fetchQuery({
        queryKey: HORECA_OPEN_ORDERS_QUERY_KEY,
        queryFn: fetchOpenAndBilledOrders,
        staleTime: 0,
      });
    }
    return await fetchOpenAndBilledOrders();
  } catch {
    return Object.values(useHorecaStore.getState().orders);
  }
}

/**
 * Fetches the current user's active orders (status: 'open' and 'billed') from GET /orders?mine=true.
 * Always refetches on mount so the Order screens have the latest server-assigned order IDs and statuses.
 */
export function useOpenOrders() {
  const orders = useHorecaStore(state => state.orders);
  const setOrders = useHorecaStore(state => state.setOrders);
  const upsertOrder = useHorecaStore(state => state.upsertOrder);

  const { isLoading, isFetching, isError, refetch: queryRefetch } = useQuery<Order[], Error>({
    queryKey: HORECA_OPEN_ORDERS_QUERY_KEY,
    queryFn: fetchOpenAndBilledOrders,
    staleTime: 0,
    refetchOnMount: 'always',
    networkMode: 'offlineFirst',
  });

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
