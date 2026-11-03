import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import { tableSchema } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';
import { tableStorage } from '../../../db/tableStorage';
import { TableCard } from '../../../components/organisms/TableCard';
import { FloorPlanScreen } from '../screens/FloorPlanScreen';
import { HorecaThemeProvider } from '../../../theme/colors';

const userTablesPayload = [
  {
    id: '08445e8b-e95e-42a2-b78a-8c04ab6bd81b',
    table_number: 'T1',
    capacity: 4,
    status: 'occupied' as const,
    section: 'Indoor',
  },
  {
    id: '44d99d71-4415-4ff4-8732-286246b7ed26',
    table_number: 'T2',
    capacity: 4,
    status: 'occupied' as const,
    section: 'Indoor',
  },
  {
    id: '605a8510-54f1-4dd5-9089-98dafdf65b7a',
    table_number: 'T3',
    capacity: 4,
    status: 'available' as const,
    section: 'Indoor',
  },
  {
    id: 'e3c85c49-ba69-48ca-9b09-06ad731da8e7',
    table_number: 'T4',
    capacity: 4,
    status: 'available' as const,
    section: 'Outdoor',
  },
  {
    id: 'a8b7656c-bc76-4dab-be6d-02721101e8c7',
    table_number: 'T5',
    capacity: 4,
    status: 'available' as const,
    section: 'Outdoor',
  },
  {
    id: '13d724e1-de97-465a-903d-b551a02ce2c6',
    table_number: 'T6',
    capacity: 4,
    status: 'available' as const,
    section: 'Outdoor',
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        networkMode: 'always',
      },
    },
  });
}

