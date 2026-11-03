import { z } from 'zod';

export const memberMeBalancesSchema = z.object({
  savings: z.number().default(0),
  shares_value: z.number().default(0),
  shares_count: z.number().default(0),
  share_price: z.number().default(0),
  welfare_paid_in: z.number().default(0),
  welfare_received: z.number().default(0),
  welfare_net: z.number().default(0),
  share_interest: z.number().default(0),
  pending_withdrawals: z.number().default(0),
  fees_paid: z.number().default(0),
});

export const memberMeResponseSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    member_no: z.string(),
    phone: z.string(),
    email: z.string().nullable().optional(),
    organization: z.union([
      z.string(),
      z.object({
        id: z.string().optional(),
        name: z.string(),
        slug: z.string().optional(),
      }),
    ]),
    // Server may return balances either flattened or inside a balances sub-object
    savings: z.number().optional(),
    shares_value: z.number().optional(),
    shares_count: z.number().optional(),
    share_price: z.number().optional(),
    welfare_paid_in: z.number().optional(),
    welfare_received: z.number().optional(),
    welfare_net: z.number().optional(),
    share_interest: z.number().optional(),
    pending_withdrawals: z.number().optional(),
    fees_paid: z.number().optional(),
    balances: memberMeBalancesSchema.optional(),
  })
  .passthrough()
  .transform(data => {
    const rawBalances: Partial<z.infer<typeof memberMeBalancesSchema>> =
      data.balances ?? {};
    return {
      ...data,
      organizationName:
        typeof data.organization === 'string'
          ? data.organization
          : data.organization?.name || '',
      balances: {
        savings: data.savings ?? rawBalances.savings ?? 0,
        shares_value: data.shares_value ?? rawBalances.shares_value ?? 0,
        shares_count: data.shares_count ?? rawBalances.shares_count ?? 0,
        share_price: data.share_price ?? rawBalances.share_price ?? 0,
        welfare_paid_in: data.welfare_paid_in ?? rawBalances.welfare_paid_in ?? 0,
        welfare_received: data.welfare_received ?? rawBalances.welfare_received ?? 0,
        welfare_net: data.welfare_net ?? rawBalances.welfare_net ?? 0,
        share_interest: data.share_interest ?? rawBalances.share_interest ?? 0,
        pending_withdrawals: data.pending_withdrawals ?? rawBalances.pending_withdrawals ?? 0,
        fees_paid: data.fees_paid ?? rawBalances.fees_paid ?? 0,
      },
    };
  });

export const transactionStatusSchema = z.enum([
  'completed',
  'pending',
  'rejected',
  'reversed',
]);

export const transactionDirectionSchema = z.enum(['in', 'out']);

export const memberTransactionSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    direction: transactionDirectionSchema,
    amount: z.number(),
    fee: z.number().default(0),
    shares: z.number().nullable().optional(),
    status: transactionStatusSchema.default('completed'),
    date: z.string(),
    note: z.string().nullable().optional(),
  })
  .passthrough();

export const memberTransactionsResponseSchema = z.object({
  data: z.array(memberTransactionSchema),
  total: z.number().default(0),
  limit: z.number().default(20),
  offset: z.number().default(0),
});

export const transactionFilterSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD').optional(),
});
