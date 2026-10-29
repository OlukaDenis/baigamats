import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ReceiptPercentIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatUGX } from '../../../utils/currency';
import { useLoanDetailQuery } from '../hooks/useLoans';
import type { LoanItem } from '../types/loanTypes';

export type LoanDetailModalProps = {
  loan: LoanItem | null;
  visible: boolean;
  onClose: () => void;
  onOpenRepay: () => void;
};

export function LoanDetailModal({
  loan,
  visible,
  onClose,
  onOpenRepay,
}: LoanDetailModalProps) {
  const { colors } = useTheme();
  const { data: detail, isLoading } = useLoanDetailQuery(loan?.id || '');

  if (!loan) return null;

  const current = detail || loan;
  const isOverdue = current.status === 'overdue';
  const isClosed = current.status === 'closed';

  const progressPercent =
    current.total_to_repay > 0
      ? Math.min(100, Math.round((current.paid / current.total_to_repay) * 100))
      : 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[85%] rounded-t-3xl border-t border-border bg-surface p-6 shadow-2xl">
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between border-b border-border pb-3">
            <View>
              <View className="flex-row items-center gap-2">
                <AppText variant="title" className="font-bold text-text-primary">
                  {current.reference}
                </AppText>
                <View
                  className={`rounded-full px-2.5 py-0.5 ${
                    isOverdue
                      ? 'bg-secondary/20'
                      : isClosed
                        ? 'bg-primary/10'
                        : 'bg-primary/20'
                  }`}
                >
                  <AppText
                    variant="label"
                    className={`text-xs font-semibold capitalize ${
                      isOverdue
                        ? 'text-secondary'
                        : isClosed
                          ? 'text-primary'
                          : 'text-primary'
                    }`}
                  >
                    {current.status}
                  </AppText>
                </View>
              </View>
              <AppText className="text-xs text-text-secondary mt-0.5">
                {current.type}
              </AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close loan details"
              onPress={onClose}
              hitSlop={8}
            >
              <XMarkIcon color={colors.textSecondary} size={22} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Balance Due Big Banner */}
            <View className="mb-5 rounded-2xl bg-background p-4 border border-border">
              <AppText variant="label" className="text-xs text-text-secondary">
                Current Balance Due
              </AppText>
              <AppText className="text-2xl font-extrabold text-text-primary mt-1">
                {formatUGX(current.balance_due)}
              </AppText>

              {/* Repayment Progress bar */}
              <View className="mt-3">
                <View className="flex-row items-center justify-between mb-1">
                  <AppText className="text-xs text-text-secondary">
                    {progressPercent}% Repaid
                  </AppText>
                  <AppText className="text-xs text-text-secondary">
                    {formatUGX(current.paid)} of {formatUGX(current.total_to_repay)}
                  </AppText>
                </View>
                <View className="h-2 w-full rounded-full bg-border overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>
              </View>
            </View>

            {/* Financial Metrics Grid */}
            <View className="mb-5 gap-2.5 rounded-2xl border border-border bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <AppText className="text-xs text-text-secondary">Principal Borrowed</AppText>
                <AppText className="font-semibold text-text-primary text-xs">
                  {formatUGX(current.borrowed)}
                </AppText>
              </View>

              <View className="flex-row items-center justify-between">
                <AppText className="text-xs text-text-secondary">Total Scheduled</AppText>
                <AppText className="font-semibold text-text-primary text-xs">
                  {formatUGX(current.total_to_repay)}
                </AppText>
              </View>

              {current.late_fees > 0 ? (
                <View className="flex-row items-center justify-between">
                  <AppText className="text-xs text-secondary font-semibold">Late Penalties</AppText>
                  <AppText className="font-semibold text-secondary text-xs">
                    +{formatUGX(current.late_fees)}
                  </AppText>
                </View>
              ) : null}

              <View className="flex-row items-center justify-between border-t border-border/60 pt-2">
                <AppText className="text-xs text-text-secondary">Issue Date</AppText>
                <AppText className="font-semibold text-text-primary text-xs">
                  {current.issued}
                </AppText>
              </View>

              <View className="flex-row items-center justify-between">
                <AppText className="text-xs text-text-secondary">Due Date</AppText>
                <AppText
                  className={`font-semibold text-xs ${
                    isOverdue ? 'text-secondary font-bold' : 'text-text-primary'
                  }`}
                >
                  {current.due} {isOverdue ? '(OVERDUE)' : ''}
                </AppText>
              </View>
            </View>

            {/* Repayments History Ledger */}
            <View className="mb-4">
              <AppText variant="title" className="font-bold text-text-primary mb-3 text-sm">
                Repayment History
              </AppText>

              {isLoading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : !detail?.repayments || detail.repayments.length === 0 ? (
                <View className="rounded-xl bg-background p-4 border border-dashed border-border items-center">
                  <AppText className="text-xs text-text-secondary">
                    No repayments recorded yet.
                  </AppText>
                </View>
              ) : (
                <View className="gap-2">
                  {detail.repayments.map((rep, idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center justify-between rounded-xl bg-background p-3 border border-border"
                    >
                      <View>
                        <AppText className="font-semibold text-text-primary text-xs">
                          {formatUGX(rep.amount)}
                        </AppText>
                        <AppText className="text-[10px] text-text-secondary mt-0.5">
                          {rep.date} • {rep.method}
                        </AppText>
                      </View>

                      <View className="items-end">
                        <AppText className="text-[10px] text-text-secondary">
                          Balance After:
                        </AppText>
                        <AppText className="text-xs font-semibold text-text-primary">
                          {formatUGX(rep.balance_after)}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action button */}
            {!isClosed && current.balance_due > 0 ? (
              <Button
                label="Repay from Savings"
                onPress={() => {
                  onClose();
                  onOpenRepay();
                }}
                className="mt-2 mb-4"
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

