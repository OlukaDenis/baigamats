import { create } from 'zustand';
import { env } from '@shared/config/env';
import type {
  KitchenTicket,
  MenuCategory,
  MenuItem,
  MenuTree,
  Order,
  OrderItem,
  Shift,
  Table,
  TableCategory,
} from '../api/schemas';
import { mockActiveOrder, mockCurrentShift, mockKitchenTickets, mockMenuCategories, mockMenuItems, mockTables } from '../mock/horecaMockData';
import { menuRepository } from './repositories/menuRepository';
import { orderRepository } from './repositories/orderRepository';
import { outboxRepository } from './repositories/outboxRepository';
import { tableRepository } from './repositories/tableRepository';
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
  menuHash: string | null;
  categoriesEtag?: string;
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
  hydrateMenu: () => Promise<void>;
  setMenu: (menu: MenuTree) => void;
  setMenuCatalogue: (payload: {
    hash?: string | null;
    categories: MenuCategory[];
    items: MenuItem[];
    categoriesEtag?: string;
  }) => void;
  applyMenuAvailability: (availability: Record<string, boolean>) => void;
  setTableCategories: (categories: TableCategory[]) => void;
  setTableStatus: (tableId: string, status: Table['status']) => void;
  setActiveTableId: (id: string | null) => void;
  setActiveOrderId: (id: string | null) => void;
  setOrders: (orders: Order[]) => void;
  upsertOrder: (order: Order, replaceTempId?: string) => void;
  replaceOrderItemId: (orderId: string, tempItemId: string, serverItem: Partial<OrderItem> & { id: string }, orderTotal?: number) => void;

  // Order actions
  createOrderOptimistic: (params: { tableId?: string; orderType: Order['order_type']; partySize?: number; tabName?: string }) => Order;
  addItemOptimistic: (orderId: string, item: MenuItem, qty: number, modifiers?: string[], notes?: string, ageVerifiedBy?: string) => OrderItem;
  removeItemOptimistic: (orderId: string, itemId: string) => void;
  updateItemQtyOptimistic: (orderId: string, itemId: string, delta: number) => void;
  updateKotStatusOptimistic: (orderId: string, itemId: string, status: OrderItem['kot_status']) => void;
  cancelOrderOptimistic: (orderId: string) => void;
  deleteOrderOptimistic: (orderId: string) => void;
  billOrderOptimistic: (orderId: string, paymentMethod: 'cash') => void;
  completeOrderSettlement: (orderId: string, status: 'billed' | 'paid') => void;

  // Shift actions
  openShiftOptimistic: (float: number) => void;
  closeShiftOptimistic: (countedCash: number, note?: string) => void;

  // Outbox management
  enqueueMutation: (mutation: Omit<OutboxMutation, 'id' | 'createdAt' | 'attempts'>) => void;
  dequeueMutation: (id: string) => void;
  clearOutbox: () => void;
  resetStore: () => void;
}

/** Converts the API menu tree into the flat/sorted shape held in the store. */
function menuTreeToState(menu: MenuTree): { categories: MenuCategory[]; menuItems: MenuItem[] } {
  const categories = [...menu.categories].sort((a, b) => a.sort_order - b.sort_order);
  const menuItems = [...categories.flatMap(c => c.items ?? []), ...(menu.uncategorised ?? [])];
  return { categories, menuItems };
}

