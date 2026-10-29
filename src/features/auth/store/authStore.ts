import { create } from 'zustand';

import { tokenStorage } from '../../../services/storage/tokenStorage';
import type {
  AuthProfile,
  AuthSession,
  AuthUser,
  MfaSession,
} from '../types/authTypes';
import type {
  MemberInfo,
  MemberSession,
  OrganizationInfo,
} from '../types/memberAuthTypes';

export type AuthStatus = 'hydrating' | 'unauthenticated' | 'authenticated';
export type AuthType = 'staff' | 'member';

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
  authType?: AuthType;
  member?: MemberInfo | null;
  organization?: OrganizationInfo | null;
  mustChangePassword?: boolean;
};

export type SetMemberAuthenticatedPayload = {
  session: MemberSession;
  member: MemberInfo;
  organization: OrganizationInfo;
  mustChangePassword?: boolean;
};

type AuthState = {
  status: AuthStatus;
  authType: AuthType;
  session: AuthSession | null;
  user: AuthUser | null;
  profile: AuthProfile | null;
  needsOrganizationSetup: boolean;
  member: MemberInfo | null;
  organization: OrganizationInfo | null;
  mustChangePassword: boolean;
  pendingMfa: PendingMfaState | null;

  setAuthenticated: (payload: SetAuthenticatedPayload) => Promise<void>;
  setMemberAuthenticated: (payload: SetMemberAuthenticatedPayload) => Promise<void>;
  updateSession: (session: AuthSession) => Promise<void>;
  setMustChangePassword: (mustChange: boolean) => Promise<void>;
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
  authType: 'staff',
  session: null,
  user: null,
  profile: null,
  needsOrganizationSetup: false,
  member: null,
  organization: null,
  mustChangePassword: false,
  pendingMfa: null,

  setAuthenticated: async ({
    session,
    user = null,
    profile = null,
    needsOrganizationSetup = false,
    authType = 'staff',
    member = null,
    organization = null,
    mustChangePassword = false,
  }) => {
    set({
      status: 'authenticated',
      authType,
      session,
      user,
      profile,
      needsOrganizationSetup,
      member,
      organization,
      mustChangePassword,
      pendingMfa: null,
    });
    await tokenStorage.setSession({
      authType,
      session,
      user,
      profile,
      needsOrganizationSetup,
      member: member ?? undefined,
      organization: organization ?? undefined,
      mustChangePassword,
    });
  },

  setMemberAuthenticated: async ({
    session,
    member,
    organization,
    mustChangePassword = false,
  }) => {
    const expiresAt =
      session.expires_at ??
      (session.expires_in
        ? Math.floor(Date.now() / 1000) + session.expires_in
        : Math.floor(Date.now() / 1000) + 15 * 60);

    const completeSession: AuthSession = {
      ...session,
      expires_at: expiresAt,
    };

    set({
      status: 'authenticated',
      authType: 'member',
      session: completeSession,
      member,
      organization,
      mustChangePassword,
      user: null,
      profile: null,
      needsOrganizationSetup: false,
      pendingMfa: null,
    });

    await tokenStorage.setSession({
      authType: 'member',
      session: completeSession,
      member,
      organization,
      mustChangePassword,
      user: null,
      profile: null,
      needsOrganizationSetup: false,
    });
  },

  updateSession: async session => {
    const {
      authType,
      user,
      profile,
      needsOrganizationSetup,
      member,
      organization,
      mustChangePassword,
    } = get();

    set({
      status: 'authenticated',
      session,
    });

    await tokenStorage.setSession({
      authType,
      session,
      user,
      profile,
      needsOrganizationSetup,
      member: member ?? undefined,
      organization: organization ?? undefined,
      mustChangePassword,
    });
  },

  setMustChangePassword: async mustChange => {
    set({ mustChangePassword: mustChange });
    const { authType, session, user, profile, needsOrganizationSetup, member, organization } =
      get();
    if (session) {
      await tokenStorage.setSession({
        authType,
        session,
        user,
        profile,
        needsOrganizationSetup,
        member: member ?? undefined,
        organization: organization ?? undefined,
        mustChangePassword: mustChange,
      });
    }
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
      authType: 'staff',
      session: null,
      user: null,
      profile: null,
      needsOrganizationSetup: false,
      member: null,
      organization: null,
      mustChangePassword: false,
      pendingMfa: null,
    });
    await tokenStorage.clearSession();
  },

  hydrateAuth: async refreshFn => {
    const stored = await tokenStorage.getSession();
    if (!stored) {
      set({
        status: 'unauthenticated',
        authType: 'staff',
        session: null,
        user: null,
        profile: null,
        needsOrganizationSetup: false,
        member: null,
        organization: null,
        mustChangePassword: false,
      });
      return;
    }

    if (isSessionExpired(stored.session) && refreshFn) {
      try {
        const refreshedSession = await refreshFn(stored.session.refresh_token);
        if (stored.authType === 'member') {
          await get().setMemberAuthenticated({
            session: refreshedSession,
            member: stored.member!,
            organization: stored.organization!,
            mustChangePassword: stored.mustChangePassword ?? false,
          });
        } else {
          await get().setAuthenticated({
            session: refreshedSession,
            user: stored.user,
            profile: stored.profile,
            needsOrganizationSetup: stored.needsOrganizationSetup,
            authType: 'staff',
          });
        }
        return;
      } catch {
        await get().clearAuth();
        return;
      }
    }

    set({
      status: 'authenticated',
      authType: stored.authType ?? (stored.session.access_token.startsWith('bmm_') ? 'member' : 'staff'),
      session: stored.session,
      user: stored.user,
      profile: stored.profile,
      needsOrganizationSetup: stored.needsOrganizationSetup,
      member: stored.member ?? null,
      organization: stored.organization ?? null,
      mustChangePassword: stored.mustChangePassword ?? false,
      pendingMfa: null,
    });
  },
}));
