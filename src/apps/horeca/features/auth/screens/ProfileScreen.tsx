import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import {
  ArrowRightOnRectangleIcon,
  KeyIcon,
  MoonIcon,
  SunIcon,
} from 'react-native-heroicons/outline';
import { useHorecaTheme } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaSubAppBar } from '@horeca/components/organisms/HorecaSubAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { useHorecaAuthStore } from '../store/horecaAuthStore';

export interface ProfileScreenProps {
  onBack: () => void;
  onOrdersPress?: () => void;
  onChangePin?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onOrdersPress,
  onChangePin,
}) => {
  const { isDark, toggleTheme, colors } = useHorecaTheme();
  const me = useHorecaAuthStore(state => state.me);
  const loginProfile = useHorecaAuthStore(state => state.loginProfile);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const logout = useHorecaAuthStore(state => state.logout);

  const displayName = me?.name ?? activeStaff?.name ?? 'Staff Member';
  const displayRole = (loginProfile?.role ?? me?.role ?? activeStaff?.role ?? 'staff').toUpperCase();

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST';

  const handleLogout = () => {
    appModal.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of this terminal? Your active database session will be cleanly unmounted.',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        await logout();
      },
    });
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaSubAppBar
          title="Profile"
          onBack={onBack}
          onOrdersPress={onOrdersPress}
        />
      }
      contentContainerClassName="px-4 py-5"
    >
      {/* Profile Identity Card */}
      <View className="rounded-horeca bg-surface border border-border p-5 mb-5 items-center shadow-sm">
        <View className="h-20 w-20 rounded-full bg-primary/15 border-2 border-primary items-center justify-center mb-3">
          <AppText className="text-2xl font-extrabold text-primary">
            {initials}
          </AppText>
        </View>

        <AppText variant="title" className="text-xl font-bold text-text text-center">
          {displayName}
        </AppText>

        <View className="mt-2">
          <Badge label={displayRole} variant="primary" size="md" />
        </View>
      </View>

      {/* Preferences & Security Section */}
      <View className="rounded-horeca bg-surface border border-border p-5 mb-6 shadow-sm">
        <AppText variant="label" className="text-xs font-bold uppercase text-text-secondary mb-3">
          Preferences
        </AppText>

        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Toggle dark theme"
          accessibilityState={{ checked: isDark }}
          onPress={toggleTheme}
          className="flex-row items-center justify-between py-2"
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="h-9 w-9 rounded-horeca bg-background border border-border items-center justify-center mr-3">
              {isDark ? (
                <MoonIcon color={colors.primary} size={18} />
              ) : (
                <SunIcon color={colors.primary} size={18} />
              )}
            </View>
            <View className="flex-1">
              <AppText variant="label" className="font-semibold text-text">
                Appearance
              </AppText>
              <AppText variant="caption" className="text-text-secondary">
                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
              </AppText>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.outlineVariant, true: colors.primary }}
          />
        </Pressable>

        {onChangePin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Set or Change Staff PIN"
            onPress={onChangePin}
            className="flex-row items-center justify-between pt-3 mt-3 border-t border-border/50 active:opacity-70"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="h-9 w-9 rounded-horeca bg-background border border-border items-center justify-center mr-3">
                <KeyIcon color={colors.primary} size={18} />
              </View>
              <View className="flex-1">
                <AppText variant="label" className="font-semibold text-text">
                  Staff PIN
                </AppText>
                <AppText variant="caption" className="text-text-secondary">
                  Update your 4-digit terminal unlock PIN
                </AppText>
              </View>
            </View>
          </Pressable>
        ) : null}
      </View>

      {/* Logout Button */}
      <Button
        label="Log Out"
        variant="danger"
        onPress={handleLogout}
        leftIcon={<ArrowRightOnRectangleIcon color={colors.onPrimary} size={18} />}
      />
    </ScreenTemplate>
  );
};
