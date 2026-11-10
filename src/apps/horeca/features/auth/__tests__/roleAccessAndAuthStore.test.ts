import { tokenStorage } from '@shared/services/tokenStorage';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { MeResponse, StaffMember } from '@horeca/api/schemas';
import { databaseManager } from '@horeca/db/DatabaseManager';
import { useHorecaAuthStore } from '../store/horecaAuthStore';
import { resolveIsManager, resolveMatchingStaff } from '../utils/roleAccess';

jest.mock('@horeca/db/DatabaseManager', () => ({
  database: {
    get: jest.fn(() => ({
      query: jest.fn(() => ({
        fetch: jest.fn().mockResolvedValue([]),
        observe: jest.fn(() => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) })),
        observeCount: jest.fn(() => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) })),
      })),
    })),
    write: jest.fn(cb => cb()),
    batch: jest.fn(),
  },
  databaseManager: {
    setCurrentUser: jest.fn(),
    getCurrentUserId: jest.fn(() => 'staff-01'),
    clearAll: jest.fn(),
    getDatabase: jest.fn(),
  },
}));

const waiterStaff: StaffMember = {
  id: 'staff-waiter-1',
  name: 'Waiter One',
  role: 'Waiter',
  access: 'waiter',
  hasPin: true,
};

const managerStaffWithWaiterAppAccess: StaffMember = {
  id: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
  name: 'Denny Manager',
  role: 'staff',
  access: 'waiter',
  hasPin: true,
};

const managerMe: MeResponse = {
  userId: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
  name: 'Denny Manager',
  organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
  role: 'staff',
  permissions: [],
};

describe('roleAccess helpers', () => {
  it('treats loginProfile.role === "manager" as manager even when activeStaff has waiter access or is null', () => {
    expect(
      resolveIsManager({
        loginProfile: {
          organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
          role: 'manager',
        },
        me: managerMe,
        activeStaff: managerStaffWithWaiterAppAccess,
      }),
    ).toBe(true);

    expect(
      resolveIsManager({
        loginProfile: {
          organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
          role: 'Manager',
        },
        me: null,
        activeStaff: null,
      }),
    ).toBe(true);
  });

  it('supports admin and owner roles in loginProfile and me', () => {
    expect(
      resolveIsManager({
        loginProfile: { organizationId: 'org-1', role: 'owner' },
      }),
    ).toBe(true);

    expect(
      resolveIsManager({
        loginProfile: null,
        me: { ...managerMe, role: 'admin' },
        activeStaff: waiterStaff,
      }),
    ).toBe(true);
  });

  it('denies manager access when loginProfile.role is "staff"', () => {
    expect(
      resolveIsManager({
        loginProfile: { organizationId: 'org-1', role: 'staff' },
        me: { ...managerMe, role: 'manager', permissions: ['reports:read'] },
        activeStaff: { ...waiterStaff, access: 'manager', role: 'manager' },
      }),
    ).toBe(false);
  });

  it('matches staff by userId and returns null when absent instead of staffList[0]', () => {
    expect(
      resolveMatchingStaff(
        [waiterStaff, managerStaffWithWaiterAppAccess],
        '2d3588e0-8732-4da0-84c8-495bc79aefe3',
      ),
    ).toEqual(managerStaffWithWaiterAppAccess);

    expect(resolveMatchingStaff([waiterStaff], 'missing-user-id')).toBeNull();
  });
});

describe('useHorecaAuthStore loginProfile persistence & matching', () => {
  beforeEach(() => {
    jest.spyOn(databaseManager, 'setCurrentUser').mockImplementation(() => ({} as any));
    jest.spyOn(databaseManager, 'clearAll').mockImplementation(() => undefined);
    useHorecaAuthStore.setState({
      status: 'unauthenticated',
      me: null,
      loginUser: null,
      loginProfile: null,
      activeStaff: null,
      staffList: [],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores loginProfile and matches activeStaff by me.userId instead of staffList[0]', () => {
    useHorecaAuthStore.getState().setStaffList([waiterStaff, managerStaffWithWaiterAppAccess]);

    useHorecaAuthStore.getState().loginSuccess(managerMe, undefined, {
      user: {
        id: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
        email: 'denny.manager@staff.baigamats.app',
      },
      profile: {
        organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
        role: 'manager',
      },
    });

    const state = useHorecaAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.loginProfile).toEqual({
      organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
      role: 'manager',
    });
    expect(state.activeStaff?.id).toBe('2d3588e0-8732-4da0-84c8-495bc79aefe3');
  });

  it('restores persisted loginProfile on hydrate even when getStaff rejects for non-managers', async () => {
    jest.spyOn(tokenStorage, 'getAccessToken').mockResolvedValue('token-123');
    jest.spyOn(tokenStorage, 'getSession').mockResolvedValue({
      session: { accessToken: 'token-123' },
      user: {
        id: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
        email: 'denny.manager@staff.baigamats.app',
      },
      profile: {
        organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
        role: 'manager',
      },
    });
    jest.spyOn(horecaApi, 'me').mockResolvedValue(managerMe);
    jest.spyOn(horecaApi, 'getStaff').mockRejectedValue(new Error('403 Forbidden'));
    jest.spyOn(horecaApi, 'getBusiness').mockRejectedValue(new Error('skip'));

    await useHorecaAuthStore.getState().hydrate();

    const state = useHorecaAuthStore.getState();
    expect(state.status).toBe('locked');
    expect(state.loginProfile).toEqual({
      organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
      role: 'manager',
    });
    expect(state.activeStaff).toBeNull();
  });

  it('clears loginProfile and loginUser on logout immediately (fire-and-forget endpoint) while forwarding token', async () => {
    jest.spyOn(tokenStorage, 'getAccessToken').mockResolvedValue('active-token-xyz');
    // Never-resolving logout request proves logout does not block on the network call
    const logoutApiSpy = jest
      .spyOn(horecaApi, 'logout')
      .mockImplementation(() => new Promise(() => {}));
    const clearSpy = jest.spyOn(tokenStorage, 'clearTokens').mockResolvedValue(undefined);

    useHorecaAuthStore.setState({
      status: 'authenticated',
      me: managerMe,
      loginUser: { id: managerMe.userId, email: 'denny.manager@staff.baigamats.app' },
      loginProfile: { organizationId: managerMe.organizationId, role: 'manager' },
      activeStaff: managerStaffWithWaiterAppAccess,
    });

    await useHorecaAuthStore.getState().logout();

    const state = useHorecaAuthStore.getState();
    expect(logoutApiSpy).toHaveBeenCalledWith('active-token-xyz');
    expect(clearSpy).toHaveBeenCalled();
    expect(state.status).toBe('unauthenticated');
    expect(state.loginProfile).toBeNull();
    expect(state.loginUser).toBeNull();
    expect(state.activeStaff).toBeNull();
  });
});
