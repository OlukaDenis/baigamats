import NetInfo from '@react-native-community/netinfo';
import { horecaApi } from '../api/horecaApiClient';
import { useHorecaStore } from './offlineStore';

class SyncEngine {
  private isProcessing = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private idMap: Map<string, string> = new Map();

  start() {
    this.stop();

    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      useHorecaStore.getState().setOnlineStatus(isOnline);

      if (isOnline) {
        this.processOutbox();
      }
    });

    // Subscribe to outbox changes so mutations flush immediately when online
    let prevOutboxLength = useHorecaStore.getState().outbox.length;
    this.unsubscribeStore = useHorecaStore.subscribe(state => {
      const nextLength = state.outbox.length;
      if (nextLength > prevOutboxLength && state.isOnline) {
        this.processOutbox();
      }
      prevOutboxLength = nextLength;
    });

    // Initial check
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
  }

  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (
        useHorecaStore.getState().isOnline &&
        useHorecaStore.getState().outbox.length > 0
      ) {
        const mutation = useHorecaStore.getState().outbox[0];
        if (!mutation) break;

        try {
          switch (mutation.type) {
            case 'create_order': {
              const { tableId, orderType, partySize, tabName, clientTempId } = mutation.payload;
              const res = await horecaApi.createOrder({
                orderType,
                tableId,
                ...(partySize !== undefined ? { partySize } : {}),
                ...(tabName ? { tabName } : {}),
              });
              if (res?.id && clientTempId) {
                this.idMap.set(clientTempId, res.id);
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

          // Dequeue successfully synced mutation
          useHorecaStore.getState().dequeueMutation(mutation.id);
        } catch (err: any) {
          console.warn(`[SyncEngine] Mutation ${mutation.id} error:`, err?.message);
          mutation.attempts += 1;
          break; // Pause outbox processing until next trigger
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
