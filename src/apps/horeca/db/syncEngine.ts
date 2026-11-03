import NetInfo from '@react-native-community/netinfo';
import { horecaApi } from '../api/horecaApiClient';
import { useHorecaStore } from './offlineStore';

class SyncEngine {
  private isProcessing = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private idMap: Map<string, string> = new Map();

  start() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      useHorecaStore.getState().setOnlineStatus(isOnline);

      if (isOnline) {
        this.processOutbox();
      }
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
  }

  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const store = useHorecaStore.getState();
      const outbox = [...store.outbox];

      for (const mutation of outbox) {
        if (!store.isOnline) break;

        try {
          switch (mutation.type) {
            case 'create_order': {
              const { tableId, orderType, partySize, tabName, clientTempId } = mutation.payload;
              const res = await horecaApi.createOrder({
                orderType,
                tableId,
                partySize,
                tabName,
              });
              if (res?.id && clientTempId) {
                this.idMap.set(clientTempId, res.id);
              }
              break;
            }

            case 'add_item': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              await horecaApi.addItemToOrder(orderId, {
                menuItemId: mutation.payload.menuItemId,
                qty: mutation.payload.qty,
                modifiers: mutation.payload.modifiers,
                notes: mutation.payload.notes,
                ageVerifiedBy: mutation.payload.ageVerifiedBy,
              });
              break;
            }

            case 'remove_item': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              await horecaApi.removeItemFromOrder(orderId, mutation.payload.itemId);
              break;
            }

            case 'update_kot_status': {
              let orderId = mutation.payload.orderId;
              if (this.idMap.has(orderId)) {
                orderId = this.idMap.get(orderId)!;
              }
              await horecaApi.updateItemKotStatus(
                orderId,
                mutation.payload.itemId,
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
          // If error is 409 or network failure, retain in outbox or back off
          console.warn(`[SyncEngine] Mutation ${mutation.id} error:`, err?.message);
          mutation.attempts += 1;
          break; // Pause outbox processing until next network cycle
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
