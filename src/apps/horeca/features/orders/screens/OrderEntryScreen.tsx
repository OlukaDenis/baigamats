import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import {
  CreditCardIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order, OrderItem } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { syncEngine } from '@horeca/db/syncEngine';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useOpenOrders } from '../hooks/useOpenOrders';

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
  onProfilePress?: () => void;
  onBack?: () => void;
}

export const OrderEntryScreen: React.FC<OrderEntryScreenProps> = ({
  orderId: propOrderId,
  onPayNow,
  onKitchenFire,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();
  const { isLoading, isFetching, refetch } = useOpenOrders();
  const [isResolvingOrder, setIsResolvingOrder] = useState(false);

  const activeTableId = useHorecaStore(state => state.activeTableId);
  const tables = useHorecaStore(state => state.tables);
  const orders = useHorecaStore(state => state.orders);
  const activeOrderId = useHorecaStore(state => state.activeOrderId);
  const setActiveOrderId = useHorecaStore(state => state.setActiveOrderId);
  const setActiveTableId = useHorecaStore(state => state.setActiveTableId);
  const removeItemOptimistic = useHorecaStore(state => state.removeItemOptimistic);
  const updateItemQtyOptimistic = useHorecaStore(state => state.updateItemQtyOptimistic);
  const deleteOrderOptimistic = useHorecaStore(state => state.deleteOrderOptimistic);

  // Always call GET /orders?mine=true&status=open when entering the order screen
  useEffect(() => {
    let mounted = true;
    (async () => {
      await syncEngine.processOutbox();
      if (mounted) {
        await refetch();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refetch]);

  const openOrdersList = useMemo(
    () => Object.values(orders).filter(o => o.status === 'open'),
    [orders],
  );

  const currentOrder = useMemo(() => {
    // 0. Prefer propOrderId if passed
    if (propOrderId && orders[propOrderId]) {
      return orders[propOrderId];
    }

    // 1. Prefer server-persisted open order for activeOrderId
    if (activeOrderId && orders[activeOrderId] && orders[activeOrderId].status === 'open') {
      if (!activeOrderId.startsWith('temp-ord-')) {
        return orders[activeOrderId];
      }
      // Check if a server order for the same table already arrived
      const tempTableId = orders[activeOrderId].table_id;
      const serverMatch = openOrdersList.find(
        o => !o.id.startsWith('temp-ord-') && o.table_id && o.table_id === tempTableId,
      );
      if (serverMatch) {
        return serverMatch;
      }
    }

    // 2. Prefer server-persisted open order matching activeTableId
    const serverTableOrder = openOrdersList.find(
      o => !o.id.startsWith('temp-ord-') && o.table_id === activeTableId,
    );
    if (serverTableOrder) {
      return serverTableOrder;
    }

    // 3. Any open order matching activeTableId or activeOrderId
    const anyTableOrder = openOrdersList.find(o => o.table_id === activeTableId);
    if (anyTableOrder) {
      return anyTableOrder;
    }
    if (activeOrderId && orders[activeOrderId] && orders[activeOrderId].status === 'open') {
      return orders[activeOrderId];
    }

    // 4. Fallback to the current user's first open order (preferring server order)
    const firstServerOpen = openOrdersList.find(o => !o.id.startsWith('temp-ord-'));
    return firstServerOpen ?? openOrdersList[0] ?? EMPTY_ORDER;
  }, [propOrderId, activeOrderId, activeTableId, openOrdersList, orders]);

  // Keep activeOrderId in sync with the resolved open order
  useEffect(() => {
    if (currentOrder.id && currentOrder.id !== activeOrderId) {
      setActiveOrderId(currentOrder.id);
    }
  }, [currentOrder.id, activeOrderId, setActiveOrderId]);

  const activeTable =
    tables.find(t => t.id === (currentOrder.table_id ?? activeTableId)) ?? tables[0];

  const orderItems: OrderItem[] = currentOrder.items ?? [];
  const totalItemsCount = orderItems.reduce((sum, it) => sum + it.qty, 0);
  const totalAmount =
    currentOrder.total_amount && currentOrder.total_amount > 0
      ? currentOrder.total_amount
      : orderItems.reduce((sum, it) => sum + it.unit_price * it.qty, 0);

  const isBilled = currentOrder.status === 'billed';

  const handleDeleteEntireOrder = () => {
    if (!currentOrder.id) return;
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel Order ${currentOrder.order_number}? This will remove all items and make Table ${activeTable?.table_number ?? ''} available.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            deleteOrderOptimistic(currentOrder.id);
            try {
              await syncEngine.processOutbox();
              await refetch();
            } catch {
              // Synced in background
            }
            Alert.alert('Order Cancelled', `Order ${currentOrder.order_number} has been cancelled.`);
            onBack?.();
          },
        },
      ],
    );
  };

  const handlePay = async () => {
    if (orderItems.length === 0 && totalAmount <= 0) {
      Alert.alert('Empty Order', 'Please add items to the order before proceeding to checkout.');
      return;
    }

    let resolvedOrderId = currentOrder.id;

    // If order is still a temp ID or missing, flush outbox and refetch open orders
    if (!resolvedOrderId || resolvedOrderId.startsWith('temp-ord-')) {
      setIsResolvingOrder(true);
      try {
        await syncEngine.processOutbox();
        const refreshedOrders = await refetch();
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
      Alert.alert(
        'Order Not Ready',
        'Could not find an active open order ID. Please refresh and try again.',
      );
      return;
    }

    setActiveOrderId(resolvedOrderId);
    onPayNow(resolvedOrderId, totalAmount);
  };

  const renderOrderItemRow = ({ item }: { item: OrderItem }) => {
    const lineTotal = item.unit_price * item.qty;

    return (
      <View className="p-3.5 mb-2.5 rounded-2xl bg-surface border border-border shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-2">
            <AppText variant="label" className="font-bold text-text" numberOfLines={1}>
              {item.item_name}
            </AppText>
            <AppText variant="caption" className="text-text-secondary text-[11px]">
              UGX {item.unit_price.toLocaleString()} each • {item.station?.toUpperCase()}
            </AppText>
          </View>
          <AppText variant="label" className="text-primary font-bold text-base">
            UGX {lineTotal.toLocaleString()}
          </AppText>
        </View>

        {item.modifiers && item.modifiers.length > 0 ? (
          <View className="flex-row flex-wrap mb-2">
            {item.modifiers.map((mod, i) => (
              <View key={i} className="mr-1.5 mb-1 px-2 py-0.5 rounded-md bg-background border border-border">
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
          <View className="flex-row items-center bg-background border border-border rounded-xl p-0.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              onPress={() => updateItemQtyOptimistic(currentOrder.id, item.id, -1)}
              className="h-8 w-8 items-center justify-center rounded-lg bg-surface active:bg-primary/10"
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
              className="h-8 w-8 items-center justify-center rounded-lg bg-surface active:bg-primary/10"
            >
              <PlusIcon color={colors.onSurface} size={14} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.item_name}`}
            onPress={() => removeItemOptimistic(currentOrder.id, item.id)}
            className="h-8 px-2.5 rounded-lg bg-error/10 border border-error/20 flex-row items-center justify-center active:opacity-70"
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
          title="Order Details"
          onBack={onBack}
          ordersCount={totalItemsCount}
        />
      }
      contentContainerClassName="flex-1"
    >
      {/* Table Context Banner */}
      <View className="flex-row items-center justify-between px-4 py-2.5 bg-surface/70 border-b border-border/40">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="h-9 w-9 rounded-xl bg-primary/10 items-center justify-center mr-2.5">
            <AppText variant="label" className="font-bold text-primary">
              T{activeTable?.table_number ?? '01'}
            </AppText>
          </View>
          <View className="flex-1">
            <AppText variant="label" className="font-bold text-text" numberOfLines={1}>
              Table {activeTable?.table_number ?? '01'} • {activeTable?.section ?? 'Main Dining'}
            </AppText>
            <View className="flex-row items-center">
              <AppText variant="caption" className="text-text-secondary text-[11px]">
                Order {currentOrder.order_number} • {currentOrder.party_size ?? 2} Guests
              </AppText>
              {isFetching ? (
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
          <View className="items-end mr-2">
            <AppText variant="caption" className="text-[10px] text-text-secondary font-semibold uppercase">
              Total
            </AppText>
            <AppText variant="label" className="text-primary font-bold">
              UGX {totalAmount.toLocaleString()}
            </AppText>
          </View>

          {!isBilled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel Entire Order"
              onPress={handleDeleteEntireOrder}
              className="h-8 w-8 rounded-xl bg-error/10 border border-error/20 items-center justify-center active:opacity-70"
              hitSlop={6}
            >
              <TrashIcon color={colors.error} size={16} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Order Items List */}
      <View className="flex-1">
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
            isLoading ? (
              <View className="py-16 items-center justify-center">
                <ActivityIndicator size="large" color={colors.primary} />
                <AppText variant="body" className="text-text-secondary font-medium mt-3">
                  Loading open order...
                </AppText>
              </View>
            ) : (
              <View className="py-16 items-center justify-center">
                <View className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-3">
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
      </View>

      {/* Bottom Sticky Order Ticket Bar (Only shown for open orders; hidden when billed/paid) */}
      {!isBilled ? (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 6 }}
          className="absolute left-0 right-0 bottom-0 bg-surface/95 border-t border-border px-4 pt-3 shadow-2xl"
        >
          {/* Ticket Summary Line */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="h-2 w-2 rounded-full bg-status-available mr-1.5" />
              <AppText variant="caption" className="text-text-secondary font-semibold">
                {totalItemsCount} {totalItemsCount === 1 ? 'ITEM' : 'ITEMS'} IN ORDER
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

          {/* Dual Actions: Cancel Order & Confirm & Pay */}
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
        </View>
      ) : null}
    </ScreenTemplate>
  );
};
