import { Model } from '@nozbe/watermelondb';
import { children, field, text } from '@nozbe/watermelondb/decorators';
import type MenuItemModel from './MenuItemModel';

export default class MenuCategoryModel extends Model {
  static table = 'menu_categories';

  static associations = {
    menu_items: { type: 'has_many' as const, foreignKey: 'category_id' },
  };

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @field('sort_order') sortOrder!: number;
  @text('etag') etag?: string;

  @children('menu_items') items!: any;
}
