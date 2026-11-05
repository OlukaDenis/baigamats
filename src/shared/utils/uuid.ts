function randomByte(): number {
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } })
    .crypto;
  if (cryptoApi?.getRandomValues) {
    return cryptoApi.getRandomValues(new Uint8Array(1))[0];
  }
  return Math.floor(Math.random() * 256);
}

/**
 * Generates an RFC 4122 version 4 UUID, e.g. `3b241101-e2bb-4255-8caf-4136c566a962`.
 * Always 36 characters long (32 hex digits + 4 dashes).
 */
export function generateUuid(): string {
  const bytes = Array.from({ length: 16 }, randomByte);
  // eslint-disable-next-line no-bitwise
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  // eslint-disable-next-line no-bitwise
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = bytes.map(b => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

/**
 * Generates a random identifier of at least `minLength` characters (default 32)
 * by concatenating UUIDs without dashes.
 */
export function generateSecureId(minLength = 32): string {
  let id = '';
  while (id.length < minLength) {
    id += generateUuid().replace(/-/g, '');
  }
  return id;
}
