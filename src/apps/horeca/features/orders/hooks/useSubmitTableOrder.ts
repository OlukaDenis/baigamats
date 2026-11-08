import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { CreateOrderItemInput, Order } from '@horeca/api/schemas';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { type DraftOrderItem, useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaAuthStore } from '@horeca/features/auth/store/horecaAuthStore';
import { HORECA_TABLES_QUERY_KEY } from '@horeca/features/floor/hooks/useFloorTables';
import { HORECA_OPEN_ORDERS_QUERY_KEY } from './useOpenOrders';

export interface SubmitTableOrderOptions {
  tableId: string;
  partySize?: number;
  onSuccess?: (order: Order) => void;
}

/**
 * Shared hook to submit a table's draft items in a single `POST /orders` call
 * (or append to an existing open server order if one is already active on the table).
 *
 * Enforces:
 * - Strict repeat-tap lock (no duplicate orders on rapid taps)
 * - No automatic retry for in-flight requests
 * - Non-blocking display of server `warnings`
 * - Clear 400 / 404 / 409 error reporting while preserving draft items
 */
export function useSubmitTableOrder() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlightRef = useRef(false);

  const submitTableOrder = useCallback(
    async ({ tableId, partySize, onSuccess }: SubmitTableOrderOptions): Promise<Order | null> => {
      if (inFlightRef.current) {
        return null;
      }

      const store = useHorecaStore.getState();
      const auth = useHorecaAuthStore.getState();
      const draft = store.draftOrdersByTable[tableId];
      const draftItems: DraftOrderItem[] = draft?.items ?? [];

      if (draftItems.length === 0) {
        appModal.warning('No Items Selected', 'Please add at least one menu item before submitting.');
        return null;
      }

      if (draftItems.length > 100) {
        appModal.warning(
          'Too Many Order Lines',
          'An order can contain at most 100 distinct item lines. Please consolidate lines.',
        );
        return null;
      }

      const defaultVerifier =
        auth.activeStaff?.name?.trim() || auth.me?.name?.trim() || null;

      // Validate age-restricted items have ageVerifiedBy
      for (const line of draftItems) {
        if (line.age_restricted && !(line.age_verified_by?.trim() || defaultVerifier)) {
          appModal.error(
            'Age Verification Required',
            `Please verify customer ID and provide staff name for age-restricted item "${line.item_name}".`,
          );
          return null;
        }
      }

      const resolvedPartySize = Math.min(
        500,
        Math.max(1, Math.round(partySize ?? draft?.partySize ?? 2)),
      );

      const itemsPayload: CreateOrderItemInput[] = draftItems.map(line => {
        const cleanMods = (line.modifiers ?? [])
          .map(m => m.trim())
          .filter(Boolean)
          .slice(0, 20);
        const cleanNotes = line.notes?.trim() ? line.notes.trim().slice(0, 300) : undefined;
        const verifiedBy = line.age_restricted
          ? line.age_verified_by?.trim() || defaultVerifier || undefined
          : line.age_verified_by?.trim() || undefined;

        return {
          menuItemId: line.menu_item_id,
          qty: Math.min(500, Math.max(1, Math.round(line.qty))),
          ...(cleanMods.length > 0 ? { modifiers: cleanMods } : {}),
          ...(cleanNotes ? { notes: cleanNotes } : {}),
          ...(verifiedBy ? { ageVerifiedBy: verifiedBy } : {}),
        };
      });

      inFlightRef.current = true;
      setIsSubmitting(true);

      try {
        // Single-call table order creation: POST /orders with items[]
        const createdOrder = await horecaApi.createOrder({
          orderType: 'dine_in',
          tableId,
          partySize: resolvedPartySize,
          items: itemsPayload,
        });

        useHorecaStore.getState().upsertOrder(createdOrder);
        useHorecaStore.getState().setActiveOrderId(createdOrder.id);
        useHorecaStore.getState().setTableStatus(tableId, 'occupied');
        useHorecaStore.getState().clearTableDraft(tableId);

        queryClient.setQueryData<Order[]>(HORECA_OPEN_ORDERS_QUERY_KEY, prev => {
          const list = Array.isArray(prev) ? prev.filter(o => o.id !== createdOrder.id) : [];
          return [createdOrder, ...list];
        });
        queryClient.invalidateQueries({ queryKey: HORECA_OPEN_ORDERS_QUERY_KEY }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: HORECA_TABLES_QUERY_KEY }).catch(() => {});

        const warnings = createdOrder.warnings?.filter(Boolean) ?? [];
        if (warnings.length > 0) {
          appModal.warning(
            'Order Placed • Warning',
            warnings.join('\n'),
            () => {
              onSuccess?.(createdOrder);
            },
          );
        } else {
          onSuccess?.(createdOrder);
        }

        return createdOrder;
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        const isTimeout =
          err?.code === 'ECONNABORTED' ||
          err?.kind === 'timeout' ||
          /timeout/i.test(err?.message || '');

        // Only queue offline when genuinely offline (no HTTP status and not a server timeout)
        if (!status && !isTimeout && !useHorecaStore.getState().isOnline) {
          const optimisticOrder = useHorecaStore.getState().createOrderOptimistic({
            orderType: 'dine_in',
            tableId,
            partySize: resolvedPartySize,
            items: itemsPayload,
            draftItems,
          });
          useHorecaStore.getState().clearTableDraft(tableId);
          onSuccess?.(optimisticOrder);
          return optimisticOrder;
        }

        const serverMessage =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          'Could not submit order. Please verify items and try again.';

        const title =
          status === 409
            ? 'Item Not Available'
            : status === 404
              ? 'Table or Item Not Found'
              : status === 400
                ? 'Invalid Order Details'
                : 'Order Submission Failed';

        appModal.error(title, serverMessage);
        return null;
      } finally {
        inFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [queryClient],
  );

  return {
    submitTableOrder,
    isSubmitting,
  };
}
