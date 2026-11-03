import React, { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, View } from 'react-native';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  FireIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MenuItem, OrderItem } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { mockActiveOrder } from '@horeca/mock/horecaMockData';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { ItemCustomizerModal } from '../components/ItemCustomizerModal';

interface OrderEntryScreenProps {
  onPayNow: (orderTotal: number) => void;
  onKitchenFire: () => void;
  onLockTerminal: () => void;
  onProfilePress?: () => void;
  onBack?: () => void;
}

export const OrderEntryScreen: React.FC<OrderEntryScreenProps> = ({
  onPayNow,
  onKitchenFire,
  onLockTerminal,
  onProfilePress,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const categories = useHorecaStore(state => state.categories);
  const menuItems = useHorecaStore(state => state.menuItems);
  const activeTableId = useHorecaStore(state => state.activeTableId);
  const tables = useHorecaStore(state => state.tables);
  const orders = useHorecaStore(state => state.orders);
  const activeOrderId = useHorecaStore(state => state.activeOrderId);
  const addItemOptimistic = useHorecaStore(state => state.addItemOptimistic);
  const removeItemOptimistic = useHorecaStore(state => state.removeItemOptimistic);
  const updateItemQtyOptimistic = useHorecaStore(state => state.updateItemQtyOptimistic);
  const deleteOrderOptimistic = useHorecaStore(state => state.deleteOrderOptimistic);
  const isOnline = useHorecaStore(state => state.isOnline);

  const [activeView, setActiveView] = useState<'catalog' | 'order'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('cat-popular');
  const [selectedItemForCustomizer, setSelectedItemForCustomizer] = useState<MenuItem | null>(null);

  const activeTable = tables.find(t => t.id === activeTableId) ?? tables[0];
  const currentOrder =
    (activeOrderId ? orders[activeOrderId] : null) ??
    Object.values(orders).find(o => o.table_id === activeTableId && o.status === 'open') ??
    mockActiveOrder;

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const displayItems = currentCategory ? currentCategory.items : menuItems;

  const orderItems: OrderItem[] = currentOrder.items ?? [];
  const totalItemsCount = orderItems.reduce((sum, it) => sum + it.qty, 0);
  const totalAmount = currentOrder.total_amount || 0;

  const handleAddItem = (item: MenuItem) => {
    setSelectedItemForCustomizer(item);
  };

  const handleConfirmCustomization = (
    item: MenuItem,
    qty: number,
    modifiers: string[],
    notes?: string,
    ageVerifiedBy?: string,
  ) => {
    addItemOptimistic(currentOrder.id, item, qty, modifiers, notes, ageVerifiedBy);
  };

  const handleDeleteEntireOrder = () => {
    Alert.alert(
      'Delete Order',
      `Are you sure you want to cancel and delete Order ${currentOrder.order_number}? This will clear all items and mark the table as available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Order',
          style: 'destructive',
          onPress: () => {
            deleteOrderOptimistic(currentOrder.id);
            Alert.alert('Order Deleted', `Order ${currentOrder.order_number} has been deleted.`);
            onBack?.();
          },
        },
      ],
    );
  };

  const handlePay = () => {
    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Please add items to the order before proceeding to checkout.');
      return;
    }
    onPayNow(totalAmount);
  };

  const renderMenuItemCard = ({ item }: { item: MenuItem }) => {
    const isSpecial = item.name.toLowerCase().includes('steak') || item.price > 80_000;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, UGX ${item.price.toLocaleString()}`}
        onPress={() => handleAddItem(item)}
        className="flex-row items-center p-3.5 mb-2.5 rounded-2xl bg-surface border border-border shadow-sm active:border-primary/50"
      >
        <View className="h-12 w-12 rounded-xl bg-background border border-border items-center justify-center mr-3.5">
          <AppText className="text-xl">
            {item.station === 'bar' ? '🍸' : '🍲'}
          </AppText>
        </View>

        <View className="flex-1 mr-2">
          <View className="flex-row items-center mb-0.5">
            <AppText variant="label" className="font-bold text-text flex-1 mr-1.5" numberOfLines={1}>
              {item.name}
            </AppText>
            {isSpecial ? (
              <Badge label="CHEF PICK" variant="primary" size="sm" />
            ) : null}
          </View>
          <AppText variant="caption" className="text-text-secondary">
            {item.station === 'bar' ? 'Bar • Served Chilled' : 'Kitchen • Fresh Made'}
          </AppText>
          <AppText variant="label" className="text-primary font-bold mt-1">
            UGX {item.price.toLocaleString()}
          </AppText>
        </View>

        <View className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center">
          <PlusIcon color={colors.primary} size={20} />
        </View>
      </Pressable>
    );
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
        <HorecaAppBar
          title="Order Entry"
          subtitle={`TABLE ${activeTable?.table_number ?? '01'} • ${currentOrder.order_number}`}
          isOnline={isOnline}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
          rightAction={
            onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to Tables"
                onPress={onBack}
                className="h-10 px-3 flex-row items-center justify-center rounded-xl bg-surface border border-border mr-2 active:opacity-70"
                hitSlop={6}
              >
                <ArrowLeftIcon color={colors.onSurface} size={16} />
                <AppText variant="label" className="text-text font-semibold ml-1 text-xs">
                  Tables
                </AppText>
              </Pressable>
            ) : null
          }
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
            <AppText variant="caption" className="text-text-secondary text-[11px]">
              Order {currentOrder.order_number} • {currentOrder.party_size ?? 2} Guests
            </AppText>
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete Entire Order"
            onPress={handleDeleteEntireOrder}
            className="h-8 w-8 rounded-xl bg-error/10 border border-error/20 items-center justify-center active:opacity-70"
            hitSlop={6}
          >
            <TrashIcon color={colors.error} size={16} />
          </Pressable>
        </View>
      </View>

      {/* Segmented Mode Bar: Catalog vs Current Order */}
      <View className="flex-row p-1 mx-4 my-2.5 bg-surface border border-border rounded-2xl">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse Catalog"
          onPress={() => setActiveView('catalog')}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            activeView === 'catalog' ? 'bg-primary shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            variant="label"
            className={`font-bold text-xs ${
              activeView === 'catalog' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Menu Catalog
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Current Order"
          onPress={() => setActiveView('order')}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
            activeView === 'order' ? 'bg-primary shadow-sm' : 'bg-transparent'
          }`}
        >
          <ShoppingBagIcon
            color={activeView === 'order' ? colors.onPrimary : colors.onSurfaceVariant}
            size={14}
            className="mr-1.5"
          />
          <AppText
            variant="label"
            className={`font-bold text-xs ${
              activeView === 'order' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Order Items ({totalItemsCount})
          </AppText>
        </Pressable>
      </View>

      {/* VIEW 1: MENU CATALOG */}
      {activeView === 'catalog' && (
        <View className="flex-1">
          {/* Horizontal Category Carousel */}
          <View className="py-1 border-b border-border/40">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {categories.map(cat => {
                const isActive = cat.id === selectedCategory;
                return (
                  <Pressable
                    key={cat.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Category ${cat.name}`}
                    onPress={() => setSelectedCategory(cat.id)}
                    className={`mr-2 px-3 py-1.5 rounded-xl border ${
                      isActive
                        ? 'bg-primary border-primary shadow-sm'
                        : 'bg-surface border-border active:bg-surface/80'
                    }`}
                  >
                    <AppText
                      variant="label"
                      className={`text-xs font-semibold ${
                        isActive ? 'text-on-primary' : 'text-text'
                      }`}
                    >
                      {cat.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Menu Items List */}
          <FlatList
            data={displayItems}
            keyExtractor={item => item.id}
            renderItem={renderMenuItemCard}
            contentContainerStyle={{
              padding: 14,
              paddingBottom: Math.max(insets.bottom, 12) + 120,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* VIEW 2: CURRENT ORDER TICKET WITH INCREMENT / DECREMENT / DELETE */}
      {activeView === 'order' && (
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
              <View className="py-16 items-center justify-center">
                <View className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-3">
                  <ShoppingBagIcon color={colors.primary} size={28} />
                </View>
                <AppText variant="title" className="text-text font-bold mb-1">
                  Order is Empty
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-center max-w-xs mb-4">
                  Browse the menu catalog and tap items to add them to this order.
                </AppText>
                <Button
                  label="Browse Menu Catalog"
                  variant="primary"
                  size="sm"
                  onPress={() => setActiveView('catalog')}
                />
              </View>
            }
          />
        </View>
      )}

      {/* Bottom Sticky Order Ticket Bar */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 6 }}
        className="absolute left-0 right-0 bottom-0 bg-surface/95 border-t border-border px-4 pt-3 shadow-2xl"
      >
        {/* Ticket Header Line */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle Order View"
          onPress={() => setActiveView(prev => (prev === 'catalog' ? 'order' : 'catalog'))}
          className="flex-row items-center justify-between mb-3 active:opacity-80"
        >
          <View className="flex-row items-center">
            <View className="h-2 w-2 rounded-full bg-status-available mr-1.5" />
            <AppText variant="caption" className="text-text-secondary font-semibold">
              {totalItemsCount} ITEMS IN ORDER • TAP TO {activeView === 'order' ? 'ADD MORE' : 'REVIEW'}
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
        </Pressable>

        {/* Dual Actions: Kitchen Fire & Pay Now */}
        <View className="flex-row items-center">
          <View className="flex-1 mr-2">
            <Button
              label="Fire Kitchen"
              variant="secondary"
              onPress={onKitchenFire}
              leftIcon={<FireIcon color={colors.statusReserved} size={18} />}
            />
          </View>

          <View className="flex-1">
            <Button
              label="Confirm & Pay"
              variant="primary"
              onPress={handlePay}
              leftIcon={<CreditCardIcon color={colors.onPrimary} size={18} />}
            />
          </View>
        </View>
      </View>

      {/* Item Customizer Modal */}
      <ItemCustomizerModal
        item={selectedItemForCustomizer}
        onClose={() => setSelectedItemForCustomizer(null)}
        onConfirm={handleConfirmCustomization}
      />
    </ScreenTemplate>
  );
};
