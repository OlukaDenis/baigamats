import type { z } from 'zod';
import type {
  loanDetailSchema,
  loanItemSchema,
  loanRepayRequestSchema,
  loanRepayResponseSchema,
  loanRepaymentItemSchema,
  loanStatusEnum,
} from '../schemas/loanSchemas';

export type LoanStatus = z.infer<typeof loanStatusEnum>;
export type LoanRepaymentItem = z.infer<typeof loanRepaymentItemSchema>;
export type LoanItem = z.infer<typeof loanItemSchema>;
export type LoanDetail = z.infer<typeof loanDetailSchema>;
export type LoanRepayRequest = z.infer<typeof loanRepayRequestSchema>;
export type LoanRepayResponse = z.infer<typeof loanRepayResponseSchema>;

