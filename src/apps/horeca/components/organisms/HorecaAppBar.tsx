import React from 'react';
import { Pressable, View } from 'react-native';
import {
  ArrowRightOnRectangleIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  MoonIcon,
  SunIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorecaTheme } from '../../theme/colors';
import { AppText } from '../atoms/AppText';

export interface HorecaAppBarProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  onLockPress?: () => void;
  onProfilePress?: () => void;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
  className?: string;
}

/**
 * HORECA POS Terminal Header Organism.
 * Powered by NativeWind and Heroicons with online status indicator and quick actions.
 */
export function HorecaAppBar({
  title,
  subtitle = 'T-01 • ONLINE',
  isOnline = true,
  onLockPress,
  onProfilePress,
  rightAction,
  showThemeToggle = true,
  className = '',
}: HorecaAppBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, colors } = useHorecaTheme();

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 12) }}
      className={`border-b border-border bg-surface px-4 pb-3 ${className}`.trim()}
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Terminal badge & title */}
        <View className="flex-row items-center flex-1 mr-2">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mr-3">
            <ComputerDesktopIcon
              color={colors.primary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <View className="flex-1">
            <AppText variant="title" numberOfLines={1} className="text-text font-bold">
              {title}
            </AppText>
            <View className="flex-row items-center mt-0.5">
              <View
                className={`h-2 w-2 rounded-full mr-1.5 ${
                  isOnline ? 'bg-status-available' : 'bg-error'
                }`}
              />
              <AppText variant="caption" className="text-text-secondary font-medium">
                {subtitle}
              </AppText>
            </View>
          </View>
        </View>

        {/* Right: Actions */}
        <View className="flex-row items-center">
          {rightAction}

          {showThemeToggle ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onPress={toggleTheme}
              className="h-10 w-10 items-center justify-center rounded-xl bg-background border border-border mr-2 active:opacity-70"
              hitSlop={6}
            >
              {isDark ? (
                <SunIcon color={colors.primary} size={18} />
              ) : (
                <MoonIcon color={colors.onSurfaceVariant} size={18} />
              )}
            </Pressable>
          ) : null}

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
              accessibilityLabel="Sign out or Switch Staff"
              onPress={onProfilePress}
              className="h-10 w-10 items-center justify-center rounded-xl bg-error/10 border border-error/20 active:opacity-70"
              hitSlop={6}
            >
              <ArrowRightOnRectangleIcon color={colors.error} size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
