/**
 * Fast currency formatter for Ugandan Shilling (UGX).
 * Replaces heavy Intl / toLocaleString() inside render loops with regex-based formatting.
 */
export const formatUGX = (val: number): string => {
  if (typeof val !== 'number' || isNaN(val)) return '0';
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
