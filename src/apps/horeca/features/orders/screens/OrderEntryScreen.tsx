import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import {
  CreditCardIcon,
  MinusIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldExclamationIcon,
  ShoppingBagIcon,
  TrashIcon,
  UserGroupIcon,
} from 'react-native-heroicons/outline';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { Order, OrderItem } from '@horeca/api/schemas';
import { type DraftOrderItem, useHorecaStore } from '@horeca/db/offlineStore';
import { syncEngine } from '@horeca/db/syncEngine';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { useHorecaAuthStore } from '@horeca/features/auth/store/horecaAuthStore';
import {
  HORECA_OPEN_ORDERS_QUERY_KEY,
  refreshOpenOrdersInBackground,
} from '../hooks/useOpenOrders';
import { useSubmitTableOrder } from '../hooks/useSubmitTableOrder';

/** Placeholder shown when the table has no open order yet. */
const EMPTY_ORDER: Order = {
  id: '',
  order_number: 'NEW',
  table_id: null,
  order_type: 'dine_in',
  status: 'open',
  total_amount: 0,
  service_charge_amount: 0,
  created_at: '',
  items: [],
};

interface OrderEntryScreenProps {
  orderId?: string | null;
  onPayNow: (orderId: string, orderTotal: number) => void;
  onKitchenFire?: () => void;
  onLockTerminal: () => void;
  onBack?: () => void;
}

