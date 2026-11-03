/**
 * Utility for formatting and parsing amounts in Ugandan Shillings (UGX).
 * As per Baigamats API brief:
 * - Whole UGX, represented as numbers.
 * - Formatted with thousand separators, including while typing.
 */

/**
 * Formats a numeric UGX amount with comma thousand separators.
 * E.g. 50000 -> "UGX 50,000" (or "50,000 UGX" if suffix = true)
 */
export function formatUGX(
  amount: number | null | undefined,
  options?: { showCurrency?: boolean; suffix?: boolean },
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return options?.showCurrency !== false ? 'UGX 0' : '0';
  }

  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('en-US');

  if (options?.showCurrency === false) {
    return formatted;
  }

  if (options?.suffix) {
    return `${formatted} UGX`;
  }

  return `UGX ${formatted}`;
}

/**
 * Formats a raw user text input while typing by removing non-digits
 * and injecting commas.
 * E.g. "50000" -> "50,000"
 */
export function formatCurrencyInput(rawInput: string): string {
  const digitsOnly = rawInput.replace(/\D/g, '');
  if (!digitsOnly) return '';
  const parsed = parseInt(digitsOnly, 10);
  if (Number.isNaN(parsed)) return '';
  return parsed.toLocaleString('en-US');
}

/**
 * Parses a formatted string like "50,000" or "UGX 50,000" into a whole integer.
 */
export function parseCurrencyInput(formatted: string): number {
  const digitsOnly = formatted.replace(/\D/g, '');
  if (!digitsOnly) return 0;
  const parsed = parseInt(digitsOnly, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

