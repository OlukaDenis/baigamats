import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import {
  ArrowPathIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MenuItem, Order } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { SearchBar } from '@horeca/components/molecules/SearchBar';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useMenu } from '../hooks/useMenu';
import { useOpenOrders } from '../hooks/useOpenOrders';

interface TableDetailsScreenProps {
  onViewOrder: () => void;
  onBack: () => void;
  onLockTerminal: () => void;
  onProfilePress?: () => void;
}

const ALL = 'all';
const DEFAULT_PARTY_SIZE = 2;

/**
 * Table details: shows the menu for the selected table and lets staff add
 * items to the table's order. The first item added creates a dine-in order.
 */
export const TableDetailsScreen: React.FC<TableDetailsScreenProps> = ({
  onViewOrder,
  onBack,
  onLockTerminal,
  onProfilePress,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const { categories, menuItems, isLoading, isError, refetch } = useMenu();
  const { refetch: refetchOrders } = useOpenOrders();

  const tables = useHorecaStore(state => state.tables);
  const orders = useHorecaStore(state => state.orders);
  const activeTableId = useHorecaStore(state => state.activeTableId);
  const isOnline = useHorecaStore(state => state.isOnline);
  const setActiveOrderId = useHorecaStore(state => state.setActiveOrderId);
  const createOrderOptimistic = useHorecaStore(state => state.createOrderOptimistic);
  const addItemOptimistic = useHorecaStore(state => state.addItemOptimistic);
  const updateItemQtyOptimistic = useHorecaStore(state => state.updateItemQtyOptimistic);

  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const table = tables.find(t => t.id === activeTableId);

  const currentOrder: Order | undefined = useMemo(
    () =>
      Object.values(orders).find(
        o => o.table_id === activeTableId && o.status === 'open',
      ),
    [orders, activeTableId],
  );

  // Point the order screen at this table's order (or nothing if there is none)
  useEffect(() => {
    setActiveOrderId(currentOrder?.id ?? null);
  }, [currentOrder?.id, setActiveOrderId]);

  const orderItems = currentOrder?.items ?? [];
  const totalCount = orderItems.reduce((sum, it) => sum + it.qty, 0);
  const totalAmount = currentOrder?.total_amount ?? 0;

  // Quantity per menu item for plain (no modifiers / notes) lines
  const lineByMenuItem = useMemo(() => {
    const map = new Map<string, { id: string; qty: number }>();
    orderItems.forEach(it => {
      if (!(it.modifiers?.length) && !it.notes) {
        map.set(it.menu_item_id, { id: it.id, qty: it.qty });
      }
    });
    return map;
  }, [orderItems]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source =
      selectedCategory === ALL
        ? menuItems
        : (categories.find(c => c.id === selectedCategory)?.items ?? []);
    return source.filter(
      it => it.is_active !== false && (!query || it.name.toLowerCase().includes(query)),
    );
  }, [categories, menuItems, selectedCategory, search]);

  const handleAdd = useCallback(
    (item: MenuItem) => {
      if (!activeTableId) return;
      const line = lineByMenuItem.get(item.id);
      if (currentOrder && line) {
        updateItemQtyOptimistic(currentOrder.id, line.id, 1);
        return;
      }
      const order =
        currentOrder ??
        createOrderOptimistic({
          tableId: activeTableId,
          orderType: 'dine_in',
          partySize: DEFAULT_PARTY_SIZE,
        });
      addItemOptimistic(order.id, item, 1);
    },
    [
      activeTableId,
      addItemOptimistic,
      createOrderOptimistic,
      currentOrder,
      lineByMenuItem,
      updateItemQtyOptimistic,
    ],
  );

  const handleRemove = useCallback(
    (item: MenuItem) => {
      const line = lineByMenuItem.get(item.id);
      if (currentOrder && line) {
        updateItemQtyOptimistic(currentOrder.id, line.id, -1);
      }
    },
    [currentOrder, lineByMenuItem, updateItemQtyOptimistic],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchOrders()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refetchOrders]);

  const renderItem = ({ item }: { item: MenuItem }) => {
    const qty = lineByMenuItem.get(item.id)?.qty ?? 0;
    return (
      <View
        className={`flex-row items-center p-3.5 mb-2.5 rounded-2xl border ${
          qty > 0 ? 'bg-primary/5 border-primary/40' : 'bg-surface border-border'
        }`}
      >
        <View className="h-12 w-12 rounded-xl bg-background border border-border items-center justify-center mr-3.5">
          <AppText className="text-xl">{item.station === 'bar' ? '🍸' : '🍲'}</AppText>
        </View>

        <View className="flex-1 mr-2">
          <AppText variant="label" className="font-bold text-text" numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText variant="caption" className="text-text-secondary">
            {item.station === 'bar' ? 'Bar' : 'Kitchen'}
          </AppText>
          <AppText variant="label" className="text-primary font-bold mt-1">
            UGX {item.price.toLocaleString()}
          </AppText>
        </View>

        {qty > 0 ? (
          <View className="flex-row items-center bg-background border border-border rounded-xl p-0.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Decrease ${item.name}`}
              onPress={() => handleRemove(item)}
              className="h-9 w-9 items-center justify-center rounded-lg bg-surface active:bg-primary/10"
            >
              <MinusIcon color={colors.onSurface} size={16} />
            </Pressable>
            <AppText className="w-8 text-center font-bold text-sm text-text">{qty}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Increase ${item.name}`}
              onPress={() => handleAdd(item)}
              className="h-9 w-9 items-center justify-center rounded-lg bg-primary active:opacity-80"
            >
              <PlusIcon color={colors.onPrimary} size={16} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name}`}
            onPress={() => handleAdd(item)}
            className="h-10 w-10 rounded-xl bg-primary items-center justify-center active:opacity-80"
          >
            <PlusIcon color={colors.onPrimary} size={20} />
          </Pressable>
        )}
      </View>
    );
  };

  const categoryTabs = [{ id: ALL, name: 'All' }, ...categories.map(c => ({ id: c.id, name: c.name }))];

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaSubAppBar
          title={table ? `Table ${table.table_number}` : 'Table'}
          onBack={onBack}
          ordersCount={totalCount}
          onOrdersPress={onViewOrder}
        />
      }
      contentContainerClassName="flex-1"
    >
      {table ? (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surface/70 border-b border-border/40">
          <AppText variant="caption" className="text-text-secondary font-semibold">
            {currentOrder ? `Order ${currentOrder.order_number}` : 'No open order yet'}
          </AppText>
          <Badge
            label={table.status.toUpperCase()}
            variant={table.status}
            size="sm"
          />
        </View>
      ) : null}

      <View className="px-4 pt-3">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search menu..." />
      </View>

      <View className="py-2.5">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {categoryTabs.map(cat => {
            const isActive = cat.id === selectedCategory;
            return (
              <Pressable
                key={cat.id}
                accessibilityRole="button"
                accessibilityLabel={`Category ${cat.name}`}
                onPress={() => setSelectedCategory(cat.id)}
                className={`mr-2 px-3.5 py-1.5 rounded-xl border ${
                  isActive ? 'bg-primary border-primary' : 'bg-surface border-border'
                }`}
              >
                <AppText
                  variant="label"
                  className={`text-xs font-semibold ${isActive ? 'text-on-primary' : 'text-text'}`}
                >
                  {cat.name}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body" className="mt-4 text-text-secondary font-medium">
            Loading menu...
          </AppText>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center p-6">
          <AppText variant="title" className="text-error font-bold mb-2">
            Unable to load menu
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-center mb-4">
            Check your connection and try again.
          </AppText>
          <Button
            label="Retry"
            variant="primary"
            size="sm"
            onPress={handleRefresh}
            leftIcon={<ArrowPathIcon color={colors.onPrimary} size={14} />}
          />
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <AppText variant="caption" className="text-text-secondary">
                No menu items found
              </AppText>
            </View>
          }
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 4,
            paddingBottom: Math.max(insets.bottom, 12) + (totalCount > 0 ? 96 : 16),
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating order summary: tap to open the order */}
      {totalCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View order, ${totalCount} items, UGX ${totalAmount.toLocaleString()}`}
          onPress={onViewOrder}
          style={{ bottom: Math.max(insets.bottom, 12) + 8 }}
          className="absolute left-4 right-4 rounded-2xl bg-primary p-3.5 shadow-xl flex-row items-center justify-between active:opacity-90"
        >
          <View className="flex-row items-center">
            <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center mr-3">
              <ShoppingBagIcon color={colors.onPrimary} size={20} />
            </View>
            <View>
              <AppText variant="label" className="text-on-primary font-bold">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} • View order
              </AppText>
              <AppText variant="caption" className="text-on-primary/80">
                UGX {totalAmount.toLocaleString()}
              </AppText>
            </View>
          </View>
          <ChevronRightIcon color={colors.onPrimary} size={20} />
        </Pressable>
      ) : null}
    </ScreenTemplate>
  );
};
