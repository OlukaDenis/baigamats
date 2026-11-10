import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from 'react-native-heroicons/outline';
import {
  BanknotesIcon,
  FireIcon,
} from 'react-native-heroicons/solid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order, Table } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { formatUGX } from '@horeca/utils/currency';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { Select, type SelectOption } from '@horeca/components/molecules/Select';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { TableCard } from '@horeca/components/organisms/TableCard';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useFloorTables } from '../hooks/useFloorTables';
import { useTableCategories } from '../hooks/useTableCategories';
import { useOpenOrders } from '../../orders/hooks/useOpenOrders';

const TABLE_STATUSES = ['occupied', 'available', 'reserved', 'dirty'] as const;

interface FloorPlanScreenProps {
  onOpenOrder: (table: Table) => void;
  onOrdersPress?: () => void;
  onOpenKitchen?: () => void;
  onOpenShift?: () => void;
  onLockTerminal: () => void;
}

export const FloorPlanScreen: React.FC<FloorPlanScreenProps> = ({
  onOpenOrder,
  onOrdersPress,
  onOpenKitchen,
  onOpenShift,
  onLockTerminal,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Fetch tables from /tables with offline fallback & SQLite observable
  const {
    tables,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
    isOnline,
  } = useFloorTables();
  const { categories, refetch: refetchCategories } = useTableCategories();
  const { refetch: refetchOrders, orders } = useOpenOrders();

  const activeTableId = useHorecaStore(state => state.activeTableId);
  const setActiveTableId = useHorecaStore(state => state.setActiveTableId);
  const setActiveOrderId = useHorecaStore(state => state.setActiveOrderId);
  const draftOrdersByTable = useHorecaStore(state => state.draftOrdersByTable);

  // Pre-index open orders by table_id for O(1) lookups during card rendering
  const openOrdersByTable = useMemo(() => {
    const map = new Map<string, Order>();
    Object.values(orders).forEach(o => {
      if (o.table_id && o.status === 'open') {
        map.set(o.table_id, o);
      }
    });
    return map;
  }, [orders]);

  const handleTablePress = useCallback(
    (tbl: Table) => {
      setActiveTableId(tbl.id);

      // Check if table already has an active open order in our pre-indexed map
      const existingOrder = openOrdersByTable.get(tbl.id);
      setActiveOrderId(existingOrder?.id ?? null);

      // Navigate directly to table menu to add/manage order items and submit in one call
      onOpenOrder(tbl);
    },
    [openOrdersByTable, onOpenOrder, setActiveOrderId, setActiveTableId],
  );

  // Pull-to-refresh handler
  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchCategories().catch(() => undefined),
        refetchOrders(),
      ]);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch, refetchCategories, refetchOrders]);

  const sectionOptions = useMemo<SelectOption[]>(() => {
    const source =
      categories.length > 0
        ? categories.map(c => ({ name: c.name.trim(), count: c.count }))
        : Array.from(
          tables.reduce((acc, t) => {
            const name = (t.section || '').trim();
            if (name) acc.set(name, (acc.get(name) ?? 0) + 1);
            return acc;
          }, new Map<string, number>()),
          ([name, count]) => ({ name, count }),
        );
    return [
      { label: 'All', value: 'All', hint: String(tables.length) },
      ...source.map(c => ({ label: c.name, value: c.name, hint: String(c.count) })),
    ];
  }, [categories, tables]);

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { label: 'All statuses', value: 'all', hint: String(tables.length) },
      ...TABLE_STATUSES.map(s => ({
        label: s.charAt(0).toUpperCase() + s.slice(1),
        value: s,
        hint: String(tables.filter(t => t.status === s).length),
      })),
    ],
    [tables],
  );

  const filteredTables = useMemo(() => {
    return tables.filter(tbl => {
      const sectionOk =
        selectedSection === 'All' ||
        (tbl.section || '').toLowerCase() === selectedSection.toLowerCase();
      const statusOk = selectedStatus === 'all' || tbl.status === selectedStatus;
      return sectionOk && statusOk;
    });
  }, [tables, selectedSection, selectedStatus]);

  const renderTableCard = useCallback(
    ({ item }: { item: Table }) => {
      const tableOrder = openOrdersByTable.get(item.id);
      const draftOrder = draftOrdersByTable[item.id];
      const draftTotal = draftOrder
        ? draftOrder.items.reduce((sum, it) => sum + it.unit_price * it.qty, 0)
        : 0;
      const tabAmount =
        tableOrder && tableOrder.total_amount > 0
          ? `UGX ${formatUGX(tableOrder.total_amount)}`
          : draftTotal > 0
            ? `Draft • UGX ${formatUGX(draftTotal)}`
            : undefined;

      return (
        <TableCard
          table={item}
          isSelected={item.id === activeTableId}
          currentTabAmount={tabAmount}
          onPress={handleTablePress}
        />
      );
    },
    [openOrdersByTable, draftOrdersByTable, activeTableId, handleTablePress],
  );

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaAppBar
          title="Home"
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
        />
      }
      contentContainerClassName="flex-1"
    >
      {/* Offline Mode Indicator Banner */}
      {!isOnline ? (
        <View className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <ExclamationTriangleIcon color={colors.warning ?? '#f59e0b'} size={15} />
            <AppText variant="caption" className="ml-1.5 font-semibold text-amber-600 dark:text-amber-400 text-xs">
              Offline Mode • Showing saved tables
            </AppText>
          </View>
          <Badge label="OFFLINE" variant="reserved" size="sm" />
        </View>
      ) : null}

      {/* Quick Actions: Kitchen & Shift */}
      <View className="flex-row px-4 pt-3 pb-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Kitchen Display"
          onPress={onOpenKitchen}
          className="flex-1 mr-2 flex-row items-center rounded-horeca border border-border bg-surface p-3 active:opacity-80"
        >
          <View className="h-10 w-10 rounded-full bg-primary items-center justify-center mr-3">
            <FireIcon color="#FFFFFF" size={20} />
          </View>
          <View className="flex-1">
            <AppText variant="label" className="font-bold text-text">
              Kitchen
            </AppText>
            <AppText variant="caption" className="text-[11px] text-text-secondary">
              View KDS tickets
            </AppText>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Shift Management"
          onPress={onOpenShift}
          className="flex-1 flex-row items-center rounded-horeca border border-border bg-surface p-3 active:opacity-80"
        >
          <View className="h-10 w-10 rounded-full bg-primary items-center justify-center mr-3">
            <BanknotesIcon color="#FFFFFF" size={20} />
          </View>
          <View className="flex-1">
            <AppText variant="label" className="font-bold text-text">
              Shift
            </AppText>
            <AppText variant="caption" className="text-[11px] text-text-secondary">
              Cash & drawer
            </AppText>
          </View>
        </Pressable>
      </View>

      {/* Category & Status Filters (offline, client-side) */}
      <View className="px-4 py-2.5 border-b border-border/40">
        <AppText variant="label" className="text-xs font-bold uppercase text-text-secondary mb-2">
          Filters
        </AppText>
        <View className="flex-row">
          <Select
            className="flex-1 mr-2"
            label="Table category"
            options={sectionOptions}
            value={selectedSection}
            onChange={setSelectedSection}
          />
          <Select
            className="flex-1"
            label="Table status"
            options={statusOptions}
            value={selectedStatus}
            onChange={setSelectedStatus}
          />
        </View>
      </View>

      {/* Tables Loading / Error / Content */}
      {isLoading && tables.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" className="mt-4 text-text-secondary font-medium">
            Loading floor tables...
          </AppText>
        </View>
      ) : isError && tables.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={() => 'error'}
          renderItem={() => null}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing || isRefetching}
              onRefresh={handlePullRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center">
              <AppText variant="title" className="text-error font-bold mb-2">
                Unable to load tables
              </AppText>
              <AppText variant="caption" className="text-text-secondary text-center mb-4">
                {error?.message || 'Check your internet connection and pull down to retry.'}
              </AppText>
              <Button
                label="Retry"
                variant="primary"
                size="sm"
                onPress={handlePullRefresh}
                leftIcon={<ArrowPathIcon color={colors.onPrimary} size={14} />}
              />
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredTables}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={renderTableCard}
          maxToRenderPerBatch={10}
          windowSize={7}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing || isRefetching}
              onRefresh={handlePullRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <AppText variant="caption" className="text-text-secondary">
                No tables match the selected filters
              </AppText>
            </View>
          }
          contentContainerStyle={{
            padding: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenTemplate>
  );
};
