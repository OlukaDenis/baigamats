import { useEffect, useRef } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type {
  HorecaDashboardData,
  HorecaDashboardSettings,
  UpdateHorecaDashboardSettingsDto,
} from '@horeca/api/schemas';
import type { DashboardDateSelection } from '../utils/dateRangePresets';

export const HORECA_DASHBOARD_QUERY_KEY = ['horeca', 'dashboard'] as const;
export const HORECA_DASHBOARD_SETTINGS_QUERY_KEY = [
  'horeca',
  'dashboard',
  'settings',
] as const;

export const EMPTY_DASHBOARD_DATA: HorecaDashboardData = {
  revenue: { total: 0, change_pct: null },
  checks: { count: 0, guests: 0 },
  avg_check: { value: 0, target: 45_000 },
  avg_turn_minutes: { value: 0, optimal: 50 },
  departments: [
    { key: 'kitchen', label: 'Kitchen / Food', amount: 0, pct: 0 },
    { key: 'bar', label: 'Bar / Alcoholic', amount: 0, pct: 0 },
    { key: 'soft', label: 'Non-Alcoholic Beverages', amount: 0, pct: 0 },
  ],
  servers: [],
};

/**
 * Fetches live HORECA Manager Dashboard metrics for a single day (`date`) or date range (`from`, `to`).
 * Respects the 30-second server cache and retains the last good figures when an error occurs.
 */
export function useHorecaDashboard(
  selection: DashboardDateSelection,
  enabled = true,
) {
  const lastGoodDataRef = useRef<HorecaDashboardData | null>(null);

  const queryParams =
    selection.preset === 'today'
      ? { date: selection.date ?? selection.from }
      : { from: selection.from, to: selection.to };

  const query = useQuery<HorecaDashboardData, Error>({
    queryKey: [
      ...HORECA_DASHBOARD_QUERY_KEY,
      selection.preset === 'today' ? 'day' : 'range',
      queryParams,
    ],
    queryFn: () => horecaApi.getDashboard(queryParams),
    enabled,
    staleTime: 30 * 1000, // 30s server cache per handoff section 6
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      lastGoodDataRef.current = query.data;
    }
  }, [query.data]);

  const displayData: HorecaDashboardData =
    query.data ?? lastGoodDataRef.current ?? EMPTY_DASHBOARD_DATA;

  return {
    ...query,
    displayData,
    hasLoadedOnce: Boolean(query.data || lastGoodDataRef.current),
    errorMessage: query.error?.message ?? null,
  };
}

/**
 * Reads and updates the client's average check and table-turn targets
 * (`GET / PUT /api/v1/horeca/dashboard/settings`).
 */
export function useHorecaDashboardSettings(enabled = true) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<HorecaDashboardSettings, Error>({
    queryKey: HORECA_DASHBOARD_SETTINGS_QUERY_KEY,
    queryFn: () => horecaApi.getDashboardSettings(),
    enabled,
    staleTime: 30 * 1000,
    retry: false,
  });

  const updateMutation = useMutation<
    HorecaDashboardSettings,
    Error,
    UpdateHorecaDashboardSettingsDto
  >({
    mutationFn: dto => horecaApi.updateDashboardSettings(dto),
    onSuccess: updated => {
      queryClient.setQueryData(HORECA_DASHBOARD_SETTINGS_QUERY_KEY, updated);
      queryClient.invalidateQueries({ queryKey: HORECA_DASHBOARD_QUERY_KEY }).catch(() => {});
    },
  });

  return {
    settings: settingsQuery.data,
    isLoadingSettings: settingsQuery.isLoading,
    settingsError: settingsQuery.error?.message ?? null,
    refetchSettings: settingsQuery.refetch,
    updateSettings: updateMutation.mutateAsync,
    isUpdatingSettings: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,
    resetUpdateError: updateMutation.reset,
  };
}
