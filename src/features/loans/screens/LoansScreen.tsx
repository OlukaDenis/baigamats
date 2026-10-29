import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ScaleIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatUGX } from '../../../utils/currency';
import { LoanDetailModal } from '../components/LoanDetailModal';
import { RepayLoanModal } from '../components/RepayLoanModal';
import { useLoansQuery } from '../hooks/useLoans';
import type { LoanItem, LoanStatus } from '../types/loanTypes';

type FilterTab = 'all' | 'active' | 'overdue' | 'closed';

export function LoansScreen() {
  const { colors } = useTheme();
  const [selectedTab, setSelectedTab] = useState<FilterTab>('active');

  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState<LoanItem | null>(null);
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<LoanItem | null>(null);

  const { data: loans, isLoading, isRefetching, refetch } = useLoansQuery();

  const allLoans = loans || [];

  const summary = useMemo(() => {
    let totalDue = 0;
    let activeCount = 0;
    let overdueCount = 0;

    allLoans.forEach(l => {
      if (l.status === 'active' || l.status === 'overdue') {
        totalDue += l.balance_due;
        activeCount += 1;
      }
      if (l.status === 'overdue') {
        overdueCount += 1;
      }
    });

    return { totalDue, activeCount, overdueCount };
  }, [allLoans]);

  const filteredLoans = useMemo(() => {
    if (selectedTab === 'all') return allLoans;
    return allLoans.filter(l => l.status === selectedTab);
  }, [allLoans, selectedTab]);

  return (
    <ScreenTemplate scrollable={false}>
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <ScaleIcon color={colors.onPrimary} size={24} />
          </View>
          <View>
            <AppText variant="title" accessibilityRole="header" className="font-bold text-text-primary">
              Loan Portfolio
            </AppText>
            <AppText className="text-xs text-text-secondary mt-0.5">
              {summary.activeCount} active • Total due: {formatUGX(summary.totalDue)}
            </AppText>
          </View>
        </View>
      </View>

      {/* Overdue Warning Alert Banner if overdue loans exist */}
      {summary.overdueCount > 0 ? (
        <View
          accessible
          accessibilityRole="alert"
          className="mb-4 flex-row items-center rounded-2xl bg-secondary/15 p-3.5 border border-secondary/30"
        >
          <ExclamationTriangleIcon color={colors.secondary} size={20} />
          <AppText className="ml-2.5 flex-1 text-xs text-secondary font-semibold">
            You have {summary.overdueCount} overdue loan{summary.overdueCount > 1 ? 's' : ''}.
            Please make a repayment from your savings to avoid late fees.
          </AppText>
        </View>
      ) : null}

      {/* Tabs Filter */}
      <View className="mb-4 flex-row rounded-xl bg-border/40 p-1">
        {(['active', 'overdue', 'closed', 'all'] as FilterTab[]).map(tab => (
          <Pressable
            key={tab}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${tab}`}
            onPress={() => setSelectedTab(tab)}
            className={`flex-1 items-center justify-center rounded-lg py-2 ${
              selectedTab === tab ? 'bg-primary shadow-sm' : ''
            }`}
          >
            <AppText
              variant="label"
              className={`text-xs font-bold capitalize ${
                selectedTab === tab ? 'text-on-primary' : 'text-text-secondary'
              }`}
            >
              {tab}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Loans List */}
      {isLoading ? (
        <View className="my-16 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
          <AppText className="mt-3 text-sm text-text-secondary">
            Loading your loan portfolio...
          </AppText>
        </View>
      ) : filteredLoans.length === 0 ? (
        <View className="my-12 items-center justify-center rounded-3xl border border-dashed border-border bg-surface p-8">
          <ScaleIcon color={colors.textSecondary} size={40} />
          <AppText className="mt-3 font-semibold text-text-primary text-center">
            No {selectedTab !== 'all' ? selectedTab : ''} loans found
          </AppText>
          <AppText className="mt-1 text-center text-xs text-text-secondary">
            Your loans and repayment schedules will be displayed here.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filteredLoans}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const isOverdue = item.status === 'overdue';
            const isClosed = item.status === 'closed';
            const progress =
              item.total_to_repay > 0
                ? Math.min(100, Math.round((item.paid / item.total_to_repay) * 100))
                : 100;

            return (
              <View className="mb-3.5 rounded-3xl border border-border bg-surface p-5 shadow-sm">
                {/* Header row */}
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <AppText className="font-bold text-text-primary text-base">
                      {item.reference}
                    </AppText>
                    <AppText className="text-xs text-text-secondary mt-0.5">
                      {item.type}
                    </AppText>
                  </View>

                  <View
                    className={`rounded-full px-2.5 py-0.5 ${
                      isOverdue
                        ? 'bg-secondary/20'
                        : isClosed
                          ? 'bg-border/60'
                          : 'bg-primary/10'
                    }`}
                  >
                    <AppText
                      variant="label"
                      className={`text-xs font-semibold capitalize ${
                        isOverdue
                          ? 'text-secondary font-bold'
                          : isClosed
                            ? 'text-text-secondary'
                            : 'text-primary'
                      }`}
                    >
                      {item.status}
                    </AppText>
                  </View>
                </View>

                {/* Balance Due */}
                <View className="mb-3 flex-row items-baseline justify-between">
                  <View>
                    <AppText variant="label" className="text-xs text-text-secondary">
                      Balance Due
                    </AppText>
                    <AppText className="text-xl font-extrabold text-text-primary mt-0.5">
                      {formatUGX(item.balance_due)}
                    </AppText>
                  </View>

                  <View className="items-end">
                    <AppText variant="label" className="text-xs text-text-secondary">
                      Due Date
                    </AppText>
                    <AppText
                      className={`text-xs font-semibold mt-0.5 ${
                        isOverdue ? 'text-secondary font-bold' : 'text-text-primary'
                      }`}
                    >
                      {item.due}
                    </AppText>
                  </View>
                </View>

                {/* Progress bar */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-1">
                    <AppText className="text-[11px] text-text-secondary">
                      {progress}% Repaid
                    </AppText>
                    <AppText className="text-[11px] text-text-secondary">
                      Paid: {formatUGX(item.paid)}
                    </AppText>
                  </View>
                  <View className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <View
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2 pt-2 border-t border-border/60">
                  <Button
                    label="View Details"
                    variant="outline"
                    onPress={() => setSelectedLoanForDetail(item)}
                    className="flex-1"
                  />
                  {!isClosed && item.balance_due > 0 ? (
                    <Button
                      label="Repay"
                      onPress={() => setSelectedLoanForRepay(item)}
                      className="flex-1"
                    />
                  ) : null}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View className="mt-2 mb-6 flex-row items-center gap-2 rounded-2xl bg-surface p-4 border border-border">
              <InformationCircleIcon color={colors.textSecondary} size={20} />
              <AppText className="flex-1 text-xs text-text-secondary">
                Applying for a new loan is not yet available in the mobile app. Please
                visit your cooperative branch to apply.
              </AppText>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <LoanDetailModal
        loan={selectedLoanForDetail}
        visible={Boolean(selectedLoanForDetail)}
        onClose={() => setSelectedLoanForDetail(null)}
        onOpenRepay={() => {
          setSelectedLoanForRepay(selectedLoanForDetail);
        }}
      />

      {/* Repay Modal */}
      <RepayLoanModal
        loan={selectedLoanForRepay}
        visible={Boolean(selectedLoanForRepay)}
        onClose={() => setSelectedLoanForRepay(null)}
      />
    </ScreenTemplate>
  );
}

