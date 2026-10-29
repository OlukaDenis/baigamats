import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BellIcon, SparklesIcon, UserIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../atoms/AppText';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

export type HomeAppBarProps = {
  /** Handler when the notification bell is tapped. Defaults to navigating to 'Notifications'. */
  onNotificationPress?: () => void;
  /** Handler when user avatar is tapped. Defaults to navigating to 'Profile'. */
  onProfilePress?: () => void;
  /** Unread notification badge count. Default: 2. */
  unreadCount?: number;
  /** Whether to apply device top safe area inset. Default: true. */
  withTopInset?: boolean;
};

/**
 * Dedicated Home Screen AppBar:
 * - Left: Baigamats Brand identity, logo icon, and contextual member ID badge
 * - Right: Notification bell with unread badge counter + Profile avatar chip
 */
export function HomeAppBar({
  onNotificationPress,
  onProfilePress,
  unreadCount = 2,
  withTopInset = true,
}: HomeAppBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const member = useAuthStore(state => state.member);
  const user = useAuthStore(state => state.user);
  const organization = useAuthStore(state => state.organization);

  const displayName = member?.name || user?.email || 'Member';
  const memberNo = member?.member_no;

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U';

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      navigation.navigate('Notifications');
    }
  };

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      navigation.navigate('Profile');
    }
  };

  const topPadding = withTopInset ? insets.top + 8 : 10;

  return (
    <View
      className="border-b border-border bg-surface px-5 pb-3 shadow-xs"
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-row items-center justify-between">
        {/* Left: App Branding & Identity */}
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-secondary shadow-sm">
            <SparklesIcon
              color={colors.onSecondary}
              size={22}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <View>
            <AppText
              variant="title"
              accessibilityRole="header"
              className="text-lg font-extrabold tracking-tight text-text-primary"
            >
              Baigamats
            </AppText>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              {memberNo ? (
                <View className="rounded-md bg-secondary/15 px-1.5 py-0.5">
                  <AppText variant="caption" className="text-[10px] font-bold text-secondary">
                    {memberNo}
                  </AppText>
                </View>
              ) : organization?.name ? (
                <AppText variant="caption" className="text-[11px] text-text-secondary" numberOfLines={1}>
                  {organization.name}
                </AppText>
              ) : (
                <AppText variant="caption" className="text-[11px] text-text-secondary">
                  SACCO & Savings
                </AppText>
              )}
            </View>
          </View>
        </View>

        {/* Right: Notifications Bell + Profile Avatar */}
        <View className="flex-row items-center gap-2.5">
          {/* Notifications Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
            onPress={handleNotificationPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="relative h-10 w-10 items-center justify-center rounded-full border border-border bg-background active:opacity-70"
          >
            <BellIcon
              color={colors.textPrimary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            {unreadCount > 0 ? (
              <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] items-center justify-center rounded-full bg-secondary px-1 border-2 border-surface">
                <AppText className="text-[9px] font-extrabold text-on-secondary">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>

          {/* Profile Avatar Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`User profile for ${displayName}`}
            onPress={handleProfilePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 active:opacity-70"
          >
            {initials ? (
              <AppText className="text-xs font-bold text-primary">
                {initials}
              </AppText>
            ) : (
              <UserIcon
                color={colors.primary}
                size={18}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

