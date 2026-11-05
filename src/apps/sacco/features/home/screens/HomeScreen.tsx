import { Linking, View } from 'react-native';
import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  ScaleIcon,
  UserCircleIcon,
} from 'react-native-heroicons/outline';

import type { MainTabParamList } from '@sacco/navigation/types';
import { AppText } from '@sacco/components/atoms/AppText';
import { Button } from '@sacco/components/atoms/Button';
import { HomeAppBar } from '@sacco/components/organisms/HomeAppBar';
import { ScreenTemplate } from '@sacco/components/templates/ScreenTemplate';
import { useTheme } from '@sacco/theme/ThemeProvider';
import { formatUGX } from '@shared/utils/currency';
import { OrganizationSetupBanner } from '@sacco/features/auth/components/OrganizationSetupBanner';
import { useAuthStore } from '@sacco/features/auth/store/authStore';
import { useLoansQuery } from '@sacco/features/loans/hooks/useLoans';
import { BalanceCard } from '@sacco/features/memberAccount/components/BalanceCard';
import { TransactionItem } from '@sacco/features/memberAccount/components/TransactionItem';
import {
  useMemberMeQuery,
  useMemberTransactionsQuery,
} from '@sacco/features/memberAccount/hooks/useMemberAccountQueries';
import { ThemePreferenceSelector } from '@sacco/features/preferences/components/ThemePreferenceSelector';

const WEB_PORTAL_URL = 'https://business.baigamats.com';

export function HomeScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, 'Home'>>();
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const member = useAuthStore(state => state.member);
  const organization = useAuthStore(state => state.organization);
  const authType = useAuthStore(state => state.authType);
  const needsOrganizationSetup = useAuthStore(
    state => state.needsOrganizationSetup,
  );

  const isMember = authType === 'member' || Boolean(member);

  const { data: memberMeData } = useMemberMeQuery();
  const { data: recentTransactionsData } = useMemberTransactionsQuery({
    limit: 3,
  });
  const { data: loansData } = useLoansQuery({
    enabled: isMember,
  });

  const activeLoans = useMemo(
    () => (loansData || []).filter(l => l.status === 'active' || l.status === 'overdue'),
    [loansData],
  );
  const totalLoanDue = useMemo(
    () => activeLoans.reduce((sum, l) => sum + l.balance_due, 0),
    [activeLoans],
  );

  const handleOpenPortal = () => {
    Linking.openURL(WEB_PORTAL_URL).catch(() => undefined);
  };

  return (
    <ScreenTemplate header={<HomeAppBar />}>
      {/* Streamlined Greeting Banner */}
      <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-5 py-3.5 shadow-xs">
        <View className="flex-1">
          <AppText className="text-xs text-text-secondary font-medium">
            {member?.name ? 'Welcome back,' : 'Workspace'}
          </AppText>
          <AppText className="text-base font-bold text-text-primary" numberOfLines={1}>
            {member?.name || user?.email || 'Valued Member'}
          </AppText>
        </View>
        {organization?.name ? (
          <View className="rounded-full bg-primary/10 px-3 py-1">
            <AppText variant="caption" className="font-semibold text-primary">
              {organization.name}
            </AppText>
          </View>
        ) : profile?.role ? (
          <View className="rounded-full bg-secondary/15 px-3 py-1">
            <AppText variant="caption" className="font-semibold uppercase text-secondary">
              {profile.role}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Member Balance Sheet & Quick Action Engine */}
      {isMember && memberMeData?.balances ? (
        <View>
          <BalanceCard
            balances={memberMeData.balances}
            onDepositPress={() => {
              navigation.navigate('Deposit');
            }}
            onWithdrawPress={() => {
              navigation.navigate('Transfer', { kind: 'withdraw' });
            }}
            onTransferPress={() => {
              navigation.navigate('Transfer', { kind: 'to_member' });
            }}
          />

          {/* Active Loans Summary Card */}
          <View className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-3 pr-2">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15">
                  <ScaleIcon color={colors.secondary} size={24} />
                </View>
                <View className="flex-1">
                  <AppText variant="title" className="font-bold text-text-primary">
                    My Loans
                  </AppText>
                  <AppText className="mt-0.5 text-xs text-text-secondary">
                    {activeLoans.length > 0
                      ? `${activeLoans.length} active loan${activeLoans.length > 1 ? 's' : ''} • ${formatUGX(totalLoanDue)} due`
                      : 'No outstanding active loans'}
                  </AppText>
                </View>
              </View>
              <Button
                label="Manage"
                variant="outline"
                onPress={() => navigation.navigate('Loans')}
              />
            </View>
          </View>

          {/* Recent Statement Preview */}
          {recentTransactionsData && recentTransactionsData.data.length > 0 ? (
            <View className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
              <View className="mb-4 flex-row items-center justify-between">
                <AppText variant="title" className="font-bold text-text-primary">
                  Recent Activity
                </AppText>
                <Button
                  label="View Statement"
                  variant="outline"
                  onPress={() => navigation.navigate('Statement')}
                />
              </View>

              {recentTransactionsData.data.map(txn => (
                <TransactionItem key={txn.id} transaction={txn} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Business Workspace details for Staff / Admin */}
      {!isMember ? (
        <>
          {needsOrganizationSetup ? <OrganizationSetupBanner /> : null}

          <View className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <AppText variant="title" className="mb-4 font-bold text-text-primary">
              Workspace Status
            </AppText>

            <View className="mb-4 gap-3">
              <View className="flex-row items-center rounded-xl border border-border bg-background p-3.5">
                <View className="mr-3 rounded-xl border border-border bg-surface p-2.5">
                  <CheckBadgeIcon
                    color={colors.secondary}
                    size={20}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </View>
                <View className="flex-1">
                  <AppText variant="label" className="text-xs text-text-secondary">
                    Organization Status
                  </AppText>
                  <AppText className="font-semibold text-text-primary">
                    {needsOrganizationSetup
                      ? 'Pending organization setup'
                      : 'Active business workspace'}
                  </AppText>
                </View>
              </View>

              {profile?.organization_id ? (
                <View className="flex-row items-center rounded-xl border border-border bg-background p-3.5">
                  <View className="mr-3 rounded-xl border border-border bg-surface p-2.5">
                    <BuildingOffice2Icon
                      color={colors.secondary}
                      size={20}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  </View>
                  <View className="flex-1">
                    <AppText variant="label" className="text-xs text-text-secondary">
                      Workspace ID
                    </AppText>
                    <AppText className="font-semibold text-text-primary">
                      {profile.organization_id}
                    </AppText>
                  </View>
                </View>
              ) : null}
            </View>

            <View className="gap-3">
              <Button
                label="Manage account & profile"
                onPress={() => navigation.navigate('Profile')}
                leftIcon={
                  <UserCircleIcon
                    color={colors.onPrimary}
                    size={20}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                }
              />
              <Button
                label="Open Business Web Portal"
                variant="outline"
                onPress={handleOpenPortal}
                rightIcon={
                  <ArrowTopRightOnSquareIcon
                    color={colors.primary}
                    size={18}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                }
              />
            </View>
          </View>
        </>
      ) : null}

      {/* Appearance Settings */}
      <View className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <AppText variant="title" className="mb-1 font-bold text-text-primary">
          Appearance
        </AppText>
        <AppText className="mb-4 text-sm text-text-secondary">
          Choose how Baigamats looks on your device.
        </AppText>
        <ThemePreferenceSelector />
      </View>
    </ScreenTemplate>
  );
}
