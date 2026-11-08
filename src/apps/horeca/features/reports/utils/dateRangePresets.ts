export type DashboardDatePreset =
  | 'today'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_3_months'
  | 'this_year'
  | 'custom';

export interface DashboardDateSelection {
  preset: DashboardDatePreset;
  /** Used when preset === 'today' (single-day request) */
  date?: string;
  /** Used for range presets and custom range */
  from: string;
  to: string;
  label: string;
}

export const DASHBOARD_PRESET_OPTIONS: Array<{
  id: DashboardDatePreset;
  label: string;
}> = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3

/**
 * Returns a Date whose UTC year/month/date correspond to the current local date in Kampala (UTC+3).
 */
export function getKampalaNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + KAMPALA_OFFSET_MS);
}

/**
 * Formats a UTC-shifted Date into `YYYY-MM-DD`.
 */
export function formatYmd(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds `days` to a `YYYY-MM-DD` string and returns a new `YYYY-MM-DD` string.
 */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return formatYmd(dt);
}

/**
 * Returns today's `YYYY-MM-DD` in Kampala time (UTC+3).
 */
export function getTodayKampalaYmd(now: Date = new Date()): string {
  return formatYmd(getKampalaNow(now));
}

/**
 * Computes the date selection (`date` or `from` & `to`) for any preset in Kampala time (UTC+3).
 */
export function resolvePresetDateSelection(
  preset: DashboardDatePreset,
  customRange?: { from: string; to: string },
  now: Date = new Date(),
): DashboardDateSelection {
  const kampala = getKampalaNow(now);
  const todayYmd = formatYmd(kampala);
  const year = kampala.getUTCFullYear();
  const month = kampala.getUTCMonth();
  const dayOfMonth = kampala.getUTCDate();
  // Monday = 0 ... Sunday = 6
  const mondayIndex = (kampala.getUTCDay() + 6) % 7;

  switch (preset) {
    case 'today':
      return {
        preset: 'today',
        date: todayYmd,
        from: todayYmd,
        to: todayYmd,
        label: `Today (${todayYmd})`,
      };

    case 'this_week': {
      const startOfWeek = formatYmd(new Date(Date.UTC(year, month, dayOfMonth - mondayIndex)));
      return {
        preset: 'this_week',
        from: startOfWeek,
        to: todayYmd,
        label: `${startOfWeek} → ${todayYmd}`,
      };
    }

    case 'last_week': {
      const lastWeekMonday = formatYmd(
        new Date(Date.UTC(year, month, dayOfMonth - mondayIndex - 7)),
      );
      const lastWeekSunday = formatYmd(
        new Date(Date.UTC(year, month, dayOfMonth - mondayIndex - 1)),
      );
      return {
        preset: 'last_week',
        from: lastWeekMonday,
        to: lastWeekSunday,
        label: `${lastWeekMonday} → ${lastWeekSunday}`,
      };
    }

    case 'this_month': {
      const startOfMonth = formatYmd(new Date(Date.UTC(year, month, 1)));
      return {
        preset: 'this_month',
        from: startOfMonth,
        to: todayYmd,
        label: `${startOfMonth} → ${todayYmd}`,
      };
    }

    case 'last_3_months': {
      // 90 days inclusive (within the 92-day API range limit)
      const ninetyDaysAgo = addDaysYmd(todayYmd, -90);
      return {
        preset: 'last_3_months',
        from: ninetyDaysAgo,
        to: todayYmd,
        label: `${ninetyDaysAgo} → ${todayYmd}`,
      };
    }

    case 'this_year': {
      const startOfYear = `${year}-01-01`;
      return {
        preset: 'this_year',
        from: startOfYear,
        to: todayYmd,
        label: `${startOfYear} → ${todayYmd}`,
      };
    }

    case 'custom': {
      const from = customRange?.from?.trim() || addDaysYmd(todayYmd, -6);
      const to = customRange?.to?.trim() || todayYmd;
      return {
        preset: 'custom',
        from,
        to,
        label: `${from} → ${to}`,
      };
    }
  }
}

/**
 * Checks whether a string is a valid calendar date in `YYYY-MM-DD` format.
 */
export function isValidYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}
