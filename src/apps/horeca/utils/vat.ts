import type { BusinessProfile, BusinessVatSettings } from '../api/schemas';

export interface VatBreakdown {
  enabled: boolean;
  label: string;
  ratePct: number;
  inclusive: boolean;
  netAmount: number;
  vatAmount: number;
  grandTotal: number;
}

/**
 * Calculates Ugandan Shilling (UGX) VAT breakdown rounded to whole shillings
 * according to the business's tax settings from `GET /api/v1/business`.
 *
 * - Inclusive: `vat = round(total * rate / (100 + rate))`, `net = total - vat`
 * - Exclusive: `vat = round(net * rate / 100)`, `grandTotal = net + vat`
 * - Disabled: `vat = 0`, `net = round(amount)`, `grandTotal = round(amount)`
 */
export function calculateVatBreakdown(
  baseAmount: number,
  vatConfig?: BusinessVatSettings | null,
): VatBreakdown {
  const safeBase = Math.max(0, Math.round(Number(baseAmount) || 0));

  if (!vatConfig || !vatConfig.enabled) {
    return {
      enabled: false,
      label: vatConfig?.name?.trim() || 'VAT',
      ratePct: vatConfig?.rate_pct ?? 18,
      inclusive: vatConfig?.inclusive ?? true,
      netAmount: safeBase,
      vatAmount: 0,
      grandTotal: safeBase,
    };
  }

  const rate = Math.max(0, Number(vatConfig.rate_pct) || 0);
  const label = vatConfig.name?.trim() || 'VAT';
  const inclusive = vatConfig.inclusive !== false;

  if (inclusive) {
    const vatAmount = rate > 0 ? Math.round((safeBase * rate) / (100 + rate)) : 0;
    const netAmount = Math.max(0, safeBase - vatAmount);
    return {
      enabled: true,
      label,
      ratePct: rate,
      inclusive: true,
      netAmount,
      vatAmount,
      grandTotal: safeBase,
    };
  }

  // Exclusive VAT: added on top of item prices
  const vatAmount = rate > 0 ? Math.round((safeBase * rate) / 100) : 0;
  const grandTotal = safeBase + vatAmount;
  return {
    enabled: true,
    label,
    ratePct: rate,
    inclusive: false,
    netAmount: safeBase,
    vatAmount,
    grandTotal,
  };
}

/**
 * Resolves the business trading name (`name`), falling back to registered `legal_name`.
 */
export function resolveBusinessName(
  business?: BusinessProfile | null,
  fallback?: string | null,
): string {
  const trading = business?.name?.trim();
  if (trading) return trading;
  const legal = business?.legal_name?.trim();
  if (legal) return legal;
  const fb = fallback?.trim();
  if (fb) return fb;
  return '';
}

/**
 * Returns the TIN to print ONLY if `tin` is non-null/non-empty AND `receipt.show_tin` is true.
 */
export function resolvePrintableTin(business?: BusinessProfile | null): string | null {
  if (!business?.receipt?.show_tin) {
    return null;
  }
  const tin = business.tin?.trim();
  if (!tin || tin.toLowerCase() === 'null') {
    return null;
  }
  return tin;
}

/**
 * Returns a real EFRIS / fiscal number only when provided by the sale or receipt response.
 * Filters out null, empty, or legacy dummy strings.
 */
export function resolveRealFiscalNumber(source?: {
  fdn?: string | null;
  efrisInvoiceNumber?: string | null;
  efrisNumber?: string | null;
  fiscalNumber?: string | null;
} | null): string | null {
  if (!source) return null;
  const candidates = [
    source.fdn,
    source.efrisInvoiceNumber,
    source.efrisNumber,
    source.fiscalNumber,
  ];
  for (const raw of candidates) {
    const cleaned = raw?.trim();
    if (
      cleaned &&
      cleaned.toLowerCase() !== 'null' &&
      cleaned !== 'EFRIS-UG-2026-88192'
    ) {
      return cleaned;
    }
  }
  return null;
}
