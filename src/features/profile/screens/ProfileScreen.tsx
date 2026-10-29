import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  IdentificationIcon,
  PhoneIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { OrganizationSetupBanner } from '../../auth/components/OrganizationSetupBanner';
import { useLogoutMutation } from '../../auth/hooks/useAuthMutations';
import { useAuthStore } from '../../auth/store/authStore';
import { ThemePreferenceSelector } from '../../preferences/components/ThemePreferenceSelector';
import { useBusinessQuery } from '../hooks/useBusinessQuery';

type DetailRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
};

function DetailRow({ icon, label, value, isLast = false }: DetailRowProps) {
  return (
    <View
      className={`flex-row items-center py-3 ${
        isLast ? '' : 'border-b border-border'
      }`}
    >
      <View
        className="mr-3 rounded-lg border border-border bg-background p-2"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {icon}
      </View>
      <View className="flex-1">
        <AppText variant="label" className="text-xs text-text-secondary">
          {label}
        </AppText>
        <AppText className="mt-0.5 font-medium text-text-primary">{value}</AppText>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const needsOrganizationSetup = useAuthStore(
    state => state.needsOrganizationSetup,
  );
  const logoutMutation = useLogoutMutation();
  const businessQuery = useBusinessQuery();

  const handleSignOutLocal = () => {
    logoutMutation.mutate({ scope: 'local' });
  };

  const handleSignOutGlobal = () => {
    Alert.alert(
      'Sign out of all devices?',
      'This will revoke active sessions across all phones, tablets, and browsers signed into your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out everywhere',
          style: 'destructive',
          onPress: () => logoutMutation.mutate({ scope: 'global' }),
        },
      ],
    );
  };

  return (
    <ScreenTemplate>
      <View className="mb-6 items-center rounded-3xl border border-border bg-surface px-6 py-8 shadow-sm">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-sm">
          <UserCircleIcon
            color={colors.onSecondary}
            size={32}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="title" className="text-center font-bold text-text-primary">
          {user?.email ?? 'Signed-in Account'}
        </AppText>
        {profile?.role ? (
          <View className="mt-2.5 rounded-full bg-secondary px-3.5 py-1">
            <AppText
              variant="label"
              className="font-semibold uppercase text-on-secondary"
            >
              {profile.role}
            </AppText>
          </View>
        ) : null}
        {profile?.organization_id ? (
          <View className="mt-3 rounded-lg border border-border bg-background px-3 py-1.5">
            <AppText className="text-center text-xs text-text-secondary">
              Organization ID: {profile.organization_id}
            </AppText>
          </View>
        ) : null}
      </View>

      {needsOrganizationSetup ? <OrganizationSetupBanner /> : null}

      {!needsOrganizationSetup ? (
        <View className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <AppText variant="title" className="mb-2 font-bold text-text-primary">
            Business Profile
          </AppText>
          {businessQuery.isLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator color={colors.primary} />
              <AppText variant="label" className="mt-2 opacity-80">
                Loading business details...
              </AppText>
            </View>
          ) : businessQuery.isError ? (
            <View className="gap-3 pt-2">
              <AppText>Unable to load business profile details.</AppText>
              <Button
                label="Retry"
                variant="outline"
                onPress={() => businessQuery.refetch()}
                leftIcon={
                  <ArrowPathIcon
                    color={colors.primary}
                    size={18}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                }
              />
            </View>
          ) : businessQuery.data ? (
            <View>
              <DetailRow
                icon={<BuildingOffice2Icon color={colors.primary} size={18} />}
                label="Name"
                value={businessQuery.data.name}
                isLast={
                  !businessQuery.data.legal_name &&
                  !businessQuery.data.currency &&
                  !businessQuery.data.phone &&
                  !businessQuery.data.email
                }
              />
              {businessQuery.data.legal_name ? (
                <DetailRow
                  icon={<IdentificationIcon color={colors.primary} size={18} />}
                  label="Legal Name"
                  value={businessQuery.data.legal_name}
                  isLast={
                    !businessQuery.data.currency &&
                    !businessQuery.data.phone &&
                    !businessQuery.data.email
                  }
                />
              ) : null}
              {businessQuery.data.currency ? (
                <DetailRow
                  icon={<BanknotesIcon color={colors.primary} size={18} />}
                  label="Currency"
                  value={businessQuery.data.currency}
                  isLast={
                    !businessQuery.data.phone && !businessQuery.data.email
                  }
                />
              ) : null}
              {businessQuery.data.phone ? (
                <DetailRow
                  icon={<PhoneIcon color={colors.primary} size={18} />}
                  label="Phone"
                  value={businessQuery.data.phone}
                  isLast={!businessQuery.data.email}
                />
              ) : null}
              {businessQuery.data.email ? (
                <DetailRow
                  icon={<EnvelopeIcon color={colors.primary} size={18} />}
                  label="Business Email"
                  value={businessQuery.data.email}
                  isLast
                />
              ) : null}
            </View>
          ) : (
            <AppText className="pt-2">No business details available.</AppText>
          )}
        </View>
      ) : null}

      <View className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <AppText variant="title" className="mb-1 font-bold text-text-primary">
          Appearance
        </AppText>
        <AppText className="mb-4 text-sm text-text-secondary">
          Sync with your device theme or lock to Light or Dark mode.
        </AppText>
        <ThemePreferenceSelector />
      </View>

      <View className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <AppText variant="title" className="mb-1 font-bold text-text-primary">
          Session
        </AppText>
        <AppText className="mb-4 text-sm text-text-secondary">
          Sign out on this device or revoke active sessions everywhere.
        </AppText>
        <View className="gap-3">
          <Button
            label="Sign out"
            loading={logoutMutation.isPending}
            onPress={handleSignOutLocal}
            leftIcon={
              <ArrowRightOnRectangleIcon
                color={colors.onPrimary}
                size={18}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            }
          />
          <Button
            label="Sign out of all devices"
            variant="outline"
            disabled={logoutMutation.isPending}
            onPress={handleSignOutGlobal}
            leftIcon={
              <ShieldExclamationIcon
                color={colors.primary}
                size={18}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            }
          />
        </View>
      </View>
    </ScreenTemplate>
  );
}
