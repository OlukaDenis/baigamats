import * as Keychain from 'react-native-keychain';
import { create } from 'zustand';
import { env } from '@shared/config/env';
import { tokenStorage } from '@shared/services/tokenStorage';
import { horecaApi } from '../../../api/horecaApiClient';
import type { LoginResponse, MeResponse, StaffMember } from '../../../api/schemas';
import { databaseManager } from '../../../db/DatabaseManager';
import { useHorecaStore } from '../../../db/offlineStore';
import { mockStaffMembers } from '../../../mock/horecaMockData';
import { fetchAndStoreBusinessProfile } from '../hooks/useBusinessProfile';
import {
  type LoginProfile,
  type LoginUser,
  resolveMatchingStaff,
} from '../utils/roleAccess';

const LAST_USERNAME_SERVICE = 'com.baigamats.horeca.auth.last_username';
const LAST_USERNAME_ACCOUNT = 'last_staff_username';

interface StoredAuthSession {
  user?: LoginUser | null;
  profile?: LoginProfile | null;
}

interface HorecaAuthState {
  status: 'hydrating' | 'unauthenticated' | 'authenticated' | 'locked';
  me: MeResponse | null;
  loginUser: LoginUser | null;
  loginProfile: LoginProfile | null;
  activeStaff: StaffMember | null;
  staffList: StaffMember[];
  autoLockSeconds: number;
  lastUsername: string;

  // Actions
  hydrate: () => Promise<void>;
  loginSuccess: (
    me: MeResponse,
    initialStaff?: StaffMember,
    loginMeta?: {
      user?: LoginResponse['user'];
      profile?: LoginResponse['profile'];
    },
  ) => void;
  lockTerminal: () => void;
  unlockWithStaff: (staff: StaffMember) => void;
  logout: () => Promise<void>;
  setMe: (me: MeResponse) => void;
  setStaffList: (list: StaffMember[]) => void;
  switchToPinLogin: () => void;
  switchToPasswordLogin: () => void;
  setLastUsername: (username: string) => Promise<void>;
}

