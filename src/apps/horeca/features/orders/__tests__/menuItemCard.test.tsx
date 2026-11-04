import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { MenuItem } from '../../../api/schemas';
import { MenuItemCard } from '../../../components/organisms/MenuItemCard';
import { HorecaThemeProvider } from '../../../theme/colors';

const mockKitchenItem: MenuItem = {
  id: 'item-01',
  category_id: 'cat-01',
  name: 'Wagyu Burger',
  price: 45000,
  station: 'kitchen',
  is_active: true,
  age_restricted: false,
};

const mockBarItem: MenuItem = {
  id: 'item-02',
  category_id: 'cat-02',
  name: 'Signature Gin Tonic',
  price: 32000,
  station: 'bar',
  is_active: true,
  age_restricted: true,
};

const mockUnavailableItem: MenuItem = {
  ...mockKitchenItem,
  id: 'item-03',
  name: 'Lobster Bisque',
  is_active: false,
};

describe('MenuItemCard Organism', () => {
  it('renders kitchen menu item with 0 quantity and triggers onAdd', () => {
    const onAdd = jest.fn();

    render(
      <HorecaThemeProvider>
        <MenuItemCard
          item={mockKitchenItem}
          quantity={0}
          onAdd={onAdd}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('Wagyu Burger')).toBeOnTheScreen();
    expect(screen.getByText('Kitchen')).toBeOnTheScreen();
    expect(screen.getByText('🍲')).toBeOnTheScreen();
    expect(screen.getByText('UGX 45,000')).toBeOnTheScreen();

    const addButton = screen.getByRole('button', { name: /Add Wagyu Burger/ });
    fireEvent.press(addButton);
    expect(onAdd).toHaveBeenCalledWith(mockKitchenItem);
  });

  it('renders bar item with emoji and station label', () => {
    render(
      <HorecaThemeProvider>
        <MenuItemCard
          item={mockBarItem}
          quantity={0}
          onAdd={jest.fn()}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('Signature Gin Tonic')).toBeOnTheScreen();
    expect(screen.getByText('Bar')).toBeOnTheScreen();
    expect(screen.getByText('🍸')).toBeOnTheScreen();
  });

  it('renders stepper when quantity > 0 and triggers onAdd and onRemove', () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();

    render(
      <HorecaThemeProvider>
        <MenuItemCard
          item={mockKitchenItem}
          quantity={3}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('3')).toBeOnTheScreen();

    // Decrease
    const decreaseButton = screen.getByRole('button', { name: /Decrease Wagyu Burger/ });
    fireEvent.press(decreaseButton);
    expect(onRemove).toHaveBeenCalledWith(mockKitchenItem);

    // Increase
    const increaseButton = screen.getByRole('button', { name: /Increase Wagyu Burger/ });
    fireEvent.press(increaseButton);
    expect(onAdd).toHaveBeenCalledWith(mockKitchenItem);
  });

  it('shows UNAVAILABLE badge and disables add button when item is inactive', () => {
    const onAdd = jest.fn();

    render(
      <HorecaThemeProvider>
        <MenuItemCard
          item={mockUnavailableItem}
          quantity={0}
          onAdd={onAdd}
        />
      </HorecaThemeProvider>,
    );

    expect(screen.getByText('UNAVAILABLE')).toBeOnTheScreen();
    const addButton = screen.getByRole('button', { name: /Add Lobster Bisque/ });
    fireEvent.press(addButton);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('disables stepper controls when disabled prop is true', () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();

    render(
      <HorecaThemeProvider>
        <MenuItemCard
          item={mockKitchenItem}
          quantity={2}
          disabled={true}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </HorecaThemeProvider>,
    );

    const increaseButton = screen.getByRole('button', { name: /Increase Wagyu Burger/ });
    fireEvent.press(increaseButton);
    expect(onAdd).not.toHaveBeenCalled();

    const decreaseButton = screen.getByRole('button', { name: /Decrease Wagyu Burger/ });
    fireEvent.press(decreaseButton);
    expect(onRemove).not.toHaveBeenCalled();
  });
});

