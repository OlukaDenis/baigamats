import { create } from 'zustand';

import { tokenStorage } from '../../../services/storage/tokenStorage';
import type {
  AuthProfile,
  AuthSession,
  AuthUser,
  MfaSession,
} from '../types/authTypes';

export type AuthStatus = 'hydrating' | 'unauthenticated' | 'authenticated';

export type PendingMfaState = {
  factorId: string;
  mfaSession: MfaSession;
  loginId: string;
};

export type SetAuthenticatedPayload = {
  session: AuthSession;
  user?: AuthUser | null;
  profile?: AuthProfile | null;
  needsOrganizationSetup?: boolean;
};

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
  user: AuthUser | null;
  profile: AuthProfile | null;
  needsOrganizationSetup: boolean;
  pendingMfa: PendingMfaState | null;
  setAuthenticated: (payload: SetAuthenticatedPayload) => Promise<void>;
  updateSession: (session: AuthSession) => Promise<void>;
  setPendingMfa: (pendingMfa: PendingMfaState) => void;
  clearPendingMfa: () => void;
  clearAuth: () => Promise<void>;
  hydrateAuth: (
    refreshFn?: (refreshToken: string) => Promise<AuthSession>,
  ) => Promise<void>;
};

const EXPIRY_BUFFER_SECONDS = 60;

export function isSessionExpired(session: AuthSession, nowMs = Date.now()): boolean {
  if (!session.expires_at) {
    return false;
  }
  const nowSeconds = Math.floor(nowMs / 1000);
  return session.expires_at <= nowSeconds + EXPIRY_BUFFER_SECONDS;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'hydrating',
  session: null,
  user: null,
  profile: null,
  needsOrganizationSetup: false,
  pendingMfa: null,

  setAuthenticated: async ({
    session,
    user = null,
    profile = null,
    needsOrganizationSetup = false,
  }) => {
    set({
      status: 'authenticated',
      session,
      user,
      profile,
      needsOrganizationSetup,
      pendingMfa: null,
    });
    await tokenStorage.setSession({
      session,
      user,
      profile,
      needsOrganizationSetup,
    });
  },

  updateSession: async session => {
    const { user, profile, needsOrganizationSetup } = get();
    set({
      status: 'authenticated',
      session,
    });
    await tokenStorage.setSession({
      session,
      user,
      profile,
      needsOrganizationSetup,
    });
  },

  setPendingMfa: pendingMfa => {
    set({ pendingMfa });
  },

  clearPendingMfa: () => {
    set({ pendingMfa: null });
  },

  clearAuth: async () => {
    set({
      status: 'unauthenticated',
      session: null,
      user: null,
      profile: null,
      needsOrganizationSetup: false,
      pendingMfa: null,
    });
    await tokenStorage.clearSession();
  },

  hydrateAuth: async refreshFn => {
    const stored = await tokenStorage.getSession();
    if (!stored) {
      set({
        status: 'unauthenticated',
        session: null,
        user: null,
        profile: null,
        needsOrganizationSetup: false,
      });
      return;
    }

    if (isSessionExpired(stored.session) && refreshFn) {
      try {
        const refreshedSession = await refreshFn(stored.session.refresh_token);
        await get().setAuthenticated({
          session: refreshedSession,
          user: stored.user,
          profile: stored.profile,
          needsOrganizationSetup: stored.needsOrganizationSetup,
        });
        return;
      } catch {
        await get().clearAuth();
        return;
      }
    }

    set({
      status: 'authenticated',
      session: stored.session,
      user: stored.user,
      profile: stored.profile,
      needsOrganizationSetup: stored.needsOrganizationSetup,
      pendingMfa: null,
    });
  },
}));
