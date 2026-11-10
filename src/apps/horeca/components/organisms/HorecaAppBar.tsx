import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import {
  ComputerDesktopIcon,
  LockClosedIcon,
  ShoppingCartIcon,
  UserIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorecaStore } from '../../db/offlineStore';
import { useHorecaColors } from '../../theme/colors';
import { resolveBusinessName } from '../../utils/vat';
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
 * Shows left icon (or business logo), screen title + business details subtitle,
 * and right actions: cart (orders) with counter, lock, and user account.
 */
export function HorecaAppBar({
  title,
  subtitle,
  leftIcon,
  ordersCount,
  onOrdersPress,
  onLockPress,
  onProfilePress,
  rightAction,
  className = '',
}: HorecaAppBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();
  const [logoError, setLogoError] = useState(false);

  const orders = useHorecaStore(state => state.orders);
  const businessProfile = useHorecaStore(state => state.businessProfile);

  const computedCount = Object.values(orders).filter(o => o.status === 'open').length;

  const badgeCount = ordersCount ?? computedCount;

  const businessName = resolveBusinessName(businessProfile);
  const businessContact = [
    businessProfile?.phone?.trim(),
    businessProfile?.address?.trim(),
  ]
    .filter(Boolean)
    .join(' • ');
  const resolvedSubtitle =
    subtitle?.trim() || (businessName ? businessName : undefined);

  const showLogo = Boolean(businessProfile?.logo_url && !logoError);

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 12) }}
      className={`border-b border-border bg-surface px-4 pb-3 ${className}`.trim()}
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Icon / Business Logo & Screen Name + Business Header */}
        <View className="flex-row items-center flex-1 mr-2">
          {leftIcon ? (
            <View className="mr-3">{leftIcon}</View>
          ) : showLogo ? (
            <Image
              source={{ uri: businessProfile!.logo_url! }}
              onError={() => setLogoError(true)}
              className="h-10 w-10 rounded-horeca bg-primary/10 border border-primary/20 mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-horeca bg-primary/10 border border-primary/20 mr-3">
              <ComputerDesktopIcon
                color={colors.primary}
                size={20}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
          )}
          <View className="flex-1">
            <AppText variant="title" numberOfLines={1} className="text-text font-bold">
              {title}
            </AppText>
            {resolvedSubtitle ? (
              <AppText
                variant="caption"
                numberOfLines={1}
                className="text-text-secondary text-[11px] font-medium"
              >
                {resolvedSubtitle}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Right: Cart (Orders) Counter, Lock, Account */}
        <View className="flex-row items-center">
          {rightAction ? <View className="mr-2">{rightAction}</View> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View Orders, ${badgeCount} selected`}
            onPress={onOrdersPress}
            className="relative h-10 w-10 items-center justify-center rounded-horeca bg-background border border-border mr-2 active:opacity-70"
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
              className="h-10 w-10 items-center justify-center rounded-horeca bg-background border border-border mr-2 active:opacity-70"
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
              className="h-10 w-10 items-center justify-center rounded-horeca bg-background border border-border active:opacity-70"
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
