import { ActivityIndicator, View } from 'react-native';
import { UserCircleIcon } from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { OrganizationSetupBanner } from '../../auth/components/OrganizationSetupBanner';
import { useLogoutMutation } from '../../auth/hooks/useAuthMutations';
import { useAuthStore } from '../../auth/store/authStore';
import { ThemePreferenceSelector } from '../../preferences/components/ThemePreferenceSelector';
import { useBusinessQuery } from '../hooks/useBusinessQuery';

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
    logoutMutation.mutate({ scope: 'global' });
  };

  return (
    <ScreenTemplate>
      <View className="mb-6 items-center rounded-2xl bg-tertiary px-6 py-8">
        <View className="mb-3 rounded-full bg-secondary p-4">
          <UserCircleIcon
            color={colors.onSecondary}
            size={32}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="title" className="text-center">
          {user?.email ?? 'Signed-in Account'}
        </AppText>
        {profile?.role ? (
          <View className="mt-2 rounded-full bg-secondary px-3 py-1">
            <AppText variant="label" className=" uppercase text-on-secondary">
              {profile.role}
            </AppText>
          </View>
        ) : null}
        {profile?.organization_id ? (
          <AppText className="mt-2 text-center text-sm opacity-80">
            Organization ID: {profile.organization_id}
          </AppText>
        ) : null}
      </View>

      {needsOrganizationSetup ? <OrganizationSetupBanner /> : null}

      {!needsOrganizationSetup ? (
        <View className="mb-6 rounded-2xl bg-surface p-5">
          <AppText variant="title" className="mb-3">
            Business Profile
          </AppText>
          {businessQuery.isLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : businessQuery.isError ? (
            <View className="gap-3">
              <AppText>Unable to load business profile details.</AppText>
              <Button
                label="Retry"
                variant="outline"
                onPress={() => businessQuery.refetch()}
              />
            </View>
          ) : businessQuery.data ? (
            <View className="gap-2">
              <View className="flex-row justify-between">
                <AppText variant="label">Name</AppText>
                <AppText>{businessQuery.data.name}</AppText>
              </View>
              {businessQuery.data.legal_name ? (
                <View className="flex-row justify-between">
                  <AppText variant="label">Legal Name</AppText>
                  <AppText>{businessQuery.data.legal_name}</AppText>
                </View>
              ) : null}
              {businessQuery.data.currency ? (
                <View className="flex-row justify-between">
                  <AppText variant="label">Currency</AppText>
                  <AppText>{businessQuery.data.currency}</AppText>
                </View>
              ) : null}
              {businessQuery.data.phone ? (
                <View className="flex-row justify-between">
                  <AppText variant="label">Phone</AppText>
                  <AppText>{businessQuery.data.phone}</AppText>
                </View>
              ) : null}
              {businessQuery.data.email ? (
                <View className="flex-row justify-between">
                  <AppText variant="label">Business Email</AppText>
                  <AppText>{businessQuery.data.email}</AppText>
                </View>
              ) : null}
            </View>
          ) : (
            <AppText>No business details available.</AppText>
          )}
        </View>
      ) : null}

      <View className="mb-6 rounded-2xl bg-surface p-5">
        <AppText variant="title" className="mb-4">
          Appearance
        </AppText>
        <ThemePreferenceSelector />
      </View>

      <View className="rounded-2xl bg-surface p-5">
        <AppText variant="title" className="mb-4">
          Session
        </AppText>
        <View className="gap-3">
          <Button
            label="Sign out"
            loading={logoutMutation.isPending}
            onPress={handleSignOutLocal}
          />
          <Button
            label="Sign out of all devices"
            variant="outline"
            disabled={logoutMutation.isPending}
            onPress={handleSignOutGlobal}
          />
        </View>
      </View>
    </ScreenTemplate>
  );
}
