import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB SQLite schema for Baigamats HORECA.
 * Version 1: Master floor tables, menu catalogue, orders, items, shifts, outbox, and sync metadata.
 */
export const horecaAppSchema = appSchema({
  version: 1,
  tables: [
    // 1. Floor Tables
    tableSchema({
      name: 'tables',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'table_number', type: 'string', isIndexed: true },
        { name: 'capacity', type: 'number' },
        { name: 'status', type: 'string', isIndexed: true }, // 'available' | 'occupied' | 'reserved' | 'dirty'
        { name: 'section', type: 'string', isIndexed: true }, // e.g. 'Indoor', 'Terrace', 'VIP'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 2. Table Categories (Floor Sections)
    tableSchema({
      name: 'table_categories',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'count', type: 'number' },
      ],
    }),

    // 3. Menu Categories
    tableSchema({
      name: 'menu_categories',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'sort_order', type: 'number', isIndexed: true },
        { name: 'etag', type: 'string', isOptional: true },
      ],
    }),

    // 4. Menu Items
    tableSchema({
      name: 'menu_items',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'price', type: 'number' },
        { name: 'station', type: 'string', isIndexed: true }, // 'kitchen' | 'bar'
        { name: 'is_active', type: 'boolean', isIndexed: true }, // 86 stock status
        { name: 'age_restricted', type: 'boolean' },
      ],
    }),

    // 5. Orders (Retained Indefinitely with User Ownership)
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true }, // Multi-user isolation
        { name: 'order_number', type: 'string', isIndexed: true },
        { name: 'table_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'order_type', type: 'string', isIndexed: true }, // 'dine_in' | 'takeaway' | 'tab'
        { name: 'status', type: 'string', isIndexed: true }, // 'open' | 'billed' | 'paid' | 'cancelled'
        { name: 'tab_name', type: 'string', isOptional: true },
        { name: 'party_size', type: 'number', isOptional: true },
        { name: 'total_amount', type: 'number' },
        { name: 'service_charge_amount', type: 'number' },
        { name: 'sync_state', type: 'string', isIndexed: true }, // 'synced' | 'created_offline' | 'modified_offline'
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // 6. Order Line Items
    tableSchema({
      name: 'order_items',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'order_id', type: 'string', isIndexed: true },
        { name: 'menu_item_id', type: 'string', isIndexed: true },
        { name: 'item_name', type: 'string' },
        { name: 'unit_price', type: 'number' },
        { name: 'qty', type: 'number' },
        { name: 'station', type: 'string', isIndexed: true },
        { name: 'kot_status', type: 'string', isIndexed: true }, // 'new' | 'preparing' | 'ready' | 'served'
        { name: 'modifiers_json', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'discount_amount', type: 'number' },
        { name: 'sync_state', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),

    // 7. Shifts
    tableSchema({
      name: 'shifts',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'opened_by', type: 'string', isOptional: true },
        { name: 'opened_at', type: 'number' },
        { name: 'closed_at', type: 'number', isOptional: true },
        { name: 'opening_float', type: 'number' },
        { name: 'counted_cash', type: 'number', isOptional: true },
        { name: 'expected_cash', type: 'number', isOptional: true },
        { name: 'variance', type: 'number', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true }, // 'open' | 'closed'
      ],
    }),

    // 8. Outbox Mutations Queue (ACID Persisted in SQLite)
    tableSchema({
      name: 'outbox_mutations',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'mutation_type', type: 'string', isIndexed: true },
        { name: 'payload_json', type: 'string' },
        { name: 'attempts', type: 'number' },
        { name: 'status', type: 'string', isIndexed: true }, // 'pending' | 'processing' | 'failed'
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),

    // 9. Sync Metadata (KV Storage for ETag, Menu Hash, Last Sync)
    tableSchema({
      name: 'sync_metadata',
      columns: [
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
