import type { z } from 'zod';
import type {
  depositQuoteResponseSchema,
  depositStatusEnum,
  depositStatusResponseSchema,
  initiateDepositRequestSchema,
  initiateDepositResponseSchema,
} from '../schemas/depositSchemas';

export type DepositQuoteResponse = z.infer<typeof depositQuoteResponseSchema>;
export type InitiateDepositRequest = z.infer<typeof initiateDepositRequestSchema>;
export type InitiateDepositResponse = z.infer<typeof initiateDepositResponseSchema>;
export type DepositStatus = z.infer<typeof depositStatusEnum>;
export type DepositStatusResponse = z.infer<typeof depositStatusResponseSchema>;

