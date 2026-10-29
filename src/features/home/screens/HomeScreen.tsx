import { Linking, View } from 'react-native';
import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  DocumentTextIcon,
  ScaleIcon,
  SparklesIcon,
  UserCircleIcon,
} from 'react-native-heroicons/outline';

import type { MainTabParamList } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatUGX } from '../../../utils/currency';
import { OrganizationSetupBanner } from '../../auth/components/OrganizationSetupBanner';
import { useAuthStore } from '../../auth/store/authStore';
import { useLoansQuery } from '../../loans/hooks/useLoans';
import { BalanceCard } from '../../memberAccount/components/BalanceCard';
import { TransactionItem } from '../../memberAccount/components/TransactionItem';
import {
  useMemberMeQuery,
  useMemberTransactionsQuery,
} from '../../memberAccount/hooks/useMemberAccountQueries';
import { ThemePreferenceSelector } from '../../preferences/components/ThemePreferenceSelector';

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
    <ScreenTemplate>
      {/* Top Welcome / Identity Card */}
      <View className="mb-6 items-center rounded-3xl border border-border bg-surface px-6 py-8 shadow-sm">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-sm">
          <SparklesIcon
            color={colors.onSecondary}
            size={32}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="display" className="text-center font-bold text-text-primary">
          Baigamats
        </AppText>
        <AppText className="mt-2 text-center text-sm text-text-secondary">
          {member?.name
            ? `Welcome back, ${member.name}`
            : user?.email
              ? `Welcome back, ${user.email}`
              : 'Your business workspace is ready.'}
        </AppText>
        {member?.member_no ? (
          <View className="mt-3 flex-row flex-wrap justify-center gap-2">
            <View className="rounded-full bg-secondary px-3.5 py-1">
              <AppText variant="label" className="font-semibold uppercase text-on-secondary">
                Member: {member.member_no}
              </AppText>
            </View>
            {organization?.name ? (
              <View className="rounded-full bg-primary px-3.5 py-1">
                <AppText variant="label" className="font-semibold text-on-primary">
                  {organization.name}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : profile?.role ? (
          <View className="mt-3 rounded-full bg-secondary px-3.5 py-1">
            <AppText
              variant="label"
              className="font-semibold uppercase text-on-secondary"
            >
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
