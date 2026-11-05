import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@shared/services/queryClient';
import { HorecaThemeProvider } from '../../theme/colors';
import { HorecaNavigator } from '../HorecaNavigator';
import { useHorecaAuthStore } from '../../features/auth/store/horecaAuthStore';
import { useHorecaStore } from '../../db/offlineStore';

describe('HorecaNavigator & Back Press Handling', () => {
  let backHandlerCallback: (() => boolean) | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    backHandlerCallback = null;

    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback as () => boolean;
      }
      return {
        remove: jest.fn(),
      };
    });

    // Preset store states for testing
    useHorecaAuthStore.setState({
      status: 'authenticated',
      activeStaff: {
        id: 'staff-01',
        name: 'Alex R.',
        role: 'manager',
        access: 'manager',
        hasPin: true,
      },
      staffList: [],
      autoLockSeconds: 360,
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
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('displays the Horeca splash screen on initial startup and transitions after warmup', async () => {
    const queryClient = createQueryClient();

    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <HorecaNavigator />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    // Initial render shows splash screen
    expect(screen.getByText('Baigamats HORECA')).toBeOnTheScreen();
    expect(screen.getByText('Point of Sale & Hospitality System')).toBeOnTheScreen();

    // Fast-forward past minimum splash display duration (1200ms)
    act(() => {
      jest.advanceTimersByTime(1300);
    });

    // Now transitioned to authenticated home floor plan
    expect(screen.getByText('Floor Plan')).toBeOnTheScreen();
  });

  it('respects device back button: returns false at root floor plan to exit app, but handles back on sub-screens', async () => {
    const queryClient = createQueryClient();

    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <HorecaNavigator />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    // Fast forward splash screen
    act(() => {
      jest.advanceTimersByTime(1300);
    });

    expect(screen.getByText('Floor Plan')).toBeOnTheScreen();
    expect(backHandlerCallback).not.toBeNull();

    // At root screen (tables), device back button press should return false (permitting app exit)
    let handled = false;
    act(() => {
      handled = backHandlerCallback!();
    });
    expect(handled).toBe(false);

    // Navigate to a non-main screen: Table Details by tapping a table
    const tableButton = screen.getByRole('button', { name: /Table T-01/i });
    act(() => {
      fireEvent.press(tableButton);
    });

    // Now on TableDetailsScreen (sub-screen)
    expect(screen.getByText('Table T-01')).toBeOnTheScreen();

    // On non-main screen, device back button MUST be intercepted (return true) and return to Floor Plan
    act(() => {
      handled = backHandlerCallback!();
    });
    expect(handled).toBe(true);

    // Verifies user is cleanly returned to Floor Plan rather than closing the app
    expect(screen.getByText('Floor Plan')).toBeOnTheScreen();

    // Once back at root, next device back returns false to permit exit
    act(() => {
      handled = backHandlerCallback!();
    });
    expect(handled).toBe(false);
  });

  it('respects device back button on Orders List sub-screen', async () => {
    const queryClient = createQueryClient();

    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <HorecaNavigator />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    act(() => {
      jest.advanceTimersByTime(1300);
    });

    expect(screen.getByText('Floor Plan')).toBeOnTheScreen();

    // Open Orders screen via AppBar cart button
    const cartButton = screen.getByRole('button', { name: /View Orders/i });
    act(() => {
      fireEvent.press(cartButton);
    });

    // On Orders list screen
    expect(screen.getByText('Orders')).toBeOnTheScreen();

    // Device back press returns true and goes back to Floor Plan
    let handled = false;
    act(() => {
      handled = backHandlerCallback!();
    });
    expect(handled).toBe(true);
    expect(screen.getByText('Floor Plan')).toBeOnTheScreen();
  });
});
