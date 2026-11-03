import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { Order } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';
import { useHorecaAuthStore } from '../../auth/store/horecaAuthStore';

export const HORECA_OPEN_ORDERS_QUERY_KEY = ['horeca', 'orders', 'open'] as const;

/**
 * Fetches open orders from GET /v1/orders with:
 * - status: 'open'
 * - limit: 50
 * - mine: true (when the signed-in user's role is not manager)
 */
export function useOpenOrders() {
  const me = useHorecaAuthStore(state => state.me);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const orders = useHorecaStore(state => state.orders);
  const setOrders = useHorecaStore(state => state.setOrders);
  const upsertOrder = useHorecaStore(state => state.upsertOrder);

  const role = (me?.role ?? activeStaff?.access ?? activeStaff?.role ?? '').toLowerCase();
  const isManager = role === 'manager';

  const { data, isLoading, isError, refetch: queryRefetch } = useQuery<Order[], Error>({
    queryKey: [...HORECA_OPEN_ORDERS_QUERY_KEY, isManager ? 'all' : 'mine'],
    queryFn: async () => {
      const res = await horecaApi.getOrders({
        status: 'open',
        limit: 50,
        ...(isManager ? {} : { mine: true }),
      });
      const list = Array.isArray(res) ? res : (res?.items ?? []);

      // Hydrate line items for open orders if the list endpoint omitted `items`
      const hydrated = await Promise.all(
        list.map(async ord => {
          if (Array.isArray(ord.items)) return ord;
          try {
            return await horecaApi.getOrder(ord.id);
          } catch {
            return { ...ord, items: [] };
          }
        }),
      );
      return hydrated;
    },
    staleTime: 15_000,
    networkMode: 'offlineFirst',
  });

  useEffect(() => {
    if (Array.isArray(data)) {
      setOrders(data);
    }
  }, [data, setOrders]);

  const refetch = useCallback(async () => {
    try {
      await queryRefetch();
    } catch {
      // Retain cached orders when offline
    }
  }, [queryRefetch]);

  return {
    orders,
    isLoading,
    isError,
    refetch,
    upsertOrder,
  };
}
