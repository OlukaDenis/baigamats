import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { FormField } from '../../../components/molecules/FormField';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { TransactionItem } from '../components/TransactionItem';
import { useMemberTransactionsInfiniteQuery } from '../hooks/useMemberAccountQueries';
import type { MemberTransaction } from '../types/memberAccountTypes';

export function StatementScreen() {
  const { colors } = useTheme();

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [fromDateInput, setFromDateInput] = useState('');
  const [toDateInput, setToDateInput] = useState('');
  const [activeFrom, setActiveFrom] = useState<string | undefined>(undefined);
  const [activeTo, setActiveTo] = useState<string | undefined>(undefined);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMemberTransactionsInfiniteQuery({
    from: activeFrom,
    to: activeTo,
    limit: 20,
  });

  const transactions = useMemo<MemberTransaction[]>(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  const totalCount = data?.pages[0]?.total ?? transactions.length;

  const handleApplyFilter = () => {
    setActiveFrom(fromDateInput.trim() || undefined);
    setActiveTo(toDateInput.trim() || undefined);
    setFilterModalVisible(false);
  };

  const handleResetFilter = () => {
    setFromDateInput('');
    setToDateInput('');
    setActiveFrom(undefined);
    setActiveTo(undefined);
    setFilterModalVisible(false);
  };

  const hasActiveFilter = Boolean(activeFrom || activeTo);

  return (
    <ScreenTemplate scrollable={false}>
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <DocumentTextIcon color={colors.onPrimary} size={24} />
          </View>
          <View>
            <AppText variant="title" accessibilityRole="header" className="font-bold text-text-primary">
              Account Statement
            </AppText>
            <AppText className="text-xs text-text-secondary mt-0.5">
              {totalCount} {totalCount === 1 ? 'transaction' : 'transactions'}
            </AppText>
          </View>
        </View>

        {/* Filter Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter statement transactions"
          onPress={() => setFilterModalVisible(true)}
          className={`flex-row items-center rounded-xl border p-2.5 shadow-sm ${
            hasActiveFilter ? 'border-primary bg-primary/10' : 'border-border bg-surface'
          }`}
        >
          <AdjustmentsHorizontalIcon
            color={hasActiveFilter ? colors.primary : colors.textSecondary}
            size={20}
          />
          {hasActiveFilter ? (
            <View className="ml-1.5 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </Pressable>
      </View>

      {/* Active Filter Chips */}
      {hasActiveFilter ? (
        <View className="mb-4 flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20">
            <CalendarDaysIcon color={colors.primary} size={14} />
            <AppText variant="label" className="ml-1.5 text-xs text-primary font-semibold">
              {activeFrom || 'Start'} → {activeTo || 'Today'}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear date filter"
              onPress={handleResetFilter}
              className="ml-2"
              hitSlop={6}
            >
              <XMarkIcon color={colors.primary} size={14} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Transactions List */}
      {isLoading ? (
        <View className="my-16 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
          <AppText className="mt-3 text-sm text-text-secondary">
            Loading your transaction statement...
          </AppText>
        </View>
      ) : transactions.length === 0 ? (
        <View className="my-16 items-center justify-center rounded-3xl border border-dashed border-border bg-surface p-8">
          <DocumentTextIcon color={colors.textSecondary} size={40} />
          <AppText className="mt-3 font-semibold text-text-primary text-center">
            No transactions found
          </AppText>
          <AppText className="mt-1 text-center text-xs text-text-secondary">
            {hasActiveFilter
              ? 'Try widening your date filter to view past records.'
              : 'Deposits, withdrawals, and share purchases will appear here.'}
          </AppText>
          {hasActiveFilter ? (
            <Button
              label="Reset Filters"
              variant="outline"
              onPress={handleResetFilter}
              className="mt-4"
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
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
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator color={colors.primary} size="small" />
              </View>
            ) : undefined
          }
        />
      )}

      {/* Date Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl border-t border-border bg-surface p-6 shadow-xl">
            <View className="mb-4 flex-row items-center justify-between border-b border-border pb-3">
              <AppText variant="title" className="font-bold text-text-primary">
                Filter by Date Range
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close filter dialog"
                onPress={() => setFilterModalVisible(false)}
                hitSlop={8}
              >
                <XMarkIcon color={colors.textSecondary} size={22} />
              </Pressable>
            </View>

            <FormField
              label="From Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-01-01"
              value={fromDateInput}
              onChangeText={setFromDateInput}
              autoCapitalize="none"
              autoCorrect={false}
              helperText="Earliest transaction date"
            />

            <FormField
              label="To Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-10-25"
              value={toDateInput}
              onChangeText={setToDateInput}
              autoCapitalize="none"
              autoCorrect={false}
              helperText="Latest transaction date"
            />

            <View className="mt-4 flex-row gap-3">
              <Button
                label="Reset"
                variant="outline"
                onPress={handleResetFilter}
                className="flex-1"
              />
              <Button
                label="Apply Filter"
                onPress={handleApplyFilter}
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenTemplate>
  );
}
