import { Model } from '@nozbe/watermelondb';
import { field, relation, text } from '@nozbe/watermelondb/decorators';
import type { PreparationStation } from '../../api/schemas';
import type MenuCategoryModel from './MenuCategoryModel';

export default class MenuItemModel extends Model {
  static table = 'menu_items';

  static associations = {
    menu_categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  @text('server_id') serverId!: string;
  @text('category_id') categoryId!: string;
  @text('name') name!: string;
  @field('price') price!: number;
  @text('station') station!: PreparationStation;
  @field('is_active') isActive!: boolean;
  @field('age_restricted') ageRestricted!: boolean;

  @relation('menu_categories', 'category_id') category!: any;
}
