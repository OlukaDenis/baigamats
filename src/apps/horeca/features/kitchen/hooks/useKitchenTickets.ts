import { useEffect, useMemo, useState } from 'react';
import type { KotStatus, PreparationStation } from '../../../api/schemas';
import {
  observeKitchenTickets,
  getKitchenTicketsSnapshot,
  type ReactiveKitchenTicket,
} from '../../../db/queries/kitchenTickets';
import { orderRepository } from '../../../db/repositories/orderRepository';
import { useHorecaStore } from '../../../db/offlineStore';

export function useKitchenTickets(station: 'all' | 'kitchen' | 'bar' = 'all') {
  const [tickets, setTickets] = useState<ReactiveKitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync with zustand offline store if needed for any legacy screens
  const zustandUpdateKotStatus = useHorecaStore(state => state.updateKotStatusOptimistic);

  useEffect(() => {
    setIsLoading(true);

    // Initial snapshot for instant first paint
    getKitchenTicketsSnapshot(station)
      .then(snap => {
        setTickets(snap);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    // Reactive subscription via RxJS observable
    const subscription = observeKitchenTickets(station).subscribe({
      next: updatedTickets => {
        setTickets(updatedTickets);
        setIsLoading(false);
      },
      error: err => {
        console.error('[useKitchenTickets] Observable error:', err);
        setIsLoading(false);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [station]);

  const updateStatus = async (orderId: string, itemId: string, nextStatus: KotStatus) => {
    // 1. Update SQLite via WatermelonDB and enqueue to outbox
    await orderRepository.updateKotStatusOptimistic(orderId, itemId, nextStatus);

    // 2. Also keep zustand in sync for any components still listening to zustand
    zustandUpdateKotStatus(orderId, itemId, nextStatus);
  };

  const stats = useMemo(() => {
    let newCount = 0;
    let preparingCount = 0;
    let readyCount = 0;

    for (const t of tickets) {
      if (t.kot_status === 'new') newCount++;
      else if (t.kot_status === 'preparing') preparingCount++;
      else if (t.kot_status === 'ready') readyCount++;
    }

    return {
      total: tickets.length,
      newCount,
      preparingCount,
      readyCount,
    };
  }, [tickets]);

  return {
    tickets,
    isLoading,
    updateStatus,
    stats,
  };
}
