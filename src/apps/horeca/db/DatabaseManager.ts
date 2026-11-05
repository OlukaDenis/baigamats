import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import MenuCategoryModel from './models/MenuCategoryModel';
import MenuItemModel from './models/MenuItemModel';
import OrderItemModel from './models/OrderItemModel';
import OrderModel from './models/OrderModel';
import OutboxMutationModel from './models/OutboxMutationModel';
import ShiftModel from './models/ShiftModel';
import SyncMetadataModel from './models/SyncMetadataModel';
import TableCategoryModel from './models/TableCategoryModel';
import TableModel from './models/TableModel';
import { horecaAppSchema } from './schema';

export const horecaModelClasses = [
  TableModel,
  TableCategoryModel,
  MenuCategoryModel,
  MenuItemModel,
  OrderModel,
  OrderItemModel,
  ShiftModel,
  OutboxMutationModel,
  SyncMetadataModel,
];

function sanitizeDbName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

class DatabaseManager {
  private activeInstances: Map<string, Database> = new Map();
  private currentUserId: string = 'default';

  /**
   * Initializes or retrieves a dedicated, isolated SQLite database for a specific user ID.
   * Ensures that data for different staff members is never accessible across sessions.
   */
  getDatabase(userId?: string): Database {
    const targetUserId = userId || this.currentUserId || 'default';
    const key = sanitizeDbName(targetUserId);

    if (this.activeInstances.has(key)) {
      return this.activeInstances.get(key)!;
    }

    const adapter = new SQLiteAdapter({
      schema: horecaAppSchema,
      dbName: `horeca_${key}`,
      jsi: true,
      onSetUpError: error => {
        console.error(`[DatabaseManager] Database setup error for user ${key}:`, error);
      },
    });

    const db = new Database({
      adapter,
      modelClasses: horecaModelClasses,
    });

    this.activeInstances.set(key, db);
    return db;
  }

  /**
   * Sets the active user context for the application.
   */
  setCurrentUser(userId: string): Database {
    this.currentUserId = userId;
    return this.getDatabase(userId);
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  /**
   * Unmounts and drops a user's local SQLite database (e.g. upon staff logout).
   */
  async resetUserDatabase(userId?: string): Promise<void> {
    const targetUserId = userId || this.currentUserId;
    const key = sanitizeDbName(targetUserId);
    const db = this.activeInstances.get(key);

    if (db) {
      try {
        await db.write(() => db.unsafeResetDatabase());
      } catch (err) {
        console.warn(`[DatabaseManager] Reset error for user ${key}:`, err);
      }
      this.activeInstances.delete(key);
    }
  }

  /**
   * Cleanly unmounts all cached database instances from memory.
   */
  clearAll(): void {
    this.activeInstances.clear();
    this.currentUserId = 'default';
  }
}

export const databaseManager = new DatabaseManager();

/**
 * Default global database export proxying to the current active user's SQLite database.
 */
export const database: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const db = databaseManager.getDatabase();
    const value = (db as any)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
});
