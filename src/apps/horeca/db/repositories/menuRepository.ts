import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { MenuCategory, MenuItem, PreparationStation } from '../../api/schemas';
import { database } from '../DatabaseManager';
import MenuCategoryModel from '../models/MenuCategoryModel';
import MenuItemModel from '../models/MenuItemModel';
import SyncMetadataModel from '../models/SyncMetadataModel';

export interface CachedCatalogueResult {
  hash: string | null;
  categories: MenuCategory[];
  items: MenuItem[];
  categoriesEtag?: string;
}

export const menuRepository = {
  /**
   * Reads the current cached menu version hash and ETag from SQLite metadata.
   */
  async getStoredVersion(): Promise<{ hash: string | null; categoriesEtag?: string }> {
    try {
      const records = await database.get<SyncMetadataModel>('sync_metadata').query().fetch();
      let hash: string | null = null;
      let categoriesEtag: string | undefined;

      for (const r of records) {
        if (r.key === 'menu_hash') hash = r.value;
        if (r.key === 'categories_etag') categoriesEtag = r.value;
      }
      return { hash, categoriesEtag };
    } catch {
      return { hash: null };
    }
  },

  /**
   * Atomically saves or updates the entire Menu Catalogue in SQLite via JSI batch.
   */
  async syncMenuCatalogue({
    hash,
    categories,
    items,
    categoriesEtag,
  }: {
    hash?: string | null;
    categories: MenuCategory[];
    items: MenuItem[];
    categoriesEtag?: string;
  }): Promise<void> {
    const categoryCollection = database.get<MenuCategoryModel>('menu_categories');
    const itemCollection = database.get<MenuItemModel>('menu_items');
    const metadataCollection = database.get<SyncMetadataModel>('sync_metadata');

    await database.write(async () => {
      const [existingCats, existingItems, existingMetadata] = await Promise.all([
        categoryCollection.query().fetch(),
        itemCollection.query().fetch(),
        metadataCollection.query().fetch(),
      ]);

      const catMap = new Map(existingCats.map(c => [c.serverId || c.id, c]));
      const itemMap = new Map(existingItems.map(i => [i.serverId || i.id, i]));
      const metaMap = new Map(existingMetadata.map(m => [m.key, m]));

      const batchOperations: any[] = [];

      // 1. Process Menu Categories
      for (const cat of categories) {
        const existing = catMap.get(cat.id);
        if (existing) {
          const changed =
            existing.name !== cat.name ||
            existing.sortOrder !== cat.sort_order;
          if (changed) {
            batchOperations.push(
              existing.prepareUpdate(r => {
                r.name = cat.name;
                r.sortOrder = cat.sort_order;
              }),
            );
          }
        } else {
          batchOperations.push(
            categoryCollection.prepareCreate(r => {
              r._raw.id = cat.id;
              r.serverId = cat.id;
              r.name = cat.name;
              r.sortOrder = cat.sort_order;
            }),
          );
        }
      }

      // 2. Process Menu Items
      for (const item of items) {
        const existing = itemMap.get(item.id);
        if (existing) {
          const changed =
            existing.name !== item.name ||
            existing.price !== item.price ||
            existing.station !== item.station ||
            existing.isActive !== item.is_active ||
            existing.ageRestricted !== item.age_restricted ||
            existing.categoryId !== (item.category_id || '');

          if (changed) {
            batchOperations.push(
              existing.prepareUpdate(r => {
                r.name = item.name;
                r.price = item.price;
                r.station = item.station;
                r.isActive = item.is_active;
                r.ageRestricted = item.age_restricted;
                r.categoryId = item.category_id || '';
              }),
            );
          }
        } else {
          batchOperations.push(
            itemCollection.prepareCreate(r => {
              r._raw.id = item.id;
              r.serverId = item.id;
              r.name = item.name;
              r.price = item.price;
              r.station = item.station;
              r.isActive = item.is_active;
              r.ageRestricted = item.age_restricted;
              r.categoryId = item.category_id || '';
            }),
          );
        }
      }

      // 3. Process Sync Metadata (Hash & ETag)
      const setMeta = (key: string, val?: string | null) => {
        if (!val) return;
        const found = metaMap.get(key);
        if (found) {
          if (found.value !== val) {
            batchOperations.push(found.prepareUpdate(r => { r.value = val; }));
          }
        } else {
          batchOperations.push(
            metadataCollection.prepareCreate(r => {
              r.key = key;
              r.value = val;
            }),
          );
        }
      };

      setMeta('menu_hash', hash);
      setMeta('categories_etag', categoriesEtag);

      if (batchOperations.length > 0) {
        await database.batch(...batchOperations);
      }
    });
  },

  /**
   * Updates availability status ('86' out-of-stock) in SQLite in a single transaction.
   */
  async applyAvailability(availability: Record<string, boolean>): Promise<void> {
    if (!availability || Object.keys(availability).length === 0) return;

    const itemIds = Object.keys(availability);
    const itemCollection = database.get<MenuItemModel>('menu_items');

    await database.write(async () => {
      const records = await itemCollection
        .query(Q.or(Q.where('id', Q.oneOf(itemIds)), Q.where('server_id', Q.oneOf(itemIds))))
        .fetch();

      const batch: any[] = [];
      for (const rec of records) {
        const targetId = rec.serverId || rec.id;
        const newActiveState = Boolean(availability[targetId]);
        if (rec.isActive !== newActiveState) {
          batch.push(
            rec.prepareUpdate(r => {
              r.isActive = newActiveState;
            }),
          );
        }
      }

      if (batch.length > 0) {
        await database.batch(...batch);
      }
    });
  },

  /**
   * Retrieves full menu catalogue from SQLite.
   */
  async getMenuCatalogue(): Promise<CachedCatalogueResult> {
    try {
      const [cats, items, version] = await Promise.all([
        database
          .get<MenuCategoryModel>('menu_categories')
          .query(Q.sortBy('sort_order', Q.asc))
          .fetch(),
        database.get<MenuItemModel>('menu_items').query(Q.sortBy('name', Q.asc)).fetch(),
        this.getStoredVersion(),
      ]);

      return {
        hash: version.hash,
        categoriesEtag: version.categoriesEtag,
        categories: cats.map(c => ({
          id: c.serverId || c.id,
          name: c.name,
          sort_order: c.sortOrder,
        })),
        items: items.map(i => ({
          id: i.serverId || i.id,
          category_id: i.categoryId || null,
          name: i.name,
          price: i.price,
          station: i.station as PreparationStation,
          is_active: i.isActive,
          age_restricted: i.ageRestricted,
        })),
      };
    } catch (err) {
      console.warn('[menuRepository] Failed to read menu catalogue from SQLite:', err);
      return { hash: null, categories: [], items: [] };
    }
  },

  observeCategories(): Observable<MenuCategoryModel[]> {
    return database
      .get<MenuCategoryModel>('menu_categories')
      .query(Q.sortBy('sort_order', Q.asc))
      .observe();
  },

  observeMenuItems(station?: 'kitchen' | 'bar'): Observable<MenuItemModel[]> {
    const collection = database.get<MenuItemModel>('menu_items');
    if (station) {
      return collection
        .query(Q.where('station', station), Q.sortBy('name', Q.asc))
        .observe();
    }
    return collection.query(Q.sortBy('name', Q.asc)).observe();
  },
};
