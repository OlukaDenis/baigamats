import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export default class OutboxMutationModel extends Model {
  static table = 'outbox_mutations';

  @text('user_id') userId!: string;
  @text('mutation_type') mutationType!: string;
  @text('payload_json') payloadJson!: string;
  @field('attempts') attempts!: number;
  @text('status') status!: 'pending' | 'processing' | 'failed';
  @text('error_message') errorMessage?: string | null;
  @readonly @date('created_at') createdAt!: Date;

  get payload(): any {
    try {
      return this.payloadJson ? JSON.parse(this.payloadJson) : null;
    } catch {
      return null;
    }
  }
}
