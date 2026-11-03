import { create } from 'zustand';
import { env } from '@shared/config/env';
import type {
  KitchenTicket,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  Shift,
  Table,
  TableCategory,
} from '../api/schemas';
import {
  mockActiveOrder,
  mockCurrentShift,
  mockKitchenTickets,
  mockMenuCategories,
  mockMenuItems,
  mockTables,
} from '../mock/horecaMockData';
import { tableStorage } from './tableStorage';

export interface OutboxMutation {
  id: string;
  type:
  | 'create_order'
  | 'add_item'
  | 'remove_item'
  | 'update_kot_status'
  | 'cancel_order'
  | 'bill_cash'
  | 'open_shift'
  | 'close_shift';
  payload: any;
  createdAt: string;
  attempts: number;
}

interface HorecaState {
  // Master data
  tables: Table[];
  tableCategories: TableCategory[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Record<string, Order>;
  kitchenTickets: KitchenTicket[];
  currentShift: Shift | null;

  // Selected table / order
  activeTableId: string | null;
  activeOrderId: string | null;

  // Outbox & network
  isOnline: boolean;
  outbox: OutboxMutation[];

  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  hydrateTables: () => Promise<void>;
  setTables: (tables: Table[]) => void;
  hydrateTableCategories: () => Promise<void>;
  setTableCategories: (categories: TableCategory[]) => void;
  setTableStatus: (tableId: string, status: Table['status']) => void;
  setActiveTableId: (id: string | null) => void;
  setActiveOrderId: (id: string | null) => void;

  // Order actions
  createOrderOptimistic: (params: { tableId?: string; orderType: Order['order_type']; partySize?: number; tabName?: string }) => Order;
  addItemOptimistic: (orderId: string, item: MenuItem, qty: number, modifiers?: string[], notes?: string, ageVerifiedBy?: string) => OrderItem;
  removeItemOptimistic: (orderId: string, itemId: string) => void;
  updateItemQtyOptimistic: (orderId: string, itemId: string, delta: number) => void;
  updateKotStatusOptimistic: (orderId: string, itemId: string, status: OrderItem['kot_status']) => void;
  cancelOrderOptimistic: (orderId: string) => void;
  deleteOrderOptimistic: (orderId: string) => void;
  billOrderOptimistic: (orderId: string, paymentMethod: 'cash') => void;

  // Shift actions
  openShiftOptimistic: (float: number) => void;
  closeShiftOptimistic: (countedCash: number, note?: string) => void;

  // Outbox management
  enqueueMutation: (mutation: Omit<OutboxMutation, 'id' | 'createdAt' | 'attempts'>) => void;
  dequeueMutation: (id: string) => void;
  clearOutbox: () => void;
}

export const useHorecaStore = create<HorecaState>((set, get) => ({
  tables: env.ENABLE_MOCK ? mockTables : [],
  tableCategories: [],
  categories: env.ENABLE_MOCK ? mockMenuCategories : [],
  menuItems: env.ENABLE_MOCK ? mockMenuItems : [],
  orders: env.ENABLE_MOCK ? { [mockActiveOrder.id]: mockActiveOrder } : {},
  kitchenTickets: env.ENABLE_MOCK ? mockKitchenTickets : [],
  currentShift: env.ENABLE_MOCK ? mockCurrentShift : null,

  activeTableId: env.ENABLE_MOCK ? (mockTables[0]?.id ?? null) : null,
  activeOrderId: env.ENABLE_MOCK ? 'ord-8429' : null,

  isOnline: true,
  outbox: [],

  setOnlineStatus: isOnline => set({ isOnline }),

  hydrateTables: async () => {
    const cached = await tableStorage.getTables();
    if (cached && cached.length > 0) {
      set(state => ({
        tables: state.tables.length === 0 ? cached : state.tables,
        activeTableId: state.activeTableId ?? cached[0]?.id ?? null,
      }));
    }
  },

  hydrateTableCategories: async () => {
    const cached = await tableStorage.getCategories();
    if (cached && cached.length > 0) {
      set(state => ({
        tableCategories: state.tableCategories.length === 0 ? cached : state.tableCategories,
      }));
    }
  },

  setTableCategories: tableCategories => {
    set({ tableCategories });
    tableStorage.saveCategories(tableCategories).catch(() => { });
  },

  setTables: tables => {
    set(state => ({
      tables,
      activeTableId: tables.some(t => t.id === state.activeTableId)
        ? state.activeTableId
        : (tables[0]?.id ?? null),
    }));
    tableStorage.saveTables(tables).catch(() => { });
  },

  setTableStatus: (tableId, status) =>
    set(state => ({
      tables: state.tables.map(t => (t.id === tableId ? { ...t, status } : t)),
    })),

  setActiveTableId: id => set({ activeTableId: id }),
  setActiveOrderId: id => set({ activeOrderId: id }),

  createOrderOptimistic: ({ tableId, orderType, partySize = 2, tabName }) => {
    const tempId = `temp-ord-${Date.now()}`;
    const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: tempId,
      order_number: orderNumber,
      table_id: tableId ?? null,
      order_type: orderType,
      status: 'open',
      tab_name: tabName ?? null,
      party_size: partySize,
      total_amount: 0,
      service_charge_amount: 0,
      created_at: new Date().toISOString(),
      items: [],
    };

    set(state => {
      const updatedTables = tableId
        ? state.tables.map(t => (t.id === tableId ? { ...t, status: 'occupied' as const } : t))
        : state.tables;

      return {
        tables: updatedTables,
        orders: { ...state.orders, [tempId]: newOrder },
        activeOrderId: tempId,
      };
    });

    get().enqueueMutation({
      type: 'create_order',
      payload: { tableId, orderType, partySize, tabName, clientTempId: tempId },
    });

    return newOrder;
  },

  addItemOptimistic: (orderId, menuItem, qty, modifiers = [], notes, ageVerifiedBy) => {
    const tempItemId = `temp-item-${Date.now()}`;
    const newItem: OrderItem = {
      id: tempItemId,
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      unit_price: menuItem.price,
      qty,
      station: menuItem.station,
      kot_status: 'new',
      modifiers,
      notes: notes ?? null,
      discount_amount: 0,
      created_at: new Date().toISOString(),
    };

    set(state => {
      const existingOrder = state.orders[orderId];
      if (!existingOrder) return state;

      const items = [...(existingOrder.items ?? []), newItem];
      const total_amount = items.reduce((sum, it) => sum + it.unit_price * it.qty, 0);

      const updatedOrder = { ...existingOrder, items, total_amount };

      // Also append to kitchen tickets
      const newKitchenTicket: KitchenTicket = {
        id: tempItemId,
        item_name: newItem.item_name,
        qty: newItem.qty,
        station: newItem.station,
        kot_status: 'new',
        modifiers: newItem.modifiers,
        notes: newItem.notes,
        created_at: newItem.created_at,
        order: {
          id: orderId,
          order_number: existingOrder.order_number,
          table_id: existingOrder.table_id,
          order_type: existingOrder.order_type,
          tab_name: existingOrder.tab_name,
          status: 'open',
        },
      };

      return {
        orders: { ...state.orders, [orderId]: updatedOrder },
        kitchenTickets: [newKitchenTicket, ...state.kitchenTickets],
      };
    });

    get().enqueueMutation({
      type: 'add_item',
      payload: {
        orderId,
        menuItemId: menuItem.id,
        qty,
        modifiers,
        notes,
        ageVerifiedBy,
        clientTempItemId: tempItemId,
      },
    });

    return newItem;
  },

  removeItemOptimistic: (orderId, itemId) => {
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;

      const items = (order.items ?? []).filter(it => it.id !== itemId);
      const total_amount = items.reduce((sum, it) => sum + it.unit_price * it.qty, 0);

      return {
        orders: { ...state.orders, [orderId]: { ...order, items, total_amount } },
        kitchenTickets: state.kitchenTickets.filter(k => k.id !== itemId),
      };
    });

    get().enqueueMutation({
      type: 'remove_item',
      payload: { orderId, itemId },
    });
  },

