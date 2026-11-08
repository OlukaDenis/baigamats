import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { createQueryClient } from '@shared/services/queryClient';
import { horecaApi } from '../../../api/horecaApiClient';
import {
  businessProfileSchema,
  createOrderDtoSchema,
  type Order,
} from '../../../api/schemas';
import { HorecaAppBar } from '../../../components/organisms/HorecaAppBar';
import { HorecaSubAppBar } from '../../../components/organisms/HorecaSubAppBar';
import { useHorecaStore } from '../../../db/offlineStore';
import { mockBusinessProfile, mockMenuItems } from '../../../mock/horecaMockData';
import { HorecaThemeProvider } from '../../../theme/colors';
import { refreshOpenOrdersInBackground } from '../hooks/useOpenOrders';

jest.mock('../../../db/DatabaseManager', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn(cb => cb()),
    batch: jest.fn(),
  },
  databaseManager: {
    getCurrentUserId: jest.fn(() => 'staff-01'),
  },
}));

const makeOrder = (overrides: Partial<Order> & { id: string }): Order => ({
  order_number: `#${overrides.id}`,
  table_id: 'tbl-1',
  order_type: 'dine_in',
  status: 'open',
  tab_name: null,
  party_size: 2,
  total_amount: 75000,
  service_charge_amount: 0,
  created_at: new Date().toISOString(),
  items: [
    {
      id: `${overrides.id}-item-1`,
      menu_item_id: 'm-1',
      item_name: 'Grilled Tilapia',
      unit_price: 25000,
      qty: 2,
      station: 'kitchen',
      kot_status: 'new',
      modifiers: [],
      notes: null,
      discount_amount: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: `${overrides.id}-item-2`,
      menu_item_id: 'm-2',
      item_name: 'Fresh Passion Juice',
      unit_price: 25000,
      qty: 1,
      station: 'bar',
      kot_status: 'new',
      modifiers: [],
      notes: null,
      discount_amount: 0,
      created_at: new Date().toISOString(),
    },
  ],
  ...overrides,
});

