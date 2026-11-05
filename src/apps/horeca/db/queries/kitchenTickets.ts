import { Q } from '@nozbe/watermelondb';
import { database } from '../index';
import type OrderItemModel from '../models/OrderItemModel';
import type OrderModel from '../models/OrderModel';
import type { KitchenTicket, KotStatus, PreparationStation } from '../../api/schemas';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export type ReactiveKitchenTicket = KitchenTicket;

/**
 * Creates an RxJS Observable query that observes active kitchen order tickets (KOT)
 * joined from `order_items` and `orders`.
 *
 * Rules:
 * - Reactive: re-emits immediately whenever any item's status, qty, notes, or order details update.
 * - Filters out served and cancelled tickets.
 * - Joined with open orders only.
 * - Station filtering: 'all' | 'kitchen' | 'bar'.
 * - Sorted FIFO by creation time.
 */
export function observeKitchenTickets(
  station: 'all' | 'kitchen' | 'bar' = 'all'
): Observable<ReactiveKitchenTicket[]> {
  const clauses: any[] = [
    Q.where('kot_status', Q.notIn(['served', 'cancelled'])),
    Q.on('orders', 'status', 'open'),
    Q.sortBy('created_at', Q.asc),
  ];

  if (station !== 'all') {
    clauses.push(Q.where('station', station));
  }

  const itemsQuery = database.get<OrderItemModel>('order_items').query(...clauses);

  return itemsQuery.observe().pipe(
    switchMap(items => {
      if (!items || items.length === 0) {
        return of([]);
      }

      const orderIds = Array.from(new Set(items.map(it => it.orderId)));
      return from(
        database
          .get<OrderModel>('orders')
          .query(Q.where('id', Q.oneOf(orderIds)))
          .fetch()
      ).pipe(
        map(orders => {
          const orderMap = new Map<string, OrderModel>(orders.map(o => [o.id, o]));
          const tickets: ReactiveKitchenTicket[] = [];

          for (const it of items) {
            const ord = orderMap.get(it.orderId);
            tickets.push({
              id: it.id,
              item_name: it.itemName,
              qty: it.qty,
              station: it.station,
              kot_status: it.kotStatus,
              modifiers: it.modifiers,
              notes: it.notes,
              created_at: it.createdAt ? it.createdAt.toISOString() : new Date().toISOString(),
              order: {
                id: ord?.id || it.orderId,
                order_number: ord?.orderNumber || 'ORD-?',
                table_id: ord?.tableId,
                order_type: ord?.orderType || 'dine_in',
                tab_name: ord?.tabName,
                status: ord?.status || 'open',
              },
            });
          }

          return tickets;
        })
      );
    })
  );
}

/**
 * Fetch a one-shot snapshot of kitchen tickets.
 */
export async function getKitchenTicketsSnapshot(
  station: 'all' | 'kitchen' | 'bar' = 'all'
): Promise<ReactiveKitchenTicket[]> {
  const clauses: any[] = [
    Q.where('kot_status', Q.notIn(['served', 'cancelled'])),
    Q.on('orders', 'status', 'open'),
    Q.sortBy('created_at', Q.asc),
  ];

  if (station !== 'all') {
    clauses.push(Q.where('station', station));
  }

  const items = await database.get<OrderItemModel>('order_items').query(...clauses).fetch();
  if (items.length === 0) return [];

  const orderIds = Array.from(new Set(items.map(it => it.orderId)));
  const orders = await database
    .get<OrderModel>('orders')
    .query(Q.where('id', Q.oneOf(orderIds)))
    .fetch();
  const orderMap = new Map<string, OrderModel>(orders.map(o => [o.id, o]));

  return items.map(it => {
    const ord = orderMap.get(it.orderId);
    return {
      id: it.id,
      item_name: it.itemName,
      qty: it.qty,
      station: it.station,
      kot_status: it.kotStatus,
      modifiers: it.modifiers,
      notes: it.notes,
      created_at: it.createdAt ? it.createdAt.toISOString() : new Date().toISOString(),
      order: {
        id: ord?.id || it.orderId,
        order_number: ord?.orderNumber || 'ORD-?',
        table_id: ord?.tableId,
        order_type: ord?.orderType || 'dine_in',
        tab_name: ord?.tabName,
        status: ord?.status || 'open',
      },
    };
  });
}
