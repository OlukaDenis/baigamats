import * as Keychain from 'react-native-keychain';
import type { MenuCategory, MenuItem, MenuTree, Table, TableCategory } from '../api/schemas';

export interface CachedMenuCatalogue {
  hash: string | null;
  categories: MenuCategory[];
  items: MenuItem[];
  categoriesEtag?: string;
}

const TABLE_STORAGE_SERVICE = 'com.baigamats.horeca.tables.offline';
const TABLE_STORAGE_ACCOUNT = 'horeca_tables';
const CATEGORY_STORAGE_SERVICE = 'com.baigamats.horeca.table-categories.offline';
const CATEGORY_STORAGE_ACCOUNT = 'horeca_table_categories';
const MENU_STORAGE_SERVICE = 'com.baigamats.horeca.menu.offline';
const MENU_STORAGE_ACCOUNT = 'horeca_menu';

let inMemoryTables: Table[] | null = null;
let inMemoryCategories: TableCategory[] | null = null;
let inMemoryMenuCatalogue: CachedMenuCatalogue | null = null;

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
   * Persist Menu API v2 catalogue (hash, flat categories, flat items, ETag) for offline ordering.
   */
  async saveMenuCatalogue(catalogue: CachedMenuCatalogue): Promise<void> {
    inMemoryMenuCatalogue = catalogue;
    try {
      await Keychain.setGenericPassword(MENU_STORAGE_ACCOUNT, JSON.stringify(catalogue), {
        service: MENU_STORAGE_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // Retain in-memory copy if keychain is not accessible
    }
  },

  async getMenuCatalogue(): Promise<CachedMenuCatalogue | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: MENU_STORAGE_SERVICE });
      if (credentials && credentials.password) {
        const parsed = JSON.parse(credentials.password);
        if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.items)) {
          inMemoryMenuCatalogue = parsed;
          return parsed;
        }
      }
    } catch {
      // Fallback to in-memory copy
    }
    return inMemoryMenuCatalogue;
  },

  /** @deprecated Legacy helper wrapped around saveMenuCatalogue */
  async saveMenu(menu: MenuTree): Promise<void> {
    const items = [
      ...menu.categories.flatMap(c => c.items ?? []),
      ...(menu.uncategorised ?? []),
    ];
    await this.saveMenuCatalogue({
      hash: null,
      categories: menu.categories.map(({ id, name, sort_order }) => ({ id, name, sort_order })),
      items,
    });
  },

  /**
   * Clear cached tables, categories and menu.
   */
  async clear(): Promise<void> {
    inMemoryTables = null;
    inMemoryCategories = null;
    inMemoryMenuCatalogue = null;
    try {
      await Keychain.resetGenericPassword({ service: TABLE_STORAGE_SERVICE });
      await Keychain.resetGenericPassword({ service: CATEGORY_STORAGE_SERVICE });
      await Keychain.resetGenericPassword({ service: MENU_STORAGE_SERVICE });
    } catch {
      // Ignore
    }
  },
};