describe('Order Badge Count & Post-Payment Background Refresh', () => {
  beforeEach(() => {
    useHorecaStore.setState({
      orders: {},
      activeOrderId: null,
      activeTableId: 'tbl-1',
    });
    jest.restoreAllMocks();
  });

  it('shows the number of individual open orders rather than the sum of order items in HorecaAppBar and HorecaSubAppBar', async () => {
    // 2 open orders, each containing 3 items (6 total item qty), plus 1 billed order
    const order1 = makeOrder({ id: 'ord-1', table_id: 'tbl-1', status: 'open' });
    const order2 = makeOrder({ id: 'ord-2', table_id: 'tbl-2', status: 'open' });
    const order3 = makeOrder({ id: 'ord-3', table_id: 'tbl-3', status: 'billed' });

    useHorecaStore.setState({
      orders: {
        [order1.id]: order1,
        [order2.id]: order2,
        [order3.id]: order3,
      },
      activeOrderId: order1.id,
      activeTableId: 'tbl-1',
    });

    const { unmount } = await render(
      <HorecaThemeProvider>
        <HorecaAppBar title="Home" />
      </HorecaThemeProvider>,
    );

    // Must count 2 individual open orders, not 3 or 6 items
    expect(screen.getByRole('button', { name: 'View Orders, 2 selected' })).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
    await unmount();

    await render(
      <HorecaThemeProvider>
        <HorecaSubAppBar title="Table 01" />
      </HorecaThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'View Orders, 2 selected' })).toBeOnTheScreen();
    expect(screen.getByText('2')).toBeOnTheScreen();
  });

  it('decrements order badge count to 0 after payment settlement and refreshes orders in the background', async () => {
    const openOrder = makeOrder({ id: 'ord-100', table_id: 'tbl-1', status: 'open' });
    useHorecaStore.setState({
      orders: { [openOrder.id]: openOrder },
      activeOrderId: openOrder.id,
      activeTableId: 'tbl-1',
    });

    await render(
      <HorecaThemeProvider>
        <HorecaAppBar title="Home" />
      </HorecaThemeProvider>,
    );

    expect(screen.getByRole('button', { name: 'View Orders, 1 selected' })).toBeOnTheScreen();

    // Simulate payment settlement
    await act(async () => {
      useHorecaStore.getState().completeOrderSettlement('ord-100', 'billed');
    });

    // Badge count immediately updates to 0 and activeOrderId is cleared
    expect(useHorecaStore.getState().activeOrderId).toBeNull();
    expect(screen.getByRole('button', { name: 'View Orders, 0 selected' })).toBeOnTheScreen();

    // Simulate background refresh returning 0 open orders and 1 billed order from server
    const billedFromServer = { ...openOrder, status: 'billed' as const };
    const getOrdersSpy = jest
      .spyOn(horecaApi, 'getOrders')
      .mockImplementation(async params => {
        if (params?.status === 'open') return { items: [], total: 0 };
        if (params?.status === 'billed') return { items: [billedFromServer], total: 1 };
        return { items: [], total: 0 };
      });

    const queryClient = createQueryClient();
    await act(async () => {
      await refreshOpenOrdersInBackground(queryClient);
    });

    expect(getOrdersSpy).toHaveBeenCalledWith({ mine: true, status: 'open' });
    expect(getOrdersSpy).toHaveBeenCalledWith({ mine: true, status: 'billed' });
    expect(useHorecaStore.getState().activeOrderId).toBeNull();
    expect(
      Object.values(useHorecaStore.getState().orders).filter(o => o.status === 'open'),
    ).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'View Orders, 0 selected' })).toBeOnTheScreen();
  });

  it('validates businessProfileSchema and renders business name in HorecaAppBar and HorecaSubAppBar', async () => {
    const parsed = businessProfileSchema.parse(mockBusinessProfile);
    expect(parsed.name).toBe('Magave Bar & Grill');
    expect(parsed.vat.enabled).toBe(false);

    useHorecaStore.setState({
      businessProfile: parsed,
    });

    const { unmount } = await render(
      <HorecaThemeProvider>
        <HorecaAppBar title="Floor Plan" />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('Magave Bar & Grill')).toBeOnTheScreen();
    await unmount();

    await render(
      <HorecaThemeProvider>
        <HorecaSubAppBar title="Table T-01" />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText(/Magave Bar & Grill/)).toBeOnTheScreen();
  });

  it('manages per-table draft items and validates single-call createOrderDtoSchema with items[]', () => {
    useHorecaStore.setState({
      draftOrdersByTable: {},
      menuItems: mockMenuItems,
    });

    const tilapia = mockMenuItems[0];
    const nileSpecial = mockMenuItems[3]; // age_restricted = true

    const line1 = useHorecaStore.getState().addDraftItem('tbl-1', tilapia, 1);
    useHorecaStore.getState().addDraftItem('tbl-1', nileSpecial, 2, {
      ageVerifiedBy: 'Jane Waiter',
    });
    useHorecaStore.getState().updateDraftItemDetails('tbl-1', line1.id, {
      notes: 'extra lemon',
      modifiers: ['spicy'],
    });
    useHorecaStore.getState().setDraftPartySize('tbl-1', 4);

    const draft = useHorecaStore.getState().draftOrdersByTable['tbl-1'];
    expect(draft).toBeDefined();
    expect(draft.partySize).toBe(4);
    expect(draft.items).toHaveLength(2);

    const dto = createOrderDtoSchema.parse({
      orderType: 'dine_in',
      tableId: '11111111-1111-4111-8111-111111111111',
      partySize: draft.partySize,
      items: draft.items.map(it => ({
        menuItemId: '22222222-2222-4222-8222-222222222222',
        qty: it.qty,
        modifiers: it.modifiers,
        notes: it.notes ?? undefined,
        ageVerifiedBy: it.age_verified_by ?? undefined,
      })),
    });

    expect(dto.items).toHaveLength(2);
    expect(dto.items?.[0].notes).toBe('extra lemon');
    expect(dto.items?.[1].ageVerifiedBy).toBe('Jane Waiter');

    useHorecaStore.getState().clearTableDraft('tbl-1');
    expect(useHorecaStore.getState().draftOrdersByTable['tbl-1']).toBeUndefined();
  });
});
