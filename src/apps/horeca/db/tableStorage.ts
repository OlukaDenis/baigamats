import * as Keychain from 'react-native-keychain';
import type { Table, TableCategory } from '../api/schemas';

const TABLE_STORAGE_SERVICE = 'com.baigamats.horeca.tables.offline';
const TABLE_STORAGE_ACCOUNT = 'horeca_tables';
const CATEGORY_STORAGE_SERVICE = 'com.baigamats.horeca.table-categories.offline';
const CATEGORY_STORAGE_ACCOUNT = 'horeca_table_categories';

let inMemoryTables: Table[] | null = null;
let inMemoryCategories: TableCategory[] | null = null;

export const tableStorage = {
  /**
   * Persist the latest fetched or updated tables locally for offline availability.
   */
  async saveTables(tables: Table[]): Promise<void> {
    inMemoryTables = tables;
    try {
      await Keychain.setGenericPassword(
        TABLE_STORAGE_ACCOUNT,
        JSON.stringify(tables),
        {
          service: TABLE_STORAGE_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    } catch {
      // Retain in-memory copy if keychain is not accessible
    }
  },

  /**
   * Retrieve cached tables when offline or during app cold boot.
   */
  async getTables(): Promise<Table[] | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: TABLE_STORAGE_SERVICE,
      });
      if (credentials && credentials.password) {
        const parsed = JSON.parse(credentials.password);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryTables = parsed;
          return parsed;
        }
      }
    } catch {
      // Fallback to in-memory copy
    }
    return inMemoryTables;
  },

  /**
   * Persist table categories for offline filtering.
   */
  async saveCategories(categories: TableCategory[]): Promise<void> {
    inMemoryCategories = categories;
    try {
      await Keychain.setGenericPassword(
        CATEGORY_STORAGE_ACCOUNT,
        JSON.stringify(categories),
        {
          service: CATEGORY_STORAGE_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    } catch {
      // Retain in-memory copy if keychain is not accessible
    }
  },

  async getCategories(): Promise<TableCategory[] | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: CATEGORY_STORAGE_SERVICE,
      });
      if (credentials && credentials.password) {
        const parsed = JSON.parse(credentials.password);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryCategories = parsed;
          return parsed;
        }
      }
    } catch {
      // Fallback to in-memory copy
    }
    return inMemoryCategories;
  },

  /**
   * Clear cached tables and categories.
   */
  async clear(): Promise<void> {
    inMemoryTables = null;
    inMemoryCategories = null;
    try {
      await Keychain.resetGenericPassword({ service: TABLE_STORAGE_SERVICE });
      await Keychain.resetGenericPassword({ service: CATEGORY_STORAGE_SERVICE });
    } catch {
      // Ignore
    }
  },
};

