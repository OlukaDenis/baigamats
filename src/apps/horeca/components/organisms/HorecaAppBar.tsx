import React from 'react';
import { Pressable, View } from 'react-native';
import {
  ComputerDesktopIcon,
  LockClosedIcon,
  ShoppingCartIcon,
  UserIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorecaStore } from '../../db/offlineStore';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';

export interface HorecaAppBarProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  leftIcon?: React.ReactNode;
  ordersCount?: number;
  onOrdersPress?: () => void;
  onLockPress?: () => void;
  onProfilePress?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

/**
 * Primary AppBar displayed on bottom navigation bar screens.
 * Shows left icon, screen title, and right actions: cart (orders) with counter, lock, and user account.
 */
export function HorecaAppBar({
  title,
  leftIcon,
  ordersCount,
  onOrdersPress,
  onLockPress,
  onProfilePress,
  className = '',
}: HorecaAppBarProps) {
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
        {/* Left: Icon & Screen Name */}
        <View className="flex-row items-center flex-1 mr-2">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mr-3">
            {leftIcon ?? (
              <ComputerDesktopIcon
                color={colors.primary}
                size={20}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            )}
          </View>
          <AppText variant="title" numberOfLines={1} className="text-text font-bold flex-1">
            {title}
          </AppText>
        </View>

        {/* Right: Cart (Orders) Counter, Lock, Account */}
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View Orders, ${badgeCount} selected`}
            onPress={onOrdersPress}
            className="relative h-10 w-10 items-center justify-center rounded-xl bg-background border border-border mr-2 active:opacity-70"
            hitSlop={6}
          >
            <ShoppingCartIcon color={colors.onSurfaceVariant} size={18} />
            <View className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <AppText className="text-[10px] font-bold text-on-primary">
                {badgeCount}
              </AppText>
            </View>
          </Pressable>

          {onLockPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Lock Terminal"
              onPress={onLockPress}
              className="h-10 w-10 items-center justify-center rounded-xl bg-background border border-border mr-2 active:opacity-70"
              hitSlop={6}
            >
              <LockClosedIcon color={colors.onSurfaceVariant} size={18} />
            </Pressable>
          ) : null}

          {onProfilePress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="User Profile"
              onPress={onProfilePress}
              className="h-10 w-10 items-center justify-center rounded-xl bg-background border border-border active:opacity-70"
              hitSlop={6}
            >
              <UserIcon color={colors.onSurfaceVariant} size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
