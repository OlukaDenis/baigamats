import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, relation, text } from '@nozbe/watermelondb/decorators';
import type { KotStatus, PreparationStation } from '../../api/schemas';
import type MenuItemModel from './MenuItemModel';
import type OrderModel from './OrderModel';

export default class OrderItemModel extends Model {
  static table = 'order_items';

  static associations = {
    orders: { type: 'belongs_to' as const, key: 'order_id' },
    menu_items: { type: 'belongs_to' as const, key: 'menu_item_id' },
  };

  @text('server_id') serverId?: string;
  @text('order_id') orderId!: string;
  @text('menu_item_id') menuItemId!: string;
  @text('item_name') itemName!: string;
  @field('unit_price') unitPrice!: number;
  @field('qty') qty!: number;
  @text('station') station!: PreparationStation;
  @text('kot_status') kotStatus!: KotStatus;
  @text('modifiers_json') modifiersJson!: string;
  @text('notes') notes?: string | null;
  @field('discount_amount') discountAmount!: number;
  @text('sync_state') syncState!: 'synced' | 'created_offline' | 'modified_offline';
  @readonly @date('created_at') createdAt!: Date;

  @relation('orders', 'order_id') order!: any;
  @relation('menu_items', 'menu_item_id') menuItem!: any;

  get modifiers(): string[] {
    try {
      return this.modifiersJson ? JSON.parse(this.modifiersJson) : [];
    } catch {
      return [];
    }
  }
}
