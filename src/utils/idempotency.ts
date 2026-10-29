/**
 * Generates an idempotency key satisfying Baigamats API rules:
 * - 8 to 64 characters
 * - Letters, digits, and `-_.:`
 */
export function generateIdempotencyKey(prefix = 'bmg'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 12);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const rawKey = `${prefix}_${timestamp}_${randomPart}_${randomSuffix}`;
  // Ensure length is between 8 and 64 characters
  return rawKey.slice(0, 64);
}

/**
 * Validates whether a given key conforms to the 8-64 char requirement.
 */
export function isValidIdempotencyKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  return /^[a-zA-Z0-9_\-\.:]{8,64}$/.test(key);
}

