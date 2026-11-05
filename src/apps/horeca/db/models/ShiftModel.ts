import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export default class ShiftModel extends Model {
  static table = 'shifts';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @text('opened_by') openedBy?: string | null;
  @readonly @date('opened_at') openedAt!: Date;
  @date('closed_at') closedAt?: Date | null;
  @field('opening_float') openingFloat!: number;
  @field('counted_cash') countedCash?: number | null;
  @field('expected_cash') expectedCash?: number | null;
  @field('variance') variance?: number | null;
  @text('note') note?: string | null;
  @text('status') status!: 'open' | 'closed';
}
