import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../atoms/AppText';
import { useTheme } from '../../theme/ThemeProvider';

export type AppBarProps = {
  /** Screen title displayed in the appbar. */
  title: string;
  /** Optional secondary subtitle or description. */
  subtitle?: string;
  /** Whether to render the back navigation button. Default: false. */
  showBackButton?: boolean;
  /** Custom handler for back button press. Defaults to navigation.goBack() if canGoBack is true. */
  onBackPress?: () => void;
  /** Optional leading icon/slot when back button is not rendered. */
  leadingIcon?: ReactNode;
  /** Optional trailing action slot (e.g. filter, refresh, info button). */
  rightAction?: ReactNode;
  /** Whether to apply device top safe area inset for edge-to-edge layout. Default: true. */
  withTopInset?: boolean;
  /** Optional background styling override. Default: 'bg-surface'. */
  className?: string;
};

/**
 * Universal customizable AppBar:
 * - Edge-to-edge status bar padding
 * - Toggleable back navigation button (hidden on main bottom tab screens, visible on sub-screens)
 * - Flexible title, subtitle, leading icon, and right action slots
 */
export function AppBar({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  leadingIcon,
  rightAction,
  withTopInset = true,
  className = '',
}: AppBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const topPadding = withTopInset ? insets.top + 8 : 10;

  return (
    <View
      className={`border-b border-border bg-surface px-5 pb-3 ${className}`}
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-row items-center justify-between">
        {/* Leading section: Back button OR Leading Icon + Title */}
        <View className="flex-1 flex-row items-center gap-3">
          {showBackButton ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={handleBackPress}
              className="h-10 w-10 items-center justify-center rounded-xl bg-border/40 active:opacity-70"
            >
              <ChevronLeftIcon
                color={colors.textPrimary}
                size={22}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          ) : leadingIcon ? (
            <View className="items-center justify-center">{leadingIcon}</View>
          ) : null}

          <View className="flex-1 justify-center">
            <AppText
              variant="title"
              numberOfLines={1}
              accessibilityRole="header"
              className="font-bold text-text-primary"
            >
              {title}
            </AppText>
            {subtitle ? (
              <AppText
                variant="caption"
                numberOfLines={1}
                className="mt-0.5 text-xs text-text-secondary"
              >
                {subtitle}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Trailing action slot */}
        {rightAction ? (
          <View className="ml-3 items-center justify-center">
            {rightAction}
          </View>
        ) : null}
      </View>
    </View>
  );
}

