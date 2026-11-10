import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import {
  ChevronLeftIcon,
  ClockIcon,
  DocumentCheckIcon,
  ShoppingBagIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { Order } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { syncEngine } from '@horeca/db/syncEngine';
import { HORECA_TABLES_QUERY_KEY } from '@horeca/features/floor/hooks/useFloorTables';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { SearchBar } from '@horeca/components/molecules/SearchBar';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { OrderCard } from '@horeca/components/organisms/OrderCard';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { useOpenOrders } from '../hooks/useOpenOrders';

interface OrdersListScreenProps {
  onSelectOrder: (order: Order) => void;
  onLockTerminal: () => void;
  onNewOrderPress?: () => void;
  onBack?: () => void;
}

type StatusTab = 'open' | 'billed';

export const OrdersListScreen: React.FC<OrdersListScreenProps> = ({
  onSelectOrder,
  onLockTerminal,
  onNewOrderPress,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();
  const queryClient = useQueryClient();

  const tables = useHorecaStore(state => state.tables);
  const deleteOrderOptimistic = useHorecaStore(state => state.deleteOrderOptimistic);
  const { orders, isLoading, isFetching, refetch } = useOpenOrders();

  const [activeStatusTab, setActiveStatusTab] = useState<StatusTab>('open');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await syncEngine.processOutbox();
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const allOrdersList = useMemo(() => {
    return Object.values(orders);
  }, [orders]);

  const openOrders = useMemo(() => {
    return allOrdersList.filter(o => o.status === 'open');
  }, [allOrdersList]);

  const billedOrders = useMemo(() => {
    return allOrdersList.filter(o => o.status === 'billed' || o.status === 'paid');
  }, [allOrdersList]);

  const currentTabOrders = useMemo(() => {
    return activeStatusTab === 'open' ? openOrders : billedOrders;
  }, [activeStatusTab, openOrders, billedOrders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return currentTabOrders.filter(ord => {
      if (!q) return true;

      const orderNumMatch = ord.order_number?.toLowerCase().includes(q);
      const tabMatch = ord.tab_name?.toLowerCase().includes(q);
      const tableMatch = tables
        .find(t => t.id === ord.table_id)
        ?.table_number?.toLowerCase()
        .includes(q);

      return orderNumMatch || tabMatch || tableMatch;
    });
  }, [currentTabOrders, search, tables]);

  const totalTabAmount = useMemo(() => {
    return currentTabOrders.reduce((sum, ord) => {
      const itemsSum = (ord.items ?? []).reduce((s, it) => s + it.unit_price * it.qty, 0);
      return sum + (ord.total_amount > 0 ? ord.total_amount : itemsSum);
    }, 0);
  }, [currentTabOrders]);

  const handleCancelOrder = useCallback(
    (ord: Order) => {
      appModal.confirm({
        title: 'Cancel Order',
        message: `Are you sure you want to cancel Order ${ord.order_number}? This will remove it and free up the table.`,
        confirmText: 'Cancel Order',
        cancelText: 'Keep Order',
        isDestructive: true,
        onConfirm: async () => {
          const isOnline = useHorecaStore.getState().isOnline;
          const isOfflineTempOrder = ord.id.startsWith('temp-ord-');

          if (!isOfflineTempOrder && isOnline) {
            try {
              await horecaApi.cancelOrder(ord.id);
              deleteOrderOptimistic(ord.id, { skipOutbox: true });
              await refetch();
              queryClient.invalidateQueries({ queryKey: HORECA_TABLES_QUERY_KEY }).catch(() => {});
              return;
            } catch (err: any) {
              if (err?.response) {
                const msg =
                  err?.response?.data?.message ||
                  err?.message ||
                  'Unable to cancel this order.';
                appModal.error('Cancel Order Failed', msg);
                return;
              }
            }
          }

          deleteOrderOptimistic(ord.id);
          try {
            await syncEngine.processOutbox();
            await refetch();
            queryClient.invalidateQueries({ queryKey: HORECA_TABLES_QUERY_KEY }).catch(() => {});
          } catch {
            // Handled by sync engine
          }
        },
      });
    },
    [deleteOrderOptimistic, queryClient, refetch],
  );

  const renderOrderCard = useCallback(
    ({ item }: { item: Order }) => {
      const table = tables.find(t => t.id === item.table_id);
      return (
        <OrderCard
          order={item}
          table={table}
          onPress={onSelectOrder}
          onCancel={handleCancelOrder}
        />
      );
    },
    [tables, onSelectOrder, handleCancelOrder],
  );

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaAppBar
          title="Orders"
          leftIcon={
            onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go Back"
                onPress={onBack}
                className="h-10 w-10 items-center justify-center rounded-none active:opacity-70"
                hitSlop={6}
              >
                <ChevronLeftIcon color={colors.onSurface} size={20} strokeWidth={2.75} />
              </Pressable>
            ) : undefined
          }
          onLockPress={onLockTerminal}
        />
      }
      contentContainerClassName="flex-1"
    >
      {/* 2 Tabs: Open and Billed */}
      <View className="flex-row p-1.5 mx-4 mt-3 mb-2 bg-surface border border-border rounded-horeca">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Orders Tab"
          onPress={() => setActiveStatusTab('open')}
          style={{
            backgroundColor: activeStatusTab === 'open' ? colors.primary : 'transparent',
          }}
          className="flex-1 py-2.5 rounded-horeca flex-row items-center justify-center"
        >
          <ClockIcon
            color={activeStatusTab === 'open' ? colors.onPrimary : colors.onSurfaceVariant}
            size={16}
            className="mr-1.5"
          />
          <AppText
            variant="label"
            style={{
              color: activeStatusTab === 'open' ? colors.onPrimary : colors.onSurface,
            }}
            className="font-bold text-sm ml-1"
          >
            Open ({openOrders.length})
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Billed Orders Tab"
          onPress={() => setActiveStatusTab('billed')}
          style={{
            backgroundColor: activeStatusTab === 'billed' ? colors.primary : 'transparent',
          }}
          className="flex-1 py-2.5 rounded-horeca flex-row items-center justify-center"
        >
          <DocumentCheckIcon
            color={activeStatusTab === 'billed' ? colors.onPrimary : colors.onSurfaceVariant}
            size={16}
            className="mr-1.5"
          />
          <AppText
            variant="label"
            style={{
              color: activeStatusTab === 'billed' ? colors.onPrimary : colors.onSurface,
            }}
            className="font-bold text-sm ml-1"
          >
            Billed ({billedOrders.length})
          </AppText>
        </Pressable>
      </View>

      {/* Overview Metric Banner for current tab */}
      <View className="px-4 py-2.5 bg-surface/80 border-b border-border/40 flex-row items-center justify-between">
        <View>
          <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-bold">
            {activeStatusTab === 'open' ? 'Active Open Orders' : 'Billed (Settled) Orders'}
          </AppText>
          <View className="flex-row items-center mt-0.5">
            <AppText variant="title" className="text-lg font-extrabold text-text mr-2">
              {currentTabOrders.length} {currentTabOrders.length === 1 ? 'Order' : 'Orders'}
            </AppText>
            {isFetching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
          </View>
        </View>

        <View className="items-end">
          <AppText variant="caption" className="text-text-secondary uppercase text-[10px] font-bold">
            Total Amount
          </AppText>
          <AppText variant="title" className="text-lg font-extrabold text-primary mt-0.5">
            UGX {totalTabAmount.toLocaleString()}
          </AppText>
        </View>
      </View>

      {/* Search Input */}
      <View className="px-4 pt-3 pb-2">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by order #, table, or tab..."
        />
      </View>

      {/* Orders List */}
      {isLoading && currentTabOrders.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" className="mt-4 text-text-secondary font-medium">
            Loading orders...
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={{
            padding: 14,
            paddingBottom: Math.max(insets.bottom, 12) + 80,
          }}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          windowSize={7}
          initialNumToRender={8}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View className="py-20 items-center justify-center px-4">
              <View className="h-16 w-16 rounded-horeca bg-primary/10 border border-primary/20 items-center justify-center mb-3">
                <ShoppingBagIcon color={colors.primary} size={32} />
              </View>
              <AppText variant="title" className="text-text font-bold mb-1">
                {search
                  ? 'No Matching Orders'
                  : activeStatusTab === 'open'
                    ? 'No Open Orders'
                    : 'No Billed Orders'}
              </AppText>
              <AppText variant="caption" className="text-text-secondary text-center max-w-xs mb-4">
                {search
                  ? 'Try searching with another keyword.'
                  : activeStatusTab === 'open'
                    ? 'All orders are currently settled or none have been placed yet.'
                    : 'Billed orders that have completed payment will appear here.'}
              </AppText>
              {activeStatusTab === 'open' && onNewOrderPress ? (
                <Button
                  label="Select Table & Place Order"
                  variant="primary"
                  size="sm"
                  onPress={onNewOrderPress}
                />
              ) : null}
            </View>
          }
        />
      )}
    </ScreenTemplate>
  );
};
