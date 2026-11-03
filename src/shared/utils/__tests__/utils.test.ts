import { APP_VERSION, getAppVersionHeader } from '../appVersion';
import { generateIdempotencyKey, isValidIdempotencyKey } from '../idempotency';
import { formatCurrencyInput, formatUGX, parseCurrencyInput } from '../currency';

describe('appVersion', () => {
  it('formats the X-App-Version header correctly', () => {
    const header = getAppVersionHeader();
    expect(header).toMatch(/^(android|ios)\/\d+\.\d+\.\d+$/);
    expect(header).toContain(APP_VERSION);
  });
});

describe('idempotency', () => {
  it('generates a valid idempotency key conforming to 8-64 chars', () => {
    const key = generateIdempotencyKey();
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(64);
    expect(isValidIdempotencyKey(key)).toBe(true);
  });

  it('validates custom idempotency keys correctly', () => {
    expect(isValidIdempotencyKey('bmm_12345678')).toBe(true);
    expect(isValidIdempotencyKey('short')).toBe(false); // < 8 chars
    expect(isValidIdempotencyKey('invalid char with space')).toBe(false);
    expect(isValidIdempotencyKey('a'.repeat(65))).toBe(false); // > 64 chars
  });
});

describe('currency (UGX)', () => {
  it('formats whole UGX amounts with comma thousand separators', () => {
    expect(formatUGX(50000)).toBe('UGX 50,000');
    expect(formatUGX(1500000, { suffix: true })).toBe('1,500,000 UGX');
    expect(formatUGX(0)).toBe('UGX 0');
    expect(formatUGX(null)).toBe('UGX 0');
    expect(formatUGX(123456.78, { showCurrency: false })).toBe('123,457');
  });

  it('formats currency input while typing', () => {
    expect(formatCurrencyInput('50000')).toBe('50,000');
    expect(formatCurrencyInput('50,0000')).toBe('500,000');
    expect(formatCurrencyInput('abc12345xyz')).toBe('12,345');
    expect(formatCurrencyInput('')).toBe('');
  });

  it('parses formatted input string into integer', () => {
    expect(parseCurrencyInput('UGX 50,000')).toBe(50000);
    expect(parseCurrencyInput('1,500,000')).toBe(1500000);
    expect(parseCurrencyInput('')).toBe(0);
  });
});

