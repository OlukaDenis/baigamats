import type { z } from 'zod';
import type {
  memberMeBalancesSchema,
  memberMeResponseSchema,
  memberTransactionSchema,
  memberTransactionsResponseSchema,
  transactionDirectionSchema,
  transactionFilterSchema,
  transactionStatusSchema,
} from '../schemas/memberAccountSchemas';

export type MemberMeBalances = z.infer<typeof memberMeBalancesSchema>;
export type MemberMeResponse = z.infer<typeof memberMeResponseSchema>;
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
export type TransactionDirection = z.infer<typeof transactionDirectionSchema>;
export type MemberTransaction = z.infer<typeof memberTransactionSchema>;
export type MemberTransactionsResponse = z.infer<typeof memberTransactionsResponseSchema>;
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;

