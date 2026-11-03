import { create } from 'zustand';
import { env } from '@shared/config/env';
import { tokenStorage } from '@shared/services/tokenStorage';
import { horecaApi } from '../../../api/horecaApiClient';
import type { MeResponse, StaffMember } from '../../../api/schemas';
import { mockStaffMembers } from '../../../mock/horecaMockData';

interface HorecaAuthState {
  status: 'hydrating' | 'unauthenticated' | 'authenticated' | 'locked';
  me: MeResponse | null;
  activeStaff: StaffMember | null;
  staffList: StaffMember[];
  autoLockSeconds: number;

  // Actions
  hydrate: () => Promise<void>;
  loginSuccess: (me: MeResponse, initialStaff?: StaffMember) => void;
  lockTerminal: () => void;
  unlockWithStaff: (staff: StaffMember) => void;
  logout: () => Promise<void>;
  setStaffList: (list: StaffMember[]) => void;
  switchToPinLogin: () => void;
  switchToPasswordLogin: () => void;
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
  activeStaff: env.ENABLE_MOCK ? mockStaffMembers[0] : null,
  staffList: env.ENABLE_MOCK ? mockStaffMembers : [],
  autoLockSeconds: 60,

  hydrate: async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        if (env.ENABLE_MOCK) {
          set({
            status: 'locked',
            staffList: mockStaffMembers,
            activeStaff: mockStaffMembers[0],
          });
        } else {
          set({
            status: 'unauthenticated',
            staffList: [],
            activeStaff: null,
            me: null,
          });
        }
        return;
      }

      // We have a stored token: fetch real user & staff from the live API
      const me = await horecaApi.me();
      const staff = await horecaApi.getStaff();
      set({
        me,
        staffList: staff.length > 0 ? staff : (env.ENABLE_MOCK ? mockStaffMembers : []),
        activeStaff: staff[0] ?? (env.ENABLE_MOCK ? mockStaffMembers[0] : null),
        status: 'locked', // Prompt PIN on app launch
      });
    } catch {
      if (env.ENABLE_MOCK) {
        set({
          status: 'locked',
          staffList: mockStaffMembers,
          activeStaff: mockStaffMembers[0],
        });
      } else {
        // If live API token verification fails, prompt full sign in with password
        set({
          status: 'unauthenticated',
          staffList: [],
          activeStaff: null,
          me: null,
        });
      }
    }
  },

  loginSuccess: (me, initialStaff) => {
    const staff = initialStaff ?? get().staffList[0] ?? (env.ENABLE_MOCK ? mockStaffMembers[0] : null);
    set({
      me,
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
    set({
      activeStaff: staff,
      status: 'authenticated',
    });
  },

  logout: async () => {
    try {
      await horecaApi.logout();
    } catch {
      // Ignore network errors during logout
    }
    await tokenStorage.clearTokens();
    set({
      status: 'unauthenticated',
      me: null,
      activeStaff: null,
      staffList: env.ENABLE_MOCK ? mockStaffMembers : [],
    });
  },

  setStaffList: staffList => set({ staffList }),
}));
