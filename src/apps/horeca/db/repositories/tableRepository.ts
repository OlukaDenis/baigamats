import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { Table, TableCategory, TableStatus } from '../../api/schemas';
import { database } from '../DatabaseManager';
import TableCategoryModel from '../models/TableCategoryModel';
import TableModel from '../models/TableModel';

export const tableRepository = {
  /**
   * Batch synchronize tables from the server into SQLite using high-performance JSI batching.
   */
  async syncTables(tables: Table[]): Promise<void> {
    if (!tables || tables.length === 0) return;

    const tableCollection = database.get<TableModel>('tables');

    await database.write(async () => {
      const existingRecords = await tableCollection.query().fetch();
      const existingMap = new Map<string, TableModel>();
      existingRecords.forEach(rec => {
        existingMap.set(rec.serverId || rec.id, rec);
      });

      const batchOperations: any[] = [];

      for (const t of tables) {
        const existing = existingMap.get(t.id);
        if (existing) {
          // Only prepare update if data changed
          const changed =
            existing.tableNumber !== t.table_number ||
            existing.capacity !== t.capacity ||
            existing.status !== t.status ||
            existing.section !== (t.section ?? 'Indoor');

          if (changed) {
            batchOperations.push(
              existing.prepareUpdate(record => {
                record.tableNumber = t.table_number;
                record.capacity = t.capacity;
                record.status = t.status as TableStatus;
                record.section = t.section ?? 'Indoor';
              }),
            );
          }
        } else {
          // Prepare new record
          batchOperations.push(
            tableCollection.prepareCreate(record => {
              record._raw.id = t.id; // Preserve server ID as primary key
              record.serverId = t.id;
              record.tableNumber = t.table_number;
              record.capacity = t.capacity;
              record.status = t.status as TableStatus;
              record.section = t.section ?? 'Indoor';
            }),
          );
        }
      }

      if (batchOperations.length > 0) {
        await database.batch(...batchOperations);
      }
    });
  },

  /**
   * Fetches all tables from local SQLite.
   */
  async getTables(): Promise<Table[]> {
    try {
      const records = await database
        .get<TableModel>('tables')
        .query(Q.sortBy('table_number', Q.asc))
        .fetch();

      return records.map(r => ({
        id: r.serverId || r.id,
        table_number: r.tableNumber,
        capacity: r.capacity,
        status: r.status,
        section: r.section || 'Indoor',
      }));
    } catch (err) {
      console.warn('[tableRepository] Error fetching tables from SQLite:', err);
      return [];
    }
  },

  /**
   * Returns an observable live stream of tables for reactive UI.
   */
  observeTables(): Observable<TableModel[]> {
    return database
      .get<TableModel>('tables')
      .query(Q.sortBy('table_number', Q.asc))
      .observe();
  },

  /**
   * Quickly updates a table's status in local SQLite.
   */
  async updateTableStatus(tableId: string, status: TableStatus): Promise<void> {
    try {
      const records = await database
        .get<TableModel>('tables')
        .query(Q.or(Q.where('server_id', tableId), Q.where('id', tableId)))
        .fetch();

      if (records.length > 0) {
        await database.write(async () => {
          await records[0].update(r => {
            r.status = status;
          });
        });
      }
    } catch (err) {
      console.warn('[tableRepository] Failed to update table status:', err);
    }
  },

  /**
   * Synchronizes table categories (sections).
   */
  async syncCategories(categories: TableCategory[]): Promise<void> {
    if (!categories || categories.length === 0) return;

    const collection = database.get<TableCategoryModel>('table_categories');

    await database.write(async () => {
      const existing = await collection.query().fetch();
      const existingMap = new Map(existing.map(c => [c.name, c]));
      const operations: any[] = [];

      for (const cat of categories) {
        const found = existingMap.get(cat.name);
        if (found) {
          if (found.count !== cat.count) {
            operations.push(
              found.prepareUpdate(r => {
                r.count = cat.count;
              }),
            );
          }
        } else {
          operations.push(
            collection.prepareCreate(r => {
              r.name = cat.name;
              r.count = cat.count;
            }),
          );
        }
      }

      if (operations.length > 0) {
        await database.batch(...operations);
      }
    });
  },

  async getCategories(): Promise<TableCategory[]> {
    try {
      const records = await database.get<TableCategoryModel>('table_categories').query().fetch();
      return records.map(r => ({ name: r.name, count: r.count }));
    } catch {
      return [];
    }
  },

  observeCategories(): Observable<TableCategoryModel[]> {
    return database.get<TableCategoryModel>('table_categories').query().observe();
  },
};
