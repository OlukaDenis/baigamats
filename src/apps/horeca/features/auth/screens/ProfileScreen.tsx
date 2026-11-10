import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import {
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
} from 'react-native-heroicons/outline';
import {
  BuildingStorefrontIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  KeyIcon,
  MapPinIcon,
  MoonIcon,
  PhoneIcon,
  SunIcon,
} from 'react-native-heroicons/solid';
import { useHorecaTheme } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { resolveBusinessName } from '@horeca/utils/vat';
import { useHorecaAuthStore } from '../store/horecaAuthStore';
import { resolveIsManager } from '../utils/roleAccess';

export interface ProfileScreenProps {
  onOrdersPress?: () => void;
  onLockTerminal?: () => void;
  onChangePin?: () => void;
  onOpenAdmin?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOrdersPress,
  onLockTerminal,
  onChangePin,
  onOpenAdmin,
}) => {
  const { isDark, toggleTheme, colors } = useHorecaTheme();
  const me = useHorecaAuthStore(state => state.me);
  const loginProfile = useHorecaAuthStore(state => state.loginProfile);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const logout = useHorecaAuthStore(state => state.logout);
  const businessProfile = useHorecaStore(state => state.businessProfile);

  const isManager = resolveIsManager({ loginProfile, me, activeStaff });
  const displayName = me?.name ?? activeStaff?.name ?? 'Staff Member';
  const displayRole = (loginProfile?.role ?? me?.role ?? activeStaff?.role ?? 'staff').toUpperCase();
  const businessRows = [
    {
      key: 'name',
      label: 'Business Name',
      value: resolveBusinessName(businessProfile, '') || 'Not configured',
      Icon: BuildingStorefrontIcon,
    },
    {
      key: 'phone',
      label: 'Phone',
      value: businessProfile?.phone?.trim() || 'Not configured',
      Icon: PhoneIcon,
    },
    {
      key: 'email',
      label: 'Email',
      value: businessProfile?.email?.trim() || 'Not configured',
      Icon: EnvelopeIcon,
    },
    {
      key: 'address',
      label: 'Address',
      value: businessProfile?.address?.trim() || 'Not configured',
      Icon: MapPinIcon,
    },
  ];

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
      onConfirm: () => {
        void logout();
      },
    });
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaAppBar
          title="Profile"
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
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

      {/* Business Details Section */}
      <View className="rounded-horeca bg-surface border border-border p-5 mb-5 shadow-sm">
        <AppText variant="label" className="text-xs font-bold uppercase text-text-secondary mb-3">
          Business
        </AppText>
        {businessRows.map(({ key, label, value, Icon }, index) => (
          <View
            key={key}
            className={`flex-row items-center py-3 ${
              index < businessRows.length - 1 ? 'border-b border-border/50' : ''
            }`}>
            <View className="h-9 w-9 rounded-full bg-primary items-center justify-center mr-3">
              <Icon size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <AppText variant="caption" className="text-xs text-text-secondary">
                {label}
              </AppText>
              <AppText className="text-base font-medium text-text">
                {value}
              </AppText>
            </View>
          </View>
        ))}
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
            <View className="h-9 w-9 rounded-full bg-primary items-center justify-center mr-3">
              {isDark ? (
                <MoonIcon color="#FFFFFF" size={18} />
              ) : (
                <SunIcon color="#FFFFFF" size={18} />
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
              <View className="h-9 w-9 rounded-full bg-primary items-center justify-center mr-3">
                <KeyIcon color="#FFFFFF" size={18} />
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
            <ChevronRightIcon color={colors.onSurfaceVariant} size={18} />
          </Pressable>
        ) : null}

        {isManager && onOpenAdmin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Admin Back Office"
            onPress={onOpenAdmin}
            className="flex-row items-center justify-between pt-3 mt-3 border-t border-border/50 active:opacity-70"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="h-9 w-9 rounded-full bg-primary items-center justify-center mr-3">
                <Cog6ToothIcon color="#FFFFFF" size={18} />
              </View>
              <View className="flex-1">
                <AppText variant="label" className="font-semibold text-text">
                  Admin & Back Office
                </AppText>
                <AppText variant="caption" className="text-text-secondary">
                  Manage tables, menu, staff & printer settings
                </AppText>
              </View>
            </View>
            <ChevronRightIcon color={colors.onSurfaceVariant} size={18} />
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
