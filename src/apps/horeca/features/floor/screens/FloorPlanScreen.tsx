import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from 'react-native';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Table } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaColors } from '@horeca/theme/colors';
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
  onLockTerminal: () => void;
  onProfilePress?: () => void;
}

export const FloorPlanScreen: React.FC<FloorPlanScreenProps> = ({
  onOpenOrder,
  onOrdersPress,
  onLockTerminal,
  onProfilePress,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // Fetch tables from /tables with offline fallback
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

  // Options come from GET /v1/tables/categories (cached offline); fall back to
  // categories derived from the downloaded tables if none have been fetched yet.
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

  const filteredTables = tables.filter(tbl => {
    const sectionOk =
      selectedSection === 'All' ||
      (tbl.section || '').toLowerCase() === selectedSection.toLowerCase();
    const statusOk = selectedStatus === 'all' || tbl.status === selectedStatus;
    return sectionOk && statusOk;
  });

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const occupancyPercent =
    totalCapacity > 0 && tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0;

  const renderTableCard = ({ item }: { item: Table }) => {
    const tableOrder = Object.values(orders).find(
      o => o.table_id === item.id && o.status === 'open',
    );
    const tabAmount =
      tableOrder && tableOrder.total_amount > 0
        ? `UGX ${tableOrder.total_amount.toLocaleString()}`
        : undefined;

    return (
      <TableCard
        table={item}
        isSelected={item.id === activeTableId}
        currentTabAmount={tabAmount}
        onPress={tbl => {
          setActiveTableId(tbl.id);
          onOpenOrder(tbl);
        }}
      />
    );
  };

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaAppBar
          title="Floor Plan"
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
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

      {/* Category & Status Filters (offline, client-side) */}
      <View className="flex-row px-4 py-2.5 border-b border-border/40">
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

      {/* Live Floor Stats Overview Bar */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-surface/60 border-b border-border/40">
        <View className="flex-row items-center">
          <View className="h-2 w-2 rounded-full bg-primary mr-1.5" />
          <AppText variant="caption" className="text-text-secondary font-semibold text-[11px]">
            OCCUPANCY:{' '}
          </AppText>
          <AppText variant="caption" className="text-text font-bold text-[11px]">
            {occupancyPercent}% ({occupiedCount}/{tables.length})
          </AppText>
        </View>
        <View className="flex-row items-center">
          <AppText variant="caption" className="text-text-secondary font-semibold text-[11px]">
            TABS:{' '}
          </AppText>
          <AppText variant="caption" className="text-primary font-bold text-[11px]">
            UGX 1,280,000
          </AppText>
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
