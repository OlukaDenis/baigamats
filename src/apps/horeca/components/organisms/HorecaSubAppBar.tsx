import React from 'react';
import { Pressable, View } from 'react-native';
import { ArrowLeftIcon, ShoppingCartIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorecaStore } from '../../db/offlineStore';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';

export interface HorecaSubAppBarProps {
  title: string;
  onBack?: () => void;
  ordersCount?: number;
  onOrdersPress?: () => void;
  className?: string;
}

/**
 * Secondary AppBar for screens not on the bottom navigation bar.
 * Displays back button on the left, screen title, and orders cart icon with counter on the right.
 */
export function HorecaSubAppBar({
  title,
  onBack,
  ordersCount,
  onOrdersPress,
  className = '',
}: HorecaSubAppBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const orders = useHorecaStore(state => state.orders);
  const activeOrderId = useHorecaStore(state => state.activeOrderId);
  const activeTableId = useHorecaStore(state => state.activeTableId);

  const currentOrder =
    (activeOrderId ? orders[activeOrderId] : null) ??
    Object.values(orders).find(o => o.table_id === activeTableId && o.status === 'open');

  const computedCount = currentOrder
    ? (currentOrder.items ?? []).reduce((sum, item) => sum + item.qty, 0)
    : Object.values(orders)
        .filter(o => o.status === 'open')
        .reduce((sum, o) => sum + (o.items ?? []).reduce((s, it) => s + it.qty, 0), 0);

  const badgeCount = ordersCount ?? computedCount;

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 12) }}
      className={`border-b border-border bg-surface px-4 pb-3 ${className}`.trim()}
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Back Button & Screen Name */}
        <View className="flex-row items-center flex-1 mr-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-xl bg-background border border-border mr-3 active:opacity-70"
            hitSlop={6}
          >
            <ArrowLeftIcon color={colors.onSurface} size={18} />
          </Pressable>
          <AppText variant="title" numberOfLines={1} className="text-text font-bold flex-1">
            {title}
          </AppText>
        </View>

        {/* Right: Orders Cart Icon Counter */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View Orders, ${badgeCount} selected`}
          onPress={onOrdersPress}
          className="relative h-10 w-10 items-center justify-center rounded-xl bg-background border border-border active:opacity-70"
          hitSlop={6}
        >
          <ShoppingCartIcon color={colors.onSurfaceVariant} size={18} />
          <View className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
            <AppText className="text-[10px] font-bold text-on-primary">
              {badgeCount}
            </AppText>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