export const useHorecaStore = create<HorecaState>((set, get) => ({
  tables: env.ENABLE_MOCK ? mockTables : [],
  tableCategories: [],
  categories: env.ENABLE_MOCK ? mockMenuCategories : [],
  menuItems: env.ENABLE_MOCK ? mockMenuItems : [],
  menuHash: null,
  categoriesEtag: undefined,
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

  hydrateMenu: async () => {
    const cached = await tableStorage.getMenuCatalogue();
    if (cached && cached.items.length > 0) {
      set(state =>
        state.menuItems.length === 0
          ? {
              menuHash: cached.hash,
              categories: [...cached.categories].sort(
                (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
              ),
              menuItems: cached.items,
              categoriesEtag: cached.categoriesEtag,
            }
          : state,
      );
    }
  },

  setMenu: menu => {
    set(menuTreeToState(menu));
    tableStorage.saveMenu(menu).catch(() => { });
  },

  setMenuCatalogue: ({ hash = null, categories, items, categoriesEtag }) => {
    const sortedCategories = [...categories].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    set(state => ({
      menuHash: hash ?? state.menuHash,
      categories: sortedCategories,
      menuItems: items,
      categoriesEtag: categoriesEtag ?? state.categoriesEtag,
    }));
    tableStorage
      .saveMenuCatalogue({
        hash,
        categories: sortedCategories,
        items,
        categoriesEtag,
      })
      .catch(() => { });
  },

  applyMenuAvailability: availability => {
    set(state => ({
      menuItems: state.menuItems.map(item =>
        Object.prototype.hasOwnProperty.call(availability, item.id)
          ? { ...item, is_active: Boolean(availability[item.id]) }
          : item,
      ),
    }));
    menuRepository.applyAvailability(availability).catch(() => {});
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

  setTableStatus: (tableId, status) => {
    set(state => ({
      tables: state.tables.map(t => (t.id === tableId ? { ...t, status } : t)),
    }));
    tableRepository.updateTableStatus(tableId, status).catch(() => {});
  },

  setActiveTableId: id => set({ activeTableId: id }),
  setActiveOrderId: id => set({ activeOrderId: id }),

  setOrders: incomingOrders =>
    set(state => {
      const nextOrders: Record<string, Order> = {};
      const incomingTableMap = new Map<string, Order>();

      incomingOrders.forEach(ord => {
        if (ord.table_id && ord.status === 'open') {
          incomingTableMap.set(ord.table_id, ord);
        }
      });

      let nextActiveOrderId = state.activeOrderId;

      // Preserve unsynced optimistic orders unless a server open order for the same table arrived
      Object.values(state.orders).forEach(ord => {
        if (ord.id.startsWith('temp-ord-')) {
          const matchingServerOrder = ord.table_id
            ? incomingTableMap.get(ord.table_id)
            : undefined;
          if (matchingServerOrder) {
            if (nextActiveOrderId === ord.id) {
              nextActiveOrderId = matchingServerOrder.id;
            }
          } else {
            nextOrders[ord.id] = ord;
          }
        }
      });

      incomingOrders.forEach(ord => {
        const existing =
          state.orders[ord.id] ??
          Object.values(state.orders).find(
            o => o.id.startsWith('temp-ord-') && o.table_id && o.table_id === ord.table_id,
          );
        const items =
          ord.items && ord.items.length > 0 ? ord.items : (existing?.items ?? []);
        const total_amount =
          ord.total_amount && ord.total_amount > 0
            ? ord.total_amount
            : (existing?.total_amount ??
              items.reduce((sum, it) => sum + it.unit_price * it.qty, 0));

        nextOrders[ord.id] = {
          ...existing,
          ...ord,
          items,
          total_amount,
        };
      });

      // Ensure activeOrderId points to a valid server open order when available
      if (!nextActiveOrderId || !nextOrders[nextActiveOrderId]) {
        const openForActiveTable = incomingOrders.find(
          o => o.table_id === state.activeTableId && o.status === 'open',
        );
        const firstOpen = incomingOrders.find(o => o.status === 'open');
        nextActiveOrderId = openForActiveTable?.id ?? firstOpen?.id ?? nextActiveOrderId;
      }

      // Sync to SQLite in the background
      orderRepository.syncServerOrders(incomingOrders).catch(() => {});

      return {
        orders: nextOrders,
        activeOrderId: nextActiveOrderId,
      };
    }),

  upsertOrder: (order, replaceTempId) =>
    set(state => {
      const nextOrders = { ...state.orders };
      const tempOrder = replaceTempId ? nextOrders[replaceTempId] : undefined;
      if (replaceTempId) {
        delete nextOrders[replaceTempId];
      }
      const existing = nextOrders[order.id] ?? tempOrder;
      nextOrders[order.id] = {
        ...existing,
        ...order,
        items:
          order.items && order.items.length > 0
            ? order.items
            : (existing?.items ?? []),
        total_amount:
          order.total_amount && order.total_amount > 0
            ? order.total_amount
            : (existing?.total_amount ?? 0),
      };
      return {
        orders: nextOrders,
        activeOrderId:
          replaceTempId && state.activeOrderId === replaceTempId
            ? order.id
            : state.activeOrderId,
      };
    }),

  replaceOrderItemId: (orderId, tempItemId, serverItem, orderTotal) =>
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;
      const items = (order.items ?? []).map(it =>
        it.id === tempItemId ? { ...it, ...serverItem, id: serverItem.id } : it,
      );
      const total_amount =
        typeof orderTotal === 'number'
          ? orderTotal
          : items.reduce((sum, it) => sum + it.unit_price * it.qty, 0);
      return {
        orders: {
          ...state.orders,
          [orderId]: { ...order, items, total_amount },
        },
      };
    }),

  createOrderOptimistic: ({ tableId, orderType, partySize, tabName }) => {
    const tempId = `temp-ord-${Date.now()}`;
    const orderNumber = `MAG-ORD-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newOrder: Order = {
      id: tempId,
      order_number: orderNumber,
      table_id: tableId ?? null,
      order_type: orderType,
      status: 'open',
      tab_name: tabName ?? null,
      party_size: partySize ?? null,
      total_amount: 0,
      service_charge_amount: 0,
      created_at: new Date().toISOString(),
      items: [],
    };

    set(state => ({
      orders: { ...state.orders, [tempId]: newOrder },
      activeOrderId: tempId,
    }));

    get().enqueueMutation({
      type: 'create_order',
      payload: {
        tableId,
        orderType,
        clientTempId: tempId,
        ...(partySize !== undefined ? { partySize } : {}),
        ...(tabName ? { tabName } : {}),
      },
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
    // Capture the line before the optimistic update changes its quantity.
    const existing = get().orders[orderId]?.items?.find(it => it.id === itemId);
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

    // The API has no "set quantity" endpoint, so replace the server line:
    // remove the old one and re-add it with the new quantity.
    if (existing) {
      const nextQty = existing.qty + delta;
      get().enqueueMutation({ type: 'remove_item', payload: { orderId, itemId } });
      if (nextQty > 0) {
        get().enqueueMutation({
          type: 'add_item',
          payload: {
            orderId,
            menuItemId: existing.menu_item_id,
            qty: nextQty,
            modifiers: existing.modifiers,
            notes: existing.notes ?? undefined,
            clientTempItemId: itemId,
          },
        });
      }
    }
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

  completeOrderSettlement: (orderId, status) => {
    set(state => {
      const order = state.orders[orderId];
      const updatedTables = order?.table_id
        ? state.tables.map(t => (t.id === order.table_id ? { ...t, status: 'dirty' as const } : t))
        : state.tables;

      const updatedOrders = order
        ? { ...state.orders, [orderId]: { ...order, status } }
        : state.orders;

      return {
        tables: updatedTables,
        orders: updatedOrders,
        kitchenTickets: state.kitchenTickets.filter(kt => kt.order.id !== orderId),
      };
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
    outboxRepository.enqueueMutation({ type: mutation.type, payload: mutation.payload }).catch(() => {});
  },

  dequeueMutation: id => {
    set(state => ({ outbox: state.outbox.filter(m => m.id !== id) }));
  },

  clearOutbox: () => set({ outbox: [] }),

  resetStore: () => {
    set({
      tables: env.ENABLE_MOCK ? mockTables : [],
      tableCategories: [],
      categories: env.ENABLE_MOCK ? mockMenuCategories : [],
      menuItems: env.ENABLE_MOCK ? mockMenuItems : [],
      menuHash: null,
      categoriesEtag: undefined,
      orders: env.ENABLE_MOCK ? { [mockActiveOrder.id]: mockActiveOrder } : {},
      kitchenTickets: env.ENABLE_MOCK ? mockKitchenTickets : [],
      currentShift: env.ENABLE_MOCK ? mockCurrentShift : null,
      activeTableId: env.ENABLE_MOCK ? (mockTables[0]?.id ?? null) : null,
      activeOrderId: env.ENABLE_MOCK ? 'ord-8429' : null,
      outbox: [],
    });
  },
}));
