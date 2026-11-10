import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { useHorecaColors } from '@horeca/theme/colors';
import {
  DASHBOARD_PRESET_OPTIONS,
  type DashboardDatePreset,
  type DashboardDateSelection,
  formatYmd,
  getKampalaNow,
  isValidYmd,
} from '../utils/dateRangePresets';

interface DashboardDateFilterProps {
  selection: DashboardDateSelection;
  onSelectPreset: (preset: DashboardDatePreset) => void;
  onApplyCustomRange: (from: string, to: string) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DashboardDateFilter: React.FC<DashboardDateFilterProps> = ({
  selection,
  onSelectPreset,
  onApplyCustomRange,
}) => {
  const colors = useHorecaColors();
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [activeField, setActiveField] = useState<'from' | 'to'>('from');
  const [draftFrom, setDraftFrom] = useState(selection.from);
  const [draftTo, setDraftTo] = useState(selection.to);
  const [localError, setLocalError] = useState<string | null>(null);

  const initialKampala = useMemo(() => getKampalaNow(), []);
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    const [y] = (selection.to || '').split('-').map(Number);
    return y || initialKampala.getUTCFullYear();
  });
  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    const [, m] = (selection.to || '').split('-').map(Number);
    return m ? m - 1 : initialKampala.getUTCMonth();
  });

  const openCustomPicker = () => {
    setDraftFrom(selection.from);
    setDraftTo(selection.to);
    setActiveField('from');
    setLocalError(null);
    const [y, m] = (selection.from || '').split('-').map(Number);
    if (y && m) {
      setCalendarYear(y);
      setCalendarMonth(m - 1);
    }
    setIsCustomModalOpen(true);
  };

  const handleChipPress = (preset: DashboardDatePreset) => {
    if (preset === 'custom') {
      openCustomPicker();
      return;
    }
    onSelectPreset(preset);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(y => y - 1);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(y => y + 1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(calendarYear, calendarMonth, 1));
    const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate();
    // Monday = 0 ... Sunday = 6
    const leadingEmpty = (firstDayOfMonth.getUTCDay() + 6) % 7;

    const cells: Array<{ key: string; ymd: string | null; day: number | null }> = [];
    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push({ key: `empty-${i}`, ymd: null, day: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const ymd = formatYmd(new Date(Date.UTC(calendarYear, calendarMonth, d)));
      cells.push({ key: ymd, ymd, day: d });
    }
    return cells;
  }, [calendarYear, calendarMonth]);

  const handleDayPress = (ymd: string) => {
    setLocalError(null);
    if (activeField === 'from') {
      setDraftFrom(ymd);
      if (draftTo && ymd > draftTo) {
        setDraftTo(ymd);
      }
      setActiveField('to');
    } else {
      setDraftTo(ymd);
    }
  };

  const selectedSpanDays = useMemo(() => {
    if (!isValidYmd(draftFrom) || !isValidYmd(draftTo)) return null;
    const fromMs = Date.parse(`${draftFrom}T00:00:00Z`);
    const toMs = Date.parse(`${draftTo}T00:00:00Z`);
    return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24)) + 1;
  }, [draftFrom, draftTo]);

  const handleApplyCustom = () => {
    const cleanFrom = draftFrom.trim();
    const cleanTo = draftTo.trim();
    if (!isValidYmd(cleanFrom) || !isValidYmd(cleanTo)) {
      setLocalError('Send both from and to as YYYY-MM-DD.');
      return;
    }
    setLocalError(null);
    setIsCustomModalOpen(false);
    onApplyCustomRange(cleanFrom, cleanTo);
  };

  return (
    <View className="mb-4">
      {/* Horizontal Date Filter Presets */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 2 }}
      >
        {DASHBOARD_PRESET_OPTIONS.map(option => {
          const isSelected = selection.preset === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${option.label}`}
              onPress={() => handleChipPress(option.id)}
              className={`mr-2 px-3.5 py-2 rounded-horeca border flex-row items-center ${
                isSelected
                  ? 'bg-primary border-primary'
                  : 'bg-surface border-border active:opacity-80'
              }`}
            >
              {option.id === 'custom' ? (
                <CalendarDaysIcon
                  size={14}
                  color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                />
              ) : null}
              <AppText
                variant="caption"
                className={`text-xs font-bold ${option.id === 'custom' ? 'ml-1' : ''} ${
                  isSelected ? 'text-on-primary' : 'text-text'
                }`}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Active Period Summary Row */}
      <View className="flex-row items-center justify-between mt-2.5 px-3 py-2 rounded-horeca bg-surface/80 border border-border/60">
        <View className="flex-row items-center flex-1 mr-2">
          <CalendarDaysIcon size={15} color={colors.primary} />
          <AppText variant="caption" className="text-xs text-text font-semibold ml-2">
            Period: {selection.label}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open custom date range picker"
          onPress={openCustomPicker}
          className="px-2.5 py-1 rounded-horeca bg-primary/10 border border-primary/20 active:opacity-75"
        >
          <AppText variant="caption" className="text-[11px] font-bold text-primary">
            Pick Dates
          </AppText>
        </Pressable>
      </View>

      {/* Custom Date Range Picker Modal */}
      <Modal
        visible={isCustomModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-4">
          <View className="w-full max-w-md rounded-3xl bg-surface border border-border p-5 shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <AppText variant="title" className="text-lg font-bold text-text">
                  Select Date Range
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-xs">
                  Choose start (From) and end (To) dates (up to 92 days)
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close date picker"
                onPress={() => setIsCustomModalOpen(false)}
                className="h-8 w-8 rounded-full bg-background border border-border items-center justify-center"
              >
                <XMarkIcon size={16} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* From / To Inputs & Active Selector */}
            <View className="flex-row justify-between mb-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select From date"
                onPress={() => setActiveField('from')}
                className={`min-h-[58px] w-[48%] p-2.5 rounded-horeca border ${
                  activeField === 'from'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-input'
                }`}
              >
                <AppText
                  variant="caption"
                  className="text-[10px] font-bold uppercase text-text-secondary mb-1"
                >
                  From (YYYY-MM-DD)
                </AppText>
                <TextInput
                  value={draftFrom}
                  onFocus={() => setActiveField('from')}
                  onChangeText={t => {
                    setLocalError(null);
                    setDraftFrom(t);
                  }}
                  placeholder="2026-11-01"
                  placeholderTextColor={colors.onSurfaceVariant}
                  maxLength={10}
                  className="text-sm font-bold text-text py-0.5"
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select To date"
                onPress={() => setActiveField('to')}
                className={`min-h-[58px] w-[48%] p-2.5 rounded-horeca border ${
                  activeField === 'to'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-input'
                }`}
              >
                <AppText
                  variant="caption"
                  className="text-[10px] font-bold uppercase text-text-secondary mb-1"
                >
                  To (YYYY-MM-DD)
                </AppText>
                <TextInput
                  value={draftTo}
                  onFocus={() => setActiveField('to')}
                  onChangeText={t => {
                    setLocalError(null);
                    setDraftTo(t);
                  }}
                  placeholder="2026-11-07"
                  placeholderTextColor={colors.onSurfaceVariant}
                  maxLength={10}
                  className="text-sm font-bold text-text py-0.5"
                />
              </Pressable>
            </View>

            {/* Calendar Month Navigation */}
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={handlePrevMonth}
                className="h-8 w-8 rounded-horeca bg-background border border-border items-center justify-center"
              >
                <ChevronLeftIcon size={16} color={colors.onSurface} />
              </Pressable>

              <AppText variant="label" className="font-bold text-text text-sm">
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </AppText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={handleNextMonth}
                className="h-8 w-8 rounded-horeca bg-background border border-border items-center justify-center"
              >
                <ChevronRightIcon size={16} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Weekday Header */}
            <View className="flex-row mb-1">
              {WEEKDAYS.map(day => (
                <View key={day} className="w-[14.28%] items-center py-1">
                  <AppText variant="caption" className="text-[10px] font-bold text-text-secondary">
                    {day}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View className="flex-row flex-wrap mb-3">
              {calendarCells.map(cell => {
                if (!cell.ymd || cell.day === null) {
                  return <View key={cell.key} className="w-[14.28%] h-9" />;
                }

                const isStart = cell.ymd === draftFrom;
                const isEnd = cell.ymd === draftTo;
                const isInRange =
                  draftFrom &&
                  draftTo &&
                  draftFrom <= draftTo &&
                  cell.ymd > draftFrom &&
                  cell.ymd < draftTo;

                return (
                  <Pressable
                    key={cell.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${cell.ymd}`}
                    onPress={() => handleDayPress(cell.ymd!)}
                    className={`w-[14.28%] h-9 items-center justify-center rounded-horeca ${
                      isStart || isEnd
                        ? 'bg-primary'
                        : isInRange
                          ? 'bg-primary/15'
                          : 'bg-transparent'
                    }`}
                  >
                    <AppText
                      variant="caption"
                      className={`text-xs font-semibold ${
                        isStart || isEnd
                          ? 'text-on-primary font-bold'
                          : isInRange
                            ? 'text-primary font-bold'
                            : 'text-text'
                      }`}
                    >
                      {cell.day}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Span / Validation Hint */}
            {localError ? (
              <AppText variant="caption" className="text-error text-xs font-semibold mb-3">
                {localError}
              </AppText>
            ) : selectedSpanDays !== null ? (
              <AppText
                variant="caption"
                className={`text-xs mb-3 ${
                  selectedSpanDays > 92 || selectedSpanDays < 1
                    ? 'text-error font-semibold'
                    : 'text-text-secondary'
                }`}
              >
                {selectedSpanDays < 1
                  ? 'The from day must not be after the to day.'
                  : `${selectedSpanDays} ${selectedSpanDays === 1 ? 'day' : 'days'} selected${
                      selectedSpanDays > 92 ? ' (Exceeds 92-day limit)' : ''
                    }`}
              </AppText>
            ) : null}

            {/* Actions */}
            <View className="flex-row items-center">
              <View className="flex-1 mr-2">
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setIsCustomModalOpen(false)}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Apply Range"
                  variant="primary"
                  onPress={handleApplyCustom}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
