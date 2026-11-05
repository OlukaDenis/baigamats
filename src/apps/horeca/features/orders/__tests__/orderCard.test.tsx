import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Order, Table } from '../../../api/schemas';
import { OrderCard } from '../../../components/organisms/OrderCard';
import { HorecaThemeProvider } from '../../../theme/colors';

const mockTable: Table = {
  id: 'table-01',
  table_number: '12',
  capacity: 4,
  status: 'occupied',
  section: 'Terrace',
};

const mockOpenOrder: Order = {
  id: 'ord-001',
  order_number: '#1001',
  table_id: 'table-01',
  order_type: 'dine_in',
  status: 'open',
  tab_name: null,
  party_size: 3,
  total_amount: 85000,
  service_charge_amount: 0,
  created_at: new Date().toISOString(),
  items: [
    {
      id: 'it-1',
      menu_item_id: 'm-1',
      item_name: 'Burger',
      unit_price: 25000,
      qty: 2,
      station: 'kitchen',
      kot_status: 'preparing',
      modifiers: [],
      notes: null,
      discount_amount: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'it-2',
      menu_item_id: 'm-2',
      item_name: 'Beer',
      unit_price: 35000,
      qty: 1,
      station: 'bar',
      kot_status: 'ready',
      modifiers: [],
      notes: null,
      discount_amount: 0,
      created_at: new Date().toISOString(),
    },
  ],
};

const mockBilledOrder: Order = {
  ...mockOpenOrder,
  id: 'ord-002',
  order_number: '#1002',
  status: 'billed',
};

const mockOfflineOrder: Order = {
  ...mockOpenOrder,
  id: 'temp-ord-123456',
  order_number: '#9999',
  table_id: null,
  tab_name: 'VIP Lounge',
};

describe('OrderCard Organism', () => {
  it('renders table number, order number, section, items count, and total amount', () => {
    const onPress = jest.fn();
    const onCancel = jest.fn();

    render(
      <HorecaThemeProvider>
        <OrderCard
          order={mockOpenOrder}
          table={mockTable}
          onPress={onPress}
          onCancel={onCancel}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('T12')).toBeOnTheScreen();
    expect(screen.getByText('#1001')).toBeOnTheScreen();
    expect(screen.getByText(/Table 12 • Terrace/)).toBeOnTheScreen();
    expect(screen.getByText('OPEN')).toBeOnTheScreen();
    expect(screen.getByText('3 items')).toBeOnTheScreen();
    expect(screen.getByText('3 guests')).toBeOnTheScreen();
    expect(screen.getByText('UGX 85,000')).toBeOnTheScreen();

    // Press card
    fireEvent.press(screen.getByRole('button', { name: /Order #1001/ }));
    expect(onPress).toHaveBeenCalledWith(mockOpenOrder);

    // Cancel button
    const cancelButton = screen.getByRole('button', { name: /Cancel Order #1001/ });
    fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalledWith(mockOpenOrder);
  });

  it('renders BILLED status and does not show cancel button when billed', () => {
    const onCancel = jest.fn();

    render(
      <HorecaThemeProvider>
        <OrderCard
          order={mockBilledOrder}
          table={mockTable}
          onPress={jest.fn()}
          onCancel={onCancel}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('BILLED (PAID)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Cancel Order/ })).toBeNull();
  });

  it('renders OFFLINE badge and tab name when order is local takeaway/tab', () => {
    render(
      <HorecaThemeProvider>
        <OrderCard
          order={mockOfflineOrder}
          table={null}
          onPress={jest.fn()}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('ORD')).toBeOnTheScreen();
    expect(screen.getByText('#9999')).toBeOnTheScreen();
    expect(screen.getByText('OFFLINE')).toBeOnTheScreen();
    expect(screen.getByText('Tab: VIP Lounge')).toBeOnTheScreen();
  });
});

