import * as Keychain from 'react-native-keychain';

import { persistedAuthSessionSchema } from '../../features/auth/schemas/authSchemas';
import type { PersistedAuthSession } from '../../features/auth/types/authTypes';

const KEYCHAIN_SERVICE = 'com.baigamats.auth.session';
const KEYCHAIN_ACCOUNT = 'baigamats_user_session';

export type TokenStorage = {
  getSession: () => Promise<PersistedAuthSession | null>;
  setSession: (payload: PersistedAuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
};

export function createKeychainTokenStorage(): TokenStorage {
  return {
    async getSession(): Promise<PersistedAuthSession | null> {
      try {
        const credentials = await Keychain.getGenericPassword({
          service: KEYCHAIN_SERVICE,
        });
        if (!credentials || !credentials.password) {
          return null;
        }
        const raw: unknown = JSON.parse(credentials.password);
        const parsed = persistedAuthSessionSchema.safeParse(raw);
        if (!parsed.success) {
          await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
          return null;
        }
        return parsed.data;
      } catch {
        return null;
      }
    },

    async setSession(payload: PersistedAuthSession): Promise<void> {
      const validated = persistedAuthSessionSchema.parse(payload);
      await Keychain.setGenericPassword(
        KEYCHAIN_ACCOUNT,
        JSON.stringify(validated),
        {
          service: KEYCHAIN_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    },

    async clearSession(): Promise<void> {
      try {
        await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
      } catch {
        // Ignore keychain reset errors when already empty
      }
    },
  };
}

export const tokenStorage: TokenStorage = createKeychainTokenStorage();