describe('Floor Plan Tables & Offline Support', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(horecaApi, 'getTableCategories').mockResolvedValue([
      { name: 'Indoor', count: 3 },
      { name: 'Outdoor', count: 3 },
    ]);
    useHorecaStore.setState({
      tableCategories: [
        { name: 'Indoor', count: 3 },
        { name: 'Outdoor', count: 3 },
      ],
      tables: [],
      activeTableId: null,
      isOnline: true,
    });
  });

  describe('tableSchema validation', () => {
    it('validates each table in the user payload successfully', () => {
      userTablesPayload.forEach(tableData => {
        const parsed = tableSchema.safeParse(tableData);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.table_number).toBe(tableData.table_number);
          expect(parsed.data.capacity).toBe(tableData.capacity);
          expect(parsed.data.section).toBe(tableData.section);
        }
      });
    });
  });

  describe('tableStorage persistence', () => {
    it('saves and retrieves tables locally for offline fallback', async () => {
      await tableStorage.saveTables(userTablesPayload);
      const retrieved = await tableStorage.getTables();
      expect(retrieved).toEqual(userTablesPayload);
    });
  });

  describe('TableCard Organism', () => {
    it('renders table details, capacity, and status badge', () => {
      const onPress = jest.fn();
      render(
        <HorecaThemeProvider>
          <TableCard
            table={userTablesPayload[0]}
            isSelected={true}
            onPress={onPress}
          />
        </HorecaThemeProvider>,
      );

      expect(screen.getByText('T1')).toBeOnTheScreen();
      expect(screen.getByText(/4 Guests • Indoor/)).toBeOnTheScreen();
      expect(screen.getByText('OCCUPIED')).toBeOnTheScreen();
      expect(screen.getByText('UGX 540,000')).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: /Table T1/i }));
      expect(onPress).toHaveBeenCalledWith(userTablesPayload[0]);
    });
  });

  describe('FloorPlanScreen integration', () => {
    it('fetches tables from API and renders them on screen', async () => {
      jest.spyOn(horecaApi, 'getTables').mockResolvedValue(userTablesPayload);

      const queryClient = createTestQueryClient();
      const onOpenOrder = jest.fn();
      const onLockTerminal = jest.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <HorecaThemeProvider>
            <FloorPlanScreen
              onOpenOrder={onOpenOrder}
              onLockTerminal={onLockTerminal}
            />
          </HorecaThemeProvider>
        </QueryClientProvider>,
      );

      // Verify tables appear
      expect(await screen.findByText('T1')).toBeOnTheScreen();
      expect(screen.getByText('T2')).toBeOnTheScreen();
      expect(screen.getByText('T3')).toBeOnTheScreen();
      expect(screen.getByText('T4')).toBeOnTheScreen();
      expect(screen.getByText('T5')).toBeOnTheScreen();
      expect(screen.getByText('T6')).toBeOnTheScreen();

      // Verify categories from the API are offered in the select dropdown
      expect(screen.getByText('All')).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: /Table category/i }));
      expect(await screen.findByText('Indoor')).toBeOnTheScreen();
      expect(screen.getByText('Outdoor')).toBeOnTheScreen();
    });

    it('displays offline banner and serves cached tables when offline', async () => {
      // Pre-seed offline store with cached tables
      useHorecaStore.setState({
        tables: userTablesPayload,
        activeTableId: userTablesPayload[0].id,
        isOnline: false,
      });

      // API fetch rejects because offline
      jest.spyOn(horecaApi, 'getTables').mockRejectedValue(new Error('Network error'));

      const queryClient = createTestQueryClient();
      const onOpenOrder = jest.fn();
      const onLockTerminal = jest.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <HorecaThemeProvider>
            <FloorPlanScreen
              onOpenOrder={onOpenOrder}
              onLockTerminal={onLockTerminal}
            />
          </HorecaThemeProvider>
        </QueryClientProvider>,
      );

      // Verify offline banner is shown
      expect(screen.getByText(/Offline Mode • Showing saved tables/i)).toBeOnTheScreen();

      // Verify cached tables are visible
      expect(screen.getByText('T1')).toBeOnTheScreen();
      expect(screen.getByText('T4')).toBeOnTheScreen();
    });

    it('filters tables when selecting a dynamic section', async () => {
      useHorecaStore.setState({
        tables: userTablesPayload,
        activeTableId: userTablesPayload[0].id,
        isOnline: true,
      });
      jest.spyOn(horecaApi, 'getTables').mockResolvedValue(userTablesPayload);

      const queryClient = createTestQueryClient();
      const onOpenOrder = jest.fn();
      const onLockTerminal = jest.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <HorecaThemeProvider>
            <FloorPlanScreen
              onOpenOrder={onOpenOrder}
              onLockTerminal={onLockTerminal}
            />
          </HorecaThemeProvider>
        </QueryClientProvider>,
      );

      // Open the category select; options come from the categories endpoint
      fireEvent.press(screen.getByRole('button', { name: /Table category/i }));
      fireEvent.press(screen.getByText('Outdoor'));

      // Indoor tables should not be shown
      expect(screen.queryByText('T1')).toBeNull();
      expect(screen.queryByText('T2')).toBeNull();
      // Outdoor tables should be shown
      expect(screen.getByText('T4')).toBeOnTheScreen();
      expect(screen.getByText('T5')).toBeOnTheScreen();
      expect(screen.getByText('T6')).toBeOnTheScreen();
    });

    it('supports pull-to-refresh to fetch latest tables', async () => {
      const getTablesSpy = jest.spyOn(horecaApi, 'getTables').mockResolvedValue(userTablesPayload);

      const queryClient = createTestQueryClient();
      const onOpenOrder = jest.fn();
      const onLockTerminal = jest.fn();

      const { UNSAFE_getByType } = render(
        <QueryClientProvider client={queryClient}>
          <HorecaThemeProvider>
            <FloorPlanScreen
              onOpenOrder={onOpenOrder}
              onLockTerminal={onLockTerminal}
            />
          </HorecaThemeProvider>
        </QueryClientProvider>,
      );

      expect(await screen.findByText('T1')).toBeOnTheScreen();

      // Trigger pull to refresh
      const { RefreshControl } = require('react-native');
      const refreshControl = UNSAFE_getByType(RefreshControl);
      await act(async () => {
        refreshControl.props.onRefresh();
      });

      expect(getTablesSpy).toHaveBeenCalled();
    });
  });
});
