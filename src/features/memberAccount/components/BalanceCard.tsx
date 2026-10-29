import { View, Pressable } from 'react-native';
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  CircleStackIcon,
  ClockIcon,
  HeartIcon,
  ReceiptPercentIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatUGX } from '../../../utils/currency';
import type { MemberMeBalances } from '../types/memberAccountTypes';

export type BalanceCardProps = {
  balances: MemberMeBalances;
  onDepositPress?: () => void;
  onWithdrawPress?: () => void;
  onTransferPress?: () => void;
};

export function BalanceCard({
  balances,
  onDepositPress,
  onWithdrawPress,
  onTransferPress,
}: BalanceCardProps) {
  const { colors } = useTheme();

  return (
    <View className="mb-6 gap-4">
      {/* Primary Savings Account Card */}
      <View className="rounded-3xl border border-primary/20 bg-primary p-6 shadow-md">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="rounded-xl bg-white/10 p-2">
              <BanknotesIcon color={colors.onPrimary} size={22} />
            </View>
            <AppText variant="label" className="font-semibold uppercase tracking-wider text-white/80">
              Savings Balance
            </AppText>
          </View>
          {balances.pending_withdrawals > 0 ? (
            <View className="flex-row items-center rounded-full bg-secondary/80 px-2.5 py-1">
              <ClockIcon color={colors.onSecondary} size={14} />
              <AppText variant="label" className="ml-1 text-xs text-on-secondary">
                {formatUGX(balances.pending_withdrawals)} pending
              </AppText>
            </View>
          ) : null}
        </View>

        <View className="my-4">
          <AppText
            variant="display"
            className="text-3xl font-extrabold text-white"
            accessibilityLabel={`Savings balance: ${formatUGX(balances.savings)}`}
          >
            {formatUGX(balances.savings)}
          </AppText>
          <AppText className="mt-1 text-xs text-white/70">
            Available for withdrawal, transfers, or loan repayment
          </AppText>
        </View>

        {/* Quick Money Actions */}
        <View className="mt-2 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Deposit funds"
            onPress={onDepositPress}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-secondary py-3 px-2 shadow-sm"
          >
            <ArrowDownLeftIcon color={colors.onSecondary} size={18} />
            <AppText variant="label" className="ml-1.5 font-bold text-on-secondary">
              Deposit
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Withdraw funds"
            onPress={onWithdrawPress}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-white/15 py-3 px-2"
          >
            <ArrowUpRightIcon color={colors.onPrimary} size={18} />
            <AppText variant="label" className="ml-1.5 font-bold text-white">
              Withdraw
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Transfer funds"
            onPress={onTransferPress}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-white/15 py-3 px-2"
          >
            <CircleStackIcon color={colors.onPrimary} size={18} />
            <AppText variant="label" className="ml-1.5 font-bold text-white">
              Transfer
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Share Capital & Welfare Grid */}
      <View className="flex-row gap-3">
        {/* Shares Card */}
        <View className="flex-1 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <View className="flex-row items-center gap-2">
            <View className="rounded-xl bg-primary/10 p-2">
              <CircleStackIcon color={colors.primary} size={20} />
            </View>
            <AppText variant="label" className="text-xs text-text-secondary">
              Share Capital
            </AppText>
          </View>
          <AppText className="mt-2 text-lg font-bold text-text-primary">
            {formatUGX(balances.shares_value)}
          </AppText>
          <AppText className="mt-1 text-xs text-text-secondary">
            {balances.shares_count.toLocaleString()} shares @ {formatUGX(balances.share_price)}
          </AppText>
          {balances.share_interest > 0 ? (
            <View className="mt-2 rounded-md bg-secondary/10 px-2 py-1">
              <AppText variant="label" className="text-xs text-secondary font-semibold">
                +{formatUGX(balances.share_interest)} dividends
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Welfare Fund Card */}
        <View className="flex-1 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <View className="flex-row items-center gap-2">
            <View className="rounded-xl bg-secondary/15 p-2">
              <HeartIcon color={colors.secondary} size={20} />
            </View>
            <AppText variant="label" className="text-xs text-text-secondary">
              Welfare Fund
            </AppText>
          </View>
          <AppText className="mt-2 text-lg font-bold text-text-primary">
            {formatUGX(balances.welfare_net)}
          </AppText>
          <AppText className="mt-1 text-xs text-text-secondary">
            Paid in: {formatUGX(balances.welfare_paid_in)}
          </AppText>
          {balances.welfare_received > 0 ? (
            <View className="mt-2 rounded-md bg-primary/10 px-2 py-1">
              <AppText variant="label" className="text-xs text-primary font-semibold">
                Received: {formatUGX(balances.welfare_received)}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Fees Paid Badge */}
      {balances.fees_paid > 0 ? (
        <View className="flex-row items-center justify-between rounded-xl border border-border bg-background p-3.5">
          <View className="flex-row items-center gap-2">
            <ReceiptPercentIcon color={colors.textSecondary} size={18} />
            <AppText variant="label" className="text-xs text-text-secondary">
              Total Transaction Fees Paid
            </AppText>
          </View>
          <AppText className="font-semibold text-text-primary">
            {formatUGX(balances.fees_paid)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

