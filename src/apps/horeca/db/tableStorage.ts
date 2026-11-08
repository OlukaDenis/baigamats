import * as Keychain from 'react-native-keychain';
import {
  type BusinessProfile,
  businessProfileSchema,
  type MenuCategory,
  type MenuItem,
  type MenuTree,
  type Table,
  type TableCategory,
} from '../api/schemas';
import { menuRepository } from './repositories/menuRepository';
import { tableRepository } from './repositories/tableRepository';

export interface CachedMenuCatalogue {
  hash: string | null;
  categories: MenuCategory[];
  items: MenuItem[];
  categoriesEtag?: string;
}

const TABLE_STORAGE_SERVICE = 'com.baigamats.horeca.tables.offline';
const CATEGORY_STORAGE_SERVICE = 'com.baigamats.horeca.table-categories.offline';
const MENU_STORAGE_SERVICE = 'com.baigamats.horeca.menu.offline';
const BUSINESS_PROFILE_SERVICE = 'com.baigamats.horeca.business.offline';
const BUSINESS_PROFILE_ACCOUNT = 'business_profile';

let inMemoryTables: Table[] | null = null;
let inMemoryCategories: TableCategory[] | null = null;
let inMemoryMenuCatalogue: CachedMenuCatalogue | null = null;
let inMemoryBusinessProfile: BusinessProfile | null = null;

/**
 * Storage adapter backed by high-performance SQLite via WatermelonDB repositories.
 * Replaces slow Keychain JSON serialization with direct native SQLite reads & batch writes.
 */
export const tableStorage = {
  /**
   * Persist tables into SQLite for offline availability.
   */
  async saveTables(tables: Table[]): Promise<void> {
    inMemoryTables = tables;
    try {
      await tableRepository.syncTables(tables);
    } catch (err) {
      console.warn('[tableStorage] Failed to save tables in SQLite:', err);
    }
  },

  /**
   * Retrieve cached tables from SQLite.
   */
  async getTables(): Promise<Table[] | null> {
    try {
      const records = await tableRepository.getTables();
      if (records && records.length > 0) {
        inMemoryTables = records;
        return records;
      }
    } catch {
      // Fallback to in-memory
    }
    return inMemoryTables;
  },

  /**
   * Persist table categories in SQLite.
   */
  async saveCategories(categories: TableCategory[]): Promise<void> {
    inMemoryCategories = categories;
    try {
      await tableRepository.syncCategories(categories);
    } catch (err) {
      console.warn('[tableStorage] Failed to save categories in SQLite:', err);
    }
  },

  async getCategories(): Promise<TableCategory[] | null> {
    try {
      const records = await tableRepository.getCategories();
      if (records && records.length > 0) {
        inMemoryCategories = records;
        return records;
      }
    } catch {
      // Fallback
    }
    return inMemoryCategories;
  },

  /**
   * Persist Menu Catalogue into SQLite.
   */
  async saveMenuCatalogue(catalogue: CachedMenuCatalogue): Promise<void> {
    inMemoryMenuCatalogue = catalogue;
    try {
      await menuRepository.syncMenuCatalogue(catalogue);
    } catch (err) {
      console.warn('[tableStorage] Failed to save menu catalogue in SQLite:', err);
    }
  },

  async getMenuCatalogue(): Promise<CachedMenuCatalogue | null> {
    try {
      const res = await menuRepository.getMenuCatalogue();
      if (res && res.items.length > 0) {
        inMemoryMenuCatalogue = res;
        return res;
      }
    } catch {
      // Fallback
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
   * Persist Business Profile for offline receipt & AppBar branding.
   */
  async saveBusinessProfile(profile: BusinessProfile): Promise<void> {
    inMemoryBusinessProfile = profile;
    try {
      await Keychain.setGenericPassword(
        BUSINESS_PROFILE_ACCOUNT,
        JSON.stringify(profile),
        {
          service: BUSINESS_PROFILE_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    } catch {
      // Ignore keychain write errors
    }
  },

  async getBusinessProfile(): Promise<BusinessProfile | null> {
    if (inMemoryBusinessProfile) {
      return inMemoryBusinessProfile;
    }
    try {
      const creds = await Keychain.getGenericPassword({
        service: BUSINESS_PROFILE_SERVICE,
      });
      if (creds && creds.password) {
        const parsed = businessProfileSchema.safeParse(JSON.parse(creds.password));
        if (parsed.success) {
          inMemoryBusinessProfile = parsed.data;
          return parsed.data;
        }
      }
    } catch {
      // Fallback
    }
    return inMemoryBusinessProfile;
  },

  /**
   * Clear cached tables, categories and menu, including cleaning any legacy Keychain keys.
   */
  async clear(): Promise<void> {
    inMemoryTables = null;
    inMemoryCategories = null;
    inMemoryMenuCatalogue = null;
    inMemoryBusinessProfile = null;
    try {
      await Keychain.resetGenericPassword({ service: TABLE_STORAGE_SERVICE });
      await Keychain.resetGenericPassword({ service: CATEGORY_STORAGE_SERVICE });
      await Keychain.resetGenericPassword({ service: MENU_STORAGE_SERVICE });
      await Keychain.resetGenericPassword({ service: BUSINESS_PROFILE_SERVICE });
    } catch {
      // Ignore
    }
  },
};
