import NetInfo from '@react-native-community/netinfo';
import type { Subscription } from 'rxjs';
import { horecaApi } from '../api/horecaApiClient';
import { useHorecaStore } from './offlineStore';
import { orderRepository } from './repositories/orderRepository';
import { outboxRepository } from './repositories/outboxRepository';

class SyncEngine {
  private isProcessing = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private outboxSubscription: Subscription | null = null;
  private idMap: Map<string, string> = new Map();

  start() {
    this.stop();

    // 1. Connectivity Listener
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      useHorecaStore.getState().setOnlineStatus(isOnline);

      if (isOnline) {
        this.processOutbox();
      }
    });

    // 2. Reactive SQLite Outbox Observer
    let prevCount = 0;
    this.outboxSubscription = outboxRepository.observePendingCount().subscribe(count => {
      if (count > prevCount && useHorecaStore.getState().isOnline) {
        this.processOutbox();
      }
      prevCount = count;
    });

    // 3. Fallback store subscription
    let prevOutboxLength = useHorecaStore.getState().outbox.length;
    this.unsubscribeStore = useHorecaStore.subscribe(state => {
      const nextLength = state.outbox.length;
      if (nextLength > prevOutboxLength && state.isOnline) {
        this.processOutbox();
      }
      prevOutboxLength = nextLength;
    });

    // 4. Initial check
    NetInfo.fetch().then(state => {
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      useHorecaStore.getState().setOnlineStatus(isOnline);
      if (isOnline) {
        this.processOutbox();
      }
    });
  }

  stop() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    if (this.outboxSubscription) {
      this.outboxSubscription.unsubscribe();
      this.outboxSubscription = null;
    }
  }

  /**
   * Processes the durable SQLite outbox in strict FIFO order when online.
   */
  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (useHorecaStore.getState().isOnline) {
        // Fetch oldest pending mutation from SQLite
        const dbMutation = await outboxRepository.getNextPendingMutation();

        // Check in-memory fallback if SQLite had none
        const inMemoryMutation = useHorecaStore.getState().outbox[0];
        const mutation = dbMutation
          ? {
              id: dbMutation.id,
              type: dbMutation.mutationType as any,
              payload: dbMutation.payload,
              attempts: dbMutation.attempts,
              createdAt: dbMutation.createdAt.toISOString(),
            }
          : inMemoryMutation;

        if (!mutation) break;

        try {
          switch (mutation.type) {
            case 'create_order': {
              const { tableId, orderType, partySize, tabName, items, clientTempId } =
                mutation.payload;
              const res = await horecaApi.createOrder({
                orderType,
                tableId,
                ...(partySize !== undefined ? { partySize } : {}),
                ...(tabName ? { tabName } : {}),
                ...(Array.isArray(items) && items.length > 0 ? { items } : {}),
              });
              if (res?.id && clientTempId) {
                this.idMap.set(clientTempId, res.id);
                await orderRepository.reconcileCreatedOrder(clientTempId, res);
                useHorecaStore.getState().upsertOrder(res, clientTempId);
              }
              break;
            }

            case 'add_item': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              const addRes = await horecaApi.addItemToOrder(orderId, {
                menuItemId: mutation.payload.menuItemId,
                qty: mutation.payload.qty,
                modifiers: mutation.payload.modifiers,
                notes: mutation.payload.notes,
                ageVerifiedBy: mutation.payload.ageVerifiedBy,
              });
              if (addRes?.item?.id && mutation.payload.clientTempItemId) {
                this.idMap.set(mutation.payload.clientTempItemId, addRes.item.id);
                await orderRepository.reconcileCreatedItem(mutation.payload.clientTempItemId, addRes.item);
                useHorecaStore
                  .getState()
                  .replaceOrderItemId(
                    orderId,
                    mutation.payload.clientTempItemId,
                    addRes.item,
                    addRes.orderTotal,
                  );
              }
              break;
            }

            case 'remove_item': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              await horecaApi.removeItemFromOrder(
                orderId,
                this.idMap.get(mutation.payload.itemId) ?? mutation.payload.itemId,
              );
              break;
            }

            case 'update_kot_status': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              await horecaApi.updateItemKotStatus(
                orderId,
                this.idMap.get(mutation.payload.itemId) ?? mutation.payload.itemId,
                mutation.payload.status,
              );
              break;
            }

            case 'cancel_order': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              await horecaApi.cancelOrder(orderId);
              break;
            }

            case 'bill_cash': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              await horecaApi.billCash(orderId, { paymentMethod: 'cash' });
              break;
            }

            case 'open_shift': {
              await horecaApi.openShift({ openingFloat: mutation.payload.openingFloat });
              break;
            }

            case 'close_shift': {
              await horecaApi.closeShift({
                countedCash: mutation.payload.countedCash,
                note: mutation.payload.note,
              });
              break;
            }
          }

          // Dequeue from both SQLite and in-memory store
          if (dbMutation) {
            await outboxRepository.dequeueMutation(dbMutation.id);
          }
          useHorecaStore.getState().dequeueMutation(mutation.id);
        } catch (err: any) {
          console.warn(`[SyncEngine] Mutation ${mutation.id} error:`, err?.message);
          if (dbMutation) {
            await outboxRepository.markMutationFailed(dbMutation.id, err?.message);
          }
          break; // Pause outbox processing until next network event
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