export const useHorecaAuthStore = create<HorecaAuthState>((set, get) => ({
  status: 'hydrating',
  me: env.ENABLE_MOCK
    ? {
        userId: 'staff-01',
        name: 'Alex R.',
        organizationId: 'org-horeca-01',
        role: 'manager',
        permissions: [
          'tables:read',
          'tables:write',
          'orders:read',
          'orders:write',
          'billing:write',
          'payments:read',
          'reports:read',
          'shifts:read',
          'shifts:write',
          'staff:write',
        ],
      }
    : null,
  loginUser: env.ENABLE_MOCK ? { id: 'staff-01', email: 'alex@horeca.com' } : null,
  loginProfile: env.ENABLE_MOCK ? { organizationId: 'org-horeca-01', role: 'manager' } : null,
  activeStaff: env.ENABLE_MOCK ? mockStaffMembers[0] : null,
  staffList: env.ENABLE_MOCK ? mockStaffMembers : [],
  autoLockSeconds: 360, // 6 minutes (360 seconds)
  lastUsername: '',

  hydrate: async () => {
    // 1. Restore cached last-used username
    try {
      const storedCreds = await Keychain.getGenericPassword({
        service: LAST_USERNAME_SERVICE,
      });
      if (storedCreds && storedCreds.password) {
        set({ lastUsername: storedCreds.password });
      }
    } catch {
      // Ignore keychain read failure
    }

    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        if (env.ENABLE_MOCK) {
          set({
            status: 'locked',
            loginUser: { id: mockStaffMembers[0].id, email: 'alex@horeca.com' },
            loginProfile: { organizationId: 'org-horeca-01', role: 'manager' },
            staffList: mockStaffMembers,
            activeStaff: mockStaffMembers[0],
          });
        } else {
          set({
            status: 'unauthenticated',
            loginUser: null,
            loginProfile: null,
            staffList: [],
            activeStaff: null,
            me: null,
          });
        }
        return;
      }

      const storedSession = await tokenStorage.getSession<StoredAuthSession>();

      // We have a stored token: fetch real user & staff from the live API
      const me = await horecaApi.me();
      let staff: StaffMember[] = [];
      try {
        staff = await horecaApi.getStaff();
      } catch {
        // Staff list endpoint may be restricted for non-manager roles
      }

      const targetUserId = me.userId || storedSession?.user?.id || '';
      const active =
        resolveMatchingStaff(staff, targetUserId) ??
        (env.ENABLE_MOCK ? mockStaffMembers[0] : null);
      const activeId = active?.id || targetUserId;

      // Mount isolated SQLite database for authenticated staff
      if (activeId) {
        databaseManager.setCurrentUser(activeId);
      }
      useHorecaStore.getState().hydrateBusinessProfile();
      useHorecaStore.getState().hydrateTables();
      useHorecaStore.getState().hydrateMenu();
      fetchAndStoreBusinessProfile().catch(() => {});

      set({
        me,
        loginUser: storedSession?.user ?? null,
        loginProfile: storedSession?.profile ?? null,
        staffList: staff.length > 0 ? staff : (env.ENABLE_MOCK ? mockStaffMembers : []),
        activeStaff: active,
        status: 'locked', // Prompt PIN on app launch
      });
    } catch {
      if (env.ENABLE_MOCK) {
        databaseManager.setCurrentUser(mockStaffMembers[0].id);
        useHorecaStore.getState().hydrateTables();
        useHorecaStore.getState().hydrateMenu();
        set({
          status: 'locked',
          loginUser: { id: mockStaffMembers[0].id, email: 'alex@horeca.com' },
          loginProfile: { organizationId: 'org-horeca-01', role: 'manager' },
          staffList: mockStaffMembers,
          activeStaff: mockStaffMembers[0],
        });
      } else {
        // If live API token verification fails, prompt full sign in with password
        databaseManager.clearAll();
        useHorecaStore.getState().resetStore();
        set({
          status: 'unauthenticated',
          loginUser: null,
          loginProfile: null,
          staffList: [],
          activeStaff: null,
          me: null,
        });
      }
    }
  },

  setLastUsername: async (username: string) => {
    const clean = username.trim();
    set({ lastUsername: clean });
    try {
      if (clean) {
        await Keychain.setGenericPassword(LAST_USERNAME_ACCOUNT, clean, {
          service: LAST_USERNAME_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
    } catch {
      // Retain in memory
    }
  },

  loginSuccess: (me, initialStaff, loginMeta) => {
    const targetUserId = me.userId || loginMeta?.user?.id || '';
    const staff =
      initialStaff ??
      resolveMatchingStaff(get().staffList, targetUserId) ??
      (env.ENABLE_MOCK ? resolveMatchingStaff(mockStaffMembers, targetUserId) : null);
    const activeId = staff?.id || targetUserId;

    // Switch to the staff member's isolated SQLite database
    if (activeId) {
      databaseManager.setCurrentUser(activeId);
    }
    useHorecaStore.getState().resetStore();
    useHorecaStore.getState().hydrateBusinessProfile();
    useHorecaStore.getState().hydrateTables();
    useHorecaStore.getState().hydrateMenu();
    fetchAndStoreBusinessProfile().catch(() => {});

    set({
      me,
      loginUser: loginMeta?.user ?? null,
      loginProfile: loginMeta?.profile ?? null,
      activeStaff: staff,
      status: 'authenticated',
    });
  },

  lockTerminal: () => {
    set({ status: 'locked' });
  },

  switchToPinLogin: () => {
    set({ status: 'locked' });
  },

  switchToPasswordLogin: () => {
    set({ status: 'unauthenticated' });
  },

  unlockWithStaff: staff => {
    const previousStaffId = get().activeStaff?.id;
    const switchedStaff = previousStaffId !== staff.id;
    if (switchedStaff) {
      // Switch staff user: mount the new staff's isolated SQLite database
      databaseManager.setCurrentUser(staff.id);
      useHorecaStore.getState().resetStore();
      useHorecaStore.getState().hydrateBusinessProfile();
      useHorecaStore.getState().hydrateTables();
      useHorecaStore.getState().hydrateMenu();
    }
    fetchAndStoreBusinessProfile().catch(() => {});

    set({
      activeStaff: staff,
      loginProfile: switchedStaff
        ? {
            organizationId:
              get().loginProfile?.organizationId ?? get().me?.organizationId ?? '',
            role: staff.access,
          }
        : get().loginProfile,
      status: 'authenticated',
    });
  },

  logout: async () => {
    let token: string | null = null;
    try {
      token = await tokenStorage.getAccessToken();
    } catch {
      // Ignore keychain read errors during logout
    }

    // Fire-and-forget logout endpoint so the user navigates to login immediately
    void horecaApi.logout(token ?? undefined).catch(() => {});

    // Cleanly unmount SQLite database and purge store memory
    databaseManager.clearAll();
    useHorecaStore.getState().resetStore();

    set({
      status: 'unauthenticated',
      me: null,
      loginUser: null,
      loginProfile: null,
      activeStaff: null,
      staffList: env.ENABLE_MOCK ? mockStaffMembers : [],
    });

    try {
      await tokenStorage.clearTokens();
    } catch {
      // Ignore token storage cleanup errors during logout
    }
  },

  setMe: me => {
    const state = get();
    if (state.status === 'unauthenticated') return;
    if (state.loginUser?.id && me.userId && state.loginUser.id !== me.userId) return;
    set({ me });
  },

  setStaffList: staffList => set({ staffList }),
}));
