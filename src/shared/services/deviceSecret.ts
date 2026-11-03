import * as Keychain from 'react-native-keychain';
import { generateSecureId } from '../utils/uuid';

const DEVICE_SECRET_SERVICE = 'com.baigamats.device.secret';
const DEVICE_SECRET_ACCOUNT = 'baigamats_device_secret';

let inMemorySecret: string | null = null;

/**
 * Returns this device's stable secret (>= 32 chars), generating and storing it
 * on first use so PIN logins are bound to the same device.
 */
export async function getDeviceSecret(): Promise<string> {
  if (inMemorySecret) return inMemorySecret;

  try {
    const stored = await Keychain.getGenericPassword({ service: DEVICE_SECRET_SERVICE });
    if (stored && stored.password && stored.password.length >= 32) {
      inMemorySecret = stored.password;
      return stored.password;
    }
  } catch {
    // Fall through and generate a new secret
  }

  const secret = generateSecureId(32);
  inMemorySecret = secret;
  try {
    await Keychain.setGenericPassword(DEVICE_SECRET_ACCOUNT, secret, {
      service: DEVICE_SECRET_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch {
    // Keep the in-memory copy for this session
  }
  return secret;
}
