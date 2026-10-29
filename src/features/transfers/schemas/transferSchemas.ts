import { z } from 'zod';
import { memberPinSchema } from '../../auth/schemas/memberAuthSchemas';

export const transferKindEnum = z.enum([
  'withdraw',
  'to_member',
  'to_shares',
  'to_welfare',
  'repay',
]);

export type TransferKind = z.infer<typeof transferKindEnum>;

export const transferQuoteResponseSchema = z.object({
  amount: z.number(),
  fee: z.number().default(0),
  total_taken_from_savings: z.number(),
  sms_code_needed: z.boolean().default(false),
});

export const transferRequestSubmissionSchema = z.object({
  kind: transferKindEnum,
  password: memberPinSchema,
  amount: z.number().int().positive().optional(),
  shares: z.number().int().positive().optional(),
  member_no: z.string().trim().optional(),
  beneficiary_id: z.string().optional(),
  note: z.string().trim().max(100).optional(),
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit SMS code').optional(),
});

export const transferRequestStatusEnum = z.enum([
  'approved',
  'waiting_for_approval',
  'completed',
  'rejected',
  'reversed',
]);

export const transferRequestResponseSchema = z.object({
  id: z.string(),
  status: transferRequestStatusEnum,
  message: z.string().optional(),
});

export const requestStatusDetailResponseSchema = z.object({
  id: z.string().optional(),
  status: transferRequestStatusEnum,
  amount: z.number().optional(),
  fee: z.number().optional(),
  date: z.string().optional(),
  message: z.string().optional(),
});

