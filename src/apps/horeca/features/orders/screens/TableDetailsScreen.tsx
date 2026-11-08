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
  CheckCircleIcon,
  ChevronRightIcon,
  MinusIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShoppingBagIcon,
  UsersIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MenuItem, Order } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaAuthStore } from '@horeca/features/auth/store/horecaAuthStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { SearchBar } from '@horeca/components/molecules/SearchBar';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { MenuItemCard } from '@horeca/components/organisms/MenuItemCard';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { formatUGX } from '@horeca/utils/currency';
import { useMenu } from '../hooks/useMenu';
import { useOpenOrders } from '../hooks/useOpenOrders';
import { useSubmitTableOrder } from '../hooks/useSubmitTableOrder';

interface TableDetailsScreenProps {
  onViewOrder: (orderId?: string) => void;
  onOrdersPress?: () => void;
  onBack: () => void;
  onLockTerminal: () => void;
  onProfilePress?: () => void;
}

const ALL = 'all';
const DEFAULT_PARTY_SIZE = 2;

/**
 * Table details: shows the menu for the selected table, lets staff build & manage
 * a local draft cart of items with zero per-tap network latency, and submit the
 * entire order in one call (`POST /orders` with `items[]`).
 */
export const TableDetailsScreen: React.FC<TableDetailsScreenProps> = ({
  onViewOrder,
  onOrdersPress,
  onBack,
  onLockTerminal: _onLockTerminal,
  onProfilePress: _onProfilePress,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const { categories, menuItems, isLoading, isError, refetch } = useMenu();
  const { refetch: refetchOrders } = useOpenOrders();
  const { submitTableOrder, isSubmitting } = useSubmitTableOrder();

  const tables = useHorecaStore(state => state.tables);
  const orders = useHorecaStore(state => state.orders);
  const draftOrdersByTable = useHorecaStore(state => state.draftOrdersByTable);
  const activeTableId = useHorecaStore(state => state.activeTableId);
  const activeOrderId = useHorecaStore(state => state.activeOrderId);
  const setActiveOrderId = useHorecaStore(state => state.setActiveOrderId);
  const addDraftItem = useHorecaStore(state => state.addDraftItem);
  const updateDraftItemQty = useHorecaStore(state => state.updateDraftItemQty);
  const setDraftPartySize = useHorecaStore(state => state.setDraftPartySize);

  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const me = useHorecaAuthStore(state => state.me);

  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const table = useMemo(
    () => tables.find(t => t.id === activeTableId),
    [tables, activeTableId],
  );

  const currentOrder: Order | undefined = useMemo(() => {
    if (
      activeOrderId &&
      orders[activeOrderId] &&
      orders[activeOrderId].table_id === activeTableId &&
      orders[activeOrderId].status === 'open'
    ) {
      return orders[activeOrderId];
    }
    const tableOpenOrders = Object.values(orders)
      .filter(o => o.table_id === activeTableId && o.status === 'open')
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return tableOpenOrders[0];
  }, [orders, activeOrderId, activeTableId]);

  useEffect(() => {
    if (currentOrder?.id && currentOrder.id !== activeOrderId) {
      setActiveOrderId(currentOrder.id);
    }
  }, [currentOrder?.id, activeOrderId, setActiveOrderId]);

  const currentDraft = activeTableId ? draftOrdersByTable[activeTableId] : undefined;
  const draftItems = useMemo(() => currentDraft?.items ?? [], [currentDraft?.items]);
  const partySize =
    currentDraft?.partySize ??
    currentOrder?.party_size ??
    table?.capacity ??
    DEFAULT_PARTY_SIZE;

  const draftCount = useMemo(
    () => draftItems.reduce((sum, it) => sum + it.qty, 0),
    [draftItems],
  );
  const draftAmount = useMemo(
    () => draftItems.reduce((sum, it) => sum + it.unit_price * it.qty, 0),
    [draftItems],
  );

  const existingOrderItems = useMemo(() => currentOrder?.items ?? [], [currentOrder?.items]);
  const existingOrderCount = useMemo(
    () => existingOrderItems.reduce((sum, it) => sum + it.qty, 0),
    [existingOrderItems],
  );
  const existingOrderAmount = currentOrder?.total_amount ?? 0;

  // Map menu_item_id -> draft item id & total draft qty for MenuItemCard steppers
  const draftLineByMenuItem = useMemo(() => {
    const map = new Map<string, { id: string; qty: number }>();
    draftItems.forEach(it => {
      const prev = map.get(it.menu_item_id);
      if (prev) {
        map.set(it.menu_item_id, { id: it.id, qty: prev.qty + it.qty });
      } else {
        map.set(it.menu_item_id, { id: it.id, qty: it.qty });
      }
    });
    return map;
  }, [draftItems]);

  const hasAgeRestrictedInDraft = useMemo(
    () => draftItems.some(it => it.age_restricted),
    [draftItems],
  );

  const staffVerifierName =
    activeStaff?.name?.trim() || me?.name?.trim() || 'Verified Staff';

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source =
      selectedCategory === ALL
        ? menuItems
        : menuItems.filter(it => it.category_id === selectedCategory);
    return source.filter(it => !query || it.name.toLowerCase().includes(query));
  }, [menuItems, selectedCategory, search]);

  const handleAdd = useCallback(
    (item: MenuItem) => {
      if (!activeTableId || item.is_active === false || isSubmitting) return;
      addDraftItem(activeTableId, item, 1, {
        partySize,
        ageVerifiedBy: item.age_restricted ? staffVerifierName : null,
      });
    },
    [activeTableId, addDraftItem, isSubmitting, partySize, staffVerifierName],
  );

  const handleRemove = useCallback(
    (item: MenuItem) => {
      if (!activeTableId || isSubmitting) return;
      const draftLine = draftLineByMenuItem.get(item.id);
      if (draftLine) {
        updateDraftItemQty(activeTableId, draftLine.id, -1);
      }
    },
    [activeTableId, draftLineByMenuItem, isSubmitting, updateDraftItemQty],
  );

  const handlePartySizeChange = useCallback(
    (delta: number) => {
      if (!activeTableId) return;
      const next = Math.min(500, Math.max(1, partySize + delta));
      setDraftPartySize(activeTableId, next);
    },
    [activeTableId, partySize, setDraftPartySize],
  );

  const handleSubmitOrderNow = useCallback(async () => {
    if (!activeTableId || draftCount === 0 || isSubmitting) return;
    await submitTableOrder({
      tableId: activeTableId,
      partySize,
      onSuccess: createdOrder => {
        onViewOrder(createdOrder.id);
      },
    });
  }, [activeTableId, draftCount, isSubmitting, onViewOrder, partySize, submitTableOrder]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchOrders()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refetchOrders]);

  const renderItem = useCallback(
    ({ item }: { item: MenuItem }) => {
      const qty = draftLineByMenuItem.get(item.id)?.qty ?? 0;
      return (
        <MenuItemCard
          item={item}
          quantity={qty}
          disabled={isSubmitting}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      );
    },
    [draftLineByMenuItem, isSubmitting, handleAdd, handleRemove],
  );

  const categoryTabs = useMemo(
    () => [{ id: ALL, name: 'All' }, ...categories.map(c => ({ id: c.id, name: c.name }))],
    [categories],
  );

  const showBottomBar = draftCount > 0 || existingOrderCount > 0;

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaSubAppBar
          title={table ? `Table ${table.table_number}` : 'Table'}
          onBack={onBack}
          onOrdersPress={onOrdersPress}
        />
      }
      contentContainerClassName="flex-1"
    >
      {table ? (
        <View className="px-4 py-2 bg-surface/70 border-b border-border/40">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <AppText variant="caption" className="text-text-secondary font-semibold mr-2">
                {currentOrder
                  ? `Order ${currentOrder.order_number}`
                  : draftCount > 0
                    ? `Draft (${draftCount} ${draftCount === 1 ? 'item' : 'items'})`
                    : 'Select items & submit once'}
              </AppText>
              <Badge
                label={table.status.toUpperCase()}
                variant={table.status}
                size="sm"
              />
            </View>

            {/* Party Size Stepper */}
            <View className="flex-row items-center bg-background border border-border rounded-xl px-1.5 py-0.5">
              <UsersIcon color={colors.onSurfaceVariant} size={13} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease party size"
                onPress={() => handlePartySizeChange(-1)}
                className="h-6 w-6 items-center justify-center rounded-md active:bg-primary/10 ml-1"
                hitSlop={4}
              >
                <MinusIcon color={colors.onSurface} size={12} />
              </Pressable>
              <AppText variant="caption" className="text-text font-bold text-xs px-1.5">
                {partySize}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase party size"
                onPress={() => handlePartySizeChange(1)}
                className="h-6 w-6 items-center justify-center rounded-md active:bg-primary/10"
                hitSlop={4}
              >
                <PlusIcon color={colors.onSurface} size={12} />
              </Pressable>
            </View>
          </View>

          {hasAgeRestrictedInDraft ? (
            <View className="flex-row items-center mt-1.5 pt-1.5 border-t border-border/30">
              <CheckCircleIcon color={colors.statusAvailable} size={14} />
              <AppText variant="caption" className="text-text-secondary text-[11px] ml-1.5">
                18+ Age-restricted items verified by{' '}
                <AppText variant="caption" className="text-text font-bold text-[11px]">
                  {staffVerifierName}
                </AppText>
              </AppText>
            </View>
          ) : null}
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
          windowSize={7}
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
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
            paddingBottom: Math.max(insets.bottom, 12) + (showBottomBar ? 116 : 16),
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Sticky Bar: Single-Call Submit or View Active Order */}
      {draftCount > 0 ? (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) + 6 }}
          className="absolute left-0 right-0 bottom-0 bg-surface/95 border-t border-border px-4 pt-3 shadow-2xl"
        >
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center flex-1">
              <View className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 items-center justify-center mr-2">
                <ShoppingBagIcon color={colors.primary} size={16} />
              </View>
              <View className="flex-1 flex-row items-center justify-between">
                <AppText variant="label" className="text-text font-bold text-xs">
                  {draftCount} {draftCount === 1 ? 'item' : 'items'} selected
                </AppText>
                <AppText variant="caption" className="text-primary font-bold text-xs">
                  UGX {formatUGX(draftAmount)}
                </AppText>
              </View>
            </View>
          </View>

          <Button
            label={
              isSubmitting
                ? 'Submitting Order...'
                : `Submit Order (${draftCount}) • UGX ${formatUGX(draftAmount)}`
            }
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleSubmitOrderNow}
            leftIcon={<PaperAirplaneIcon color={colors.onPrimary} size={18} />}
          />
        </View>
      ) : existingOrderCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View order, ${existingOrderCount} items, UGX ${formatUGX(existingOrderAmount)}`}
          onPress={() => onViewOrder(currentOrder?.id)}
          style={{ bottom: Math.max(insets.bottom, 12) + 8 }}
          className="absolute left-4 right-4 rounded-2xl bg-primary p-3.5 shadow-xl flex-row items-center justify-between active:opacity-90"
        >
          <View className="flex-row items-center">
            <View className="h-10 w-10 rounded-xl bg-white/20 items-center justify-center mr-3">
              <ShoppingBagIcon color={colors.onPrimary} size={20} />
            </View>
            <View>
              <AppText variant="label" className="text-on-primary font-bold">
                {existingOrderCount} {existingOrderCount === 1 ? 'item' : 'items'} • View active order
              </AppText>
              <AppText variant="caption" className="text-on-primary/80">
                UGX {formatUGX(existingOrderAmount)}
              </AppText>
            </View>
          </View>
          <ChevronRightIcon color={colors.onPrimary} size={20} />
        </Pressable>
      ) : null}
    </ScreenTemplate>
  );
};