  updateItemQtyOptimistic: (orderId, itemId, delta) => {
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;

      const items = (order.items ?? [])
        .map(it => {
          if (it.id === itemId) {
            const nextQty = it.qty + delta;
            return nextQty > 0 ? { ...it, qty: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as OrderItem[];

      const total_amount = items.reduce((sum, it) => sum + it.unit_price * it.qty, 0);

      const updatedKitchenTickets = state.kitchenTickets
        .map(kt => {
          if (kt.id === itemId) {
            const matchingItem = items.find(it => it.id === itemId);
            return matchingItem ? { ...kt, qty: matchingItem.qty } : null;
          }
          return kt;
        })
        .filter(Boolean) as KitchenTicket[];

      return {
        orders: { ...state.orders, [orderId]: { ...order, items, total_amount } },
        kitchenTickets: updatedKitchenTickets,
      };
    });

    get().enqueueMutation({
      type: 'add_item',
      payload: { orderId, itemId, delta },
    });
  },

  deleteOrderOptimistic: orderId => {
    set(state => {
      const order = state.orders[orderId];
      const updatedOrders = { ...state.orders };
      delete updatedOrders[orderId];

      const updatedTables = order?.table_id
        ? state.tables.map(t => (t.id === order.table_id ? { ...t, status: 'available' as const } : t))
        : state.tables;

      return {
        orders: updatedOrders,
        tables: updatedTables,
        kitchenTickets: state.kitchenTickets.filter(kt => kt.order.id !== orderId),
        activeOrderId: state.activeOrderId === orderId ? null : state.activeOrderId,
      };
    });

    get().enqueueMutation({
      type: 'cancel_order',
      payload: { orderId },
    });
  },

  updateKotStatusOptimistic: (orderId, itemId, status) => {
    set(state => {
      const order = state.orders[orderId];
      const updatedOrder = order
        ? {
          ...order,
          items: (order.items ?? []).map(it =>
            it.id === itemId ? { ...it, kot_status: status } : it,
          ),
        }
        : null;

      const updatedKitchenTickets = state.kitchenTickets.map(kt =>
        kt.id === itemId ? { ...kt, kot_status: status } : kt,
      );

      return {
        orders: updatedOrder ? { ...state.orders, [orderId]: updatedOrder } : state.orders,
        kitchenTickets: updatedKitchenTickets,
      };
    });

    get().enqueueMutation({
      type: 'update_kot_status',
      payload: { orderId, itemId, status },
    });
  },

  cancelOrderOptimistic: orderId => {
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;

      const updatedTables = order.table_id
        ? state.tables.map(t => (t.id === order.table_id ? { ...t, status: 'available' as const } : t))
        : state.tables;

      return {
        tables: updatedTables,
        orders: { ...state.orders, [orderId]: { ...order, status: 'cancelled' } },
        kitchenTickets: state.kitchenTickets.filter(kt => kt.order.id !== orderId),
      };
    });

    get().enqueueMutation({
      type: 'cancel_order',
      payload: { orderId },
    });
  },

