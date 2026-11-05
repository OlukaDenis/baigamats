import { Model } from '@nozbe/watermelondb';
import { children, date, field, readonly, text } from '@nozbe/watermelondb/decorators';
import type { TableStatus } from '../../api/schemas';
import type OrderModel from './OrderModel';

export default class TableModel extends Model {
  static table = 'tables';

  static associations = {
    orders: { type: 'has_many' as const, foreignKey: 'table_id' },
  };

  @text('server_id') serverId!: string;
  @text('table_number') tableNumber!: string;
  @field('capacity') capacity!: number;
  @text('status') status!: TableStatus;
  @text('section') section!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('orders') orders!: any;
}
