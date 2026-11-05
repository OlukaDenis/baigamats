import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class SyncMetadataModel extends Model {
  static table = 'sync_metadata';

  @text('key') key!: string;
  @text('value') value!: string;
  @readonly @date('updated_at') updatedAt!: Date;
}
