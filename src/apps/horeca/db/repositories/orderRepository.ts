import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { KotStatus, MenuItem, Order, OrderItem, OrderStatus, OrderType } from '../../api/schemas';
import { database, databaseManager } from '../DatabaseManager';
import OrderItemModel from '../models/OrderItemModel';
import OrderModel from '../models/OrderModel';
import OutboxMutationModel from '../models/OutboxMutationModel';

export interface CreateOrderOptimisticParams {
  tableId?: string;
  orderType: OrderType;
  partySize?: number;
  tabName?: string;
  userId?: string;
}

export interface AddItemOptimisticParams {
  orderId: string;
  menuItem: MenuItem;
  qty: number;
  modifiers?: string[];
  notes?: string;
  ageVerifiedBy?: string;
}

export const orderRepository = {
  /**
   * Optimistically creates an order in SQLite and queues its outbox mutation atomically.
   */
  async createOrderOptimistic({
    tableId,
    orderType,
    partySize,
    tabName,
    userId,
  }: CreateOrderOptimisticParams): Promise<OrderModel> {
    const targetUserId = userId || databaseManager.getCurrentUserId() || 'default';
    const tempId = `temp-ord-${Date.now()}`;
    const orderNumber = `#OFF-${Date.now().toString().slice(-4)}`;

    const orderCollection = database.get<OrderModel>('orders');
    const outboxCollection = database.get<OutboxMutationModel>('outbox_mutations');

    let createdOrder!: OrderModel;

    await database.write(async () => {
      createdOrder = await orderCollection.create(record => {
        record._raw.id = tempId;
        record.serverId = tempId;
        record.userId = targetUserId;
        record.orderNumber = orderNumber;
        record.tableId = tableId || null;
        record.orderType = orderType;
        record.status = 'open';
        record.tabName = tabName || null;
        record.partySize = partySize || null;
        record.totalAmount = 0;
        record.serviceChargeAmount = 0;
        record.syncState = 'created_offline';
      });

      await outboxCollection.create(record => {
        record.userId = targetUserId;
        record.mutationType = 'create_order';
        record.payloadJson = JSON.stringify({
          clientTempId: tempId,
          tableId,
          orderType,
          partySize,
          tabName,
        });
        record.attempts = 0;
        record.status = 'pending';
      });
    });

    return createdOrder;
  },

  /**
   * Optimistically adds a line item, recalculates order total, and queues outbox mutation.
   */
  async addItemOptimistic({
    orderId,
    menuItem,
    qty,
    modifiers = [],
    notes,
    ageVerifiedBy,
  }: AddItemOptimisticParams): Promise<OrderItemModel> {
    const tempItemId = `temp-item-${Date.now()}`;
    const targetUserId = databaseManager.getCurrentUserId() || 'default';

    const orderCollection = database.get<OrderModel>('orders');
    const itemCollection = database.get<OrderItemModel>('order_items');
    const outboxCollection = database.get<OutboxMutationModel>('outbox_mutations');

    let createdItem!: OrderItemModel;

    await database.write(async () => {
      // 1. Create Order Item
      createdItem = await itemCollection.create(record => {
        record._raw.id = tempItemId;
        record.serverId = tempItemId;
        record.orderId = orderId;
        record.menuItemId = menuItem.id;
        record.itemName = menuItem.name;
        record.unitPrice = menuItem.price;
        record.qty = qty;
        record.station = menuItem.station;
        record.kotStatus = 'new';
        record.modifiersJson = JSON.stringify(modifiers);
        record.notes = notes || null;
        record.discountAmount = 0;
        record.syncState = 'created_offline';
      });

      // 2. Recalculate Order Total
      const order = await orderCollection.find(orderId);
      if (order) {
        const allItems = await itemCollection.query(Q.where('order_id', orderId)).fetch();
        const newTotal = allItems.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
        await order.update(r => {
          r.totalAmount = newTotal;
          if (r.syncState === 'synced') {
            r.syncState = 'modified_offline';
          }
        });
      }

      // 3. Queue Outbox Mutation
      await outboxCollection.create(record => {
        record.userId = targetUserId;
        record.mutationType = 'add_item';
        record.payloadJson = JSON.stringify({
          orderId,
          clientTempItemId: tempItemId,
          menuItemId: menuItem.id,
          qty,
          modifiers,
          notes,
          ageVerifiedBy,
        });
        record.attempts = 0;
        record.status = 'pending';
      });
    });

    return createdItem;
  },

  /**
   * Optimistically removes a line item and updates the order total in SQLite.
   */
  async removeItemOptimistic(orderId: string, itemId: string): Promise<void> {
    const targetUserId = databaseManager.getCurrentUserId() || 'default';
    const orderCollection = database.get<OrderModel>('orders');
    const itemCollection = database.get<OrderItemModel>('order_items');
    const outboxCollection = database.get<OutboxMutationModel>('outbox_mutations');

    await database.write(async () => {
      const item = await itemCollection.find(itemId).catch(() => null);
      if (item) {
        await item.destroyPermanently();
      }

      const order = await orderCollection.find(orderId).catch(() => null);
      if (order) {
        const remaining = await itemCollection.query(Q.where('order_id', orderId)).fetch();
        const newTotal = remaining.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
        await order.update(r => {
          r.totalAmount = newTotal;
        });
      }

      await outboxCollection.create(record => {
        record.userId = targetUserId;
        record.mutationType = 'remove_item';
        record.payloadJson = JSON.stringify({ orderId, itemId });
        record.attempts = 0;
        record.status = 'pending';
      });
    });
  },

  /**
   * Updates line item quantity and recalculates total.
   */
  async updateItemQtyOptimistic(orderId: string, itemId: string, delta: number): Promise<void> {
    const targetUserId = databaseManager.getCurrentUserId() || 'default';
    const orderCollection = database.get<OrderModel>('orders');
    const itemCollection = database.get<OrderItemModel>('order_items');
    const outboxCollection = database.get<OutboxMutationModel>('outbox_mutations');

    await database.write(async () => {
      const item = await itemCollection.find(itemId).catch(() => null);
      if (!item) return;

      const nextQty = item.qty + delta;
      if (nextQty > 0) {
        await item.update(r => {
          r.qty = nextQty;
        });
      } else {
        await item.destroyPermanently();
      }

      const order = await orderCollection.find(orderId).catch(() => null);
      if (order) {
        const remaining = await itemCollection.query(Q.where('order_id', orderId)).fetch();
        const newTotal = remaining.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
        await order.update(r => {
          r.totalAmount = newTotal;
        });
      }

      // API uses remove + add pattern for line replacement
      await outboxCollection.create(record => {
        record.userId = targetUserId;
        record.mutationType = 'remove_item';
        record.payloadJson = JSON.stringify({ orderId, itemId });
        record.attempts = 0;
        record.status = 'pending';
      });

      if (nextQty > 0) {
        await outboxCollection.create(record => {
          record.userId = targetUserId;
          record.mutationType = 'add_item';
          record.payloadJson = JSON.stringify({
            orderId,
            menuItemId: item.menuItemId,
            qty: nextQty,
            modifiers: item.modifiers,
            notes: item.notes,
            clientTempItemId: itemId,
          });
          record.attempts = 0;
          record.status = 'pending';
        });
      }
    });
  },

  /**
   * Updates KOT preparation status.
   */
  async updateKotStatusOptimistic(orderId: string, itemId: string, status: KotStatus): Promise<void> {
    const targetUserId = databaseManager.getCurrentUserId() || 'default';
    const itemCollection = database.get<OrderItemModel>('order_items');
    const outboxCollection = database.get<OutboxMutationModel>('outbox_mutations');

    await database.write(async () => {
      const item = await itemCollection.find(itemId).catch(() => null);
      if (item) {
        await item.update(r => {
          r.kotStatus = status;
        });
      }

      await outboxCollection.create(record => {
        record.userId = targetUserId;
        record.mutationType = 'update_kot_status';
        record.payloadJson = JSON.stringify({ orderId, itemId, status });
        record.attempts = 0;
        record.status = 'pending';
      });
    });
  },

  /**
   * Cancels an order.
   */
  async cancelOrderOptimistic(orderId: string): Promise<void> {
    const targetUserId = databaseManager.getCurrentUserId() || 'default';
    const orderCollection = database.get<OrderModel>('orders');
    const outboxCollection = database.get<OutboxMutationModel>('outbox_mutations');

    await database.write(async () => {
      const order = await orderCollection.find(orderId).catch(() => null);
      if (order) {
        await order.update(r => {
          r.status = 'cancelled';
        });
      }

      await outboxCollection.create(record => {
        record.userId = targetUserId;
        record.mutationType = 'cancel_order';
        record.payloadJson = JSON.stringify({ orderId });
        record.attempts = 0;
        record.status = 'pending';
      });
    });
  },

  /**
   * Batch upserts server orders into SQLite while preserving unsynced local mutations.
   */
  async syncServerOrders(incomingOrders: Order[], userId?: string): Promise<void> {
    if (!incomingOrders || incomingOrders.length === 0) return;
    const targetUserId = userId || databaseManager.getCurrentUserId() || 'default';

    const orderCollection = database.get<OrderModel>('orders');
    const itemCollection = database.get<OrderItemModel>('order_items');

    await database.write(async () => {
      const existingOrders = await orderCollection.query(Q.where('user_id', targetUserId)).fetch();
      const existingMap = new Map<string, OrderModel>();
      existingOrders.forEach(o => {
        existingMap.set(o.serverId || o.id, o);
      });

      const batch: any[] = [];

      for (const ord of incomingOrders) {
        let orderRecord = existingMap.get(ord.id);

        if (orderRecord) {
          // If local order is unsynced, keep local changes
          if (orderRecord.syncState !== 'synced') {
            continue;
          }

          batch.push(
            orderRecord.prepareUpdate(r => {
              r.status = ord.status;
              r.totalAmount = ord.total_amount;
              r.orderNumber = ord.order_number;
              r.tableId = ord.table_id || null;
              r.tabName = ord.tab_name || null;
              r.partySize = ord.party_size || null;
            }),
          );
        } else {
          orderRecord = orderCollection.prepareCreate(r => {
            r._raw.id = ord.id;
            r.serverId = ord.id;
            r.userId = targetUserId;
            r.orderNumber = ord.order_number;
            r.tableId = ord.table_id || null;
            r.orderType = ord.order_type;
            r.status = ord.status;
            r.tabName = ord.tab_name || null;
            r.partySize = ord.party_size || null;
            r.totalAmount = ord.total_amount;
            r.serviceChargeAmount = ord.service_charge_amount || 0;
            r.syncState = 'synced';
          });
          batch.push(orderRecord);
        }

        // Process line items if provided
        if (Array.isArray(ord.items) && ord.items.length > 0) {
          const existingItems = await itemCollection.query(Q.where('order_id', ord.id)).fetch();
          const itemMap = new Map(existingItems.map(it => [it.serverId || it.id, it]));

          for (const it of ord.items) {
            const foundItem = itemMap.get(it.id);
            if (foundItem) {
              batch.push(
                foundItem.prepareUpdate(r => {
                  r.itemName = it.item_name;
                  r.unitPrice = it.unit_price;
                  r.qty = it.qty;
                  r.station = it.station;
                  r.kotStatus = it.kot_status;
                  r.modifiersJson = JSON.stringify(it.modifiers || []);
                  r.notes = it.notes || null;
                }),
              );
            } else {
              batch.push(
                itemCollection.prepareCreate(r => {
                  r._raw.id = it.id;
                  r.serverId = it.id;
                  r.orderId = ord.id;
                  r.menuItemId = it.menu_item_id;
                  r.itemName = it.item_name;
                  r.unitPrice = it.unit_price;
                  r.qty = it.qty;
                  r.station = it.station;
                  r.kotStatus = it.kot_status;
                  r.modifiersJson = JSON.stringify(it.modifiers || []);
                  r.notes = it.notes || null;
                  r.discountAmount = it.discount_amount || 0;
                  r.syncState = 'synced';
                }),
              );
            }
          }
        }
      }

      if (batch.length > 0) {
        await database.batch(...batch);
      }
    });
  },

  /**
   * Reconciles a newly synced server order replacing temp ID references.
   */
  async reconcileCreatedOrder(tempId: string, serverOrder: Partial<Order> & { id: string }): Promise<void> {
    const orderCollection = database.get<OrderModel>('orders');
    const itemCollection = database.get<OrderItemModel>('order_items');

    await database.write(async () => {
      const existing = await orderCollection.find(tempId).catch(() => null);
      if (existing) {
        await existing.update(r => {
          r.serverId = serverOrder.id;
          if (serverOrder.order_number) r.orderNumber = serverOrder.order_number;
          if (serverOrder.status) r.status = serverOrder.status;
          r.syncState = 'synced';
        });

        // Also update child items' foreign keys
        const childItems = await itemCollection.query(Q.where('order_id', tempId)).fetch();
        for (const it of childItems) {
          await it.update(r => {
            r.orderId = serverOrder.id;
          });
        }
      }
    });
  },

  /**
   * Reconciles a newly synced line item replacing client temp ID.
   */
  async reconcileCreatedItem(tempItemId: string, serverItem: Partial<OrderItem> & { id: string }): Promise<void> {
    const itemCollection = database.get<OrderItemModel>('order_items');

    await database.write(async () => {
      const item = await itemCollection.find(tempItemId).catch(() => null);
      if (item) {
        await item.update(r => {
          r.serverId = serverItem.id;
          r.syncState = 'synced';
        });
      }
    });
  },

  /**
   * Returns live observable stream of orders filtered by status or user.
   */
  observeOrders(options?: { status?: OrderStatus; userId?: string }): Observable<OrderModel[]> {
    const conditions: any[] = [];
    const targetUserId = options?.userId || databaseManager.getCurrentUserId();

    if (targetUserId && targetUserId !== 'default') {
      conditions.push(Q.where('user_id', targetUserId));
    }
    if (options?.status) {
      conditions.push(Q.where('status', options.status));
    }
    conditions.push(Q.sortBy('created_at', Q.desc));

    return database.get<OrderModel>('orders').query(...conditions).observe();
  },

  /**
   * Returns live observable for a single order.
   */
  observeOrder(orderId: string): Observable<OrderModel | null> {
    return database
      .get<OrderModel>('orders')
      .findAndObserve(orderId);
  },

  /**
   * Returns live observable stream of line items for an order.
   */
  observeOrderItems(orderId: string): Observable<OrderItemModel[]> {
    return database
      .get<OrderItemModel>('order_items')
      .query(Q.where('order_id', orderId), Q.sortBy('created_at', Q.asc))
      .observe();
  },
};
