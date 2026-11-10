import React from 'react';
import { BackHandler } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@shared/services/queryClient';
import { horecaApi } from '../../api/horecaApiClient';
import { HorecaThemeProvider } from '../../theme/colors';
import { HorecaNavigator } from '../HorecaNavigator';
import { useHorecaAuthStore } from '../../features/auth/store/horecaAuthStore';
import { useHorecaStore } from '../../db/offlineStore';

jest.mock('../../db', () => ({
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

jest.mock('../../db/DatabaseManager', () => ({
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

jest.mock('../../db/syncEngine', () => ({
  syncEngine: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('../../features/auth/hooks/useBusinessProfile', () => ({
  useBusinessProfile: jest.fn(),
  fetchAndStoreBusinessProfile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../features/auth/screens/HorecaSplashScreen', () => {
  const { View } = require('react-native');
  return {
    HorecaSplashScreen: () => <View testID="horeca-splash-mock" />,
  };
});

describe('HorecaNavigator manager Reports tab visibility', () => {
  jest.setTimeout(15000);
  const originalHydrate = useHorecaAuthStore.getState().hydrate;
  let queryClient = createQueryClient();

  beforeEach(() => {
    jest.useFakeTimers();
    queryClient = createQueryClient();

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));

    jest.spyOn(horecaApi, 'getTables').mockResolvedValue([]);
    jest.spyOn(horecaApi, 'getTableCategories').mockResolvedValue([]);
    jest.spyOn(horecaApi, 'getDashboard').mockResolvedValue({
      revenue: { total: 120000, change_pct: 5 },
      checks: { count: 4, guests: 10 },
      avg_check: { value: 30000, target: 45000 },
      avg_turn_minutes: { value: 35, optimal: 50 },
      departments: [],
      servers: [],
    });
    jest.spyOn(horecaApi, 'getDashboardSettings').mockResolvedValue({
      target_check: 45000,
      optimal_turn: 50,
    });

    useHorecaStore.setState({
      tables: [
        {
          id: 'tbl-01',
          table_number: 'T-01',
          capacity: 4,
          status: 'available',
          section: 'Main Dining',
        },
      ],
      orders: {},
      menuItems: [],
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    useHorecaAuthStore.setState({ hydrate: originalHydrate });
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shows Reports and Admin bottom tabs for loginProfile.role="manager" even when activeStaff has waiter access', async () => {
    useHorecaAuthStore.setState({
      status: 'authenticated',
      hydrate: jest.fn().mockResolvedValue(undefined),
      me: {
        userId: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
        name: 'Denny Manager',
        organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
        role: 'staff',
        permissions: [],
      },
      loginUser: {
        id: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
        email: 'denny.manager@staff.baigamats.app',
      },
      loginProfile: {
        organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
        role: 'manager',
      },
      activeStaff: {
        id: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
        name: 'Denny Manager',
        role: 'staff',
        access: 'waiter',
        hasPin: true,
      },
    });

    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <HorecaNavigator />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1300);
    });

    const reportsTab = screen.getByRole('button', { name: 'Navigate to Reports' });
    expect(reportsTab).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Navigate to Admin' })).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(reportsTab);
    });

    expect(screen.getByText('Reports & Analytics')).toBeOnTheScreen();
    expect(screen.queryByText('Manager Access Required')).toBeNull();
  });

  it('shows Reports and Admin bottom tabs for loginProfile.role="manager" when activeStaff is null', async () => {
    useHorecaAuthStore.setState({
      status: 'authenticated',
      hydrate: jest.fn().mockResolvedValue(undefined),
      me: null,
      loginUser: {
        id: '2d3588e0-8732-4da0-84c8-495bc79aefe3',
        email: 'denny.manager@staff.baigamats.app',
      },
      loginProfile: {
        organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
        role: 'manager',
      },
      activeStaff: null,
    });

    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <HorecaNavigator />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1300);
    });

    expect(screen.getByRole('button', { name: 'Navigate to Reports' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Navigate to Admin' })).toBeOnTheScreen();
  });

  it('hides Reports and Admin bottom tabs when loginProfile.role="staff"', async () => {
    useHorecaAuthStore.setState({
      status: 'authenticated',
      hydrate: jest.fn().mockResolvedValue(undefined),
      me: {
        userId: 'staff-waiter-1',
        name: 'Waiter One',
        organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
        role: 'staff',
        permissions: [],
      },
      loginUser: {
        id: 'staff-waiter-1',
        email: 'waiter@staff.baigamats.app',
      },
      loginProfile: {
        organizationId: '52cbbf2b-7066-4018-843f-7a7125dc9d16',
        role: 'staff',
      },
      activeStaff: {
        id: 'staff-waiter-1',
        name: 'Waiter One',
        role: 'Waiter',
        access: 'waiter',
        hasPin: true,
      },
    });

    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <HorecaNavigator />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1300);
    });

    expect(screen.getByText('Floor Plan')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Navigate to Reports' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Navigate to Admin' })).toBeNull();
  });
});