export const OrderEntryScreen: React.FC<OrderEntryScreenProps> = ({
  orderId: propOrderId,
  onPayNow,
  onKitchenFire: _onKitchenFire,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();
  const queryClient = useQueryClient();
  const { isSubmitting, submitTableOrder } = useSubmitTableOrder();
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isResolvingOrder, setIsResolvingOrder] = useState(false);
  const [expandedDraftItemId, setExpandedDraftItemId] = useState<string | null>(null);

  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const me = useHorecaAuthStore(state => state.me);
  const defaultVerifier = activeStaff?.name?.trim() || me?.name?.trim() || 'Waiter';

  const activeTableId = useHorecaStore(state => state.activeTableId);
  const tables = useHorecaStore(state => state.tables);
  const orders = useHorecaStore(state => state.orders);
  const activeOrderId = useHorecaStore(state => state.activeOrderId);
  const setActiveOrderId = useHorecaStore(state => state.setActiveOrderId);
  const upsertOrder = useHorecaStore(state => state.upsertOrder);
  const removeItemOptimistic = useHorecaStore(state => state.removeItemOptimistic);
  const updateItemQtyOptimistic = useHorecaStore(state => state.updateItemQtyOptimistic);
  const deleteOrderOptimistic = useHorecaStore(state => state.deleteOrderOptimistic);

  // Draft order state for the current table
  const tableDraft = useHorecaStore(state =>
    activeTableId ? state.draftOrdersByTable[activeTableId] : undefined,
  );
  const updateDraftItemQty = useHorecaStore(state => state.updateDraftItemQty);
  const updateDraftItemDetails = useHorecaStore(state => state.updateDraftItemDetails);
  const removeDraftItem = useHorecaStore(state => state.removeDraftItem);
  const setDraftPartySize = useHorecaStore(state => state.setDraftPartySize);
  const clearTableDraft = useHorecaStore(state => state.clearTableDraft);

  const targetOrderId = propOrderId ?? activeOrderId;

  // Fetch only the current order's details and items by ID
  useEffect(() => {
    let mounted = true;
    if (!targetOrderId || targetOrderId.startsWith('temp-ord-')) {
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setIsLoadingOrder(true);
      try {
        const exactOrder = await horecaApi.getOrder(targetOrderId);
        if (mounted && exactOrder?.id) {
          upsertOrder(exactOrder);
        }
      } catch {
        // Retain cached order payload from POST /v1/orders
      } finally {
        if (mounted) {
          setIsLoadingOrder(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [targetOrderId, upsertOrder]);

  const openOrdersList = useMemo(
    () =>
      Object.values(orders)
        .filter(o => o.status === 'open')
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [orders],
  );

  const currentOrder = useMemo(() => {
    // 0. Prefer propOrderId if passed
    if (propOrderId && orders[propOrderId]) {
      return orders[propOrderId];
    }

    // 1. Prefer server-persisted order for activeOrderId
    if (activeOrderId && orders[activeOrderId]) {
      if (!activeOrderId.startsWith('temp-ord-')) {
        return orders[activeOrderId];
      }
      const tempTableId = orders[activeOrderId].table_id;
      const serverMatch = openOrdersList.find(
        o => !o.id.startsWith('temp-ord-') && o.table_id && o.table_id === tempTableId,
      );
      if (serverMatch) {
        return serverMatch;
      }
      return orders[activeOrderId];
    }

    // If a specific propOrderId was requested and isn't in store yet, wait for it rather than showing another order
    if (propOrderId) {
      return EMPTY_ORDER;
    }

    // 2. Prefer newest server-persisted open order matching activeTableId
    const serverTableOrder = openOrdersList.find(
      o => !o.id.startsWith('temp-ord-') && o.table_id === activeTableId,
    );
    if (serverTableOrder) {
      return serverTableOrder;
    }

    // 3. Any open order matching activeTableId
    const anyTableOrder = openOrdersList.find(o => o.table_id === activeTableId);
    if (anyTableOrder) {
      return anyTableOrder;
    }

    // 4. Fallback to EMPTY_ORDER when viewing a table that only has a draft or is empty
    return EMPTY_ORDER;
  }, [propOrderId, activeOrderId, activeTableId, openOrdersList, orders]);

  // Keep activeOrderId in sync with the resolved open order
  useEffect(() => {
    if (currentOrder.id && currentOrder.id !== activeOrderId) {
      setActiveOrderId(currentOrder.id);
    }
  }, [currentOrder.id, activeOrderId, setActiveOrderId]);

  const activeTable =
    tables.find(t => t.id === (currentOrder.table_id ?? activeTableId)) ?? tables[0];

  const draftItems: DraftOrderItem[] = useMemo(
    () => tableDraft?.items ?? [],
    [tableDraft],
  );
  const isDraftMode = draftItems.length > 0 && !currentOrder.id;

  const draftItemsCount = useMemo(
    () => draftItems.reduce((sum, it) => sum + it.qty, 0),
    [draftItems],
  );
  const draftTotalAmount = useMemo(
    () => draftItems.reduce((sum, it) => sum + it.unit_price * it.qty, 0),
    [draftItems],
  );

  const orderItems: OrderItem[] = currentOrder.items ?? [];
  const submittedItemsCount = orderItems.reduce((sum, it) => sum + it.qty, 0);
  const submittedTotalAmount =
    currentOrder.total_amount && currentOrder.total_amount > 0
      ? currentOrder.total_amount
      : orderItems.reduce(
        (sum, it) => sum + Math.max(0, it.unit_price * it.qty - (it.discount_amount ?? 0)),
        0,
      );

  const totalItemsCount = isDraftMode ? draftItemsCount : submittedItemsCount;
  const totalAmount = isDraftMode ? draftTotalAmount : submittedTotalAmount;
  const partySize = isDraftMode
    ? (tableDraft?.partySize ?? 2)
    : (currentOrder.party_size ?? 2);

  const isBilled = currentOrder.status === 'billed' || currentOrder.status === 'paid';

  const handleClearDraft = () => {
    if (!activeTableId) return;
    appModal.confirm({
      title: 'Clear Draft Order',
      message: `Remove all ${draftItemsCount} unsent items for Table ${activeTable?.table_number ?? ''}?`,
      confirmText: 'Clear Draft',
      cancelText: 'Keep Items',
      isDestructive: true,
      onConfirm: () => {
        clearTableDraft(activeTableId);
        onBack?.();
      },
    });
  };

  const handleSubmitDraft = async () => {
    if (!activeTableId || isSubmitting) return;
    const createdOrder = await submitTableOrder({
      tableId: activeTableId,
      partySize,
    });
    if (createdOrder) {
      queryClient.invalidateQueries({ queryKey: HORECA_OPEN_ORDERS_QUERY_KEY });
    }
  };

  const handleDeleteEntireOrder = () => {
    if (isDraftMode) {
      handleClearDraft();
      return;
    }
    if (!currentOrder.id) return;
    appModal.confirm({
      title: 'Cancel Order',
      message: `Are you sure you want to cancel Order ${currentOrder.order_number}? This will remove all items and make Table ${activeTable?.table_number ?? ''} available.`,
      confirmText: 'Cancel Order',
      cancelText: 'Keep Order',
      isDestructive: true,
      onConfirm: async () => {
        deleteOrderOptimistic(currentOrder.id);
        try {
          await syncEngine.processOutbox();
          queryClient.invalidateQueries({ queryKey: HORECA_OPEN_ORDERS_QUERY_KEY });
        } catch {
          // Synced in background
        }
        appModal.success('Order Cancelled', `Order ${currentOrder.order_number} has been cancelled.`, () => {
          onBack?.();
        });
      },
    });
  };

  const handlePay = async () => {
    if (orderItems.length === 0 && totalAmount <= 0) {
      appModal.warning('Empty Order', 'Please add items to the order before proceeding to checkout.');
      return;
    }

    let resolvedOrderId = currentOrder.id;

    // If order is still a temp ID or missing, flush outbox and refetch open orders
    if (!resolvedOrderId || resolvedOrderId.startsWith('temp-ord-')) {
      setIsResolvingOrder(true);
      try {
        await syncEngine.processOutbox();
        const refreshedOrders = await refreshOpenOrdersInBackground(queryClient);
        const matched =
          refreshedOrders.find(
            o =>
              !o.id.startsWith('temp-ord-') &&
              o.status === 'open' &&
              (o.table_id === (currentOrder.table_id ?? activeTableId) ||
                refreshedOrders.length === 1),
          ) ??
          refreshedOrders.find(o => !o.id.startsWith('temp-ord-') && o.status === 'open');

        if (matched?.id) {
          resolvedOrderId = matched.id;
          setActiveOrderId(matched.id);
        }
      } finally {
        setIsResolvingOrder(false);
      }
    }

    if (!resolvedOrderId) {
      appModal.error(
        'Order Not Ready',
        'Could not find an active open order ID. Please refresh and try again.',
      );
      return;
    }

    setActiveOrderId(resolvedOrderId);
    onPayNow(resolvedOrderId, totalAmount);
  };

  const renderDraftItemRow = ({ item }: { item: DraftOrderItem }) => {
    if (!activeTableId) return null;
    const lineTotal = item.unit_price * item.qty;
    const isExpanded = expandedDraftItemId === item.id;

    return (
      <View className="p-3.5 mb-2.5 rounded-horeca bg-surface border border-border shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center">
              <AppText variant="label" className="font-bold text-text mr-1.5" numberOfLines={1}>
                {item.item_name}
              </AppText>
              {item.age_restricted ? (
                <View className="px-1.5 py-0.5 rounded-horeca bg-warning/20 border border-warning/40">
                  <AppText variant="caption" className="text-[9px] font-bold text-warning">
                    18+
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText variant="caption" className="text-text-secondary text-[11px]">
              UGX {item.unit_price.toLocaleString()} each • {item.station.toUpperCase()}
            </AppText>
          </View>
          <AppText variant="label" className="text-primary font-bold text-base">
            UGX {lineTotal.toLocaleString()}
          </AppText>
        </View>

        {item.modifiers && item.modifiers.length > 0 ? (
          <View className="flex-row flex-wrap mb-1.5">
            {item.modifiers.map((mod, i) => (
              <View key={i} className="mr-1.5 mb-1 px-2 py-0.5 rounded-horeca bg-background border border-border">
                <AppText variant="caption" className="text-[10px] text-text-secondary font-medium">
                  {mod}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {item.notes ? (
          <AppText variant="caption" className="text-status-reserved mb-1.5 text-xs">
            Note: {item.notes}
          </AppText>
        ) : null}

        {item.age_restricted ? (
          <View className="flex-row items-center mb-2">
            <ShieldExclamationIcon color={colors.warning} size={13} />
            <AppText variant="caption" className="text-warning text-[11px] ml-1 font-medium">
              Age verified by: {item.age_verified_by || defaultVerifier}
            </AppText>
          </View>
        ) : null}

        {/* Expandable Notes & Modifiers Editor */}
        {isExpanded ? (
          <View className="mt-1 mb-2.5 p-2.5 rounded-horeca bg-background border border-border">
            <AppText variant="caption" className="text-[10px] text-text-secondary font-semibold uppercase mb-1">
              Special Notes (Max 300 chars)
            </AppText>
            <TextInput
              value={item.notes ?? ''}
              onChangeText={text =>
                updateDraftItemDetails(activeTableId, item.id, {
                  notes: text.slice(0, 300),
                })
              }
              placeholder="e.g., no ice, extra well done"
              placeholderTextColor={colors.onSurfaceVariant}
              maxLength={300}
              className="min-h-[58px] text-xs text-text bg-input border border-border rounded-horeca px-3 py-2 mb-2"
            />

            <AppText variant="caption" className="text-[10px] text-text-secondary font-semibold uppercase mb-1">
              Modifiers (Comma-separated, max 20)
            </AppText>
            <TextInput
              value={(item.modifiers ?? []).join(', ')}
              onChangeText={text => {
                const parsed = text
                  .split(',')
                  .map(s => s.trim().slice(0, 80))
                  .filter(Boolean)
                  .slice(0, 20);
                updateDraftItemDetails(activeTableId, item.id, {
                  modifiers: parsed,
                });
              }}
              placeholder="e.g., spicy, lemon slice"
              placeholderTextColor={colors.onSurfaceVariant}
              className="min-h-[58px] text-xs text-text bg-input border border-border rounded-horeca px-3 py-2"
            />
          </View>
        ) : null}

        {/* Stepper, Edit Notes & Delete Row */}
        <View className="flex-row items-center justify-between pt-2 border-t border-border/40">
          <View className="flex-row items-center bg-background border border-border rounded-horeca p-0.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              onPress={() => updateDraftItemQty(activeTableId, item.id, -1)}
              className="h-8 w-8 items-center justify-center rounded-horeca bg-surface active:bg-primary/10"
            >
              <MinusIcon color={colors.onSurface} size={14} />
            </Pressable>
            <AppText className="w-9 text-center font-bold text-sm text-text">
              {item.qty}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              onPress={() => updateDraftItemQty(activeTableId, item.id, 1)}
              className="h-8 w-8 items-center justify-center rounded-horeca bg-surface active:bg-primary/10"
            >
              <PlusIcon color={colors.onSurface} size={14} />
            </Pressable>
          </View>

          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit notes for ${item.item_name}`}
              onPress={() =>
                setExpandedDraftItemId(prev => (prev === item.id ? null : item.id))
              }
              className="h-8 px-2.5 mr-2 rounded-horeca bg-surface border border-border flex-row items-center justify-center active:opacity-70"
            >
              <PencilSquareIcon color={colors.onSurfaceVariant} size={14} />
              <AppText variant="caption" className="text-text-secondary font-semibold ml-1 text-xs">
                {isExpanded ? 'Done' : 'Notes'}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.item_name}`}
              onPress={() => removeDraftItem(activeTableId, item.id)}
              className="h-8 px-2.5 rounded-horeca bg-error/10 border border-error/20 flex-row items-center justify-center active:opacity-70"
            >
              <TrashIcon color={colors.error} size={14} />
              <AppText variant="caption" className="text-error font-semibold ml-1 text-xs">
                Remove
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderOrderItemRow = ({ item }: { item: OrderItem }) => {
    const discount = item.discount_amount ?? 0;
    const lineTotal = Math.max(0, item.unit_price * item.qty - discount);

    return (
      <View className="p-3.5 mb-2.5 rounded-horeca bg-surface border border-border shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-2">
            <AppText variant="label" className="font-bold text-text" numberOfLines={1}>
              {item.item_name}
            </AppText>
            <AppText variant="caption" className="text-text-secondary text-[11px]">
              UGX {item.unit_price.toLocaleString()} each • {item.station?.toUpperCase()}
              {discount > 0 ? ` • -UGX ${discount.toLocaleString()} disc.` : ''}
            </AppText>
          </View>
          <AppText variant="label" className="text-primary font-bold text-base">
            UGX {lineTotal.toLocaleString()}
          </AppText>
        </View>

        {item.modifiers && item.modifiers.length > 0 ? (
          <View className="flex-row flex-wrap mb-2">
            {item.modifiers.map((mod, i) => (
              <View key={i} className="mr-1.5 mb-1 px-2 py-0.5 rounded-horeca bg-background border border-border">
                <AppText variant="caption" className="text-[10px] text-text-secondary font-medium">
                  {mod}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {item.notes ? (
          <AppText variant="caption" className="text-status-reserved mb-2 text-xs">
            Note: {item.notes}
          </AppText>
        ) : null}

        {/* Stepper & Delete Row */}
        <View className="flex-row items-center justify-between pt-2 border-t border-border/40">
          <View className="flex-row items-center bg-background border border-border rounded-horeca p-0.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              onPress={() => updateItemQtyOptimistic(currentOrder.id, item.id, -1)}
              className="h-8 w-8 items-center justify-center rounded-horeca bg-surface active:bg-primary/10"
            >
              <MinusIcon color={colors.onSurface} size={14} />
            </Pressable>
            <AppText className="w-9 text-center font-bold text-sm text-text">
              {item.qty}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              onPress={() => updateItemQtyOptimistic(currentOrder.id, item.id, 1)}
              className="h-8 w-8 items-center justify-center rounded-horeca bg-surface active:bg-primary/10"
            >
              <PlusIcon color={colors.onSurface} size={14} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.item_name}`}
            onPress={() => removeItemOptimistic(currentOrder.id, item.id)}
            className="h-8 px-2.5 rounded-horeca bg-error/10 border border-error/20 flex-row items-center justify-center active:opacity-70"
          >
            <TrashIcon color={colors.error} size={14} />
            <AppText variant="caption" className="text-error font-semibold ml-1 text-xs">
              Remove
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaSubAppBar
          title={isDraftMode ? 'Review Draft Order' : 'Order Details'}
          onBack={onBack}
        />
      }
      contentContainerClassName="flex-1"
    >
      {/* Table Context Banner */}
      <View className="flex-row items-center justify-between px-4 py-2.5 bg-surface/70 border-b border-border/40">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="flex-1">
            <AppText variant="label" className="font-bold text-text" numberOfLines={1}>
              Table {activeTable?.table_number ?? '01'} • {activeTable?.section ?? 'Main Dining'}
            </AppText>
            <View className="flex-row items-center">
              <AppText variant="caption" className="text-text-secondary text-[11px]">
                {isDraftMode ? 'Unsent Draft' : `Order ${currentOrder.order_number}`} • {partySize} Guests
              </AppText>
              {isLoadingOrder ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ marginLeft: 6, transform: [{ scale: 0.7 }] }}
                />
              ) : null}
            </View>
          </View>
        </View>

        <View className="flex-row items-center">
          {isDraftMode && activeTableId ? (
            <View className="flex-row items-center bg-background border border-border rounded-horeca px-1.5 py-0.5 mr-2.5">
              <UserGroupIcon color={colors.onSurfaceVariant} size={13} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease party size"
                onPress={() => setDraftPartySize(activeTableId, partySize - 1)}
                className="h-6 w-6 items-center justify-center"
              >
                <MinusIcon color={colors.onSurface} size={12} />
              </Pressable>
              <AppText variant="caption" className="font-bold text-text px-1 text-xs">
                {partySize}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase party size"
                onPress={() => setDraftPartySize(activeTableId, partySize + 1)}
                className="h-6 w-6 items-center justify-center"
              >
                <PlusIcon color={colors.onSurface} size={12} />
              </Pressable>
            </View>
          ) : null}

          <View className="items-end mr-2">
            <AppText variant="caption" className="text-[10px] text-text-secondary font-semibold uppercase">
              Total
            </AppText>
            <AppText variant="label" className="text-primary font-bold">
              UGX {totalAmount.toLocaleString()}
            </AppText>
          </View>
        </View>
      </View>

      {/* Order Items List */}
      <View className="flex-1">
        {isDraftMode ? (
          <FlatList
            data={draftItems}
            keyExtractor={item => item.id}
            renderItem={renderDraftItemRow}
            contentContainerStyle={{
              padding: 14,
              paddingBottom: Math.max(insets.bottom, 12) + 140,
            }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={orderItems}
            keyExtractor={item => item.id}
            renderItem={renderOrderItemRow}
            contentContainerStyle={{
              padding: 14,
              paddingBottom: Math.max(insets.bottom, 12) + 140,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              isLoadingOrder ? (
                <View className="py-16 items-center justify-center">
                  <ActivityIndicator size="large" color={colors.primary} />
                  <AppText variant="body" className="text-text-secondary font-medium mt-3">
                    Loading open order...
                  </AppText>
                </View>
              ) : (
                <View className="py-16 items-center justify-center">
                  <View className="h-14 w-14 rounded-horeca bg-primary/10 border border-primary/20 items-center justify-center mb-3">
                    <ShoppingBagIcon color={colors.primary} size={28} />
                  </View>
                  <AppText variant="title" className="text-text font-bold mb-1">
                    Order is Empty
                  </AppText>
                  <AppText variant="caption" className="text-text-secondary text-center max-w-xs mb-4">
                    Go back to the table menu and tap items to add them to this order.
                  </AppText>
                  {onBack ? (
                    <Button
                      label="Browse Table Menu"
                      variant="primary"
                      size="sm"
                      onPress={onBack}
                    />
                  ) : null}
                </View>
              )
            }
          />
        )}
      </View>

      {/* Bottom Sticky Order Ticket Bar (Only shown for open/draft orders; hidden when billed/paid) */}
      {!isBilled ? (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 6 }}
          className="absolute left-0 right-0 bottom-0 bg-surface/95 border-t border-border px-4 pt-3 shadow-2xl"
        >
          {/* Ticket Summary Line */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                className={`h-2 w-2 rounded-full mr-1.5 ${isDraftMode ? 'bg-warning' : 'bg-status-available'
                  }`}
              />
              <AppText variant="caption" className="text-text-secondary font-semibold">
                {totalItemsCount} {totalItemsCount === 1 ? 'ITEM' : 'ITEMS'}{' '}
                {isDraftMode ? 'IN DRAFT' : 'IN ORDER'}
              </AppText>
            </View>
            <View className="flex-row items-center">
              <AppText variant="caption" className="text-text-secondary font-semibold">
                TOTAL:{' '}
              </AppText>
              <AppText variant="label" className="text-text font-bold text-lg">
                UGX {totalAmount.toLocaleString()}
              </AppText>
            </View>
          </View>

          {isDraftMode ? (
            <View className="flex-row items-center">
              <View className="flex-1 mr-2">
                <Button
                  label="Clear Draft"
                  variant="secondary"
                  disabled={isSubmitting}
                  onPress={handleClearDraft}
                  leftIcon={<TrashIcon color={colors.error} size={18} />}
                />
              </View>

              <View className="flex-1">
                <Button
                  label={`Submit Order (${draftItemsCount})`}
                  variant="primary"
                  disabled={isSubmitting || draftItemsCount === 0}
                  loading={isSubmitting}
                  onPress={handleSubmitDraft}
                  leftIcon={<PaperAirplaneIcon color={colors.onPrimary} size={18} />}
                />
              </View>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="flex-1 mr-2">
                <Button
                  label="Cancel Order"
                  variant="secondary"
                  onPress={handleDeleteEntireOrder}
                  leftIcon={<TrashIcon color={colors.error} size={18} />}
                />
              </View>

              <View className="flex-1">
                <Button
                  label="Confirm & Pay"
                  variant="primary"
                  onPress={handlePay}
                  loading={isResolvingOrder}
                  leftIcon={<CreditCardIcon color={colors.onPrimary} size={18} />}
                />
              </View>
            </View>
          )}
        </View>
      ) : null}
    </ScreenTemplate>
  );
};
