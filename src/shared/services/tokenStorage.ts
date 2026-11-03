import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'com.baigamats.auth.session';
const KEYCHAIN_ACCOUNT = 'baigamats_user_session';

export type TokenStorage = {
  getSession: <T = any>() => Promise<T | null>;
  setSession: <T = any>(payload: T) => Promise<void>;
  clearSession: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  saveTokens: (tokens: { accessToken: string; refreshToken?: string }) => Promise<void>;
  clearTokens: () => Promise<void>;
};

export function createKeychainTokenStorage(): TokenStorage {
  return {
    async getSession<T = any>(): Promise<T | null> {
      try {
        const credentials = await Keychain.getGenericPassword({
          service: KEYCHAIN_SERVICE,
        });
        if (!credentials || !credentials.password) {
          return null;
        }
        return JSON.parse(credentials.password) as T;
      } catch {
        return null;
      }
    },

    async setSession<T = any>(payload: T): Promise<void> {
      await Keychain.setGenericPassword(
        KEYCHAIN_ACCOUNT,
        JSON.stringify(payload),
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

    async getAccessToken(): Promise<string | null> {
      const session = await this.getSession<any>();
      if (!session) return null;
      return (
        session.session?.accessToken ??
        session.session?.access_token ??
        session.accessToken ??
        session.access_token ??
        null
      );
    },

    async getRefreshToken(): Promise<string | null> {
      const session = await this.getSession<any>();
      if (!session) return null;
      return (
        session.session?.refreshToken ??
        session.session?.refresh_token ??
        session.refreshToken ??
        session.refresh_token ??
        null
      );
    },

    async saveTokens(tokens: { accessToken: string; refreshToken?: string }): Promise<void> {
      const existing = (await this.getSession<any>()) || {};
      await this.setSession({
        ...existing,
        session: {
          ...(existing.session || {}),
          accessToken: tokens.accessToken,
          access_token: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? existing.session?.refreshToken,
          refresh_token: tokens.refreshToken ?? existing.session?.refresh_token,
        },
      });
    },

    async clearTokens(): Promise<void> {
      await this.clearSession();
    },
  };
}

export const tokenStorage: TokenStorage = createKeychainTokenStorage();