  billOrderOptimistic: (orderId, _paymentMethod) => {
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;

      const updatedTables = order.table_id
        ? state.tables.map(t => (t.id === order.table_id ? { ...t, status: 'dirty' as const } : t))
        : state.tables;

      return {
        tables: updatedTables,
        orders: { ...state.orders, [orderId]: { ...order, status: 'billed' } },
      };
    });

    get().enqueueMutation({
      type: 'bill_cash',
      payload: { orderId, paymentMethod: 'cash' },
    });
  },

  openShiftOptimistic: float => {
    const shift: Shift = {
      id: `sh-${Date.now()}`,
      opened_at: new Date().toISOString(),
      closed_at: null,
      opening_float: float,
      expected_cash: float,
      variance: 0,
      note: null,
      status: 'open',
    };

    set({ currentShift: shift });
    get().enqueueMutation({
      type: 'open_shift',
      payload: { openingFloat: float },
    });
  },

  closeShiftOptimistic: (countedCash, note) => {
    set(state => {
      if (!state.currentShift) return state;
      const expected = state.currentShift.expected_cash ?? state.currentShift.opening_float;
      const variance = countedCash - expected;
      const updated: Shift = {
        ...state.currentShift,
        closed_at: new Date().toISOString(),
        counted_cash: countedCash,
        variance,
        note: note ?? null,
        status: 'closed',
      };
      return { currentShift: updated };
    });

    get().enqueueMutation({
      type: 'close_shift',
      payload: { countedCash, note },
    });
  },

  enqueueMutation: mutation => {
    const item: OutboxMutation = {
      ...mutation,
      id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    set(state => ({ outbox: [...state.outbox, item] }));
  },

  dequeueMutation: id => {
    set(state => ({ outbox: state.outbox.filter(m => m.id !== id) }));
  },

  clearOutbox: () => set({ outbox: [] }),
}));
