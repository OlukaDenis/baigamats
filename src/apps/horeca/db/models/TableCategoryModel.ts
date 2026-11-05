import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class TableCategoryModel extends Model {
  static table = 'table_categories';

  @text('name') name!: string;
  @field('count') count!: number;
}
