import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  UsersIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useHorecaAuthStore } from '@horeca/features/auth/store/horecaAuthStore';
import { resolveIsManager } from '@horeca/features/auth/utils/roleAccess';
import { useHorecaColors } from '@horeca/theme/colors';
import { DashboardDateFilter } from '../components/DashboardDateFilter';
import {
  EMPTY_DASHBOARD_DATA,
  useHorecaDashboard,
  useHorecaDashboardSettings,
} from '../hooks/useHorecaDashboard';
import {
  type DashboardDatePreset,
  resolvePresetDateSelection,
} from '../utils/dateRangePresets';

interface ReportsScreenProps {
  onLockTerminal: () => void;
  onOrdersPress?: () => void;
  onProfilePress?: () => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  onLockTerminal,
  onOrdersPress,
  onProfilePress,
}) => {
  const colors = useHorecaColors();
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const me = useHorecaAuthStore(state => state.me);
  const loginProfile = useHorecaAuthStore(state => state.loginProfile);

  const isManager = resolveIsManager({ loginProfile, me, activeStaff });

  const [preset, setPreset] = useState<DashboardDatePreset>('today');
  const [lastRangePreset, setLastRangePreset] =
    useState<Exclude<DashboardDatePreset, 'today'>>('this_week');
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>(() => {
    const week = resolvePresetDateSelection('this_week');
    return { from: week.from, to: week.to };
  });

  const selection = useMemo(
    () => resolvePresetDateSelection(preset, customRange),
    [preset, customRange],
  );

  const activeTab: 'daily' | 'range' = preset === 'today' ? 'daily' : 'range';

  const {
    displayData,
    isLoading,
    isFetching,
    errorMessage,
    refetch,
  } = useHorecaDashboard(selection, isManager);

  const {
    settings,
    updateSettings,
    isUpdatingSettings,
    updateError,
    resetUpdateError,
  } = useHorecaDashboardSettings(isManager);

  // Targets Modal state
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [draftTargetCheck, setDraftTargetCheck] = useState('45000');
  const [draftOptimalTurn, setDraftOptimalTurn] = useState('50');
  const [localTargetError, setLocalTargetError] = useState<string | null>(null);

  const effectiveTargetCheck =
    settings?.target_check ?? displayData.avg_check.target ?? 45_000;
  const effectiveOptimalTurn =
    settings?.optimal_turn ?? displayData.avg_turn_minutes.optimal ?? 50;

  const handleSelectTab = (tab: 'daily' | 'range') => {
    if (tab === 'daily') {
      setPreset('today');
    } else if (preset === 'today') {
      setPreset(lastRangePreset);
    }
  };

  const handleSelectPreset = (nextPreset: DashboardDatePreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'today') {
      setLastRangePreset(nextPreset);
    }
  };

  const handleApplyCustomRange = (from: string, to: string) => {
    setCustomRange({ from, to });
    setPreset('custom');
    setLastRangePreset('custom');
  };

  const openTargetsModal = () => {
    setDraftTargetCheck(String(Math.round(effectiveTargetCheck)));
    setDraftOptimalTurn(String(Math.round(effectiveOptimalTurn)));
    setLocalTargetError(null);
    resetUpdateError();
    setIsTargetsModalOpen(true);
  };

  const handleSaveTargets = async () => {
    const parsedTarget = Math.round(Number(draftTargetCheck.replace(/,/g, '').trim()));
    const parsedTurn = Math.round(Number(draftOptimalTurn.replace(/,/g, '').trim()));

    if (
      !Number.isFinite(parsedTarget) ||
      parsedTarget <= 0 ||
      !Number.isFinite(parsedTurn) ||
      parsedTurn <= 0
    ) {
      setLocalTargetError(
        'Enter an average check target and a table-turn time above zero.',
      );
      return;
    }

    setLocalTargetError(null);
    try {
      await updateSettings({
        target_check: parsedTarget,
        optimal_turn: parsedTurn,
      });
      setIsTargetsModalOpen(false);
      await refetch();
    } catch {
      // Error surfaced via updateError
    }
  };

  // Guard: Manager role only
  if (!isManager) {
    return (
      <ScreenTemplate
        className="bg-background"
        header={
          <HorecaAppBar
            title="Reports & Analytics"
            subtitle="EXECUTIVE DASHBOARD"
            onOrdersPress={onOrdersPress}
            onLockPress={onLockTerminal}
            onProfilePress={onProfilePress}
          />
        }
        contentContainerClassName="flex-1 items-center justify-center px-6"
      >
        <View className="h-16 w-16 rounded-2xl bg-error/10 border border-error/20 items-center justify-center mb-4">
          <ShieldExclamationIcon size={32} color={colors.error} />
        </View>
        <AppText variant="title" className="text-lg font-bold text-text text-center mb-1.5">
          Manager Access Required
        </AppText>
        <AppText variant="caption" className="text-text-secondary text-center max-w-xs">
          Reports & Analytics are restricted to staff with the Manager role.
        </AppText>
      </ScreenTemplate>
    );
  }

  const changePct = displayData.revenue.change_pct;
  const comparisonSuffix =
    activeTab === 'daily' ? 'vs yesterday' : 'vs previous period';
  const formattedChange =
    changePct === null || changePct === undefined
      ? `No prior sales (${comparisonSuffix})`
      : `${changePct >= 0 ? '+' : ''}${Number(changePct).toFixed(1)}% ${comparisonSuffix}`;

  const isChangePositive = changePct !== null && changePct !== undefined && changePct >= 0;
  const isChangeNegative = changePct !== null && changePct !== undefined && changePct < 0;

  const departments =
    displayData.departments.length > 0
      ? displayData.departments
      : EMPTY_DASHBOARD_DATA.departments;

  const getDepartmentColorClass = (key: string) => {
    switch (key) {
      case 'kitchen':
        return 'bg-primary';
      case 'bar':
        return 'bg-status-reserved';
      case 'soft':
      default:
        return 'bg-secondary';
    }
  };

  return (
    <ScreenTemplate
      scrollable
      withBottomInset
      className="bg-background"
      header={
        <HorecaAppBar
          title="Reports & Analytics"
          subtitle="EXECUTIVE DASHBOARD"
          onOrdersPress={onOrdersPress}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
        />
      }
      contentContainerClassName="px-4 py-4"
    >
      {/* Segmented Control: Today's Sales vs Date Range Summary */}
      <View className="flex-row p-1 bg-surface border border-border rounded-2xl mb-3.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Today's Sales"
          onPress={() => handleSelectTab('daily')}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === 'daily' ? 'bg-primary shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            variant="label"
            className={`font-bold ${
              activeTab === 'daily' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Today's Sales
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Date Range Summary"
          onPress={() => handleSelectTab('range')}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === 'range' ? 'bg-primary shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            variant="label"
            className={`font-bold ${
              activeTab === 'range' ? 'text-on-primary' : 'text-text'
            }`}
          >
            Date Range Summary
          </AppText>
        </Pressable>
      </View>

      {/* Date Filter Presets & Custom Date Picker */}
      <DashboardDateFilter
        selection={selection}
        onSelectPreset={handleSelectPreset}
        onApplyCustomRange={handleApplyCustomRange}
      />

      {/* Action Bar: Targets & Refresh */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center">
          {isFetching ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText variant="caption" className="text-text-secondary text-xs ml-2">
                Updating live figures...
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" className="text-text-secondary text-xs">
              Live figures (Kampala UTC+3 • 30s cache)
            </AppText>
          )}
        </View>

        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configure dashboard targets"
            onPress={openTargetsModal}
            className="flex-row items-center px-3 py-1.5 rounded-xl bg-surface border border-border mr-2 active:opacity-75"
          >
            <AdjustmentsHorizontalIcon size={14} color={colors.primary} />
            <AppText variant="caption" className="text-xs font-bold text-text ml-1.5">
              Targets
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh dashboard"
            disabled={isFetching}
            onPress={() => refetch()}
            className="h-8 w-8 rounded-xl bg-surface border border-border items-center justify-center active:opacity-75"
          >
            <ArrowPathIcon size={15} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {/* Red Error Banner (Keeps last good figures on screen per Handoff Section 5) */}
      {errorMessage ? (
        <View
          accessibilityRole="alert"
          className="flex-row items-start p-3.5 mb-4 rounded-2xl bg-error/10 border border-error/30"
        >
          <ExclamationTriangleIcon size={18} color={colors.error} />
          <View className="flex-1 ml-2.5">
            <AppText variant="caption" className="text-error font-bold text-xs">
              {errorMessage}
            </AppText>
            <AppText variant="caption" className="text-error/80 text-[11px] mt-0.5">
              Showing last loaded figures below.
            </AppText>
          </View>
        </View>
      ) : null}

      {/* KPI Cards 2x2 Grid */}
      <View className="flex-row flex-wrap justify-between mb-5">
        {/* 1. Total Revenue */}
        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Total Revenue
            </AppText>
            {isChangeNegative ? (
              <ArrowTrendingDownIcon color={colors.error} size={16} />
            ) : (
              <ArrowTrendingUpIcon color={colors.statusAvailable} size={16} />
            )}
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-primary">
            UGX {Math.round(displayData.revenue.total).toLocaleString()}
          </AppText>
          <AppText
            variant="caption"
            className={`text-[11px] font-semibold mt-1 ${
              isChangePositive
                ? 'text-status-available'
                : isChangeNegative
                  ? 'text-error'
                  : 'text-text-secondary'
            }`}
          >
            {formattedChange}
          </AppText>
        </View>

        {/* 2. Checks / Covers */}
        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Checks / Covers
            </AppText>
            <UsersIcon color={colors.primary} size={16} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-text">
            {displayData.checks.count}{' '}
            {displayData.checks.count === 1 ? 'Check' : 'Checks'}
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-[11px] mt-1">
            {displayData.checks.guests} Total{' '}
            {displayData.checks.guests === 1 ? 'Guest' : 'Guests'}
          </AppText>
        </View>

        {/* 3. Avg Check Size */}
        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Avg Check Size
            </AppText>
            <ChartBarIcon color={colors.primary} size={16} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-text">
            UGX {Math.round(displayData.avg_check.value).toLocaleString()}
          </AppText>
          <AppText variant="caption" className="text-text-secondary text-[11px] mt-1">
            Target: {Math.round(effectiveTargetCheck).toLocaleString()} UGX
          </AppText>
        </View>

        {/* 4. Avg Turn Time */}
        <View className="w-[48%] mb-3 p-4 rounded-2xl bg-surface border border-border shadow-sm">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText variant="caption" className="text-text-secondary text-[10px] font-bold uppercase">
              Avg Turn Time
            </AppText>
            <ClockIcon color={colors.onSurfaceVariant} size={16} />
          </View>
          <AppText variant="title" className="text-xl font-extrabold text-text">
            {Math.round(displayData.avg_turn_minutes.value)} min
          </AppText>
          <AppText
            variant="caption"
            className={`text-[11px] font-semibold mt-1 ${
              displayData.avg_turn_minutes.value <= effectiveOptimalTurn
                ? 'text-status-available'
                : 'text-status-reserved'
            }`}
          >
            Optimal: &lt; {Math.round(effectiveOptimalTurn)} min
          </AppText>
        </View>
      </View>

      {/* Sales by Department */}
      <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
        <AppText variant="title" className="text-lg font-bold text-text mb-3">
          Sales by Department
        </AppText>

        {departments.map(dept => (
          <View
            key={dept.key}
            className="flex-row items-center justify-between py-2.5 border-b border-border/40"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className={`h-3 w-3 rounded-md mr-2.5 ${getDepartmentColorClass(dept.key)}`} />
              <AppText variant="label" className="text-text font-medium">
                {dept.label}
              </AppText>
            </View>
            <AppText variant="label" className="font-bold text-text">
              UGX {Math.round(dept.amount).toLocaleString()} ({Math.round(dept.pct)}%)
            </AppText>
          </View>
        ))}
      </View>

      {/* Server Performance Leaderboard */}
      <View className="rounded-3xl bg-surface border border-border p-5 mb-5 shadow-sm">
        <AppText variant="title" className="text-lg font-bold text-text mb-3">
          Server Performance Leaderboard
        </AppText>

        {displayData.servers.length === 0 ? (
          <View className="py-6 items-center justify-center">
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppText variant="caption" className="text-text-secondary text-center">
                No server sales recorded for this period.
              </AppText>
            )}
          </View>
        ) : (
          displayData.servers.map((server, idx) => (
            <View
              key={server.id || `${server.name}-${idx}`}
              className="flex-row items-center justify-between py-2.5 border-b border-border/40"
            >
              <View className="flex-row items-center">
                <View className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mr-3">
                  <AppText variant="label" className="font-bold text-primary text-xs">
                    #{idx + 1}
                  </AppText>
                </View>
                <View>
                  <AppText variant="label" className="font-bold text-text">
                    {server.name}
                  </AppText>
                  <AppText variant="caption" className="text-text-secondary text-[11px]">
                    {server.covers} {server.covers === 1 ? 'Cover' : 'Covers'} Served
                  </AppText>
                </View>
              </View>
              <AppText variant="label" className="font-bold text-primary">
                UGX {Math.round(server.sales).toLocaleString()}
              </AppText>
            </View>
          ))
        )}
      </View>

      {/* Targets Settings Modal (GET / PUT /api/v1/horeca/dashboard/settings) */}
      <Modal
        visible={isTargetsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTargetsModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-4">
          <View className="w-full max-w-md rounded-3xl bg-surface border border-border p-5 shadow-2xl">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <AppText variant="title" className="text-lg font-bold text-text">
                  Dashboard Targets
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-xs">
                  Set average check target (UGX) and optimal table-turn time
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close targets modal"
                onPress={() => setIsTargetsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-background border border-border items-center justify-center"
              >
                <XMarkIcon size={16} color={colors.onSurface} />
              </Pressable>
            </View>

            <View className="mb-3">
              <AppText
                variant="caption"
                className="text-xs font-bold uppercase text-text-secondary mb-1.5"
              >
                Average Check Target (UGX)
              </AppText>
              <TextInput
                value={draftTargetCheck}
                onChangeText={t => {
                  setLocalTargetError(null);
                  setDraftTargetCheck(t);
                }}
                keyboardType="numeric"
                placeholder="45000"
                placeholderTextColor={colors.onSurfaceVariant}
                className="bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text"
              />
            </View>

            <View className="mb-4">
              <AppText
                variant="caption"
                className="text-xs font-bold uppercase text-text-secondary mb-1.5"
              >
                Optimal Table Turn Time (Minutes)
              </AppText>
              <TextInput
                value={draftOptimalTurn}
                onChangeText={t => {
                  setLocalTargetError(null);
                  setDraftOptimalTurn(t);
                }}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.onSurfaceVariant}
                className="bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text"
              />
            </View>

            {localTargetError || updateError ? (
              <AppText variant="caption" className="text-error text-xs font-semibold mb-3">
                {localTargetError || updateError}
              </AppText>
            ) : null}

            <View className="flex-row items-center">
              <View className="flex-1 mr-2">
                <Button
                  label="Cancel"
                  variant="secondary"
                  disabled={isUpdatingSettings}
                  onPress={() => setIsTargetsModalOpen(false)}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Save Targets"
                  variant="primary"
                  loading={isUpdatingSettings}
                  disabled={isUpdatingSettings}
                  onPress={handleSaveTargets}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenTemplate>
  );
};
