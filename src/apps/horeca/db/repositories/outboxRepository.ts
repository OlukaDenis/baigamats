import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import { database, databaseManager } from '../DatabaseManager';
import OutboxMutationModel from '../models/OutboxMutationModel';

export interface EnqueueMutationDto {
  type: string;
  payload: any;
  userId?: string;
}

export const outboxRepository = {
  /**
   * Atomically enqueues an offline mutation into SQLite.
   */
  async enqueueMutation({ type, payload, userId }: EnqueueMutationDto): Promise<OutboxMutationModel> {
    const targetUserId = userId || databaseManager.getCurrentUserId() || 'default';
    const collection = database.get<OutboxMutationModel>('outbox_mutations');

    return await database.write(async () => {
      return await collection.create(rec => {
        rec.userId = targetUserId;
        rec.mutationType = type;
        rec.payloadJson = JSON.stringify(payload);
        rec.attempts = 0;
        rec.status = 'pending';
      });
    });
  },

  /**
   * Retrieves the oldest pending mutation (FIFO) for processing.
   */
  async getNextPendingMutation(userId?: string): Promise<OutboxMutationModel | null> {
    try {
      const targetUserId = userId || databaseManager.getCurrentUserId();
      const conditions: any[] = [
        Q.where('status', 'pending'),
        Q.sortBy('created_at', Q.asc),
        Q.take(1),
      ];

      if (targetUserId && targetUserId !== 'default') {
        conditions.unshift(Q.where('user_id', targetUserId));
      }

      const records = await database
        .get<OutboxMutationModel>('outbox_mutations')
        .query(...conditions)
        .fetch();

      return records[0] ?? null;
    } catch (err) {
      console.warn('[outboxRepository] Error fetching next mutation:', err);
      return null;
    }
  },

  /**
   * Removes a successfully executed mutation from SQLite.
   */
  async dequeueMutation(id: string): Promise<void> {
    try {
      const record = await database.get<OutboxMutationModel>('outbox_mutations').find(id);
      if (record) {
        await database.write(async () => {
          await record.destroyPermanently();
        });
      }
    } catch {
      // Record already removed or not found
    }
  },

  /**
   * Increments attempt count and records failure reason without dropping the record.
   */
  async markMutationFailed(id: string, errorMessage?: string): Promise<void> {
    try {
      const record = await database.get<OutboxMutationModel>('outbox_mutations').find(id);
      if (record) {
        await database.write(async () => {
          await record.update(r => {
            r.attempts += 1;
            r.status = r.attempts >= 5 ? 'failed' : 'pending';
            r.errorMessage = errorMessage || null;
          });
        });
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Returns live count of pending outbox mutations for UI badges.
   */
  observePendingCount(userId?: string): Observable<number> {
    const targetUserId = userId || databaseManager.getCurrentUserId();
    const conditions: any[] = [Q.where('status', 'pending')];
    if (targetUserId && targetUserId !== 'default') {
      conditions.push(Q.where('user_id', targetUserId));
    }
    return database.get<OutboxMutationModel>('outbox_mutations').query(...conditions).observeCount();
  },

  /**
   * Purges all mutations for a user (e.g. upon user reset).
   */
  async clearUserOutbox(userId?: string): Promise<void> {
    const targetUserId = userId || databaseManager.getCurrentUserId();
    const records = await database
      .get<OutboxMutationModel>('outbox_mutations')
      .query(Q.where('user_id', targetUserId))
      .fetch();

    if (records.length > 0) {
      await database.write(async () => {
        await database.batch(...records.map(r => r.prepareDestroyPermanently()));
      });
    }
  },
};
