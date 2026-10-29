import { z } from 'zod';
import { memberPinSchema } from '../../auth/schemas/memberAuthSchemas';

export const loanStatusEnum = z.enum(['active', 'overdue', 'closed']);
export type LoanStatus = z.infer<typeof loanStatusEnum>;

export const loanRepaymentItemSchema = z.object({
  date: z.string(),
  amount: z.number(),
  method: z.string().default('savings'),
  balance_after: z.number(),
});

export const loanItemSchema = z
  .object({
    id: z.string(),
    reference: z.string(),
    type: z.string(),
    status: loanStatusEnum,
    borrowed: z.number(),
    total_to_repay: z.number(),
    paid: z.number().default(0),
    late_fees: z.number().default(0),
    balance_due: z.number(),
    issued: z.string(),
    due: z.string(),
  })
  .passthrough();

export const loanDetailSchema = loanItemSchema
  .extend({
    repayments: z.array(loanRepaymentItemSchema).default([]),
  })
  .passthrough();

export const loansListResponseSchema = z.union([
  z.array(loanItemSchema),
  z.object({
    data: z.array(loanItemSchema),
    total: z.number().optional(),
  }).transform(res => res.data),
]);

export const loanRepayRequestSchema = z.object({
  amount: z.number().int().positive('Repayment amount must be positive'),
  password: memberPinSchema,
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit SMS verification code').optional(),
});

export const loanRepayResponseSchema = z.object({
  paid: z.number(),
  fee: z.number().default(0),
  message: z.string().optional(),
  repeated: z.boolean().optional(),
});

