import { Model, type Query } from '@nozbe/watermelondb';
import { children, date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';
import type { OrderStatus, OrderType } from '../../api/schemas';
import type OrderItemModel from './OrderItemModel';
import type TableModel from './TableModel';

export default class OrderModel extends Model {
  static table = 'orders';

  static associations = {
    tables: { type: 'belongs_to' as const, key: 'table_id' },
    order_items: { type: 'has_many' as const, foreignKey: 'order_id' },
  };

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('order_number') orderNumber!: string;
  @text('table_id') tableId?: string | null;
  @text('order_type') orderType!: OrderType;
  @text('status') status!: OrderStatus;
  @text('tab_name') tabName?: string | null;
  @field('party_size') partySize?: number | null;
  @field('total_amount') totalAmount!: number;
  @field('service_charge_amount') serviceChargeAmount!: number;
  @text('sync_state') syncState!: 'synced' | 'created_offline' | 'modified_offline';
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('tables', 'table_id') assignedTable!: any;
  @children('order_items') items!: Query<OrderItemModel>;
}
