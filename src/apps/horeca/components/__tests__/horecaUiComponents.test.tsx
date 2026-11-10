import React from 'react';
import { Appearance, Keyboard, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { usePreferencesStore } from '@shared/preferences/preferencesStore';
import { createQueryClient } from '@shared/services/queryClient';
import { tokenStorage } from '@shared/services/tokenStorage';
import { ThemeProvider } from '@sacco/theme/ThemeProvider';
import { useTheme } from '@sacco/theme/ThemeProvider';
import { horecaApi } from '../../api/horecaApiClient';
import type { MeResponse } from '../../api/schemas';
import { useHorecaStore } from '../../db/offlineStore';
import { HorecaLoginScreen } from '../../features/auth/screens/HorecaLoginScreen';
import { FloorPlanScreen } from '../../features/floor/screens/FloorPlanScreen';
import { fetchOpenAndBilledOrders } from '../../features/orders/hooks/useOpenOrders';
import { OrderEntryScreen } from '../../features/orders/screens/OrderEntryScreen';
import { OrdersListScreen } from '../../features/orders/screens/OrdersListScreen';
import {
  HorecaThemeProvider,
  horecaDarkColors,
  horecaLightColors,
  toHorecaCssVariables,
  toRgbChannels,
  useHorecaColors,
  useHorecaTheme,
} from '../../theme/colors';
import { AppTextInput } from '../atoms/AppTextInput';
import { Button } from '../atoms/Button';
import { GlobalBottomSheetModal } from '../molecules/modal/GlobalBottomSheetModal';
import { useAppModalStore } from '../molecules/modal/appModalStore';
import { SearchBar } from '../molecules/SearchBar';
import { Select } from '../molecules/Select';
import { HorecaAppBar } from '../organisms/HorecaAppBar';
import { HorecaSubAppBar } from '../organisms/HorecaSubAppBar';
import { MenuItemCard } from '../organisms/MenuItemCard';
import { TABLE_STATUS_TONES, TableCard } from '../organisms/TableCard';
import { ProfileScreen } from '../../features/auth/screens/ProfileScreen';
import { useHorecaAuthStore } from '../../features/auth/store/horecaAuthStore';

jest.mock('../../db/DatabaseManager', () => ({
  database: {
    get: jest.fn(() => ({
      query: jest.fn(() => ({
        fetch: jest.fn().mockResolvedValue([]),
        observe: jest.fn(() => ({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        })),
        observeCount: jest.fn(() => ({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        })),
      })),
    })),
    write: jest.fn((cb: () => unknown) => cb()),
    batch: jest.fn(),
  },
  databaseManager: {
    setCurrentUser: jest.fn(),
    getCurrentUserId: jest.fn(() => 'staff-01'),
    clearAll: jest.fn(),
  },
}));

jest.mock('../../db/syncEngine', () => ({
  syncEngine: {
    start: jest.fn(),
    stop: jest.fn(),
    processOutbox: jest.fn().mockResolvedValue(undefined),
  },
}));

function HorecaThemeProbe() {
  const { scheme, isDark, colors, toggleTheme } = useHorecaTheme();
  return (
    <>
      <Text testID="horeca-scheme">{scheme}</Text>
      <Text testID="horeca-dark">{String(isDark)}</Text>
      <Text testID="horeca-bg">{colors.background}</Text>
      <Button label="Toggle Horeca Theme" onPress={toggleTheme} />
    </>
  );
}

function SaccoThemeProbe() {
  const { scheme } = useTheme();
  return <Text testID="sacco-scheme">{scheme}</Text>;
}

function HorecaFallbackProbe() {
  const colors = useHorecaColors();
  return <Text testID="horeca-fallback-bg">{colors.background}</Text>;
}

describe('HORECA UI Components & Default Light Theme', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await act(async () => {
      usePreferencesStore.setState({ themePreference: 'light' });
      useAppModalStore.setState({ isOpen: false, isLoading: false, onConfirm: undefined, onCancel: undefined });
    });
  });

  it('defaults both horeca and sacco to light mode even when system color scheme is dark', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

    expect(usePreferencesStore.getState().themePreference).toBe('light');

    await render(
      <>
        <HorecaThemeProvider>
          <HorecaThemeProbe />
        </HorecaThemeProvider>
        <ThemeProvider>
          <SaccoThemeProbe />
        </ThemeProvider>
        <HorecaFallbackProbe />
      </>,
    );

    expect(screen.getByTestId('horeca-scheme').props.children).toBe('light');
    expect(screen.getByTestId('horeca-dark').props.children).toBe('false');
    expect(screen.getByTestId('horeca-bg').props.children).toBe(
      horecaLightColors.background,
    );
    expect(screen.getByTestId('sacco-scheme').props.children).toBe('light');
    expect(screen.getByTestId('horeca-fallback-bg').props.children).toBe(
      horecaLightColors.background,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Toggle Horeca Theme' }),
    );

    expect(screen.getByTestId('horeca-scheme').props.children).toBe('dark');
    expect(screen.getByTestId('horeca-bg').props.children).toBe(
      horecaDarkColors.background,
    );
  });

  it('applies 5px default radius and 58px default height to Button with className and prop precedence', async () => {
    await render(
      <HorecaThemeProvider>
        <Button label="Default CTA" />
        <Button
          label="Class Override CTA"
          className="rounded-2xl min-h-14"
        />
        <Button
          label="Prop Override CTA"
          className="rounded-2xl min-h-14"
          borderRadius={12}
          height={64}
        />
      </HorecaThemeProvider>,
    );

    const defaultBtn = screen.getByRole('button', { name: 'Default CTA' });
    expect(defaultBtn.props.className).toContain('rounded-horeca');
    expect(defaultBtn.props.className).toContain('min-h-[58px]');

    const classBtn = screen.getByRole('button', { name: 'Class Override CTA' });
    expect(classBtn.props.className).toContain('rounded-2xl');
    expect(classBtn.props.className).toContain('min-h-14');

    const propBtn = screen.getByRole('button', { name: 'Prop Override CTA' });
    const propStyle = StyleSheet.flatten(propBtn.props.style);
    expect(propStyle.borderRadius).toBe(12);
    expect(propStyle.minHeight).toBe(64);
    expect(propStyle.height).toBe(64);
  });

  it('applies 5px default radius and 58px default height to AppTextInput with prop precedence', async () => {
    await render(
      <HorecaThemeProvider>
        <AppTextInput accessibilityLabel="Default input" />
        <AppTextInput
          accessibilityLabel="Class override input"
          className="rounded-2xl min-h-12"
        />
        <AppTextInput
          accessibilityLabel="Prop override input"
          className="rounded-2xl min-h-12"
          borderRadius={14}
          height={70}
        />
      </HorecaThemeProvider>,
    );

    const defaultInput = screen.getByLabelText('Default input');
    expect(defaultInput.props.className).toContain('min-h-[58px]');
    const defaultWrapper = defaultInput.parent;
    expect(defaultWrapper?.props.className).toContain('rounded-horeca');
    expect(defaultWrapper?.props.className).toContain('min-h-[58px]');
    expect(defaultWrapper?.props.className).toContain('bg-input');

    const classInput = screen.getByLabelText('Class override input');
    const classWrapper = classInput.parent;
    expect(classWrapper?.props.className).toContain('rounded-2xl');
    expect(classWrapper?.props.className).toContain('min-h-12');

    const propInput = screen.getByLabelText('Prop override input');
    expect(StyleSheet.flatten(propInput.props.style).minHeight).toBe(70);
    const propWrapper = propInput.parent;
    expect(StyleSheet.flatten(propWrapper?.props.style).borderRadius).toBe(14);
    expect(StyleSheet.flatten(propWrapper?.props.style).height).toBe(70);
    expect(StyleSheet.flatten(propWrapper?.props.style).minHeight).toBe(70);
  });

  it('applies 5px default radius and 58px default height to Select with className and prop precedence', async () => {
    const options = [
      { label: 'Main Dining', value: 'main' },
      { label: 'Patio', value: 'patio' },
    ];

    await render(
      <HorecaThemeProvider>
        <Select
          label="Section"
          options={options}
          value="main"
          onChange={() => {}}
        />
        <Select
          label="Custom Section"
          options={options}
          value="patio"
          onChange={() => {}}
          triggerClassName="rounded-xl min-h-12"
          borderRadius={10}
          height={62}
        />
      </HorecaThemeProvider>,
    );

    const defaultTrigger = screen.getByRole('button', {
      name: 'Section: Main Dining',
    });
    expect(defaultTrigger.props.className).toContain('rounded-horeca');
    expect(defaultTrigger.props.className).toContain('min-h-[58px]');
    expect(defaultTrigger.props.className).toContain('bg-input');

    const customTrigger = screen.getByRole('button', {
      name: 'Custom Section: Patio',
    });
    expect(customTrigger.props.className).toContain('rounded-xl');
    const customStyle = StyleSheet.flatten(customTrigger.props.style);
    expect(customStyle.borderRadius).toBe(10);
    expect(customStyle.minHeight).toBe(62);
    expect(customStyle.height).toBe(62);
  });

  it('uses lighter grey input background tokens in both light and dark themes', async () => {
    expect(horecaLightColors.inputBackground).toBe('#f3f4f6');
    expect(horecaDarkColors.inputBackground).toBe('#222b3a');
    expect(toHorecaCssVariables(horecaLightColors)['--color-input']).toBe(
      toRgbChannels(horecaLightColors.inputBackground),
    );
    expect(toHorecaCssVariables(horecaDarkColors)['--color-input']).toBe(
      toRgbChannels(horecaDarkColors.inputBackground),
    );

    await render(
      <HorecaThemeProvider>
        <SearchBar value="" onChangeText={() => {}} placeholder="Search menu" />
      </HorecaThemeProvider>,
    );

    const searchInput = screen.getByLabelText('Search menu');
    expect(searchInput.parent?.props.className).toContain('bg-input');
  });

  it('uses darker green for available tables and maroon for occupied tables', async () => {
    await render(
      <HorecaThemeProvider>
        <TableCard
          table={{
            id: 't1',
            table_number: 'T1',
            capacity: 4,
            section: 'Main',
            status: 'available',
          }}
          onPress={() => {}}
        />
        <TableCard
          table={{
            id: 't2',
            table_number: 'T2',
            capacity: 4,
            section: 'Patio',
            status: 'occupied',
          }}
          onPress={() => {}}
        />
      </HorecaThemeProvider>,
    );

    const availableCard = screen.getByRole('button', {
      name: 'Table T1, available',
    });
    expect(StyleSheet.flatten(availableCard.props.style).backgroundColor).toBe(
      TABLE_STATUS_TONES.available.background,
    );
    expect(TABLE_STATUS_TONES.available.background).toBe('#166534');

    const occupiedCard = screen.getByRole('button', {
      name: 'Table T2, occupied',
    });
    expect(StyleSheet.flatten(occupiedCard.props.style).backgroundColor).toBe(
      TABLE_STATUS_TONES.occupied.background,
    );
    expect(TABLE_STATUS_TONES.occupied.background).toBe('#7F1D1D');
  });

  it('uses circular backgrounds on HorecaAppBar buttons without profile icon and plain borderless bold chevron on HorecaSubAppBar back button', async () => {
    await render(
      <HorecaThemeProvider>
        <HorecaAppBar
          title="Floor Plan"
          ordersCount={2}
          onOrdersPress={() => {}}
          onLockPress={() => {}}
        />
        <HorecaSubAppBar
          title="Table 01"
          ordersCount={1}
          onBack={() => {}}
          onOrdersPress={() => {}}
        />
      </HorecaThemeProvider>,
    );

    const lockBtn = screen.getByRole('button', { name: 'Lock Terminal' });
    expect(lockBtn.props.className).toContain('rounded-full');

    expect(screen.queryByRole('button', { name: 'User Profile' })).toBeNull();

    const cartButtons = screen.getAllByRole('button', { name: /View Orders/ });
    cartButtons.forEach(btn => {
      expect(btn.props.className).toContain('rounded-full');
    });

    const backBtn = screen.getByRole('button', { name: 'Go Back' });
    expect(backBtn.props.className).toContain('rounded-none');
    expect(backBtn.props.className).not.toContain('border');
    expect(backBtn.props.className).not.toContain('bg-background');
    expect(backBtn.props.className).not.toContain('rounded-horeca');
    expect(backBtn.props.className).not.toContain('rounded-full');
  });

  it('renders ProfileScreen without back button, with solid white circular-primary icons, and gates Admin row by manager role', async () => {
    const onOpenAdmin = jest.fn();

    await act(async () => {
      useHorecaAuthStore.setState({
        loginProfile: { organizationId: 'org-1', role: 'manager' },
        me: {
          userId: 'u-1',
          name: 'Alex Manager',
          organizationId: 'org-1',
          role: 'manager',
          permissions: [],
        },
        activeStaff: null,
      });
    });

    const managerView = await render(
      <HorecaThemeProvider>
        <ProfileScreen
          onOrdersPress={() => {}}
          onLockTerminal={() => {}}
          onChangePin={() => {}}
          onOpenAdmin={onOpenAdmin}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Go Back' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'User Profile' })).toBeNull();
    const adminBtn = screen.getByRole('button', { name: 'Admin Back Office' });
    await fireEvent.press(adminBtn);
    expect(onOpenAdmin).toHaveBeenCalledTimes(1);

    const json = JSON.stringify(managerView.toJSON());
    expect(json).toContain('h-9 w-9 rounded-full bg-primary');

    await act(async () => {
      useHorecaAuthStore.setState({
        loginProfile: { organizationId: 'org-1', role: 'staff' },
        me: {
          userId: 'u-2',
          name: 'Waiter Sam',
          organizationId: 'org-1',
          role: 'staff',
          permissions: [],
        },
        activeStaff: null,
      });
    });

    expect(screen.queryByRole('button', { name: 'Admin Back Office' })).toBeNull();
  });

  it('renders ProfileScreen Business section card with name, phone, email, and address and falls back when unconfigured', async () => {
    await act(async () => {
      useHorecaAuthStore.setState({
        loginProfile: { organizationId: 'org-1', role: 'staff' },
        me: {
          userId: 'u-3',
          name: 'Grace Barista',
          organizationId: 'org-1',
          role: 'staff',
          permissions: [],
        },
        activeStaff: null,
      });
      useHorecaStore.setState({
        businessProfile: {
          name: 'Savanna Bistro Ltd',
          legal_name: 'Savanna Hospitality Group',
          institution_code: 'SAV01',
          phone: '+256 700 123456',
          email: 'hello@savannabistro.ug',
          address: 'Plot 14 Acacia Ave, Kampala',
          logo_url: null,
          currency: 'UGX',
          tin: '1000123456',
          receipt: {
            header_note: null,
            footer: null,
            show_tin: true,
          },
          vat: {
            enabled: false,
            name: 'VAT',
            rate_pct: 18,
            inclusive: true,
          },
        },
      });
    });

    await render(
      <HorecaThemeProvider>
        <ProfileScreen
          onOrdersPress={() => {}}
          onLockTerminal={() => {}}
          onChangePin={() => {}}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('Business')).toBeTruthy();
    expect(screen.getByText('Savanna Bistro Ltd')).toBeTruthy();
    expect(screen.getByText('+256 700 123456')).toBeTruthy();
    expect(screen.getByText('hello@savannabistro.ug')).toBeTruthy();
    expect(screen.getByText('Plot 14 Acacia Ave, Kampala')).toBeTruthy();

    await act(async () => {
      useHorecaStore.setState({ businessProfile: null });
    });

    expect(screen.getAllByText('Not configured')).toHaveLength(4);
  });

  it('renders MenuItemCard left icon with white shopping bag inside circular primary background', async () => {
    const view = await render(
      <HorecaThemeProvider>
        <MenuItemCard
          item={{
            id: 'm1',
            category_id: 'c1',
            name: 'Grilled Tilapia',
            price: 35000,
            station: 'kitchen',
            is_active: true,
            age_restricted: false,
          }}
          onAdd={() => {}}
        />
      </HorecaThemeProvider>,
    );

    const json = JSON.stringify(view.toJSON());
    expect(json).toContain('h-12 w-12 rounded-full bg-primary');
    expect(json).toContain('#FFFFFF');
  });

  it('renders Kitchen and Shift cards above Filters on FloorPlanScreen without OCCUPANCY bar', async () => {
    jest.spyOn(horecaApi, 'getTables').mockResolvedValue([
      {
        id: 't-1',
        table_number: 'T1',
        capacity: 4,
        section: 'Indoor',
        status: 'available',
      },
    ]);
    jest.spyOn(horecaApi, 'getTableCategories').mockResolvedValue([]);
    jest.spyOn(horecaApi, 'getOrders').mockResolvedValue([]);
    useHorecaStore.setState({
      tables: [
        {
          id: 't-1',
          table_number: 'T1',
          capacity: 4,
          section: 'Indoor',
          status: 'available',
        },
      ],
      orders: {},
      isOnline: true,
    });

    const onOpenKitchen = jest.fn();
    const onOpenShift = jest.fn();
    const queryClient = createQueryClient();

    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <FloorPlanScreen
            onOpenOrder={() => {}}
            onOpenKitchen={onOpenKitchen}
            onOpenShift={onOpenShift}
            onLockTerminal={() => {}}
          />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByText(/OCCUPANCY:/i)).toBeNull();
    expect(screen.getByText('Filters')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Open Kitchen Display' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Open Shift Management' }),
    );
    expect(onOpenKitchen).toHaveBeenCalledTimes(1);
    expect(onOpenShift).toHaveBeenCalledTimes(1);
  });

  it('scrolls focused password field above keyboard on HorecaLoginScreen', async () => {
    const scrollToSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});
    let keyboardShowCb: (() => void) | undefined;
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, cb) => {
      if (event === 'keyboardWillShow' || event === 'keyboardDidShow') {
        keyboardShowCb = cb as () => void;
      }
      return { remove: jest.fn() } as any;
    });

    await render(
      <HorecaThemeProvider>
        <HorecaLoginScreen />
      </HorecaThemeProvider>,
    );

    const passwordInput = screen.getByLabelText('Password');
    expect(Platform.OS).toBeDefined();

    await fireEvent(passwordInput, 'focus');
    await act(async () => {
      keyboardShowCb?.();
    });

    // Focusing password + showing keyboard triggers scroll adjustment when layout height is set
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
    expect(scrollToSpy).toBeDefined();
  });

  it('navigates immediately on login without calling getStaff and silently fetches me in the background', async () => {
    useHorecaAuthStore.setState({
      status: 'unauthenticated',
      me: null,
      loginUser: null,
      loginProfile: null,
      activeStaff: null,
    });

    jest.spyOn(tokenStorage, 'setSession').mockResolvedValue(undefined);
    jest.spyOn(horecaApi, 'login').mockResolvedValue({
      mfaRequired: false,
      session: {
        accessToken: 'tok-abc',
        refreshToken: 'ref-abc',
        tokenType: 'bearer',
        expiresIn: 3600,
        expiresAt: 1999999999,
      },
      user: { id: 'u-99', email: 'jane@bistro.com' },
      profile: { organizationId: 'org-1', role: 'manager' },
    });

    const getStaffSpy = jest.spyOn(horecaApi, 'getStaff').mockResolvedValue([]);
    let resolveMe!: (val: MeResponse) => void;
    const mePromise = new Promise<MeResponse>(res => {
      resolveMe = res;
    });
    const meSpy = jest.spyOn(horecaApi, 'me').mockReturnValue(mePromise);

    await render(
      <HorecaThemeProvider>
        <HorecaLoginScreen />
      </HorecaThemeProvider>,
    );

    await fireEvent.changeText(
      screen.getByPlaceholderText('Enter username or email'),
      'jane@bistro.com',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('Enter your password'),
      'secret123',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(useHorecaAuthStore.getState().status).toBe('authenticated');
    });

    // Must not call getStaff and must already be authenticated before me() resolves
    expect(getStaffSpy).not.toHaveBeenCalled();
    expect(meSpy).toHaveBeenCalledTimes(1);
    expect(useHorecaAuthStore.getState().me?.name).toBe('jane');

    // Silent background me() update
    await act(async () => {
      resolveMe({
        userId: 'u-99',
        name: 'Jane Doe',
        organizationId: 'org-1',
        role: 'manager',
        permissions: ['reports:read'],
      });
      await mePromise;
    });

    expect(useHorecaAuthStore.getState().me?.name).toBe('Jane Doe');
  });

  it('fetchOpenAndBilledOrders does not call getOrder for every open order', async () => {
    useHorecaStore.setState({ orders: {} });
    const getOrdersSpy = jest
      .spyOn(horecaApi, 'getOrders')
      .mockImplementation(async params => {
        if (params?.status === 'open') {
          return {
            items: [
              {
                id: 'ord-1',
                order_number: '#101',
                table_id: 'tbl-1',
                order_type: 'dine_in',
                status: 'open',
                total_amount: 25000,
                service_charge_amount: 0,
                created_at: '2026-11-10T10:00:00Z',
                items: [],
              },
            ],
            total: 1,
          };
        }
        return { items: [], total: 0 };
      });
    const getOrderSpy = jest.spyOn(horecaApi, 'getOrder');

    const result = await fetchOpenAndBilledOrders();

    expect(getOrdersSpy).toHaveBeenCalledTimes(2);
    expect(getOrderSpy).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(useHorecaStore.getState().orders['ord-1']?.order_number).toBe('#101');
  });

  it('OrderEntryScreen fetches only the selected order details and does not call getOrders', async () => {
    useHorecaStore.setState({
      tables: [
        {
          id: 'tbl-1',
          table_number: 'T-01',
          capacity: 4,
          status: 'occupied',
          section: 'Main',
        },
      ],
      orders: {},
      activeTableId: 'tbl-1',
      activeOrderId: 'ord-42',
    });

    const getOrdersSpy = jest.spyOn(horecaApi, 'getOrders');
    const getOrderSpy = jest.spyOn(horecaApi, 'getOrder').mockResolvedValue({
      id: 'ord-42',
      order_number: '#042',
      table_id: 'tbl-1',
      order_type: 'dine_in',
      status: 'open',
      total_amount: 40000,
      service_charge_amount: 0,
      created_at: '2026-11-10T10:00:00Z',
      items: [
        {
          id: 'oi-1',
          menu_item_id: 'm-1',
          item_name: 'Grilled Tilapia',
          qty: 2,
          unit_price: 20000,
          station: 'kitchen',
          kot_status: 'new',
          modifiers: [],
          discount_amount: 0,
          created_at: '2026-11-10T10:00:00Z',
        },
      ],
    });

    const queryClient = createQueryClient();
    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <OrderEntryScreen
            orderId="ord-42"
            onPayNow={() => {}}
            onLockTerminal={() => {}}
          />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Grilled Tilapia')).toBeOnTheScreen();
    expect(getOrderSpy).toHaveBeenCalledTimes(1);
    expect(getOrderSpy).toHaveBeenCalledWith('ord-42');
    expect(getOrdersSpy).not.toHaveBeenCalled();
  });

  it('reloads the new order list from the backend after successfully cancelling an order on OrdersListScreen', async () => {
    useHorecaStore.setState({
      isOnline: true,
      tables: [
        {
          id: 'tbl-1',
          table_number: 'T-01',
          capacity: 4,
          status: 'occupied',
          section: 'Main',
        },
        {
          id: 'tbl-2',
          table_number: 'T-02',
          capacity: 2,
          status: 'occupied',
          section: 'Main',
        },
      ],
      orders: {},
      activeOrderId: 'ord-1',
    });

    let serverOpenOrders = [
      {
        id: 'ord-1',
        order_number: '#1001',
        table_id: 'tbl-1',
        order_type: 'dine_in' as const,
        status: 'open' as const,
        total_amount: 30000,
        service_charge_amount: 0,
        created_at: '2026-11-10T10:00:00Z',
        items: [],
      },
      {
        id: 'ord-2',
        order_number: '#1002',
        table_id: 'tbl-2',
        order_type: 'dine_in' as const,
        status: 'open' as const,
        total_amount: 45000,
        service_charge_amount: 0,
        created_at: '2026-11-10T10:05:00Z',
        items: [],
      },
    ];

    const cancelOrderSpy = jest.spyOn(horecaApi, 'cancelOrder').mockImplementation(async id => {
      serverOpenOrders = [
        ...serverOpenOrders.filter(o => o.id !== id),
        {
          id: 'ord-3',
          order_number: '#1003',
          table_id: 'tbl-2',
          order_type: 'dine_in' as const,
          status: 'open' as const,
          total_amount: 18000,
          service_charge_amount: 0,
          created_at: '2026-11-10T10:10:00Z',
          items: [],
        },
      ];
      return { id, status: 'cancelled' as const };
    });

    const getOrdersSpy = jest.spyOn(horecaApi, 'getOrders').mockImplementation(async params => {
      if (params?.status === 'open') {
        return { items: serverOpenOrders, total: serverOpenOrders.length };
      }
      return { items: [], total: 0 };
    });

    const queryClient = createQueryClient();
    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <OrdersListScreen onSelectOrder={() => {}} onLockTerminal={() => {}} />
          <GlobalBottomSheetModal />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('#1001')).toBeOnTheScreen();
    expect(screen.getByText('#1002')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel Order #1001' }));
    expect(screen.getByText(/Are you sure you want to cancel Order #1001/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel Order' }));

    await waitFor(() => {
      expect(cancelOrderSpy).toHaveBeenCalledTimes(1);
      expect(cancelOrderSpy).toHaveBeenCalledWith('ord-1');
      expect(screen.getByText('#1003')).toBeOnTheScreen();
    });

    expect(screen.queryByText('#1001')).toBeNull();
    expect(screen.getByText('#1002')).toBeOnTheScreen();
    expect(getOrdersSpy).toHaveBeenCalledWith({ mine: true, status: 'open' });
    expect(getOrdersSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(useHorecaStore.getState().tables.find(t => t.id === 'tbl-1')?.status).toBe('available');
  });

  it('keeps order and displays error modal when cancelOrder fails with server error on OrdersListScreen', async () => {
    useHorecaStore.setState({
      isOnline: true,
      tables: [
        {
          id: 'tbl-1',
          table_number: 'T-01',
          capacity: 4,
          status: 'occupied',
          section: 'Main',
        },
      ],
      orders: {},
    });

    jest.spyOn(horecaApi, 'getOrders').mockImplementation(async params => {
      if (params?.status === 'open') {
        return {
          items: [
            {
              id: 'ord-9',
              order_number: '#1009',
              table_id: 'tbl-1',
              order_type: 'dine_in' as const,
              status: 'open' as const,
              total_amount: 25000,
              service_charge_amount: 0,
              created_at: '2026-11-10T10:00:00Z',
              items: [],
            },
          ],
          total: 1,
        };
      }
      return { items: [], total: 0 };
    });

    jest.spyOn(horecaApi, 'cancelOrder').mockRejectedValue({
      response: { status: 409, data: { message: 'Order already billed on another terminal.' } },
    });

    const queryClient = createQueryClient();
    await render(
      <QueryClientProvider client={queryClient}>
        <HorecaThemeProvider>
          <OrdersListScreen onSelectOrder={() => {}} onLockTerminal={() => {}} />
          <GlobalBottomSheetModal />
        </HorecaThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('#1009')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel Order #1009' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel Order' }));

    expect(await screen.findByText('Cancel Order Failed')).toBeOnTheScreen();
    expect(screen.getByText('Order already billed on another terminal.')).toBeOnTheScreen();
    expect(screen.getByText('#1009')).toBeOnTheScreen();
  });
});
