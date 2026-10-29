import { View } from 'react-native';
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatUGX } from '../../../utils/currency';
import type { MemberTransaction } from '../types/memberAccountTypes';

export type TransactionItemProps = {
  transaction: MemberTransaction;
};

export function TransactionItem({ transaction }: TransactionItemProps) {
  const { colors } = useTheme();

  const isIncoming = transaction.direction === 'in';
  const isPending = transaction.status === 'pending';
  const isFailed = transaction.status === 'rejected' || transaction.status === 'reversed';

  return (
    <View className="mb-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        {/* Direction icon & Label */}
        <View className="flex-1 flex-row items-center gap-3">
          <View
            className={`h-11 w-11 items-center justify-center rounded-2xl ${
              isIncoming ? 'bg-primary/10' : 'bg-secondary/15'
            }`}
          >
            {isIncoming ? (
              <ArrowDownLeftIcon color={colors.primary} size={20} />
            ) : (
              <ArrowUpRightIcon color={colors.secondary} size={20} />
            )}
          </View>

          <View className="flex-1">
            <AppText className="font-semibold text-text-primary text-base">
              {transaction.label || transaction.type}
            </AppText>
            <AppText className="text-xs text-text-secondary mt-0.5">
              {transaction.date}
            </AppText>
          </View>
        </View>

        {/* Amount & Status */}
        <View className="items-end">
          <AppText
            className={`font-bold text-base ${
              isIncoming ? 'text-primary' : 'text-text-primary'
            }`}
          >
            {isIncoming ? '+' : '-'}{formatUGX(transaction.amount)}
          </AppText>

          {/* Status pill */}
          <View className="mt-1 flex-row items-center">
            {isPending ? (
              <View className="flex-row items-center rounded-full bg-secondary/15 px-2 py-0.5">
                <ClockIcon color={colors.secondary} size={12} />
                <AppText variant="label" className="ml-1 text-xs text-secondary capitalize">
                  Pending
                </AppText>
              </View>
            ) : isFailed ? (
              <View className="flex-row items-center rounded-full bg-secondary/20 px-2 py-0.5">
                <XCircleIcon color={colors.secondary} size={12} />
                <AppText variant="label" className="ml-1 text-xs text-secondary capitalize">
                  {transaction.status}
                </AppText>
              </View>
            ) : (
              <View className="flex-row items-center rounded-full bg-primary/10 px-2 py-0.5">
                <CheckCircleIcon color={colors.primary} size={12} />
                <AppText variant="label" className="ml-1 text-xs text-primary capitalize">
                  Completed
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Optional Note or Fee metadata */}
      {transaction.fee > 0 || transaction.note ? (
        <View className="mt-2.5 flex-row items-center justify-between border-t border-border/60 pt-2">
          {transaction.note ? (
            <AppText className="flex-1 text-xs text-text-secondary italic mr-2" numberOfLines={1}>
              {transaction.note}
            </AppText>
          ) : <View />}

          {transaction.fee > 0 ? (
            <AppText variant="label" className="text-xs text-text-secondary">
              Fee: {formatUGX(transaction.fee)}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

